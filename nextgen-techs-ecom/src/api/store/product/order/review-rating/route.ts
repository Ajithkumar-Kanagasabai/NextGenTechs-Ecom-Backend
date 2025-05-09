import type { PostReviewTypes } from "../../../../../types/review"

import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import ProductReviewModuleService from "../../../../../modules/product_review/service";

export const POST = async (req: AuthenticatedMedusaRequest<unknown>, res: MedusaResponse) => {
  try {
    const reviewModuleService =
      req.scope.resolve<ProductReviewModuleService>("product_review");

    const orderModuleService = req.scope.resolve(Modules.ORDER);

    const {
      order_id,
      product_id,
      variant_id,
      rating,
      comment,
    } = req.body as PostReviewTypes;

    // 1. Validate payload
    if (
      !order_id ||
      !product_id ||
      !variant_id ||
      rating == null
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const customer_id = req.auth_context.actor_id;

    // 2. Retrieve and verify order
    const order = await orderModuleService.retrieveOrder(order_id, {
        select: ["id", "customer_id"],
      })

    if (!order || order.customer_id !== customer_id) {
      return res.status(403).json({
        message: "Unauthorized: Order does not belong to the customer",
      });
    }

    // 3. Check for existing review
    const existingReview = await reviewModuleService.findOne({
        order_id,
        customer_id,
        product_id,
        variant_id,
      })

    if (existingReview) {
      return res.status(409).json({
        message: "You have already submitted a review for this product in this order",
      });
    }

    const review = await reviewModuleService.createReviewRating({
      order_id,
      customer_id,
      product_id,
      variant_id,
      rating,
      comment: comment ?? "",
    });

    return res.status(201).json({
      message: "Review or Rating submitted successfully",
      review
    });
  } catch (err) {
    console.error("Error creating review or rating:", err);
    return res.status(500).json({
      message: "Failed to create review or rating",
      error: (err as Error).message,
    });
  }
};
