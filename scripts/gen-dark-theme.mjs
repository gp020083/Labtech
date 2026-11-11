// Generates src/theme-dark.css — property-specific dark-mode overrides for every
// Tailwind colour utility actually used in src/. Runs automatically before `npm run build`.
// Elements inside `.light-island` (paper worksheets / formal reports / QR labels) keep light colours.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(SRC, 'theme-dark.css');

const NEUTRALS = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const HUES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const PROPS = ['bg', 'text', 'border', 'divide', 'ring', 'from', 'via', 'to'];
const VARIANTS = { '': (s) => s, 'hover:': (s) => `${s}:hover`, 'focus:': (s) => `${s}:focus`, 'active:': (s) => `${s}:active`, 'group-hover:': (s) => `.group:hover ${s}` };
const BREAKPOINTS = { '': null, 'sm:': 640, 'md:': 768, 'lg:': 1024 };

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(f) && !f.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

// ---- colour mapping (returns CSS colour or null = leave untouched) ----
const N_BG = { 50: 'var(--d-surface-2)', 100: 'var(--d-surface-3)', 200: 'var(--d-surface-4)', 300: 'var(--d-surface-5)', 400: '#4b5871', 700: '#46566f', 800: '#3b4a63', 900: '#2f3c54', 950: '#27324a' };
const N_TEXT = { 950: 'var(--d-text)', 900: 'var(--d-text)', 800: 'var(--d-text)', 700: 'var(--d-text-2)', 600: 'var(--d-text-3)', 500: '#8a96ab', 400: 'var(--d-text-4)', 300: '#cbd5e1', 200: '#e2e8f0', 100: '#f1f5f9' };
const N_BORDER = { 50: 'var(--d-line)', 100: 'var(--d-line)', 200: 'var(--d-line)', 300: 'var(--d-line-strong)', 400: '#44516b', 700: '#5b6884', 800: '#5b6884', 900: '#6b7894', 950: '#6b7894' };

function mapColor(prop, family, shade) {
  const s = Number(shade);
  if (family === 'white') {
    if (prop === 'bg' || prop === 'from' || prop === 'via' || prop === 'to') return 'var(--d-surface)';
    if (prop === 'border' || prop === 'divide' || prop === 'ring') return 'var(--d-line)';
    return null; // text-white stays white
  }
  if (family === 'paper') return prop === 'bg' ? 'var(--d-surface)' : null;
  if (family === 'ground') return prop === 'bg' ? 'var(--d-bg)' : null;
  if (family === 'line') return prop === 'border' || prop === 'divide' ? 'var(--d-line)' : null;
  if (family === 'ink') return prop === 'text' ? 'var(--d-text)' : null;
  if (family === 'ink-soft') return prop === 'text' ? 'var(--d-text-3)' : null;
  if (family === 'ink-faint') return prop === 'text' ? 'var(--d-text-4)' : null;
  if (family === 'brand-wash') {
    if (prop === 'bg' || prop === 'from' || prop === 'via' || prop === 'to') return 'color-mix(in oklab, var(--color-brand) 20%, var(--d-surface))';
    if (prop === 'border' || prop === 'ring') return 'color-mix(in oklab, var(--color-brand) 35%, transparent)';
    return null;
  }
  if (family === 'brand-deep') return prop === 'text' ? '#9bb8ff' : null;
  if (family === 'brand') return prop === 'text' ? '#7ea4ff' : null;
  if (NEUTRALS.includes(family)) {
    if (prop === 'bg' || prop === 'from' || prop === 'via' || prop === 'to') return N_BG[s] || null;
    if (prop === 'text') return N_TEXT[s] || null;
    return N_BORDER[s] || null;
  }
  if (HUES.includes(family)) {
    const base = `var(--color-${family}-500)`;
    if (prop === 'bg' || prop === 'from' || prop === 'via' || prop === 'to') {
      const pct = { 50: 12, 100: 18, 200: 26, 300: 36 }[s];
      return pct ? `color-mix(in oklab, ${base} ${pct}%, var(--d-surface))` : null;
    }
    if (prop === 'text') {
      if (s >= 800) return `var(--color-${family}-200)`;
      if (s === 700) return `var(--color-${family}-300)`;
      if (s === 600) return `var(--color-${family}-400)`;
      return null;
    }
    const pct = { 50: 22, 100: 26, 200: 30, 300: 42 }[s];
    return pct ? `color-mix(in oklab, ${base} ${pct}%, transparent)` : null;
  }
  return null;
}

function cssProp(prop, color) {
  switch (prop) {
    case 'bg': return `background-color:${color}`;
    case 'text': return `color:${color}`;
    case 'border': return `border-color:${color}`;
    case 'ring': return `--tw-ring-color:${color}`;
    case 'from': return `--tw-gradient-from:${color}`;
    case 'via': return `--tw-gradient-via:${color}`;
    case 'to': return `--tw-gradient-to:${color}`;
    default: return '';
  }
}

const esc = (cls) => cls.replace(/([:/.[\]%#()])/g, '\\$1');

const families = ['white', 'paper', 'ground', 'line', 'ink-soft', 'ink-faint', 'ink', 'brand-wash', 'brand-deep', 'brand', ...NEUTRALS, ...HUES].join('|');
const re = new RegExp(`(?<![\\w-])((?:sm:|md:|lg:)?(?:hover:|focus:|active:|group-hover:)?)(${PROPS.join('|')})-(${families})(?:-(\\d{2,3}))?(?:\\/(\\d{1,3}))?(?![\\w-])`, 'g');

const tokens = new Map();
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(re)) tokens.set(m[0], m);
}

const rules = { '': [] , 640: [], 768: [], 1024: [] };
for (const [token, m] of [...tokens.entries()].sort()) {
  const [, prefix, prop, family, shade, alpha] = m;
  const bp = Object.keys(BREAKPOINTS).find((b) => b && prefix.startsWith(b)) || '';
  const variant = prefix.slice(bp.length);
  if (!(variant in VARIANTS)) continue;
  const tailwindShadeRequired = NEUTRALS.includes(family) || HUES.includes(family);
  if (tailwindShadeRequired && !shade) continue;
  let color = mapColor(prop, family, shade);
  if (!color) continue;
  if (alpha) color = `color-mix(in oklab, ${color} ${alpha}%, transparent)`;
  const base = VARIANTS[variant](`.${esc(token)}`);
  const decl = cssProp(prop, color);
  if (!decl) {
    // divide-*: colour the separators between children
    rules[BREAKPOINTS[bp] || ''].push(`:root.dark ${base} > :not(:last-child):not(.light-island, .light-island *){border-color:${color}}`);
    continue;
  }
  rules[BREAKPOINTS[bp] || ''].push(`:root.dark ${base}:not(.light-island, .light-island *){${decl}}`);
}

let css = `/* AUTO-GENERATED by scripts/gen-dark-theme.mjs — do not edit by hand. */\n@media screen {\n${rules[''].join('\n')}\n`;
for (const bp of [640, 768, 1024]) if (rules[bp].length) css += `@media (min-width:${bp}px){\n${rules[bp].join('\n')}\n}\n`;
css += '}\n';
fs.writeFileSync(OUT, css);
console.log(`[gen-dark-theme] ${Object.values(rules).flat().length} dark-mode rules from ${tokens.size} colour tokens -> src/theme-dark.css`);
