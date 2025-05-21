import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import ProductReviewModuleService from "../../../modules/product_review/service";
import { Modules, QueryContext } from "@medusajs/framework/utils";
import { RegionDTO } from "@medusajs/framework/types";
import { ParsedQs } from "qs";
import WishlistModuleService from "../../../modules/wishlist/service";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const reviewService =
    req.scope.resolve<ProductReviewModuleService>("product_review");
  const wishlistService = req.scope.resolve(
    "wishlist"
  ) as WishlistModuleService;
  const query = req.scope.resolve("query");
  const regionService = req.scope.resolve(Modules.REGION);

  const {
    limit = 10,
    offset = 0,
    region_id,
    category_id,
    collection_id,
    fields,
    order,
    ...otherFilters
  } = req.query;

  try {
    const customer_id = req.auth_context?.actor_id;
    let region: RegionDTO | null = null;

    if (typeof region_id === "string") {
      try {
        const regions = await regionService.listRegions(
          { id: [region_id] },
          {}
        );
        region = regions?.[0] ?? null;
      } catch (err) {
        console.warn("Region not found:", region_id);
      }
    }

    const normalizeToStringArray = (
      value: string | ParsedQs | (string | ParsedQs)[]
    ): string[] => {
      if (Array.isArray(value)) {
        return value
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter(Boolean);
      } else if (typeof value === "string") {
        return value.trim() ? [value.trim()] : [];
      }
      return [];
    };

    const categoryIds = normalizeToStringArray(category_id ?? []);
    const collectionIds = normalizeToStringArray(collection_id ?? []);

    const filters: Record<string, any> = { ...otherFilters };

    if (otherFilters.handle) {
      filters["handle"] = otherFilters.handle;
    }

    const andConditions: any[] = [];

    if (categoryIds.length) {
      andConditions.push({
        categories: {
          id: categoryIds,
        },
      });
    }

    if (collectionIds.length) {
      andConditions.push({
        collection: {
          id: collectionIds,
        },
      });
    }

    if (andConditions.length) {
      filters["$and"] = andConditions;
    }

    const currency_code = region?.currency_code || "gbp";

    const parsedOrder =
      typeof order === "string"
        ? {
            [order.replace(/^-/, "")]: order.startsWith("-") ? "DESC" : "ASC",
          }
        : undefined;

    const productQuery = {
      entity: "product",
      fields: [
        "*",
         "options.*",
        "variants.*",
        "variants.options.*",
        "variants.calculated_price.*",
        "images.*",
        "metadata.*",
        "collection.*",
        "categories.*",
      ],
      filters,
      order: parsedOrder,
      context: {
        variants: {
          calculated_price: QueryContext({ currency_code }),
        },
      },
    };

    const { data: products } = await query.graph(productQuery);
    const productIds = products.map((p) => p.id);

    // Fetch review stats
    const reviewStats = await reviewService.getReviewStatsByProductIds(
      productIds
    );

    // Fetch wishlist items if customer is authenticated
    let wishlistMap: Record<
      string,
      { wishlist_item_id: string | null; is_in_wishlist: boolean }
    > = {};

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Get all wishlist items for the target products in the last 30 days
    const recentWishlistItems = await wishlistService.listWishlistItems({
      product_id: productIds,
      created_at: {
        $gte: thirtyDaysAgo.toISOString(),
        $lte: now.toISOString(),
      },
    });

    // Map to store product_id into wishlist count
    const wishlistCountMap: Record<string, number> = {};

    for (const item of recentWishlistItems) {
      wishlistCountMap[item.product_id] =
        (wishlistCountMap[item.product_id] || 0) + 1;
    }

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

    // Enrich products with reviews and wishlist flags
    const enrichedProducts = products.map((product) => {
      const stats = reviewStats[product.id] || {
        user_total_ratings: 0,
        avg_rating: 0,
      };

      const wishlistEntry = wishlistMap[product.id] || {
        is_in_wishlist: false,
        wishlist_item_id: null,
      };

      return {
        ...product,
        ratings: {
          ...stats,
        },
        ...wishlistEntry,
        wishlists_total: wishlistCountMap[product.id] || 0,
      };
    });

    res.status(200).json({
      products: enrichedProducts,
      count: products.length,
      offset: Number(offset),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error fetching products or reviews:", error);
    res.status(500).json({
      message: "An error occurred while fetching the products or reviews.",
    });
  }
};
