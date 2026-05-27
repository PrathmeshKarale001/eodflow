// =============================================================================
// EOD FLOW — Client Storage Utility
// Uses presigned URLs to upload directly to R2 (bypasses Vercel's 4.5MB limit)
// Falls back to /api/upload for small files if presign fails
// =============================================================================

export async function uploadFile(
  file: File,
  pathPrefix: string
): Promise<{ path: string; url: string }> {
  // ─── Strategy: Presigned URL (direct browser → R2) ─────────────────────
  // This bypasses Vercel's serverless 4.5MB body limit entirely.
  try {
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        pathPrefix,
      }),
    });

    if (presignRes.ok) {
      const { presignedUrl, publicUrl, key } = await presignRes.json();

      // Upload directly to R2 using the presigned URL
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (uploadRes.ok) {
        return { path: key, url: publicUrl };
      }

      // If direct upload failed, fall through to legacy route
      console.warn("[UPLOAD] Presigned upload failed, falling back to /api/upload");
    }
  } catch (err) {
    console.warn("[UPLOAD] Presign flow failed, falling back:", err);
  }

  // ─── Fallback: Route through Vercel (for files < 4.5MB) ────────────────
  const formData = new FormData();
  formData.append("file", file);
  formData.append("pathPrefix", pathPrefix);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html") || res.redirected) {
        throw new Error("Session expired. Please refresh the page and try again.");
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed (HTTP ${res.status})`);
    }

    return res.json();
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Upload timed out. The file may be too large.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
