import CategoryModuleService from "./service";
import { Module } from "@medusajs/framework/utils";

export const CATEGORY_BANNER_MODULE = "category_banner";

export default Module(CATEGORY_BANNER_MODULE, {
  service: CategoryModuleService,
});
