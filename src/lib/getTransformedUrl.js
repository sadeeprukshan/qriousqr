/**
 * Helper to dynamically resize and compress Supabase public storage images on-the-fly.
 * 
 * Public URL format:
 * https://{project-id}.supabase.co/storage/v1/object/public/{bucket-name}/{file-path}
 * 
 * Image Render / CDN transform URL format:
 * https://{project-id}.supabase.co/storage/v1/render/image/public/{bucket-name}/{file-path}?width={width}&height={height}&resize=cover&quality=75
 */
export function getTransformedUrl(url, width, height) {
  if (!url) return '';
  
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const params = [];
    if (width) params.push(`width=${width}`);
    if (height) params.push(`height=${height}`);
    params.push('resize=cover');
    params.push('quality=75');
    return `${renderUrl}?${params.join('&')}`;
  }
  
  return url;
}
