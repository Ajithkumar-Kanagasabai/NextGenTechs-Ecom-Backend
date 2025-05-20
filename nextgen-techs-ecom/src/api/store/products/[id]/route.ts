import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { MedusaError, Modules, QueryContext } from "@medusajs/framework/utils";
import WishlistModuleService from "../../../../modules/wishlist/service";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params;
  const { region_id } = req.query;

  if (!region_id || typeof region_id !== "string" || region_id.trim() === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The `region_id` query parameter is required."
    );
  }

  // Resolve services
  const query = req.scope.resolve("query");
  const regionService = req.scope.resolve(Modules.REGION);
  const wishlistService = req.scope.resolve(
    "wishlist"
  ) as WishlistModuleService;
  const customer_id = req.auth_context?.actor_id;

  // Find region and get currency_code
  let region: any = null;
  let currency_code: string | undefined = undefined;

  if (typeof region_id === "string") {
    try {
      const regions = await regionService.listRegions({ id: [region_id] }, {});
      region = regions?.[0] ?? null;
      if (region) {
        currency_code = region.currency_code;
      }
    } catch (err) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Region not found:${region_id}`
      );
    }
  }

  // Query product with calculated prices for variants
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "*",
      "collection.*",
      "options.*",
      "variants.*",
      "variants.options.*",
      "variants.calculated_price.*",
      "categories.*",
      "images.*",
      "tags.*",
    ],
    filters: { id },
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id,
          currency_code,
        }),
      },
    },
  });

  // Fetch wishlist items if customer is authenticated
  let wishlistMap: Record<
    string,
    { wishlist_item_id: string | null; is_in_wishlist: boolean }
  > = {};

  if (customer_id) {
    const wishlists = await wishlistService.listWishlists({ customer_id });

    const customerWishlist = wishlists.find(
      (w) => w.customer_id === customer_id
    );
    if (customerWishlist) {
      const wishlist = await wishlistService.retrieveWishlist(
        customerWishlist.id,
        {
          relations: ["items"],
        }
      );

      for (const item of wishlist.items) {
        wishlistMap[item.product_id] = {
          is_in_wishlist: true,
          wishlist_item_id: item.id,
        };
      }
    }
  }
  const wishlistEntry = wishlistMap[products[0].id] || {
    is_in_wishlist: false,
    wishlist_item_id: null,
  };

  // Calculate wistlists total count, date range for last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Get wishlist items for the product in the last 30 days
  const wishlistItems = await wishlistService.listWishlistItems({
    product_id: products[0].id,
    created_at: {
      $gte: thirtyDaysAgo.toISOString(),
      $lte: now.toISOString(),
    },
  });

  const count = wishlistItems.length;

  res.json({ product: products[0], ...wishlistEntry,wishlists_total:count });
};
