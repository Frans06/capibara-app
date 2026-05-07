// Test R2 CORS configuration — simulates browser behavior
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(import.meta.dirname, ".env");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=['""]?([^'"]*)['""]?$/);
  if (match) env[match[1]] = match[2];
}

const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const testKey = `test/cors-test-${Date.now()}.txt`;
const origin = "http://localhost:3000";

// Generate presigned URL
const presignedUrl = await getSignedUrl(s3, new PutObjectCommand({
  Bucket: env.R2_BUCKET_NAME,
  Key: testKey,
  ContentType: "text/plain",
}), { expiresIn: 600 });

console.log(`Presigned URL: ${presignedUrl.slice(0, 80)}...\n`);

// Test 1: OPTIONS preflight (what the browser sends first)
console.log(`Test 1: OPTIONS preflight from origin ${origin}...`);
try {
  const preflight = await fetch(presignedUrl, {
    method: "OPTIONS",
    headers: {
      "Origin": origin,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  console.log(`  Status: ${preflight.status}`);
  console.log(`  Access-Control-Allow-Origin: ${preflight.headers.get("access-control-allow-origin") ?? "(missing)"}`);
  console.log(`  Access-Control-Allow-Methods: ${preflight.headers.get("access-control-allow-methods") ?? "(missing)"}`);
  console.log(`  Access-Control-Allow-Headers: ${preflight.headers.get("access-control-allow-headers") ?? "(missing)"}`);
  if (preflight.status >= 400) {
    const body = await preflight.text();
    console.log(`  Body: ${body.slice(0, 200)}`);
    console.log("\n  ✗ Preflight FAILED — CORS is not configured on the bucket yet.");
  } else {
    console.log("  ✓ Preflight passed!");
  }
} catch (err) {
  console.error(`  ✗ Preflight error: ${err.message}`);
}

// Test 2: PUT with Origin header (what the browser sends after preflight)
console.log(`\nTest 2: PUT with Origin header from ${origin}...`);
try {
  const upload = await fetch(presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "text/plain",
      "Origin": origin,
    },
    body: "CORS test",
  });
  console.log(`  Status: ${upload.status}`);
  console.log(`  Access-Control-Allow-Origin: ${upload.headers.get("access-control-allow-origin") ?? "(missing)"}`);
  if (upload.ok) {
    console.log("  ✓ Upload succeeded!");
    if (upload.headers.get("access-control-allow-origin")) {
      console.log("  ✓ CORS headers present — browser uploads should work!");
    } else {
      console.log("  ⚠ Upload worked but no CORS headers — browser will still block this.");
    }
  } else {
    const body = await upload.text();
    console.log(`  Body: ${body.slice(0, 200)}`);
    console.log("  ✗ Upload failed.");
  }
} catch (err) {
  console.error(`  ✗ Upload error: ${err.message}`);
}

// Cleanup
try {
  await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: testKey }));
} catch (_) {}
