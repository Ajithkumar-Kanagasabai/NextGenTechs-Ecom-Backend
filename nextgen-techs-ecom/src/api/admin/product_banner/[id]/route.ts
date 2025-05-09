import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import ProductBannerModuleService from "../../../../modules/product_banner/service";

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productBannerModuleService: ProductBannerModuleService =
      req.scope.resolve("product_banner");
    const { id } = req.params;

    const deletedbanner = await productBannerModuleService.deleteBanner(id);

    if (!deletedbanner) {
      return res.status(404).json({ message: "product banner not found" });
    }

    res
      .status(200)
      .json({ message: "product banner deleted successfully", deletedbanner });
  } catch (err) {
    console.error("Error deleting banner:", err);
    res.status(500).json({ message: "Failed to delete banner", error: err });
  }
};
