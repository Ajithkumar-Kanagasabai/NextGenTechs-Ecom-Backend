import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/utils";
import getPriceListProducts from "../../../services/getPriceListProducts";

// GET Route (Fetch all deals)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const priceListService = req.scope.resolve("pricing");
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    // Fetch all price lists
    const priceLists = await priceListService.listPriceLists({});

    // Find the "Deals of the Day" price list
    const dealOfTheDay = priceLists.find((pl) =>
      pl.title?.toLowerCase()?.includes("deals of the day")
    );

    if (!dealOfTheDay) {
      return res.status(404).json({ message: "No deals available today." });
    }

    const { isError, message, data } = await getPriceListProducts(
      dealOfTheDay.id,
      priceListService,
      query
    );

    if (isError) {
      return res.status(404).json({ message });
    }

    return res.status(200).json({ deal: dealOfTheDay, products: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
