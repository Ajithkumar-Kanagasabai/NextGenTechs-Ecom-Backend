import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getOrdersListWorkflow } from "@medusajs/medusa/core-flows";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  // Check if user is authenticated
  if (!req.auth_context || !req.auth_context.actor_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const customerId = req.auth_context.actor_id;

  
  
  // Get query parameters from request
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;
  
  try {
    const { result } = await getOrdersListWorkflow(req.scope)
      .run({
        input: {
          fields: [
            "id",
            "status",
            "metadata",
            "payment_collections.payments.*",
            "items.*",
            "items.product.id",
            "items.product.title",
            "items.product.metadata", 
            "summary.*"
          ],          
          variables: {
            filters: {
              customer_id: customerId
            },
            take: limit,
            skip: offset,
            order: {
              created_at: "DESC"
            }          
          },
        },
      });
    
    if (Array.isArray(result)) {
      // It's just an array of orders
      res.json({
        orders: result,
        count: result.length,
        limit,
        offset,
      });
    } else if (result && typeof result === 'object' && 'rows' in result) {
      // It's a paginated result with rows and metadata
      const { rows, metadata } = result;
      
      res.json({
        orders: rows,
        count: metadata.count,
        limit: metadata.take || limit,
        offset: metadata.skip || offset,
      });
    } else {
      // Fallback for unexpected structure
      res.json({
        orders: [],
        count: 0,
        limit,
        offset,
      });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};