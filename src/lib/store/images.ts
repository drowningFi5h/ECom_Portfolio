import { createBrowserClient } from './client';

const BUCKET = 'product-images';

export async function uploadProductImage(file: File): Promise<string> {
  const supabase = createBrowserClient();
  const ext  = file.name.split('.').pop() ?? 'jpg';
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProductImage(url: string): Promise<void> {
  const supabase = createBrowserClient();
  // Extract the path after the bucket name in the URL
  const marker = `/${BUCKET}/`;
  const idx    = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}
