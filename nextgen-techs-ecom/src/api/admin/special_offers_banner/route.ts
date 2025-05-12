import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import SpecialOfferModuleService from "../../../modules/special_offers_banner/service";


interface SpecialOfferRequestBody {
  offer_description: string;
  offer_title: string;
}

// Configure AWS SDK v3 S3 client
const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS!,
  },
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload function using SDK v3
const uploadFiles = async (files: Express.Multer.File[]) => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
  }

  const uploadPromises = files.map(async (file) => {
    const key = `uploads/images/special_offers_banner/${Date.now()}_${file.originalname}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3.send(command);

    // You must manually construct the URL, unlike v2 SDK
    const region = process.env.AWS_S3_REGION;
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    return { Location: fileUrl };
  });

  return Promise.all(uploadPromises);
};

// POST route to upload banner
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  upload.single("specialOfferBannerImage")(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(500).json({ error: "Multer file upload error" });
    }

    try {
      const { offer_description, offer_title } = req.body as SpecialOfferRequestBody;

      if (!req.file) {
        return res.status(400).json({ error: "No file received" });
      }

      const uploadedImages = await uploadFiles([req.file]);
      const offer_banner_image = uploadedImages[0]?.Location;

      if (!offer_banner_image) {
        throw new Error("File upload failed, no image URL returned");
      }

      const specialOfferBannerModuleService: SpecialOfferModuleService =
        req.scope.resolve("special_offers_banner");

      const specialOfferBanner =
        await specialOfferBannerModuleService.createSpecialOfferBanner({
          offer_banner_image,
          offer_description,
          offer_title,
        });

      res.json(specialOfferBanner);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "File upload failed" });
    }
  });
};

// GET route to fetch banners
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const specialOfferBannerModuleService: SpecialOfferModuleService =
      req.scope.resolve("special_offers_banner");
    const banners = await specialOfferBannerModuleService.getAllBanners();
    res.json({ banners });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ error: "Could not fetch offer banners" });
  }
};
