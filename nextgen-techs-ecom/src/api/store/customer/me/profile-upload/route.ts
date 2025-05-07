import { container } from "@medusajs/framework";
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

// Configure S3 client v3
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS || "",
  },
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Invalid file type. Only images are allowed."));
    }
    cb(null, true);
  },
});

const uploadFileToS3 = async (file: Express.Multer.File) => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
  }

  const fileKey = `uploads/images/customer/profile/${Date.now()}_${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  const imageUrl = `https://${bucketName}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${fileKey}`;
  return imageUrl;
};

export const POST = async (
  req: AuthenticatedMedusaRequest<unknown>,
  res: MedusaResponse
) => {
  try {
    if (!req.auth_context || !req.auth_context.actor_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const customerId = req.auth_context.actor_id;

    const processFile = () => {
      return new Promise<Express.Multer.File | undefined>((resolve, reject) => {
        upload.single("imageFile")(req, res, (err) => {
          if (err) {
            if ((err as any).code === "LIMIT_FILE_SIZE") {
              return reject(new Error("File size exceeds 5MB limit."));
            }
            return reject(err);
          }
          resolve(req.file);
        });
      });
    };

    const file = await processFile();
    if (!file) {
      return res.status(400).json({ error: "No file received" });
    }

    const imageUrl = await uploadFileToS3(file);

    const customerService = container.resolve("customer");
    const customer = await customerService.retrieveCustomer(customerId);

    await customerService.updateCustomers(customerId, {
      metadata: {
        ...customer.metadata,
        profile_image: imageUrl,
      },
    });

    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Error during upload:", error);
    res.status(500).json({ error: (error as Error).message || "File upload failed" });
  }
};
