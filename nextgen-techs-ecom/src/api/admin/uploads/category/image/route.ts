import {
    DeleteObjectCommand,
    S3Client,
    S3ClientConfig,
  } from "@aws-sdk/client-s3"
  import { Upload } from "@aws-sdk/lib-storage"
  import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
  import multer from "multer"
  import type { NextFunction } from "express"
  
  // Validate and load environment variables
  const {
    AWS_S3_REGION,
    AWS_ACCESS_KEY,
    AWS_SECRET_ACCESS,
    AWS_S3_BUCKET_NAME,
    AWS_S3_ENDPOINT,
  } = process.env
  
  if (!AWS_S3_REGION || !AWS_ACCESS_KEY || !AWS_SECRET_ACCESS || !AWS_S3_BUCKET_NAME) {
    throw new Error("Missing required AWS S3 environment variables.")
  }
  
  const s3Config: S3ClientConfig = {
    region: AWS_S3_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET_ACCESS,
    },
    endpoint: AWS_S3_ENDPOINT,
    forcePathStyle: !!AWS_S3_ENDPOINT, 
  }
  
  const s3Client = new S3Client(s3Config)
  const upload = multer({ storage: multer.memoryStorage() })
  
  const uploadFileToS3 = async (file: Express.Multer.File): Promise<string> => {
    const fileKey = `uploads/images/category/${Date.now()}_${file.originalname}`
  
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: AWS_S3_BUCKET_NAME!,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    })
  
    const result = await upload.done()
  
    const fallbackUrl = AWS_S3_ENDPOINT
      ? `${AWS_S3_ENDPOINT.replace(/\/$/, "")}/${AWS_S3_BUCKET_NAME}/${fileKey}`
      : `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${fileKey}`
  
    return (result as any).Location || fallbackUrl
  }
  
  export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: NextFunction
  ) => {
    upload.single("files")(req, res, async (err: any) => {
      if (err) {
        console.error("Multer error:", err)
        return res.status(400).json({ error: "File processing error" })
      }
  
      const file = req.file
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" })
      }
  
      try {
        const imageUrl = await uploadFileToS3(file)
        return res.status(200).json({ url: imageUrl })
      } catch (error) {
        console.error("Upload failed:", error)
        return res.status(500).json({ error: "S3 upload failed" })
      }
    })
  }
  
  export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
      const { key } = req.query
  
      if (!key || typeof key !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'key' in query" })
      }
  
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: AWS_S3_BUCKET_NAME!,
          Key: key,
        })
      )
  
      return res.status(200).json({ message: "Image deleted from S3 successfully" })
    } catch (err) {
      console.error("S3 delete error:", err)
      return res.status(500).json({ error: "Failed to delete image from S3" })
    }
  }