import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StripePaymentService from "../../../../../services/stripe";

type props = {
  cartId: string;
  userId: string;
  payMethod: string;
  totalAmount: number;
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cartId, userId, payMethod, totalAmount } = req.body as props;

  if (!cartId || !userId || !totalAmount || !payMethod) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const stripePaymentService = new StripePaymentService();

    let paymentIntent;
    if (payMethod === "stripe") {
      // Create Stripe Payment Intent
      paymentIntent = await stripePaymentService.initiatePayment({
        amount: Math.round(totalAmount * 100),
        currency: "gbp",
        metadata: { cartId, userId },
        userId: userId,
      });
    }

    res.json({
      stripeClientSecret:
        payMethod === "stripe" ? paymentIntent.clientSecret : null,
      stripePaymentIntentId:
        payMethod === "stripe" ? paymentIntent.paymentIntentId : null,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Could not payment intent" });
  }
};
