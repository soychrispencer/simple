export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function dataURLToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function canvasToBlob(canvas: HTMLCanvasElement, type = "image/webp", quality = 0.92): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob as Blob), type, quality);
  });
}

export async function fileToWebp(file: File, maxW = 2000, maxH = 2000, quality = 0.9): Promise<File> {
  const dataUrl = await fileToDataURL(file);
  const img = await dataURLToImage(dataUrl);
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await canvasToBlob(canvas, "image/webp", quality);
  return new File([blob], replaceExt(file.name, ".webp"), { type: "image/webp" });
}

export function replaceExt(name: string, newExt: string): string {
  const i = name.lastIndexOf(".");
  if (i === -1) return name + newExt;
  return name.slice(0, i) + newExt;
}

export function dataURLToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(",");
  const isBase64 = /;base64/.test(meta);
  const mime = (meta.match(/data:(.*?);/) || [])[1] || "application/octet-stream";
  const bytes = isBase64 ? atob(data) : decodeURIComponent(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function dataURLToFile(dataUrl: string, filename = "image.webp"): File {
  const blob = dataURLToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type || "image/webp" });
}
