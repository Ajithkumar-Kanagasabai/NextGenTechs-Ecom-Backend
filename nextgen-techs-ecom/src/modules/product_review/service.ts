import { MedusaService } from "@medusajs/framework/utils"
import ProductReview from "./models/product_review"

class ProductReviewModuleService extends MedusaService({
    ProductReview,
  }){
  }

  export default ProductReviewModuleService