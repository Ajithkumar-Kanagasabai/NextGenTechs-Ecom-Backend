import { container } from "@medusajs/framework";
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

export const DELETE = async (
  req: AuthenticatedMedusaRequest<unknown>,
  res: MedusaResponse
) => {
  try {
    const { id } = req.params;

    const cartModuleService = container.resolve(Modules.CART);

    // Retrieve the cart
    const retrievedCart = await cartModuleService.retrieveCart(id);

    if (!retrievedCart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const customerId = req.auth_context.actor_id;

    // Check if the cart belongs to the authenticated customer
    if (retrievedCart.customer_id !== customerId) {
      return res.status(403).json({
        message: "Unauthorized: You do not have permission to delete this cart",
      });
    }

    // Delete the cart
    await cartModuleService.deleteCarts(id);

    return res.status(200).json({ message: "Cart deleted successfully" });
  } catch (err) {
    console.error("Error removing cart:", err);
    return res.status(500).json({
      message: "Failed to remove cart",
      error: (err as Error).message,
    });
  }
};
