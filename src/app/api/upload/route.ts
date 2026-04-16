export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadBuffer } from "@/lib/storage";

export async function POST(req: NextRequest) {
  // 1. Validate session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const rawPathPrefix = (form.get("pathPrefix") as string) || "general";

    // Sanitize to prevent path traversal (allow only word characters and hyphens)
    const pathPrefix = rawPathPrefix.replace(/[^a-zA-Z0-9_-]/g, "");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 2. Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Build storage path
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
    const filePath = `${pathPrefix}/${Date.now()}_${safeFileName}`;

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

// Max 100MB (R2 supports up to 5GB per upload)
export const config = {
  api: { bodyParser: false },
};
