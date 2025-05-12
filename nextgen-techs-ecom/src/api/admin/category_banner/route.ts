import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import CategoryModuleService from "../../../modules/category_banner/service";
import { categoryBannerTypes } from "../../../types/category_banner";

// Configure AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS!,
  },
});

// Set up multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper to upload a file to S3
const uploadFileToS3 = async (file: Express.Multer.File) => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
  }

  // Create a unique file key for S3
  const fileKey = `uploads/images/category_banner/${Date.now()}_${file.originalname}`;

  // Set up the parameters for the S3 upload
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype, // Ensure correct content type
  });

  // Send the upload request to S3
  await s3Client.send(command);

  // Return the URL of the uploaded file
  return `https://${bucketName}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${fileKey}`;
};

// Define the POST route to handle file uploads
export const POST = async (req: MedusaRequest<unknown>, res: MedusaResponse) => {
  upload.single("categoryBannerImage")(req, res, async (err: any) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(500).json({ error: "Multer error" });
    }

    try {
      const {
        categoryId,
        offer_description,
        button_text,
        category_name,
        type,
      } = req.body as categoryBannerTypes;

      // Check if the file is missing
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Upload the file to S3
      const category_image = await uploadFileToS3(req.file);

      // Get an instance of CategoryModuleService
      const categoryBannerModuleService: CategoryModuleService =
        req.scope.resolve("category_banner");

      // Create a new category banner entry
      const categoryBanner =
        await categoryBannerModuleService.createCategoryBanner({
          categoryId,
          category_image,
          offer_description,
          button_text,
          category_name,
          type,
        });

      // Respond with the newly created category banner
      return res.status(200).json(categoryBanner);
    } catch (error) {
      console.error("Error during upload:", error);
      return res.status(500).json({ error: "File upload failed" });
    }
  });
};

// GET route to fetch all category banners
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { type = "Ecom" } = req.query;
    const categoryBannerModuleService: CategoryModuleService =
      req.scope.resolve("category_banner");

    if (type === "All") {
      const banners = await categoryBannerModuleService.getAllBanners();
      res.json({ banners });
    } else {
      const banners = await categoryBannerModuleService.getAllBannersByType(
        //@ts-ignore
        type
      );
      res.json({ banners });
    }
  } catch (error) {
    console.error("Error in GET category banners route:", error);
    res.status(500).json({ error: "Could not fetch category banners" });
  }
};

