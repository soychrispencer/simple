import fs from 'node:fs';

const path = 'apps/simplepropiedades/src/app/panel/publicar/page.tsx';
let s = fs.readFileSync(path, 'utf8');
const before = (s.match(/style=\{/g) || []).length;

s = s.replace(
    'style={{ color: \'#b42318\' }}',
    'className="prop-field-error"'
);
s = s.replace(
    /className="block text-sm font-medium mb-1" style=\{\{ color: 'var\(--fg-secondary\)' \}\}/g,
    'className="block text-sm font-medium mb-1 prop-field-label"'
);
s = s.replace(
    /style=\{\{ color: 'var\(--color-error, #ef4444\)', textDecoration: 'none' \}\}/g,
    'className="text-(--color-error) no-underline"'
);
s = s.replace(
    /className="text-xs mt-1" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="text-xs mt-1 prop-field-hint"'
);
s = s.replace(
    /className="border-b pb-3" style=\{\{ borderColor: 'var\(--border\)' \}\}/g,
    'className="border-b pb-3 prop-section-border"'
);
s = s.replace(
    /className="block text-xs mt-0\.5" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="block text-xs mt-0.5 prop-field-hint"'
);
s = s.replace(
    /className="text-xs mt-0\.5" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="text-xs mt-0.5 prop-field-hint"'
);
s = s.replace(
    /className="rounded-lg border px-3 py-2 flex items-center justify-between gap-2 text-sm" style=\{\{ borderColor: 'var\(--border\)' \}\}/g,
    'className="rounded-lg border px-3 py-2 flex items-center justify-between gap-2 text-sm prop-section-border"'
);
s = s.replace(
    /className="text-xs uppercase tracking-\[0\.08em\]" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="text-xs uppercase tracking-[0.08em] prop-field-hint"'
);
s = s.replace(
    /className="h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0" style=\{\{ background: 'var\(--bg-muted\)', color: 'var\(--fg\)' \}\}/g,
    'className="h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 prop-publish-icon"'
);
s = s.replace(
    /className="h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0" style=\{\{ background: 'var\(--bg-muted\)', color: 'var\(--fg\)' \}\}/g,
    'className="h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0 prop-publish-icon"'
);
s = s.replace(
    /className="text-sm font-medium truncate" style=\{\{ color: 'var\(--fg\)' \}\}/g,
    'className="text-sm font-medium truncate prop-publish-fg"'
);
s = s.replace(
    /className="rounded-2xl border p-3" style=\{\{ borderColor: 'var\(--border\)', background: 'var\(--surface\)' \}\}/g,
    'className="rounded-2xl border p-3 prop-publish-card"'
);
s = s.replace(
    /className="absolute left-3 top-1\/2 -translate-y-1\/2" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="absolute left-3 top-1/2 -translate-y-1/2 prop-field-hint"'
);

fs.writeFileSync(path, s);
const after = (s.match(/style=\{/g) || []).length;
console.log('publicar', before, '->', after);
