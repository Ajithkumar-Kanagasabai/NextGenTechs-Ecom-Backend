import {
    DeleteObjectsCommand,
    S3Client,
    S3ClientConfig,
  } from "@aws-sdk/client-s3"
  import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
  
  // Load and validate environment variables
  const {
    AWS_S3_REGION,
    AWS_ACCESS_KEY,
    AWS_SECRET_ACCESS,
    AWS_S3_BUCKET_NAME,
    AWS_S3_ENDPOINT,
  } = process.env
  
  if (
    !AWS_S3_REGION ||
    !AWS_ACCESS_KEY ||
    !AWS_SECRET_ACCESS ||
    !AWS_S3_BUCKET_NAME
  ) {
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
  
  export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
      const body = req.body as { file_keys?: string[] }
  
      if (!Array.isArray(body.file_keys) || body.file_keys.length === 0) {
        return res
          .status(400)
          .json({ error: "Missing or invalid file_keys parameter" })
      }
  
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: AWS_S3_BUCKET_NAME!,
        Delete: {
          Objects: body.file_keys.map((key) => ({ Key: key })),
          Quiet: false,
        },
      })
  
      const result = await s3Client.send(deleteCommand)
  
      return res.status(200).json({
        message: "Images deleted from S3 successfully",
        deleted: result.Deleted || [],
        errors: result.Errors || [],
      })
    } catch (err) {
      console.error("S3 delete error:", err)
      return res.status(500).json({ error: "Failed to delete images from S3" })
    }
  }
  