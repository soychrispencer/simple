'use client';

import React, { useMemo } from 'react';
import { Button } from '@simple/ui';
import { verticalThemes } from '@simple/config';
import { IconCar, IconHome, IconShoppingBag } from '@tabler/icons-react';

type BrandKey = 'simpleautos' | 'simplepropiedades' | 'simpletiendas';

type TablerIcon = React.ComponentType<{
  size?: number;
  stroke?: number;
  className?: string;
}>;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isIgnorableTablerResetPath(props: Record<string, unknown> | null | undefined) {
  // Tabler suele incluir: <path stroke="none" d="M0 0h24v24H0z" fill="none" />
  return (
    props != null &&
    props.stroke === 'none' &&
    props.fill === 'none' &&
    props.d === 'M0 0h24v24H0z'
  );
}

function iconToInnerMarkup(Icon: TablerIcon): string {
  // Ejecuta el componente Tabler para obtener el <svg> real y extraer sus children.
  const svgEl = (Icon as any)({ size: 24, stroke: 2 }) as React.ReactElement<{
    children?: React.ReactNode;
  }> | null;
  if (!svgEl) return '';

  const children = React.Children.toArray(svgEl.props?.children).filter(Boolean) as Array<
    React.ReactElement
  >;

  const parts: string[] = [];
  for (const child of children) {
    if (!React.isValidElement(child)) continue;

    const type = child.type as string;
    const props = (child.props || {}) as Record<string, unknown>;

    if (type === 'path' && isIgnorableTablerResetPath(props)) continue;

    if (type === 'path' && typeof props.d === 'string') {
      parts.push(`<path d="${props.d}" />`);
      continue;
    }

    if (type === 'circle') {
      const cx = typeof props.cx === 'number' ? String(props.cx) : String(props.cx ?? '');
      const cy = typeof props.cy === 'number' ? String(props.cy) : String(props.cy ?? '');
      const r = typeof props.r === 'number' ? String(props.r) : String(props.r ?? '');
      if (cx && cy && r) parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" />`);
      continue;
    }

    if (type === 'rect') {
      const x = typeof props.x === 'number' ? String(props.x) : String(props.x ?? '');
      const y = typeof props.y === 'number' ? String(props.y) : String(props.y ?? '');
      const width = typeof props.width === 'number' ? String(props.width) : String(props.width ?? '');
      const height = typeof props.height === 'number' ? String(props.height) : String(props.height ?? '');
      const rx = typeof props.rx === 'number' ? String(props.rx) : String(props.rx ?? '');
      const ry = typeof props.ry === 'number' ? String(props.ry) : String(props.ry ?? '');
      if (x && y && width && height) {
        const rounded = rx || ry ? ` rx=\"${rx || ry}\" ry=\"${ry || rx}\"` : '';
        parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}"${rounded} />`);
      }
      continue;
    }

    if (type === 'line') {
      const x1 = String(props.x1 ?? '');
      const y1 = String(props.y1 ?? '');
      const x2 = String(props.x2 ?? '');
      const y2 = String(props.y2 ?? '');
      if (x1 && y1 && x2 && y2) parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`);
      continue;
    }

    if (type === 'polyline' || type === 'polygon') {
      const points = String(props.points ?? '');
      if (points) parts.push(`<${type} points="${points}" />`);
      continue;
    }
  }

  return parts.join('');
}

function buildBrandMarkSvg(args: {
  size: number;
  primary: string;
  Icon: TablerIcon;
  paddingRatio?: number;
}) {
  const paddingRatio = args.paddingRatio ?? 0.14;
  const pad = Math.round(args.size * paddingRatio);
  const diameter = args.size - pad * 2;
  const radius = diameter / 2;

  const iconSizePx = diameter * 0.52;
  const scale = iconSizePx / 24;
  const tx = args.size / 2 - iconSizePx / 2;
  const ty = args.size / 2 - iconSizePx / 2;

  const inner = iconToInnerMarkup(args.Icon);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${args.size}" height="${args.size}" viewBox="0 0 ${args.size} ${args.size}">` +
    `<rect width="100%" height="100%" fill="transparent" />` +
    `<circle cx="${args.size / 2}" cy="${args.size / 2}" r="${radius}" fill="${args.primary}" />` +
    `<g transform="translate(${tx} ${ty}) scale(${scale})" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    inner +
    `</g>` +
    `</svg>`
  );
}

async function downloadBrandPng(args: {
  brand: BrandKey;
  size: 1024 | 2048;
  primary: string;
  Icon: TablerIcon;
}) {
  const svgString = buildBrandMarkSvg({
    size: args.size,
    primary: args.primary,
    Icon: args.Icon,
  });

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    // Evita taint del canvas
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo rasterizar el SVG.'));
      img.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = args.size;
    canvas.height = args.size;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear el canvas.');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar PNG.'))), 'image/png');
    });

    downloadBlob(pngBlob, `${args.brand}-mark-${args.size}.png`);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function downloadBrandSvg(args: { brand: BrandKey; primary: string; Icon: TablerIcon }) {
  const svgString = buildBrandMarkSvg({ size: 1024, primary: args.primary, Icon: args.Icon });
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  downloadBlob(blob, `${args.brand}-mark.svg`);
}

export default function BrandExportsPage() {
  const brandBgClassByKey: Record<BrandKey, string> = {
    simpleautos: 'bg-[#FF3600]',
    simplepropiedades: 'bg-[#3232FF]',
    simpletiendas: 'bg-[#0F766E]',
  };

  const brands = useMemo(
    () =>
      [
        {
          key: 'simpleautos' as const,
          label: 'SimpleAutos',
          primary: verticalThemes.autos.primary,
          Icon: IconCar,
        },
        {
          key: 'simplepropiedades' as const,
          label: 'SimplePropiedades',
          primary: verticalThemes.properties.primary,
          Icon: IconHome,
        },
        {
          key: 'simpletiendas' as const,
          label: 'SimpleTiendas',
          primary: verticalThemes.stores.primary,
          Icon: IconShoppingBag,
        },
      ],
    []
  );

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-lighttext dark:text-darktext">Exports de logo (redes sociales)</h1>
          <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-1">
            Descarga el “círculo + ícono” en PNG (1024/2048) o SVG.
          </p>
        </div>

        <div className="space-y-4">
          {brands.map((b) => (
            <section key={b.key} className="card-surface shadow-card p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`flex items-center justify-center w-24 h-24 rounded-full shadow-card ring-2 ring-[color:var(--overlay-highlight-80)] ring-offset-2 ring-offset-transparent ${brandBgClassByKey[b.key]}`}
                  aria-hidden
                >
                  <b.Icon size={52} stroke={1.8} className="text-black" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-lighttext dark:text-darktext truncate">{b.label}</div>
                  <div className="text-xs text-lighttext/70 dark:text-darktext/70 truncate">Color: {b.primary}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:ml-auto">
                <Button
                  type="button"
                  variant="primary"
                  shape="rounded"
                  size="sm"
                  onClick={() => downloadBrandPng({ brand: b.key, size: 1024, primary: b.primary, Icon: b.Icon })}
                >
                  PNG 1024
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  shape="rounded"
                  size="sm"
                  onClick={() => downloadBrandPng({ brand: b.key, size: 2048, primary: b.primary, Icon: b.Icon })}
                >
                  PNG 2048
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  shape="rounded"
                  size="sm"
                  onClick={() => downloadBrandSvg({ brand: b.key, primary: b.primary, Icon: b.Icon })}
                >
                  SVG
                </Button>
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-lighttext/60 dark:text-darktext/60">
          Tip: Para Instagram/Facebook, sube el PNG 2048 (mejor nitidez). Si la plataforma recorta el borde, el padding ya viene considerado.
        </p>
      </div>
    </main>
  );
}
