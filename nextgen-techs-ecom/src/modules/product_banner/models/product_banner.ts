import { model } from "@medusajs/framework/utils";

export const ProductBanner = model.define("product_banner", {
  id: model.id().primaryKey(),
  product_banner_image: model.text(),
  banner_title: model.text(),
  offer_description: model.text(),
  button_text: model.text(),
});

export default ProductBanner;
