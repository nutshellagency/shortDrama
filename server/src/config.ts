import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") }); // Look in project root
dotenv.config({ path: path.join(__dirname, "..", ".env") }); // Look in server root
dotenv.config(); // Also try current directory

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  ADMIN_JWT_SECRET: z.string().min(8),
  ADMIN_EMAIL: z.string().min(1).transform(v => v.trim()),
  ADMIN_PASSWORD: z.string().min(1).transform(v => v.trim()),
  WORKER_TOKEN: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET_RAW: z.string().min(1),
  S3_BUCKET_PROCESSED: z.string().min(1),
  PUBLIC_S3_BASE_URL: z.string().url()
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error(parsed.error.format());
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}


