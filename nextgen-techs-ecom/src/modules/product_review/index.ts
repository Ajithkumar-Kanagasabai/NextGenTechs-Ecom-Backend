import ProductReviewModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PRODUCT_REVIEW_MODULE = "product_review"

export default Module(PRODUCT_REVIEW_MODULE, {
  service: ProductReviewModuleService,
})