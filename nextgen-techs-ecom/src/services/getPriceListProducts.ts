import { QueryContext } from "@medusajs/framework/utils";

const getPriceListProducts = async (priceListId, priceListService, query) => {
  // First, get all variant IDs linked to the price list
  const priceListDetails = await priceListService.retrievePriceList(
    priceListId,
    {
      relations: ["prices", "prices.price_set"],
    }
  );

  if (
    !priceListDetails ||
    !priceListDetails.prices ||
    priceListDetails.prices.length === 0
  ) {
    return {
      isError: true,
      message: "No products found in this offer.",
      data: null,
    };
  }

  // Extract price set IDs
  const priceSetIds = priceListDetails.prices
    .map((price) => price.price_set_id)
    .filter((id) => id);

  if (priceSetIds.length === 0) {
    return {
      isError: true,
      message: "No product variants found in this offer.",
      data: null,
    };
  }

  // Extract variant set IDs
  const variantSetIdsQuery = {
    entity: "product_variant_price_set",
    fields: ["*"],
    filters: {
      price_set_id: { $in: priceSetIds },
    },
  };
  const { data: variantSetIds } = await query.graph(variantSetIdsQuery);

  if (variantSetIds.length === 0) {
    return {
      isError: true,
      message: "No product variants found in this offer.",
      data: null,
    };
  }

  // Extract variant IDs
  const variantIds = variantSetIds
    .map((variant) => variant.variant_id)
    .filter((id) => id);

  const dataQuery = {
    entity: "product",
    fields: [
      "*",
      "images.id",
      "images.url",
      "variants.*",
      "variants.calculated_price.*",
    ],
    filters: {
      variants: { $in: variantIds },
    },
    context: {
      variants: {
        calculated_price: QueryContext({
          currency_code: "gbp",
        }),
      },
    },
  };

  const { data } = await query.graph(dataQuery);
  return {
    isError: false,
    message: "success",
    data,
  };
};

export default getPriceListProducts;
