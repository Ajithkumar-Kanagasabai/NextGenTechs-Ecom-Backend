import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import ProductReviewModuleService from "../../../modules/product_review/service";
import { Modules, QueryContext } from "@medusajs/framework/utils";
import { RegionDTO } from "@medusajs/framework/types";
import { ParsedQs } from "qs";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const reviewService =
    req.scope.resolve<ProductReviewModuleService>("product_review");
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
    let region: RegionDTO | null = null;

    if (typeof region_id === "string") {
      try {
        const regions = await regionService.listRegions({ id: [region_id] }, {});
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

    // Optional: Parse order string like "-created_at" into object format if needed
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
    const reviewStats = await reviewService.getReviewStatsByProductIds(
      productIds
    );

    const enrichedProducts = products.map((product) => {
      const stats = reviewStats[product.id] || {
        user_total_reviews: 0,
        avg_rating: 0,
      };

      return {
        ...product,
        user_total_reviews: stats.user_total_reviews,
        avg_rating: stats.avg_rating,
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
