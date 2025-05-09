import { model } from "@medusajs/framework/utils"

export const ProductReview = model.define("product_review", {
    id: model.id({prefix:"prv"}).primaryKey(),
    order_id: model.text(),
    customer_id: model.text(),
    comment: model.text(),
    rating: model.float(),
    product_id: model.text(),
    variant_id: model.text(),
  });
  export default ProductReview;