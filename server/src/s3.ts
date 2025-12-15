import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "./config";

export function createS3() {
  const env = getEnv();
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY
    }
  });
}

export function publicObjectUrl(bucket: string, key: string) {
  // POC: Special handling for seeded static assets (e.g. public/img/...)
  if (key.startsWith("public/")) {
    return `/${key}`;
  }
  // Generate Supabase Storage public URL
  // Format: {PUBLIC_S3_BASE_URL}/{bucket}/{key}
  const env = getEnv();
  return `${env.PUBLIC_S3_BASE_URL}/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

export async function presignPutUrl(params: { bucket: string; key: string; contentType?: string }) {
  const s3 = createS3();
  const cmd = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
    ContentType: params.contentType
  });
  return await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 });
}


