import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables for storage.");
}

export const supabaseStorage = createClient(supabaseUrl, supabaseKey);

const DEFAULT_BUCKET = "eod-flow-files";

export async function uploadFile(
  file: File,
  pathPrefix: string,
  bucket: string = DEFAULT_BUCKET
): Promise<{ path: string; url: string }> {
  const filePath = `${pathPrefix}/${Date.now()}-${file.name}`;

  const { data, error } = await supabaseStorage.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabaseStorage.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: publicUrlData.publicUrl,
  };
}

export function getFileUrl(path: string, bucket: string = DEFAULT_BUCKET): string {
  const { data } = supabaseStorage.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteStorageFile(
  filePath: string,
  bucket: string = DEFAULT_BUCKET
): Promise<void> {
  const { error } = await supabaseStorage.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.warn(`Storage delete warning: ${error.message}`);
  }
}

