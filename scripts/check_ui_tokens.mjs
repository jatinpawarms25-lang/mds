import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.join(process.cwd(), 'src', 'index.css');
const css = fs.readFileSync(cssPath, 'utf8');

const requiredTokens = [
  '--bg-base',
  '--card-bg',
  '--card-border',
  '--card-highlight',
  '--mem-again',
  '--mem-hard',
  '--mem-good',
  '--mem-easy',
  '[data-theme="light"]',
  'prefers-reduced-transparency: reduce',
  'prefers-reduced-motion: reduce',
  'tabular-nums'
];

for (const token of requiredTokens) {
  if (!css.includes(token)) {
    console.error(`[UI TOKEN FAIL] Missing required Apple glass/accessibility token: ${token}`);
    process.exit(1);
  }
}

console.log(`[UI TOKEN PASS] Verified all ${requiredTokens.length} Apple glass, contrast, and 60fps/a11y tokens.`);
