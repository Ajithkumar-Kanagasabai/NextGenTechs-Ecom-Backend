import { MedusaService } from "@medusajs/framework/utils"
import ProductBanner from "./models/product_banner"
import { productBannerTypes } from "../../types/product_banner"

class ProductBannerModuleService extends MedusaService({
  ProductBanner,
}) {
  // List all product banners
  async getAllBanners() {
    try {
      const product_banners = await this.listProductBanners({})
      return product_banners
    } catch (error) {
      console.error("Raw error in getAllBanners:", error)
      throw new Error("Could not fetch banners")
    }
  }

  // Create a new product banner
  async createProductBanner(input: productBannerTypes) {
    const {
      product_banner_image,
      offer_description,
      button_text,
      banner_title,
    } = input

    const [newProductBanner] = await this.createProductBanners([
      {
        product_banner_image: product_banner_image ?? undefined,
        offer_description: offer_description ?? undefined,
        banner_title: banner_title ?? undefined,
        button_text: button_text ?? undefined,
      },
    ])

    return newProductBanner
  }
  // Delete product banner

 async deleteBanner(id: string) {
  try {
    await this.deleteProductBanners({ id });
    return true; 
  } catch (error) {
    console.error("Error deleting product banner:", error);
    throw new Error("Could not delete product banner");
  }
}
}

export default ProductBannerModuleService