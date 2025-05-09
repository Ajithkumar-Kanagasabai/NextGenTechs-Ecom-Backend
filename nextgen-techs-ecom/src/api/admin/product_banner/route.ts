import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import ProductBannerModuleService from "../../../modules/product_banner/service";

// AWS S3 Client Configuration
const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS!,
  },
});

// Set up Multer memory storage for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadFiles = async (files: Express.Multer.File[]) => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
  }

  const uploadPromises = files.map(async (file) => {
    const key = `uploads/images/product_banner/${Date.now()}_${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3.send(command);

    const location = `https://${bucketName}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;

    return { Location: location };
  });

  return await Promise.all(uploadPromises);
};

export const POST = async (req: MedusaRequest<any>, res: MedusaResponse) => {
  upload.single("productBannerImage")(req, res, async (err) => {
    if (err) {
      console.error("Multer processing error:", err);
      return res.status(500).json({ error: "Multer processing error" });
    }

    try {
      const { offer_description, button_text, banner_title } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "No file received" });
      }

      const uploadedImages = await uploadFiles([req.file]);

      const product_banner_image = uploadedImages[0]?.Location;

      if (!product_banner_image) {
        throw new Error("File upload failed, no location returned");
      }

      const productBannerModuleService: ProductBannerModuleService =
        req.scope.resolve("product_banner");

      const productBanner =
        await productBannerModuleService.createProductBanner({
          product_banner_image,
          offer_description,
          banner_title,
          button_text,
        });

      res.status(200).json(productBanner);
    } catch (error) {
      console.error("Error during upload:", error);
      res.status(500).json({ error: "File upload failed" });
    }
  });
};

// GET route: Fetch all product banners
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productBannerModuleService: ProductBannerModuleService =
      req.scope.resolve("product_banner");

    const banners = await productBannerModuleService.getAllBanners();

    res.status(200).json({ banners });
  } catch (error) {
    console.error("Error in GET product banners route:", error);
    res.status(500).json({ error: "Could not fetch product banners" });
  }
};

