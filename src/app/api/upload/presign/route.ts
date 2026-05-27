// =============================================================================
// EOD FLOW — Presigned Upload URL API Route
// Generates a presigned PUT URL so the browser uploads directly to R2,
// completely bypassing Vercel's 4.5MB serverless body limit.
// =============================================================================

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authApi } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Dedicated R2 client for presigning (avoids type mismatch with shared client)
let _presignClient: S3Client | null = null;

function getPresignClient(): S3Client {
  if (!_presignClient) {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 storage not configured.");
    }

    _presignClient = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _presignClient;
}

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || "eod-flow-storage";
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

export async function POST(req: NextRequest) {
  // 1. Validate session
  try {
    const sessionData = await authApi.api.getSession({
      headers: req.headers,
    });
    if (!sessionData?.user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { filename, contentType, pathPrefix } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType are required" },
        { status: 400 }
      );
    }

    // Build the storage key
    const safeFileName = filename.replace(/[^a-zA-Z0-9._\-]/g, "_");
    const rawPrefix = (pathPrefix || "general")
      .split("/")
      .map((s: string) => s.replace(/[^a-zA-Z0-9_\-. ]/g, "").replace(/\s+/g, "_").trim())
      .filter(Boolean)
      .join("/");
    const datePrefix = new Date().toISOString().split("T")[0];
    const key = `${rawPrefix}/${datePrefix}_${safeFileName}`;

    // 2. Generate presigned PUT URL (valid for 10 minutes)
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(getPresignClient(), command, {
      expiresIn: 600,
    });

    // 3. Return the presigned URL + the final public URL
    return NextResponse.json({
      presignedUrl,
      publicUrl: `${PUBLIC_URL}/${key}`,
      key,
    });
  } catch (err: any) {
    console.error("[PRESIGN] Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
