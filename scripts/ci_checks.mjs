import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const checkAll = args.size === 0;

const SCAN_DIRS = ['src', 'supabase', 'scripts', 'api'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.html', '.css', '.sql', '.json']);

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const files = [];
for (const d of SCAN_DIRS) {
  files.push(...walk(path.join(ROOT, d)));
}
for (const top of ['index.html', 'package.json', 'tsconfig.json', 'vite.config.ts']) {
  const p = path.join(ROOT, top);
  if (fs.existsSync(p)) files.push(p);
}

let failed = false;

if (checkAll || args.has('--ascii')) {
  const curly = ['\u2018', '\u2019', '\u201c', '\u201d'];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const ch of curly) {
      if (content.includes(ch)) {
        console.error(`[CI FAIL] Curly quote found in ${path.relative(ROOT, file)}`);
        failed = true;
      }
    }
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) > 127) {
        console.error(`[CI FAIL] Non-ASCII character (code ${content.charCodeAt(i)}) in ${path.relative(ROOT, file)}`);
        failed = true;
        break;
      }
    }
  }
  if (!failed) console.log('[CI PASS] Strict 7-bit ASCII & zero curly quotes verified.');
}

if (checkAll || args.has('--secrets')) {
  const clientOnlyPatterns = [
    /service_role/i
  ];
  const secretPatterns = [
    /sb_secret_[A-Za-z0-9_-]+/,
    /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?[A-Za-z0-9._-]{20,}/,
    /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9._-]{20,}/
  ];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (rel === 'scripts/ci_checks.mjs') continue;
    const content = fs.readFileSync(file, 'utf8');
    if (rel.startsWith('src/') || rel.startsWith('public/') || rel === 'index.html') {
      for (const rx of clientOnlyPatterns) {
        if (rx.test(content)) {
          console.error(`[CI FAIL] Forbidden server-only reference matching ${rx} in client file ${rel}`);
          failed = true;
        }
      }
    }
    for (const rx of secretPatterns) {
      if (rx.test(content)) {
        console.error(`[CI FAIL] Potential committed secret matching ${rx} in ${rel}`);
        failed = true;
      }
    }
  }
  if (!failed) console.log('[CI PASS] Zero committed secrets verified.');
}

if (checkAll || args.has('--defaults')) {
  const badDefaultPatterns = [
    /2027-04-18/,
    /defaultState\s*[:=]\s*['"]Maharashtra['"]/i,
    /examDate\s*:\s*['"]2027-\d{2}-\d{2}['"]/
  ];
  for (const file of walk(path.join(ROOT, 'src'))) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf8');
    for (const rx of badDefaultPatterns) {
      if (rx.test(content)) {
        console.error(`[CI FAIL] Forbidden hardcoded personal default matching ${rx} in ${rel}`);
        failed = true;
      }
    }
  }
  if (!failed) console.log('[CI PASS] Zero hardcoded personal dates/states verified.');
}

if (failed) process.exit(1);
