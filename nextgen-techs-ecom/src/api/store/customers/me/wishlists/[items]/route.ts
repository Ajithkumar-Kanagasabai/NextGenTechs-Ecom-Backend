import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import WishlistModuleService from "../../../../../../modules/wishlist/service"
import { MedusaError } from "@medusajs/framework/utils"

type PostStoreCreateWishlistItemType = {
  product_id: string
}


export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const { product_id } = req.body as PostStoreCreateWishlistItemType

    // Check if product_id is missing or empty
    if (!product_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The 'product_id' field is required."
      )
    }

    const customer_id = req.auth_context.actor_id
    const wishlistModuleService: WishlistModuleService = req.scope.resolve("wishlist")
    const wishlist = await wishlistModuleService.createWishlistItem(customer_id, req.scope, product_id)

    if (!wishlist) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No wishlist found for customer"
      )
    }

   return res.status(200).json({
      message: "Wishlist item added successfully",
      type: "success",
    })
  } catch (err) {
    throw err
  }
}
