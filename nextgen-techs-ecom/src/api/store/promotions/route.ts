import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const promotionModuleService = req.scope.resolve(Modules.PROMOTION);

  // Extract query params safely
  const {
    limit = "10",
    offset = "0",
    order,
    type,
    ...restFilters
  } = req.query as Record<string, any>;

  const limitNum = parseInt(limit, 10);
  const offsetNum = parseInt(offset, 10);

  let orderParsed: Record<string, "ASC" | "DESC"> | undefined;
  try {
    orderParsed = typeof order === "string" ? JSON.parse(order) : undefined;
  } catch {
    orderParsed = undefined;
  }

  const filters: any = { ...restFilters };

  if (typeof type === "string") {
    filters.$or = [
      { type: [type] },
      {
        campaign: {
          campaign_identifier: {
            $ilike: `%${type.toLowerCase()}%`,
          },
        },
      },
    ];
  } else if (Array.isArray(type)) {
    const typeConditions = type.map((t) => ({
      type: [t],
    }));

    const campaignConditions = type.map((t) => ({
      campaign: {
        campaign_identifier: {
          $ilike: `%${t.toLowerCase()}%`,
        },
      },
    }));

    filters.$or = [...typeConditions, ...campaignConditions];
  }

  const [promotions, count] = await promotionModuleService.listAndCountPromotions(filters, {
    take: limitNum,
    skip: offsetNum,
    order: orderParsed,
    relations: ["application_method", "campaign", "campaign.budget"],
  });

  const formattedPromotions = promotions.map((promo) => ({
    ...promo,
    campaign: promo.campaign || null,
  }));

  res.json({
    promotions: formattedPromotions,
    count,
    limit: limitNum,
    offset: offsetNum,
  });
}
