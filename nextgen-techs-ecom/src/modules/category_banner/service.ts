import CategoryBanner from "./models/category_banner";
import { categoryBannerTypes } from "../../types/category_banner";
import { MedusaService } from "@medusajs/framework/utils";

class CategoryModuleService extends MedusaService({
  CategoryBanner,
}) {
  //  safely handle null or undefined category_image
  private getCategoryImage(category_image: string | null | undefined): string | undefined {
    return category_image ? category_image : undefined;
  }

  async createCategoryBanner(input: categoryBannerTypes) {
    const {
      category_image,
      categoryId,
      offer_description,
      button_text,
      category_name,
      type,
    } = input;

    // Safely process category_image
    const processedCategoryImage = this.getCategoryImage(category_image);

    const newCategoryBanner = await this.createCategoryBanners({
      category_image: processedCategoryImage,  
      category_id: categoryId,
      offer_description: offer_description,
      button_text: button_text,
      category_name: category_name,
      type: type,
    });

    return newCategoryBanner;
  }

  async getAllBannersByType(type: string) {
    try {
      const category_banners = await this.listCategoryBanners({ type });

      return category_banners;
    } catch (error) {
      console.error("Error fetching category banners:", error);
      throw new Error("Could not fetch banners");
    }
  }

  async getAllBanners() {
    try {
      const category_banners = await this.listCategoryBanners({});
      return category_banners;
    } catch (error) {
      console.error("Error fetching category banners:", error);
      throw new Error("Could not fetch banners");
    }
  }

  async deleteBanner(id: string) {
    try {
      await this.deleteCategoryBanners({ id });
      return true;
    } catch (error) {
      console.error("Error deleting category banner:", error);
      throw new Error("Could not delete category banner");
    }
  }
}

export default CategoryModuleService;
