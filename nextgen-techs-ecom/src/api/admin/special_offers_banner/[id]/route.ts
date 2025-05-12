import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import SpecialOfferModuleService from "../../../../modules/special_offers_banner/service";

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const SpecialOfferBannerModuleService: SpecialOfferModuleService =
      req.scope.resolve("special_offers_banner");
    const { id } = req.params;

    const deletedbanner = await SpecialOfferBannerModuleService.deleteBanner(
      id
    );

    if (!deletedbanner) {
      return res
        .status(404)
        .json({ message: "Special offer banner not found" });
    }

    res
      .status(200)
      .json({
        message: "Special offer banner deleted successfully",
        deletedbanner,
      });
  } catch (err) {
    console.error("Error deleting banner:", err);
    res.status(500).json({ message: "Failed to delete banner", error: err });
  }
};
