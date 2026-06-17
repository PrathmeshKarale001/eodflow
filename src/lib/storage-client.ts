// =============================================================================
// EOD FLOW — Client Storage Utility
// Uses presigned URLs to upload directly to R2 (bypasses Vercel's 4.5MB limit)
// Falls back to /api/upload for small files if presign fails
// =============================================================================

export async function uploadFile(
  file: File,
  pathPrefix: string,
  onProgress?: (percent: number) => void
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

      // Upload directly to R2 using XMLHttpRequest to track progress
      const xhr = new XMLHttpRequest();
      const uploadPromise = new Promise<{ path: string; url: string }>((resolve, reject) => {
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ path: key, url: publicUrl });
          } else {
            reject(new Error(`Direct upload failed (HTTP ${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error("Direct upload network error"));
        xhr.send(file);
      });

      return await uploadPromise;
    }
  } catch (err) {
    console.warn("[UPLOAD] Presign flow failed, falling back:", err);
  }

  // ─── Fallback: Route through Vercel (for files < 4.5MB) ────────────────
  const formData = new FormData();
  formData.append("file", file);
  formData.append("pathPrefix", pathPrefix);

  const xhr = new XMLHttpRequest();
  const fallbackUploadPromise = new Promise<{ path: string; url: string }>((resolve, reject) => {
    xhr.open("POST", "/api/upload");

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error || `Upload failed (HTTP ${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (HTTP ${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Fallback upload network error"));
    // Set a 60s timeout
    xhr.timeout = 60000;
    xhr.ontimeout = () => reject(new Error("Upload timed out. The file may be too large."));
    
    xhr.send(formData);
  });

  return await fallbackUploadPromise;
}
