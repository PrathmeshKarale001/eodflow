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

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Upload failed");
  }

  return res.json();
}
