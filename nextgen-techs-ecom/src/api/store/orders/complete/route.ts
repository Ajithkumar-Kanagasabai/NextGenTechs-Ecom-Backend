import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows";
import StripePaymentService from "../../../../services/stripe";

type PostPaymentType = {
  cartId: string;
  orderId: string;
  userId: string;
  paymentIntentId: string;
  paymentSessionId: string;
  paymentMethodId: string;
  type: string; // ecom/eat/meat/grocery
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const {
    cartId,
    orderId,
    userId,
    paymentIntentId,
    paymentSessionId,
    type,
    paymentMethodId,
  } = req.body as PostPaymentType;

  if (
    !cartId ||
    !orderId ||
    !userId ||
    !paymentIntentId ||
    !paymentSessionId ||
    !type ||
    !paymentMethodId
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const stripePaymentService = new StripePaymentService();
    const paymentModuleService = req.scope.resolve("payment");
    const orderModuleService = req.scope.resolve("order");

    const paymentDetails = await paymentModuleService.listPayments({
      payment_session_id: paymentSessionId,
    });

    if (!paymentDetails?.length) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const existingPayment = paymentDetails[0];
    const existingIntent = await stripePaymentService.retrievePayment(
      paymentIntentId
    );

    if (existingIntent.status === "canceled") {
      return res.status(400).json({
        error:
          "This payment has already been canceled. Please restart the payment process.",
        retry: true,
      });
    }

    const orderDetails = await orderModuleService.listOrders({ id: orderId });
    if (!orderDetails?.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Attach payment method to customer
    await stripePaymentService.attachPaymentMethodToCustomer(
      paymentMethodId,
      userId
    );

    const returnUrl = `${process.env.VITE_API_URL}/store/order/${orderId}`;
    const paymentIntent = await stripePaymentService.confirmPayment(
      paymentIntentId,
      paymentMethodId,
      returnUrl
    );

    const paymentId = existingPayment.id;

    if (paymentIntent.status === "succeeded") {
      // Update payment metadata
      await paymentModuleService.updatePayment({
        id: paymentId,
        // @ts-ignore
        data: {
          payment_intent_id: paymentIntentId,
          payment_method_id: paymentMethodId,
        },
        metadata: { type, cart_id: cartId, order_id: orderId },
      });

      // Capture payment
      const { result, errors } = await capturePaymentWorkflow(req.scope).run({
        input: { payment_id: paymentId },
      });

      // Mark order as completed
      await orderModuleService.updateOrders([
        {
          id: orderId,
          customer_id: userId,
          // @ts-ignore
          status: "completed",
          metadata: { type, status: "completed" },
        },
      ]);

      return res.json({ success: true, message: "Payment confirmed!" });
    } else {
      // Update payment and order as failed
      await paymentModuleService.updatePayment({
        id: paymentId,
        // @ts-ignore
        data: {
          payment_intent_id: paymentIntentId,
          payment_method_id: paymentMethodId,
        },
        metadata: {
          type,
          cart_id: cartId,
          order_id: orderId,
          status: "canceled-failed",
        },
      });

      await orderModuleService.updateOrders([
        {
          id: orderId,
          customer_id: userId,
          // @ts-ignore
          status: "failed",
          metadata: { type, status: "canceled-failed" },
        },
      ]);

      return res.status(400).json({
        error: "Payment failed",
        status: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error("Error processing payment:", error);

    return res.status(500).json({
      error: error?.raw?.message || "Could not process payment",
    });
  }
};
