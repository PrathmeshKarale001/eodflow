export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Use the service role key — bypasses RLS entirely.
// This is safe because we validate the NextAuth session first.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "eod-flow-files";

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

    // 4. Upload using service role (no RLS restrictions)
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl, path: data.path });
  } catch (err: any) {
    console.error("Upload route error:", err);
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}

// Max 50MB (Supabase free tier limit)
export const config = {
  api: { bodyParser: false },
};
