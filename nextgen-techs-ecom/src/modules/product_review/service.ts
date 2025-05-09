import { MedusaService } from "@medusajs/framework/utils";
import ProductReview from "./models/product_review";
import { container } from "@medusajs/framework";
import { CustomerDTO, ProductVariantDTO } from "@medusajs/framework/types";

class ProductReviewModuleService extends MedusaService({
  ProductReview,
}) {
  async fetchReviewData(productId: string, offset: number, limit: number) {
    const customerService = container.resolve("customer");
    const productService = container.resolve("product");

    // Get all reviews for productId
    const [allReviews, totalCount] = await this.listAndCountProductReviews({
      product_id: productId,
    });

    // Get paginated reviews
    const paginatedReviews = allReviews
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(offset, offset + limit);

    if (!paginatedReviews.length) {
      return {
        totalRatings: 0,
        averageRating: 0,
        totalComments: 0,
        reviews: [],
        count: totalCount,
        offset,
        limit,
        total: 0,
      };
    }

    const validReviews = allReviews.filter(
      (r) => r.rating !== null && r.rating !== undefined
    );

    const totalRatings = validReviews.length;
    const totalComments = allReviews.length;
    const averageRating =
      validReviews.length > 0
        ? parseFloat(
            (
              validReviews.reduce((sum, r) => sum + r.rating, 0) /
              validReviews.length
            ).toFixed(2)
          )
        : 0;

    // Fetch customer and variant info for each review
    const reviews = await Promise.all(
      paginatedReviews.map(async (review) => {
        let customer: CustomerDTO | null = null;
        let variant: ProductVariantDTO | null = null;

        try {
          customer = await customerService.retrieveCustomer(review.customer_id);
        } catch (err) {
          console.warn(`Failed to fetch customer ${review.customer_id}:`, err);
        }

        try {
          const [variants] = await productService.listAndCountProductVariants({
            id: [review.variant_id],
          });
          variant = variants?.[0] ?? null;
        } catch (err) {
          console.warn(`Failed to fetch variant ${review.variant_id}:`, err);
        }

        return {
          customerId: review.customer_id,
          customerName: customer
            ? `${customer.first_name ?? "Unknown"} ${
                customer.last_name ?? "Unknown"
              }`
            : "Unknown",
          profile_image: customer?.metadata?.profile_image ?? null,
          comment: review.comment,
          rating: review.rating,
          variant,
        };
      })
    );

    return {
      totalRatings,
      averageRating,
      totalComments,
      reviews,
      count: totalCount,
      offset,
      limit,
      total: totalCount,
    };
  }

  async findOne(filter: {
    order_id: string;
    customer_id: string;
    product_id: string;
    variant_id: string;
  }) {
    const results = await this.listProductReviews(filter);
    return results[0] || null;
  }

  // Create a new review
  async createReviewRating(input: {
    order_id: string;
    customer_id: string;
    product_id: string;
    variant_id: string;
    rating: number;
    comment: string;
  }) {
    const newReview = await this.createProductReviews(input);
    return newReview;
  }

  async getReviewStatsByProductIds(productIds: string[]) {
    if (!productIds.length) return {};

    const [reviews, count] = await this.listAndCountProductReviews({
      product_id: productIds,
    });

    // Group reviews by product_id
    const grouped = reviews.reduce((acc, review) => {
      const pid = review.product_id;
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(review);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate review stats
    const result = Object.entries(grouped).reduce((acc, [productId, group]) => {
      acc[productId] = {
        user_total_reviews: group.length,
        avg_rating:
          group.length > 0
            ? parseFloat(
                (
                  group.reduce((sum, r) => sum + r.rating, 0) / group.length
                ).toFixed(2)
              )
            : 0,
      };
      return acc;
    }, {} as Record<string, { user_total_reviews: number; avg_rating: number }>);

    return result;
  }
}

export default ProductReviewModuleService;
