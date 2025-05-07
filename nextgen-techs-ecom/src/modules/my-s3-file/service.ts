import { AbstractFileProviderService } from "@medusajs/framework/utils"
import {
  ProviderUploadFileDTO,
  ProviderDeleteFileDTO,
  ProviderFileResultDTO,
} from "@medusajs/types"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"

type S3ProviderOptions = {
  access_key_id: string
  secret_access_key: string
  region: string
  endpoint?: string
  bucket: string
}

class S3FileProviderService extends AbstractFileProviderService {
  protected s3Client: S3Client
  protected bucket: string
  protected endpoint?: string
  protected region: string

  static identifier = "s3"

  constructor(_: any, options: S3ProviderOptions) {
    super()

    this.s3Client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      credentials: {
        accessKeyId: options.access_key_id,
        secretAccessKey: options.secret_access_key,
      },
      forcePathStyle: !!options.endpoint, // Required for MinIO or custom endpoints
    })

    this.bucket = options.bucket
    this.endpoint = options.endpoint
    this.region = options.region
  }

  async upload(file: ProviderUploadFileDTO): Promise<ProviderFileResultDTO> {
    if (!file.content) {
      throw new Error("File content is required for upload.")
    }

    const fileKey = `uploads/images/products/${Date.now()}_${file.filename}`

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucket,
        Key: fileKey,
        Body: Buffer.from(file.content, "binary"),
        ContentType: file.mimeType,
        ACL: "public-read",
      },
    })

    const result = await upload.done()

    // If AWS didn't provide a location, construct a public URL manually
    const fallbackBaseUrl = this.endpoint
      ? `${this.endpoint.replace(/\/$/, "")}/${this.bucket}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com`

    const url = (result as any).Location || `${fallbackBaseUrl}/${fileKey}`

    return {
      url,
      key: fileKey,
    }
  }

  async delete(file: ProviderDeleteFileDTO): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: file.fileKey,
    })

    await this.s3Client.send(command)
  }
}

export default S3FileProviderService
