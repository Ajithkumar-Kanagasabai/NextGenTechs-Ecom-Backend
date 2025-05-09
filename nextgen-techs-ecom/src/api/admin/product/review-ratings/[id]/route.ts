import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import ProductReviewModuleService from "../../../../../modules/product_review/service";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params;
  const { limit, offset } = req.query;

  // Parse limit and offset from query parameters
  const pageLimit = limit ? parseInt(limit as string, 10) : 10;
  const pageOffset = offset ? parseInt(offset as string, 10) : 0;

  try {
    const productReviewModuleService: ProductReviewModuleService =
      req.scope.resolve("product_review");

    // Pass parsed limit and offset to fetchReviewData
    const reviewData = await productReviewModuleService.fetchReviewData(
      id,
      pageOffset,
      pageLimit
    );
    return res.status(200).json(reviewData);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch reviews", error: err });
  }
};
