
import CategoryModuleService from "../../../modules/category_banner/service";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// GET route to fetch all category banners
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { type = "Ecom" } = req.query;
    const categoryBannerModuleService: CategoryModuleService =
      req.scope.resolve("category_banner");

    if (type === "All") {
      const banners = await categoryBannerModuleService.getAllBanners();
      res.json({ banners });
    } else {
      const banners = await categoryBannerModuleService.getAllBannersByType(
        //@ts-ignore
        type
      );
      res.json({ banners });
    }
  } catch (error) {
    console.error("Error in GET category banners route:", error);
    res.status(500).json({ error: "Could not fetch category banners" });
  }
};