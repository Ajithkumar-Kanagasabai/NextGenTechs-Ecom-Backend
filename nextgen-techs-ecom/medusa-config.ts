import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())
import dotenv from "dotenv"
dotenv.config()

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: {
    file: {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "./src/modules/my-s3-file",
            id: "my-s3",
            options: {
              access_key_id: process.env.AWS_ACCESS_KEY!,
              secret_access_key: process.env.AWS_SECRET_ACCESS!,
              region: process.env.AWS_S3_REGION!,
              bucket: process.env.AWS_S3_BUCKET_NAME!,
            },
          },
        ],
      },
    },
    //  "google-apple-auth": {
    //   resolve: "./src/modules/auth",
    // },
    product_review: {
      resolve: "./src/modules/product_review",
    },
     product_banner: {
      resolve: "./src/modules/product_banner",
    },
    special_offers_banner: {
      resolve: "./src/modules/special_offers_banner",
    },
     category_banner: {
      resolve: "./src/modules/category_banner",
    },
     sendgrid: {
      resolve: "./src/services/sendGrid.ts",
      options: {
        api_key: process.env.SENDGRID_API_KEY,
        from_email: process.env.SENDGRID_FROM_EMAIL,
      },
    } 
  },
})
