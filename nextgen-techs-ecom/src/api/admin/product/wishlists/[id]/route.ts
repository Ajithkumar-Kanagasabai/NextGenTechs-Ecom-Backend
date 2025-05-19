import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import WishlistModuleService from "../../../../../modules/wishlist/service";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const wishlistService = req.scope.resolve("wishlist") as WishlistModuleService;
  const query = req.scope.resolve("query");

  const { id: product_id } = req.params;

  try {
    if (!product_id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Check if product exists
    const { data: productResult } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { id: product_id },
    });

    const productExists = productResult && productResult.length > 0;

    if (!productExists) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Calculate date range for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Get wishlist items for the product in the last 30 days
    const wishlistItems = await wishlistService.listWishlistItems({
      product_id,
      created_at: {
        $gte: thirtyDaysAgo.toISOString(),
        $lte: now.toISOString(),
      },
    });

    const count = wishlistItems.length;

    return res.status(200).json({
      product_id,
      count,
      message: `This product is in ${count} wishlist(s) for the past 30 days.`,
    });
  } catch (error) {
    console.error("Error fetching product wishlist data", error);
    return res.status(500).json({
      message: "An error occurred while fetching the product wishlist data",
    });
  }
};
