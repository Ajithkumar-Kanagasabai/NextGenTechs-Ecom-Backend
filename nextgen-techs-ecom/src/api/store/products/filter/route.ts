import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  QueryContext,
} from "@medusajs/framework/utils";
import ProductBannerModuleService from "../../../../modules/product_review/service";
import WishlistModuleService from "../../../../modules/wishlist/service";

// Custom variant and product interfaces
interface CustomVariant {
  id: string;
  prices?: {
    amount: number;
    currency_code: string;
  }[];
  calculated_price?: {
    calculated_amount: number;
  };
  [key: string]: any;
}

interface CustomProduct {
  id: string;
  variants: CustomVariant[];
  [key: string]: any;
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const reviewModuleService: ProductBannerModuleService =
      req.scope.resolve("product_review");
    const wishlistService = req.scope.resolve(
      "wishlist"
    ) as WishlistModuleService;
    const customer_id = req.auth_context?.actor_id;

    const region_id = req.query.region_id as string;
    const sort = req.query.sort as string;
    const limit = req.query.limit as string;
    const offset = req.query.offset as string;
    const minRating = req.query.rating
      ? parseFloat(req.query.rating as string)
      : undefined;

    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedOffset = parseInt(offset, 10) || 0;

    const collection_id = Array.isArray(req.query.collection_id)
      ? req.query.collection_id
      : req.query.collection_id
      ? [req.query.collection_id]
      : [];

    const category_id = Array.isArray(req.query.category_id)
      ? req.query.category_id
      : req.query.category_id
      ? [req.query.category_id]
      : [];

    const filters: any = {};

    if (collection_id.length) {
      filters.collection_id = collection_id;
    }

    if (category_id.length) {
      filters.categories = {
        id: {
          $in: category_id,
        },
      };
    }

    const {
      data: rawProducts,
      metadata = { count: 0, take: parsedLimit, skip: parsedOffset },
    } = await query.graph({
      entity: "product",
      fields: [
        "*",
        "images.*",
        "variants.*",
        "variants.options.*",
        "variants.prices.*",
        "variants.calculated_price.*",
        "collection.*",
        "categories.*",
        "tags.*",
      ],
      filters,
      pagination: {
        skip: parsedOffset,
        take: parsedLimit,
      },
      context: {
        variants: {
          calculated_price: QueryContext({
            currency_code: "gbp",
            region_id: region_id || undefined,
          }),
        },
      },
    });

    const products = rawProducts as CustomProduct[];

    // Filter variant prices by GBP and sort
    products.forEach((product) => {
      product.variants = product.variants.map((variant) => {
        if (variant.prices) {
          variant.prices = variant.prices.filter(
            (price) => price.currency_code === "gbp"
          );
        }
        return variant;
      });
    });

    const productIds = products.map((p) => p.id);

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

    // Sort variants and products if sort is provided
    if (sort === "asc" || sort === "desc") {
      products.forEach((product) => {
        product.variants.sort((a, b) => {
          const priceA = a.calculated_price?.calculated_amount || 0;
          const priceB = b.calculated_price?.calculated_amount || 0;
          return sort === "desc" ? priceB - priceA : priceA - priceB;
        });
      });

      products.sort((a, b) => {
        const priceA = a.variants[0]?.calculated_price?.calculated_amount || 0;
        const priceB = b.variants[0]?.calculated_price?.calculated_amount || 0;
        return sort === "desc" ? priceB - priceA : priceA - priceB;
      });
    }

    // Add ratings if filtering by rating
    let enrichedProducts = products;

    if (minRating !== undefined) {
      const reviewStats = await reviewModuleService.fetchALLReviewsData(
        productIds,
        parsedOffset,
        parsedLimit
      );

      enrichedProducts = products
        .map((product) => {
          const stats = reviewStats.find((r) => r.product_id === product.id);
          const wishlistEntry = wishlistMap[product.id] || {
            is_in_wishlist: false,
            wishlist_item_id: null,
          };

          return {
            ...product,
            ratings: {
              user_total_ratings: stats?.user_total_ratings || 0,
              avg_rating: stats?.avg_rating || 0,
              total_comments: stats?.total_comments || 0,
            },
            ...wishlistEntry,
            wishlists_total: wishlistCountMap[product.id] || 0,
          };
        })
        .filter((p) => p.ratings.avg_rating >= minRating);
    }

    res.json({
      products: enrichedProducts,
      count: enrichedProducts.length,
      offset: parsedOffset,
      limit: parsedLimit,
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};
