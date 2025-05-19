import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import WishlistModuleService from "../../../../../modules/wishlist/service"


// get wishlists
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const customer_id = req.auth_context.actor_id
    const region_id = req.query.region_id as string

    if (!region_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing region_id in query"
      )
    }

    const limit = parseInt((req.query.limit as string) || "10", 10)
    const offset = parseInt((req.query.offset as string) || "0", 10)
    const sort = (req.query.sort as string) || "created_at:desc"

    const wishlistModuleService: WishlistModuleService = req.scope.resolve("wishlist")

    const { wishlist, count } = await wishlistModuleService.getCustomerWishlists(
      customer_id,
      req.scope,
      region_id,
      limit,
      offset,
      sort
    )

    if (!wishlist) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No wishlist found for customer"
      )
    }

    return res.json({
      wishlist: {
        ...wishlist,
        items: wishlist.items, // paginated items
      },
      count,
      offset,
      limit,
    })
  } catch (err) {
    throw err
  }
}


//create customerWishlist
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const customer_id = req.auth_context.actor_id
    const wishlistModuleService: WishlistModuleService = req.scope.resolve("wishlist")
    const wishlist = await wishlistModuleService.createCustomerWishlist(customer_id, req.scope)

    if (!wishlist) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No wishlist found for customer"
      )
    }

    return res.status(200).json({
      message: "Wishlist created successfully",
      type: "success",
    })
  } catch (err) {
    throw err
  }
}