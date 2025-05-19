import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { MedusaError } from "@medusajs/framework/utils";
import WishlistModuleService from "../../../../../../../modules/wishlist/service";

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;

    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The 'id' parameter is required."
      );
    }
    const customer_id = req.auth_context.actor_id;
    const wishlistModuleService: WishlistModuleService =
      req.scope.resolve("wishlist");

    const deletedItem = await wishlistModuleService.deleteWishlistItem(
      req.scope,
      id,
      customer_id
    );

    return res.status(200).json({
      message: "Wishlist item deleted successfully",
      type: "success",
    });
  } catch (err) {
    if (err instanceof MedusaError) {
      let statusCode = 500;

      switch (err.type) {
        case MedusaError.Types.NOT_FOUND:
          statusCode = 404;
          break;
        case MedusaError.Types.INVALID_DATA:
          statusCode = 400;
          break;
        case MedusaError.Types.UNAUTHORIZED:
          statusCode = 401;
          break;
      }
      return res.status(statusCode).json({
        message: err.message,
        type: err.type,
      });
    }
    return res.status(500).json({
      message: err.message || "An error occurred while deleting wishlist item",
      type: "error",
    });
  }
}
