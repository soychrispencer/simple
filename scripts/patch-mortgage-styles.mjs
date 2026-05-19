import fs from 'node:fs';

const path = 'apps/simplepropiedades/src/components/MortgageAdvisor.tsx';
let s = fs.readFileSync(path, 'utf8');
const before = (s.match(/style=\{/g) || []).length;

s = s.replace(
    'className="min-h-screen" style={{ background: \'var(--bg-secondary)\' }}',
    'className="min-h-screen mortgage-page"'
);
s = s.replace(
    /className="w-10 h-10 rounded-xl flex items-center justify-center" style=\{\{ background: 'var\(--accent\)' \}\}/g,
    'className="w-10 h-10 rounded-xl flex items-center justify-center mortgage-accent-icon"'
);
s = s.replace(
    /className="font-semibold text-sm" style=\{\{ color: 'var\(--fg\)' \}\}/g,
    'className="font-semibold text-sm mortgage-fg"'
);
s = s.replace(
    /className="text-\[10px\]" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="text-[10px] mortgage-muted"'
);
s = s.replace(
    /className="flex items-center gap-3 text-\[11px\]" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="flex items-center gap-3 text-[11px] mortgage-muted"'
);
s = s.replace(
    /className="mb-6 p-4 rounded-2xl border" style=\{\{\s*background: 'var\(--bg\)',\s*borderColor: 'var\(--border\)',\s*\}\}/g,
    'className="mb-6 p-4 rounded-2xl border mortgage-card"'
);
s = s.replace(
    /className="mb-6 p-4 rounded-2xl border flex items-center gap-4" style=\{\{\s*background: 'var\(--bg\)',\s*borderColor: 'var\(--border\)',\s*\}\}/g,
    'className="mb-6 p-4 rounded-2xl border flex items-center gap-4 mortgage-card"'
);
s = s.replace(
    /className="p-4 rounded-2xl border" style=\{\{ background: 'var\(--bg\)', borderColor: 'var\(--border\)' \}\}/g,
    'className="p-4 rounded-2xl border mortgage-card"'
);
s = s.replace(
    /className="text-sm font-semibold flex items-center gap-2 mb-3" style=\{\{ color: 'var\(--fg\)' \}\}/g,
    'className="text-sm font-semibold flex items-center gap-2 mb-3 mortgage-fg"'
);
s = s.replace(
    /className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style=\{\{ background: 'var\(--accent\)' \}\}/g,
    'className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mortgage-step-badge"'
);
s = s.replace(
    /className="text-xs font-medium mb-1 block" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="text-xs font-medium mb-1 block mortgage-muted"'
);
s = s.replace(
    /style=\{\{ background: 'var\(--bg-secondary\)', borderColor: 'var\(--border\)', color: 'var\(--fg\)' \}\}/g,
    'className="mortgage-input border"'
);
s = s.replace(
    /className="font-semibold text-sm" style=\{\{ color: 'var\(--fg\)' \}\}/g,
    'className="font-semibold text-sm mortgage-fg"'
);
s = s.replace(
    /className="text-xs" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="text-xs mortgage-muted"'
);
s = s.replace(
    /className="text-xs uppercase tracking-wide font-semibold" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="text-xs uppercase tracking-wide font-semibold mortgage-muted"'
);
s = s.replace(
    /className="text-lg font-bold" style=\{\{ color: 'var\(--fg\)' \}\}/g,
    'className="text-lg font-bold mortgage-fg"'
);
s = s.replace(
    /className="text-xs mt-0\.5" style=\{\{ color: 'var\(--fg-muted\)' \}\}/g,
    'className="text-xs mt-0.5 mortgage-muted"'
);

fs.writeFileSync(path, s);
const after = (s.match(/style=\{/g) || []).length;
console.log('MortgageAdvisor', before, '->', after, `(${Math.round((1 - after / before) * 100)}% reduction)`);
