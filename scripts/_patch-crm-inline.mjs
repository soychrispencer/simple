import fs from 'node:fs';

const files = [
  'apps/simpleautos/src/app/panel/crm/page.tsx',
  'apps/simplepropiedades/src/app/panel/crm/page.tsx',
];

function patch(content) {
  const pairs = [
    [` style={{ color: 'var(--fg-muted)' }}`, ''],
    [` style={{ color: 'var(--fg)' }}`, ''],
    [` style={{ color: 'var(--fg-secondary)' }}`, ''],
    [` style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}`, ''],
    [` style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}`, ''],
    [` style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}`, ''],
    [` style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--surface)' }}`, ''],
    [` style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--surface)' }}`, ''],
    [` style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}`, ''],
    [` style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}`, ''],
    [` style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}`, ''],
    [` style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-secondary)' }}`, ''],
    [` style={{ borderColor: 'var(--color-error-subtle)', background: 'var(--color-error-subtle)', color: 'var(--color-error)' }}`, ''],
    [` style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}`, ''],
    [` style={{ borderColor: 'var(--border)' }}`, ''],
    [` style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}`, ''],
    [` style={{ borderColor: 'var(--bg-muted)', background: 'transparent' }}`, ''],
  ];

  for (const [from] of pairs) {
    content = content.split(from).join('');
  }

  content = content.replace(
    /className="([^"]*)"/g,
    (match, classes, offset, full) => {
      const after = full.slice(offset + match.length, offset + match.length + 80);
      if (!after.includes('crm-') && !after.includes('autos-')) return match;
      return match;
    },
  );

  const classAdds = [
    [/(<p className="text-xs font-medium uppercase tracking-\[0\.18em\]")/g, '$1 crm-text-muted'],
    [/(<h2 className="text-2xl font-semibold")/g, '$1 crm-text-fg'],
    [/(<p className="mt-2 text-sm")/g, '$1 crm-text-secondary'],
    [/(<motion\.div className="mt-5 rounded-card border px-5 py-6 text-sm")/g, '$1 crm-subtle-panel'],
    [/(<motion\.motion className="mt-5 rounded-card border px-5 py-6 text-sm")/g, '$1 crm-subtle-panel'],
    [/(<div className="mt-5 rounded-card border px-5 py-6 text-sm")/g, '$1 crm-subtle-panel'],
    [/(<motion\.div className="rounded-card border px-3 py-3")/g, '$1 crm-subtle-card'],
    [/(<div className="rounded-card border px-3 py-3")/g, '$1 crm-subtle-card'],
    [/(<motion\.div className="px-4 py-6 text-sm")/g, '$1 crm-text-muted'],
    [/(<motion\.div className="px-4 py-6 text-sm")/g, '$1 crm-text-muted'],
    [/(<div className="px-4 py-6 text-sm")/g, '$1 crm-text-muted'],
    [
      /(<motion\.div className="grid grid-cols-\[1fr_auto\] gap-3 px-4 py-2\.5 text-xs font-medium uppercase tracking-wider")/g,
      '$1 crm-list-head',
    ],
    [
      /(<div className="grid grid-cols-\[1fr_auto\] gap-3 px-4 py-2\.5 text-xs font-medium uppercase tracking-wider")/g,
      '$1 crm-list-head',
    ],
    [/(<p className="truncate text-sm font-medium")/g, '$1 crm-text-fg'],
    [/(<p className="mt-1 truncate text-xs")/g, '$1 crm-text-secondary'],
    [/(<div className="mt-2 flex flex-wrap items-center gap-2 text-xs")/g, '$1 crm-text-muted'],
    [/(<div className="border-b px-3 py-3")/g, '$1 crm-border-b'],
    [/(<p className="text-sm font-semibold")/g, '$1 crm-text-fg'],
    [/(<p className="text-\[11px\]")/g, '$1 crm-text-muted'],
    [
      /(<div className="rounded-\[14px\] border border-dashed px-3 py-4 text-center text-xs")/g,
      '$1 crm-empty-dashed',
    ],
    [/(<p className="mt-2 text-\[11px\]")/g, '$1 crm-text-muted'],
    [/(<p className="text-sm font-medium")/g, '$1 crm-text-fg'],
    [/(<p className="text-xs")/g, '$1 crm-text-muted'],
    [
      /(<button[^>]*className="rounded-full border px-3 py-1\.5 text-xs font-medium")/g,
      '$1 crm-close-btn',
    ],
    [/(<div className="px-1 py-6 text-sm")/g, '$1 crm-text-muted'],
    [/(<motion\.motion className="rounded-card border p-4")/g, '$1 crm-subtle-card'],
    [/(<div className="rounded-card border p-4")/g, '$1 crm-subtle-card'],
    [/(<p className="text-lg font-semibold")/g, '$1 crm-text-fg'],
    [/(<p className="mt-1 text-sm")/g, '$1 crm-text-muted'],
    [/(<motion\.form className="mt-5 rounded-card border p-4")/g, '$1 crm-subtle-card'],
    [/(<form className="mt-5 rounded-card border p-4")/g, '$1 crm-subtle-card'],
    [
      /(<div className="mt-4 rounded-xl border px-3 py-2 text-sm")/g,
      '$1 crm-error-banner',
    ],
    [
      /(<div key=\{column\.id\} className="rounded-card border p-4")/g,
      '$1 crm-surface-card',
    ],
    [/(<div className="mt-2 flex items-center gap-2 text-xs")/g, '$1 crm-text-muted'],
    [
      /(<span className="inline-flex items-center gap-1\.5 rounded-full px-2 py-0\.5 text-\[11px\]")/g,
      '$1 crm-source-pill',
    ],
    [
      /(<div className="inline-flex items-center gap-1 rounded-full border p-1")/g,
      '$1 crm-view-toggle',
    ],
    [/(<motion\.div className="rounded-card border px-3\.5 py-3")/g, '$1 crm-info-card'],
    [/(<motion\.div className="rounded-card border px-3\.5 py-3")/g, '$1 crm-info-card'],
    [/(<motion\.div className="rounded-card border px-3\.5 py-3")/g, '$1 crm-info-card'],
    [/(<div className="rounded-card border px-3\.5 py-3")/g, '$1 crm-info-card'],
    [
      /(<span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full")/g,
      '$1 crm-info-icon',
    ],
    [
      /(<p className="text-\[11px\] font-medium uppercase tracking-\[0\.16em\]")/g,
      '$1 crm-label-muted',
    ],
    [/(<details className="group rounded-card border")/g, '$1 crm-accordion'],
    [
      /(<span className="inline-flex h-8 w-8 items-center justify-center rounded-full transition group-open:rotate-180")/g,
      '$1 crm-accordion-toggle',
    ],
    [/(<div className="border-t px-4 py-4")/g, '$1 crm-border-b'],
    [/(<motion\.motion className="rounded-xl border px-3 py-2\.5")/g, '$1 crm-activity-card'],
    [/(<div className="rounded-xl border px-3 py-2\.5")/g, '$1 crm-activity-card'],
    [/(<p className="mt-1 text-sm")/g, '$1 crm-text-secondary'],
    [/(<p className="mt-1 text-xs")/g, '$1 crm-text-muted'],
    [
      /(<span className="text-\[11px\] font-medium uppercase tracking-\[0\.14em\]")/g,
      '$1 crm-label-muted',
    ],
    [
      /(<p className="text-\[11px\] font-medium uppercase tracking-\[0\.16em\]")/g,
      '$1 crm-label-muted',
    ],
    [/(<span className="text-xs font-medium")/g, '$1 crm-label-muted'],
    [
      /(<div className="mt-3 rounded-xl border px-3 py-2 text-sm")/g,
      '$1 crm-detail-box',
    ],
    [/(<span key=\{tag\} className="rounded-full px-2\.5 py-1 text-xs")/g, '$1 crm-tag'],
    [
      /(<Link href=\{`\/panel\/mensajes\?thread=\$\{encodeURIComponent\(detail\.thread\.id\)\}`\} className="inline-flex items-center gap-2 text-sm font-medium")/g,
      '$1 crm-text-secondary',
    ],
    [/(<p className="text-\[11px\] font-medium uppercase tracking-\[0\.16em\]")/g, '$1 crm-label-muted'],
  ];

  for (const [pattern, replacement] of classAdds) {
    content = content.replace(pattern, replacement);
  }

  content = content.replace(
    /className="inline-flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-medium transition"/g,
    'className="inline-flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-medium transition crm-secondary-btn"',
  );

  content = content.replace(
    /className="inline-flex h-10 items-center rounded-full border px-3 text-sm font-medium"/g,
    'className="inline-flex h-10 items-center rounded-full border px-3 text-sm font-medium crm-secondary-btn"',
  );

  content = content.replace(
    /className="inline-flex h-10 items-center rounded-full border px-3 text-sm font-medium crm-secondary-btn"/g,
    (match, offset, str) => {
      const slice = str.slice(offset, offset + 400);
      if (slice.includes('color-error')) {
        return match.replace('crm-secondary-btn', 'crm-danger-outline');
      }
      return match;
    },
  );

  return content;
}

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const countBefore = (before.match(/style=\{\{/g) || []).length;
  const after = patch(before);
  const countAfter = (after.match(/style=\{\{/g) || []).length;
  fs.writeFileSync(file, after);
  console.log(file, countBefore, '->', countAfter);
}
