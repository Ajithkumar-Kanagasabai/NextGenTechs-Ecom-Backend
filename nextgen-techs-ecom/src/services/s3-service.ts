import AWS from "aws-sdk";
import { MedusaError } from "@medusajs/utils";

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS!,
  region: process.env.AWS_S3_REGION!,
  endpoint: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`, // Explicit bucket endpoint
  s3ForcePathStyle: true, // Ensures the bucket is part of the URL path instead of the domain
});

export const deleteS3Objects = async (fileKeys: string[]) => {
  try {
    const deleteRequests = fileKeys.map((fileKey) => {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: fileKey,
      };
      return s3.deleteObject(params).promise();
    });

    await Promise.all(deleteRequests);

    return { success: true };
  } catch (error) {
    console.error("S3 Delete Error:", error);
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to delete files from S3"
    );
  }
};
