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
  // POC: Serving MinIO content via local static server relative path
  // This works because we mount ./content:/data in MinIO and serve ../content via fastify-static
  return `/content/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
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


