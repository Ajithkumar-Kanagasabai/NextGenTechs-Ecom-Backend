export type ReviewTypes = {
    order_id: string
    customer_id: string
    product_id: string
    variant_id: string
    rating: number
    comment: string
  }

  export type PostReviewTypes = {
    order_id: string;
    customer_id: string;
    product_id: string;
    variant_id: string;
    rating: number;
    comment?: string;
  };