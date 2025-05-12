import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import CategoryModuleService from "../../../../modules/category_banner/service";

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const categoryBannerModuleService: CategoryModuleService =
      req.scope.resolve("category_banner");
    const { id } = req.params;

    const deletedbanner = await categoryBannerModuleService.deleteBanner(id);

    if (!deletedbanner) {
      return res.status(404).json({ message: "category banner not found" });
    }

    res
      .status(200)
      .json({ message: "Category banner deleted successfully", deletedbanner });
  } catch (err) {
    console.error("Error deleting banner:", err);
    res.status(500).json({ message: "Failed to delete banner", error: err });
  }
};
