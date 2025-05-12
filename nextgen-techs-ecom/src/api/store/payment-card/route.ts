import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StripePaymentService from "../../../services/stripe";

type getQueryProps = {
  userId: string;
};

type postQueryProps = {
  userId: string;
  cardToken: string;
};

// Fetching Cards API
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { userId } = req.query as getQueryProps;
  if (!userId) return res.status(400).json({ error: "User ID is required" });

  const { limit = 10, offset = 0 } = req.query; // Default limit to 10, and offset to 0

  try {
    const stripePaymentService = new StripePaymentService();
    const payMethods = await stripePaymentService.getCustomerPaymentMethods(
      userId,
      parseInt(limit as string, 10), // Ensure limit is an integer
      parseInt(offset as string, 10) // Ensure offset is an integer
    );

    res.json({
      data: payMethods.data,
      count: payMethods.count, 
      offset: offset, 
      limit: limit, 
      url: `/v1/customers/${userId}/payment-methods`
    });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    res.status(500).json({ error: error?.message });
  }
};


// Adding a Card API - not in use because handled in payment confirm API
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { userId, cardToken } = req.body as postQueryProps;
  if (!userId || !cardToken)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const stripePaymentService = new StripePaymentService();
    const card = await stripePaymentService.addCustomerPaymentCard(
      userId,
      cardToken
    );
    res.json(card);
  } catch (error) {
    console.error("Error adding card:", error);
    res.status(500).json({ error: "Could not add card" });
  }
};
