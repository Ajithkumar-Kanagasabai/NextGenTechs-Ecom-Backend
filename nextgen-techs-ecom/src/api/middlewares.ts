import { ConfigModule } from "@medusajs/framework";
import { authenticate, defineMiddlewares, MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { parseCorsOrigins } from "@medusajs/framework/utils";
import cors from "cors";

const corsMiddleware = (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const configModule: ConfigModule = req.scope.resolve("configModule");
  
    // Create the cors middleware
    const corsHandler = cors({
      origin: parseCorsOrigins(configModule.projectConfig.http.storeCors),
      credentials: true,
      exposedHeaders: ["Authorization"],
      allowedHeaders: ["Authorization", "Content-Type", "x-publishable-api-key"],
    });
  
    // Apply it to the current request
    corsHandler(req, res, next);
  };

export default defineMiddlewares({
  routes: [
     // Exclude authentication for POST /store/customers
     {
        matcher: "/store/customers",
        method: "POST",
        middlewares: [],
      },
      // Apply authentication to all other store routes
      {
        matcher: "/store/*",
        middlewares: [
          (req, res, next) => {
            // Ensure /store/customers is excluded properly
            if (req.method === "POST" && (req.path === "/store/customers" || req.originalUrl.endsWith("/store/customers"))) {
              return next(); 
            }
  
            return authenticate("customer", ["session", "bearer"])(req, res, next);
          },
        ],
      },
  ],
})
