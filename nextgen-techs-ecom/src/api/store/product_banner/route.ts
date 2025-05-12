import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import ProductBannerModuleService from "../../../modules/product_banner/service";
import getPriceListProducts from "../../../services/getPriceListProducts";
import { ContainerRegistrationKeys } from "@medusajs/utils";

// GET route to fetch all product banners with their respective products
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productBannerModuleService: ProductBannerModuleService =
      req.scope.resolve("product_banner");
    const banners = await productBannerModuleService.getAllBanners();

    if (!banners || banners.length === 0) {
      return res.status(404).json({ message: "No banners available." });
    }

    const priceListService = req.scope.resolve("pricing");
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    // Fetch all price lists
    const priceLists = await priceListService.listPriceLists({});

    // Map over banners and attach products dynamically
    const bannersWithProducts = await Promise.all(
      banners.map(async (banner) => {
        // Find the price list that matches the banner's title dynamically
        const matchedPriceList = priceLists.find((pl) =>
          pl.title?.toLowerCase()?.includes(banner.banner_title.toLowerCase())
        );

        const priceListId = matchedPriceList?.id || null;

        // Fetch products only if a matching price list exists
        let products = [];
        if (priceListId) {
          const { data } = await getPriceListProducts(
            priceListId,
            priceListService,
            query
          );
          products = data;
        }

        return {
          ...banner,
          products, // Attach products inside each banner object
        };
      })
    );

    res.json({ banners: bannersWithProducts });
  } catch (error) {
    console.error("Error in GET product banners route:", error);
    res.status(500).json({ error: "Could not fetch product banners" });
  }
};
