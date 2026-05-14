/// <reference types="@cloudflare/workers-types" />

export interface Env {
  AI: Ai;
  RECEIPTS_BUCKET: R2Bucket;
  POSTGRES_URL: string;
  SHARED_SECRET: string;
}
