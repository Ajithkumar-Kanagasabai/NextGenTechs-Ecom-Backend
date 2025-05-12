import { model } from "@medusajs/framework/utils";

export const CategoryBanner = model.define("category_banner", {
  id: model.id().primaryKey(),
  category_image: model.text(),
  category_id: model.text(),
  category_name: model.text(),
  offer_description: model.text(),
  button_text: model.text(),
  type: model.text(),
});

export default CategoryBanner;
