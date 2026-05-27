// =============================================================================
// EOD FLOW — Cloudflare R2 Storage (S3-compatible)
// Replaces Supabase Storage for scalable 1TB+ asset management
// =============================================================================

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// ---------------------------------------------------------------------------
// R2 Client (server-side only — lazy instantiation)
// ─── PERF: Created on first use, not at import time ─────────────────────────
// This prevents crashes when env vars are missing (e.g., during build or in
// environments without R2 configured).
// ---------------------------------------------------------------------------

let _r2: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_r2) {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "R2 storage not configured. Missing CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, or CLOUDFLARE_R2_SECRET_ACCESS_KEY."
      );
    }

    _r2 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return _r2;
}

export const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || "eod-flow-storage";
export const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

// Internal aliases for backward compatibility
const BUCKET = R2_BUCKET;
const PUBLIC_URL = R2_PUBLIC_URL;

// ---------------------------------------------------------------------------
// Upload a file to R2
// ---------------------------------------------------------------------------

export async function uploadFile(
  file: File,
  pathPrefix: string
): Promise<{ path: string; url: string }> {
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${pathPrefix}/${Date.now()}_${safeFileName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: filePath,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    })
  );

  return {
    path: filePath,
    url: `${PUBLIC_URL}/${filePath}`,
  };
}

// ---------------------------------------------------------------------------
// Upload from a raw Buffer (used by API routes)
// ---------------------------------------------------------------------------

export async function uploadBuffer(
  buffer: Buffer,
  filePath: string,
  contentType: string
): Promise<{ path: string; url: string }> {
  if (!PUBLIC_URL) {
    throw new Error("R2 storage not configured. Missing CLOUDFLARE_R2_PUBLIC_URL.");
  }

  try {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: filePath,
        Body: buffer,
        ContentType: contentType,
      })
    );
  } catch (err: any) {
    console.error("[R2] Upload failed:", err.message, { filePath, contentType, bufferSize: buffer.length });
    throw new Error(`Storage upload failed: ${err.message}`);
  }

  return {
    path: filePath,
    url: `${PUBLIC_URL}/${filePath}`,
  };
}

// ---------------------------------------------------------------------------
// Get public URL for a stored file
// ---------------------------------------------------------------------------

export function getFileUrl(path: string): string {
  return `${PUBLIC_URL}/${path}`;
}

// ---------------------------------------------------------------------------
// Delete a file from R2
// ---------------------------------------------------------------------------

export async function deleteStorageFile(filePath: string): Promise<void> {
  try {
    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: filePath,
      })
    );
  } catch (e) {
    console.warn("R2 delete warning:", e);
  }
}

// ---------------------------------------------------------------------------
// Extract the R2 key (path) from a public URL
// Used by deleteFile action to clean up storage
// ---------------------------------------------------------------------------

export function extractStoragePath(fileUrl: string): string | null {
  if (!PUBLIC_URL) return null;
  try {
    if (fileUrl.startsWith(PUBLIC_URL)) {
      return fileUrl.slice(PUBLIC_URL.length + 1); // +1 for the trailing /
    }
    // Fallback: try parsing the URL and extracting the pathname
    const urlObj = new URL(fileUrl);
    return urlObj.pathname.startsWith("/")
      ? urlObj.pathname.slice(1)
      : urlObj.pathname;
  } catch {
    return null;
  }
}
