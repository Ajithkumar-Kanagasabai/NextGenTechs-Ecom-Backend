import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import StripePaymentService from "../../../../services/stripe";


// fetch saved card

export const GET = async (req: AuthenticatedMedusaRequest<unknown>, res: MedusaResponse) => {
  try {
    const userId = req.auth_context?.actor_id;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        type: "unauthorized",
      });
    }

    const parsePaginationQuery = (query: any): { limit: number; offset: string | null } => {
      const rawLimit = query.limit ?? "10";
      const rawOffset = query.offset ?? null;

      const limit = parseInt(rawLimit, 10);
      if (isNaN(limit) || limit <= 0) {
        throw new Error("Invalid limit value.");
      }

      const offset = typeof rawOffset === "string" ? rawOffset : null;
      return { limit, offset };
    };

    const { limit, offset } = parsePaginationQuery(req.query);

    const stripePaymentService = new StripePaymentService();

    const savedCards = await stripePaymentService.getCustomerPaymentCards(
      userId,
      limit,
      offset
    );

    res.status(200).json({
      data: savedCards.data,
      count: savedCards.data.length,
      offset,
      limit,
      has_more: savedCards.has_more,
      url: `/v1/customers/${userId}/sources`
    });
  } catch (error) {
    console.error("Error fetching cards:", error);
    res.status(500).json({ error: error?.message });
  }
};

//delete payment card by using cardId or paymentMethodId
  export const DELETE = async (req:  AuthenticatedMedusaRequest<{ cardId: string }>, res: MedusaResponse) => {
    try {
      const userId = req.auth_context.actor_id;
  
      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
          type: "unauthorized",
        });
      }
  
      const { cardId } = req.body;
  
      if (!cardId) {
        return res.status(400).json({ error: "cardId is required " });
      }
  
      const stripePaymentService = new StripePaymentService();
      const result = await stripePaymentService.deleteCard(userId, cardId);
  
      res.json({ success: true, deleted: result });
    } catch (error) {
      console.error("Error deleting card:", error);
      res.status(500).json({ error: error?.message });
    }
  };

  export const PATCH = async (req: AuthenticatedMedusaRequest<unknown>, res: MedusaResponse) => {
    try {
      const userId = req.auth_context?.actor_id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
  
      const { cardId, paymentMethodId, name, exp_month, exp_year, metadata, limit = 10, offset = "" } = req.body as any;
  
      // Check if neither cardId nor paymentMethodId is provided
      if (!cardId && !paymentMethodId) {
        return res.status(400).json({ error: "Either cardId or paymentMethodId is required" });
      }
  
      const stripeService = new StripePaymentService();
  
      // Ensure offset is a string, and it's null if not provided
      const validOffset = offset && typeof offset === 'string' ? offset : null;
  
      const idToUse = cardId || paymentMethodId;
  
      if (idToUse.startsWith("card_")) {
        // Handle cardId
        const cards = await stripeService.getCustomerPaymentCards(userId, limit, validOffset);
  
        const matchedCard = cards.data.find((c) => c.id === idToUse);
        if (!matchedCard) {
          return res.status(404).json({ error: "Card not found or unauthorized" });
        }
  
        // Update the card details
        const updatedCard = await stripeService.updateCustomerCardDetails(
          userId,
          idToUse,
          {
            name,
            exp_month,
            exp_year,
            metadata,
          }
        );
  
        return res.status(200).json({ card: updatedCard });
      } else if (idToUse.startsWith("pm_")) {
        // Handle paymentMethodId
        const paymentMethods = await stripeService.getCustomerPaymentMethods(userId, limit, offset);

  
        const matchedPaymentMethod = paymentMethods.data.find((pm) => pm.id === idToUse);
        if (!matchedPaymentMethod) {
          return res.status(404).json({ error: "Payment method not found or unauthorized" });
        }
  
        const updatedPaymentMethod = await stripeService.updateCustomerPaymentMethodDetails(
          userId,
          idToUse,
          {
            name,
            exp_month,
            exp_year,
            metadata,
          }
        );
  
        return res.status(200).json({ paymentMethod: updatedPaymentMethod });
      } else {
        return res.status(400).json({ error: "Unsupported ID format. Only 'card_' and 'pm_' IDs are supported." });
      }
    } catch (err: any) {
      console.error("Stripe card/payment method update error:", err);
      res.status(500).json({ error: err.message });
    }
  };
  