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

export async function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/webp', quality = 0.92): Promise<Blob> {
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
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await canvasToBlob(canvas, 'image/webp', quality);
  return new File([blob], replaceExt(file.name, '.webp'), { type: 'image/webp' });
}

export function replaceExt(name: string, newExt: string): string {
  const i = name.lastIndexOf('.');
  if (i === -1) return name + newExt;
  return name.slice(0, i) + newExt;
}

export function dataURLToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(',');
  const isBase64 = /;base64/.test(meta);
  const mime = (meta.match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
  const bytes = isBase64 ? atob(data) : decodeURIComponent(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function dataURLToFile(dataUrl: string, filename = 'image.webp'): File {
  const blob = dataURLToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type || 'image/webp' });
}

export async function getCroppedWebp(
  imageDataUrl: string,
  crop: { x: number; y: number; width: number; height: number },
  quality = 0.9,
  type: 'avatar' | 'portada' = 'avatar',
  rotation: number = 0
): Promise<Blob> {
  const img = await dataURLToImage(imageDataUrl);
  const canvasFill = getCanvasFillFromTokens();
  let outW = crop.width;
  let outH = crop.height;
  if (type === 'avatar') {
    outW = 1080;
    outH = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    // Usar los valores originales (flotantes) de crop tal como los entrega react-easy-crop
    const x = Number(crop.x);
    const y = Number(crop.y);
    const w = Number(crop.width);
    const h = Number(crop.height);
    // Validar que los valores sean válidos
    if ([x, y, w, h].some((v) => isNaN(v) || v < 0)) {
      ctx.fillStyle = canvasFill;
      ctx.fillRect(0, 0, outW, outH);
      return await canvasToBlob(canvas, 'image/webp', quality);
    }
    // Rellenar el canvas con gris claro
    ctx.fillStyle = canvasFill;
    ctx.fillRect(0, 0, outW, outH);
    // Rotar el canvas si es necesario
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-outW / 2, -outH / 2);
    }
    // Calcular la parte visible de la imagen dentro del crop
    const sx = Math.max(x, 0);
    const sy = Math.max(y, 0);
    const ex = Math.min(x + w, img.width);
    const ey = Math.min(y + h, img.height);
    const sw = Math.max(ex - sx, 0);
    const sh = Math.max(ey - sy, 0);
    // Calcular a dónde va en el canvas
    const dx = ((sx - x) * outW) / w;
    const dy = ((sy - y) * outH) / h;
    const dw = (sw * outW) / w;
    const dh = (sh * outH) / h;
    // Dibujar solo la parte visible de la imagen, escalada para llenar el canvas
    if (sw > 0 && sh > 0 && dw > 0 && dh > 0) {
      ctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        dx,
        dy,
        dw,
        dh
      );
    }
    if (rotation !== 0) ctx.restore();
    return await canvasToBlob(canvas, 'image/webp', quality);
  } else if (type === 'portada') {
    outW = 3840;
    outH = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    // Rotar el canvas si es necesario
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-outW / 2, -outH / 2);
    }
    ctx.drawImage(
      img,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      outW,
      outH
    );
    if (rotation !== 0) ctx.restore();
    return await canvasToBlob(canvas, 'image/webp', quality);
  } else {
    // Por defecto, recorte libre
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    ctx.drawImage(
      img,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      outW,
      outH
    );
    return await canvasToBlob(canvas, 'image/webp', quality);
  }
}

function getCanvasFillFromTokens(): string {
  if (typeof window === 'undefined') return 'transparent';
  const root = window.getComputedStyle(document.documentElement);
  const fill =
    root.getPropertyValue('--field-bg').trim() ||
    root.getPropertyValue('--surface-3').trim() ||
    root.getPropertyValue('--color-bg-alt').trim() ||
    root.getPropertyValue('--color-bg').trim();
  return fill || 'transparent';
}


