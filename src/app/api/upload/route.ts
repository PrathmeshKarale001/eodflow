export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authApi } from "@/lib/auth";
import { uploadBuffer } from "@/lib/storage";

// App Router route segment config — raise body limit to 100MB
export const maxDuration = 60; // seconds (for large uploads on Vercel)

export async function POST(req: NextRequest) {
  // 1. Validate session — use authApi directly (not the cached auth() wrapper)
  //    The React cache() wrapper can fail in Route Handlers for non-SUPER_ADMIN roles
  try {
    const sessionData = await authApi.api.getSession({
      headers: req.headers,
    });
    if (!sessionData?.user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  } catch (authErr) {
    console.error("[UPLOAD] Auth error:", authErr);
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const rawPathPrefix = (form.get("pathPrefix") as string) || "general";

    // Sanitize: allow slashes for nested folders, replace spaces/special chars with underscores
    const pathPrefix = rawPathPrefix
      .split("/")
      .map((segment) => segment.replace(/[^a-zA-Z0-9_\-. ]/g, "").replace(/\s+/g, "_").trim())
      .filter(Boolean)
      .join("/");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 2. Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Build storage path with date prefix for chronological grouping
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
    const datePrefix = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const filePath = `${pathPrefix}/${datePrefix}_${safeFileName}`;

    // 4. Upload to Cloudflare R2
    const { url, path } = await uploadBuffer(
      buffer,
      filePath,
      file.type || "application/octet-stream"
    );

    return NextResponse.json({ url, path });
  } catch (err: any) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: err.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
