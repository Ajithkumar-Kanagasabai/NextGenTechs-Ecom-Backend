import SpecialOfferBannerModuleService from "./service";
import { Module } from "@medusajs/framework/utils";

export const SPECIAL_OFFER_BANNER_MODULE = "special_offers_banner";

export default Module(SPECIAL_OFFER_BANNER_MODULE, {
  service: SpecialOfferBannerModuleService,
});
