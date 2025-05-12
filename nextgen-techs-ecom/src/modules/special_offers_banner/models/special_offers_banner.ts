import { model } from "@medusajs/framework/utils";

export const SpecialOffer = model.define("special_offers_banner", {
  id: model.id().primaryKey(),
  offer_banner_image: model.text(),
  offer_title: model.text(),
  offer_description: model.text(),
});

export default SpecialOffer;
