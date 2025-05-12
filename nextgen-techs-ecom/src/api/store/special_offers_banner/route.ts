import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import SpecialOfferModuleService from "../../../modules/special_offers_banner/service";
import { ContainerRegistrationKeys } from "@medusajs/utils";
import getPriceListProducts from "../../../services/getPriceListProducts";

// GET route to fetch all product banners
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const specialOfferBannerModuleService: SpecialOfferModuleService =
      req.scope.resolve("special_offers_banner");
    const banners = await specialOfferBannerModuleService.getAllBanners();
    if (!banners || banners?.length === 0) {
      return res.status(404).json({ message: "No banners available." });
    }

    const priceListService = req.scope.resolve("pricing");
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    // Fetch all price lists
    const priceLists = await priceListService.listPriceLists({});

    // Find the offers price list
    const offerPriceLists = priceLists.find((pl) =>
      pl.title?.toLowerCase()?.includes("special offer")
    );

    if (!offerPriceLists) {
      return res.status(404).json({ message: "No offers available." });
    }

    const { isError, message, data } = await getPriceListProducts(
      offerPriceLists.id,
      priceListService,
      query
    );

    if (isError) {
      return res.status(404).json({ message });
    }

    let offerDetails = {};
    offerDetails["starts_at"] = offerPriceLists?.starts_at || null;
    offerDetails["ends_at"] = offerPriceLists?.ends_at || null;

    return res.status(200).json({
      banner: banners?.[0] || null,
      metadata: offerDetails,
      products: data,
    });
  } catch (error) {
    console.error("Error in GET offer banners route:", error);
    res.status(500).json({ error: "Could not fetch offer banners" });
  }
};
