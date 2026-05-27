// =============================================================================
// EOD FLOW — Client Storage Utility
// Safely routes uploads through server-side /api/upload to protect R2 credentials
// =============================================================================

export async function uploadFile(
  file: File,
  pathPrefix: string
): Promise<{ path: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("pathPrefix", pathPrefix);

  // Use AbortController for timeout (60s for large files)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      // If redirected to login page (HTML response), it's an auth issue
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
