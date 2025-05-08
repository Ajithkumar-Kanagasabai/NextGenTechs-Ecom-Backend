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
  bucket: string
}

class S3FileProviderService extends AbstractFileProviderService {
  protected s3Client: S3Client
  protected bucket: string
  protected region: string

  static identifier = "s3"

  constructor(_: any, options: S3ProviderOptions) {
    super()

    this.s3Client = new S3Client({
      region: process.env.AWS_S3_REGION, // Make sure the region is set correctly
      credentials: {
        accessKeyId: options.access_key_id,
        secretAccessKey: options.secret_access_key,
      },
      forcePathStyle: false, 
    })    
    this.bucket = options.bucket
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
      },
    })

    const result = await upload.done()

    const url = (result as any).Location ||
      `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileKey}`

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
