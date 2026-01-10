export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataURLToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(',');
  const isBase64 = /;base64/.test(meta);
  const mime = (meta.match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
  const bytes = isBase64 ? atob(data) : decodeURIComponent(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function dataURLToFile(dataUrl: string, filename = 'image.webp'): File {
  const blob = dataURLToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type || 'image/webp' });
}
