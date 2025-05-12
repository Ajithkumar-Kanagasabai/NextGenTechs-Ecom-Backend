import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

type CancelOrderType = {
  orderId: string;
  paymentIntentId: string;
  paymentSessionId: string;
  type: string; // ecom/eat/meat/grocery
};

// Helper to safely convert to number
const safeToNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    try {
      // @ts-ignore
      return value.toNumber();
    } catch {
      return 0;
    }
  }
  return 0;
};

export const POST = async (
  req: AuthenticatedMedusaRequest<unknown>,
  res: MedusaResponse
) => {
  const { orderId, paymentIntentId, paymentSessionId, type } =
    req.body as CancelOrderType;

  if (!orderId || !paymentIntentId || !paymentSessionId || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const customerId = req.auth_context.actor_id;
    const paymentModuleService = req.scope.resolve("payment");
    const orderModuleService = req.scope.resolve("order");

    // 1. Fetch the order
    const orderList = await orderModuleService.listOrders({ id: orderId });
    if (!orderList.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderList[0];

    // 2. Check customer ownership
    if (order.customer_id !== customerId) {
      return res.status(403).json({
        error: "You are not authorized to cancel this order.",
      });
    }

    // 3. Get payment using payment_session_id
    const paymentDetails = await paymentModuleService.listPayments({
      payment_session_id: paymentSessionId,
    });

    if (!paymentDetails?.length) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const payment = paymentDetails[0];

    // 4. Calculate outstanding amount
    const orderTotal = safeToNumber(order.total);
    const transactionsTotal = (order.transactions || []).reduce((sum, tx) => {
      return sum + safeToNumber(tx.amount);
    }, 0);
    const outstandingAmount = orderTotal - transactionsTotal;

    let refundId = "none";
    let refundStatus = "not_needed";

    if (outstandingAmount < 0) {
      // Use Stripe to refund instead of Medusa refund workflow
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-04-30.basil",
      });

      const idempotencyKey = `refund-${orderId}-${uuidv4()}`;

      const stripeRefund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: Math.abs(outstandingAmount),
          metadata: {
            reason: "Customer cancelled",
            order_id: orderId,
            user_id: customerId,
            type,
          },
        },
        {
          idempotencyKey,
        }
      );

      if (stripeRefund.status !== "succeeded") {
        return res.status(400).json({
          error: "Stripe refund failed",
          details: stripeRefund,
        });
      }

      refundId = stripeRefund.id;
      refundStatus = "succeeded";
    }

    // 5. Cancel the order
    const { result: cancelResult } = await cancelOrderWorkflow(req.scope).run({
      input: {
        order_id: orderId,
      },
    });

    // 6. Update order metadata
    await orderModuleService.updateOrders([
      {
        id: orderId,
        metadata: {
          type,
          refund_id: refundId,
          refund_status: refundStatus,
          status: "canceled",
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Order cancelled" +
        (refundStatus === "succeeded"
          ? " and refund processed successfully. It may take a few business days to reflect in the bank account."
          : ". No refund was necessary."),
      order: cancelResult,
    });
  } catch (err: any) {
    console.error("Error cancelling order:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err?.message || err,
    });
  }
};
