import ProductBannerModuleService from "./service";
import { Module } from "@medusajs/framework/utils";

export const PRODUCT_BANNER_MODULE = "product_banner";

export default Module(PRODUCT_BANNER_MODULE, {
  service: ProductBannerModuleService,
});
