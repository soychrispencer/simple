import fs from 'node:fs';

const path = 'apps/simpleautos/src/app/globals.css';
let content = fs.readFileSync(path, 'utf8');

if (content.includes('.autos-search-hero')) {
  console.log('already patched');
  process.exit(0);
}

const block = `
.autos-search-hero { border-color: var(--border); background: var(--surface); box-shadow: 0 16px 46px rgba(0,0,0,0.12); }
.autos-search-tabs { background: var(--bg-subtle); scrollbar-width: none; }
.autos-search-tab { border-color: transparent; background: transparent; color: var(--fg-secondary); }
.autos-search-tab--active { background: var(--button-primary-bg); color: var(--button-primary-color); border-color: var(--button-primary-border); }
.autos-search-input { padding-left: 2.75rem; padding-right: 4.5rem; }
.autos-search-input--actions { padding-right: 7rem; }
.autos-icon-btn { background: var(--bg-muted); color: var(--fg-secondary); }
.autos-icon-btn--primary { background: var(--button-primary-bg); color: var(--button-primary-color); }
.autos-filter-chip { background: var(--bg-subtle); border-color: var(--border); color: var(--fg-secondary); }
.autos-text-muted { color: var(--fg-muted); }
.autos-text-secondary { color: var(--fg-secondary); }
.autos-text-fg { color: var(--fg); }
.autos-subtle-box { border-color: var(--border); background: var(--bg-subtle); }
.autos-border-card { border-color: var(--border); }
.autos-icon-tile { background: var(--bg-muted); color: var(--fg-secondary); }
.autos-dest-card { border-color: var(--border-strong); }
.autos-dest-card--active { border-color: var(--fg); }
.autos-dest-dot { background: var(--fg); }
.autos-dest-badge { border-color: var(--border); color: var(--fg-secondary); }
.autos-map-border { border-color: var(--border); }
.autos-map-popup-price, .autos-map-popup-cta { background: var(--accent); }
.crm-text-fg { color: var(--fg); }
.crm-text-secondary { color: var(--fg-secondary); }
.crm-text-muted { color: var(--fg-muted); }
.crm-subtle-panel { border-color: var(--border); background: var(--bg-subtle); color: var(--fg-muted); }
.crm-subtle-card { border-color: var(--border); background: var(--bg-subtle); }
.crm-surface-card { border-color: var(--border); background: var(--surface); }
.crm-list-head { background: var(--bg-muted); color: var(--fg-muted); }
.crm-border-b { border-color: var(--border); }
.crm-empty-dashed { border-color: var(--border); color: var(--fg-muted); }
.crm-detail-box { border-color: var(--border); background: var(--bg); color: var(--fg-secondary); }
.crm-close-btn { border-color: var(--border); color: var(--fg-secondary); background: var(--surface); }
.crm-secondary-btn { border-color: var(--border); color: var(--fg-secondary); background: var(--surface); }
.crm-error-banner { border-color: var(--color-error-subtle); background: var(--color-error-subtle); color: var(--color-error); }
.crm-tag { background: var(--bg-muted); color: var(--fg-secondary); }
.crm-source-pill { background: var(--bg-muted); color: var(--fg-muted); }
.crm-label-muted { color: var(--fg-muted); }
.crm-activity-card { border-color: var(--border); background: var(--bg); }
.crm-accordion { border-color: var(--border); background: var(--bg); }
.crm-accordion-toggle { background: var(--bg-subtle); color: var(--fg-muted); }
.crm-info-card { border-color: var(--border); background: var(--surface); }
.crm-info-icon { background: var(--bg-muted); color: var(--fg-secondary); }
.crm-view-toggle { border-color: var(--bg-muted); background: transparent; }
.crm-quick-action { border-color: var(--border); background: var(--surface); color: var(--fg-secondary); }
.crm-quick-action--muted { color: var(--fg-muted); }
.crm-danger-outline { border-color: var(--border); color: var(--color-error); }
`;

fs.appendFileSync(path, block);
console.log('appended utilities');
