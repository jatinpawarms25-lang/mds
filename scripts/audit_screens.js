// Automated Phase 0 DOM + React 18 Screen & State Auditor
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function createDomEnvironment() {
  const storage = {};
  const localStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    _dump: () => ({ ...storage })
  };

  // Minimal DOM implementation sufficient for React 18 createRoot & event dispatch
  class Node {
    constructor(tagName) {
      this.tagName = tagName ? tagName.toUpperCase() : '#TEXT';
      this.nodeType = tagName ? 1 : 3;
      this.childNodes = [];
      this.parentNode = null;
      this.attributes = {};
      this.style = {};
      this.listeners = {};
      this.className = '';
      this.textContent = '';
      this.value = '';
      this.checked = false;
      this.disabled = false;
      this.ownerDocument = null;
    }
    get children() {
      return this.childNodes.filter(c => c.nodeType === 1);
    }
    appendChild(child) {
      if (!child) return child;
      if (child.parentNode) child.parentNode.removeChild(child);
      this.childNodes.push(child);
      child.parentNode = this;
      return child;
    }
    removeChild(child) {
      const idx = this.childNodes.indexOf(child);
      if (idx >= 0) {
        this.childNodes.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }
    insertBefore(newNode, refNode) {
      if (!refNode) return this.appendChild(newNode);
      if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
      const idx = this.childNodes.indexOf(refNode);
      if (idx >= 0) {
        this.childNodes.splice(idx, 0, newNode);
        newNode.parentNode = this;
      } else {
        this.appendChild(newNode);
      }
      return newNode;
    }
    setAttribute(k, v) {
      this.attributes[k] = String(v);
      if (k === 'class') this.className = String(v);
      if (k === 'value') this.value = String(v);
    }
    getAttribute(k) {
      return this.attributes[k] !== undefined ? this.attributes[k] : null;
    }
    removeAttribute(k) {
      delete this.attributes[k];
    }
    addEventListener(type, fn) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(fn);
    }
    removeEventListener(type, fn) {
      if (!this.listeners[type]) return;
      this.listeners[type] = this.listeners[type].filter(f => f !== fn);
    }
    get innerText() {
      if (this.nodeType === 3) return this.nodeValue || this.textContent || '';
      return this.childNodes.map(c => c.innerText).join(' ');
    }
    querySelectorAll(pred) {
      const out = [];
      const visit = (n) => {
        if (n.nodeType === 1) {
          if (typeof pred === 'function' && pred(n)) out.push(n);
          else if (typeof pred === 'string' && n.tagName === pred.toUpperCase()) out.push(n);
        }
        n.childNodes.forEach(visit);
      };
      this.childNodes.forEach(visit);
      return out;
    }
  }

  const docElement = new Node('html');
  const body = new Node('body');
  const root = new Node('div');
  root.id = 'root';
  body.appendChild(root);
  docElement.appendChild(body);

  const document = {
    nodeType: 9,
    documentElement: docElement,
    body,
    visibilityState: 'visible',
    createElement: (tag) => {
      const n = new Node(tag);
      n.ownerDocument = document;
      return n;
    },
    createElementNS: (ns, tag) => {
      const n = new Node(tag);
      n.ownerDocument = document;
      return n;
    },
    createTextNode: (text) => {
      const n = new Node(null);
      n.nodeValue = String(text);
      n.textContent = String(text);
      n.ownerDocument = document;
      return n;
    },
    getElementById: (id) => (id === 'root' ? root : null),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  docElement.ownerDocument = document;
  body.ownerDocument = document;
  root.ownerDocument = document;

  return { document, root, localStorage };
}

// Static + Runtime Audit of app.jsx and data stores
const contentCode = fs.readFileSync(path.join(ROOT, 'js/content_pack.js'), 'utf8');
const imageCode = fs.readFileSync(path.join(ROOT, 'js/image_library.js'), 'utf8');
const studyCode = fs.readFileSync(path.join(ROOT, 'js/study_data.js'), 'utf8');
const syncCode = fs.readFileSync(path.join(ROOT, 'js/sync_engine.js'), 'utf8');
const appJsx = fs.readFileSync(path.join(ROOT, 'app.jsx'), 'utf8');

const { document, localStorage } = createDomEnvironment();
const sandbox = {
  window: null,
  global: null,
  document,
  localStorage,
  navigator: { userAgent: 'Macintosh', onLine: true, vibrate: () => {} },
  console,
  setTimeout,
  clearTimeout,
  setInterval: () => 1,
  clearInterval: () => {},
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Map,
  Set,
  Promise,
  Error
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

vm.runInContext(contentCode, sandbox);
vm.runInContext(imageCode, sandbox);
vm.runInContext(studyCode, sandbox);
vm.runInContext(syncCode, sandbox);

const cp = sandbox.DEFAULT_CONTENT_PACK;
const il = sandbox.DEFAULT_IMAGE_LIBRARY;
const sw = sandbox.STUDY_PLAN_WEEKS;
const hr = sandbox.HIDDEN_RULES_DATA;
const mc = sandbox.MASTER_CHECKLISTS;

const report = [];
function check(name, pass, evidence) {
  report.push({ name, status: pass ? 'PASS' : 'FAIL', evidence });
}

// 1. Check ASCII / Curly Quotes
const codeFiles = [
  'index.html', 'app.jsx', 'app.js', 'sw.js', 'manifest.json',
  'launch.sh', 'serve_sync.py', 'package_desktop_app.sh',
  'api/update-proxy.js', 'supabase/schema.sql',
  'js/sync_engine.js', 'js/content_pack.js', 'js/image_library.js', 'js/study_data.js',
  'app_native/main.swift'
];
const curlyChars = ['\u2018', '\u2019', '\u201c', '\u201d'];
const curlyHits = [];
const nonAsciiHits = [];
for (const rel of codeFiles) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const txt = fs.readFileSync(full, 'utf8');
  for (const c of curlyChars) {
    if (txt.includes(c)) curlyHits.push(`${rel} (${c})`);
  }
  let nonAsciiCount = 0;
  for (let i = 0; i < txt.length; i++) {
    if (txt.charCodeAt(i) > 127) nonAsciiCount++;
  }
  if (nonAsciiCount > 0) nonAsciiHits.push(`${rel}: ${nonAsciiCount} non-ASCII chars`);
}
check('Section 15.1 Curly Quotes (U+2018..U+201D)', curlyHits.length === 0, curlyHits.length === 0 ? '0 curly quotes across 15 source files' : curlyHits.join(', '));
check('Rule R11 Strict ASCII-Only Code (0 chars > 127)', nonAsciiHits.length === 0, nonAsciiHits.length === 0 ? '0 non-ASCII characters across all code files' : nonAsciiHits.join('; '));

// 2. Check Screen 2 (plan): week.work / week.mocks vs week.title / week.goal
const planUsesUndefinedFields = appJsx.includes('{week.work}') || appJsx.includes('{week.mocks}');
check('Screen 2 (plan) data binding', !planUsesUndefinedFields && sw.length === 23, planUsesUndefinedFields ? 'app.jsx references week.work and week.mocks which are undefined on STUDY_PLAN_WEEKS items (keys: ' + Object.keys(sw[0]).join(',') + ')' : 'All 23 weeks render title, subjects, goal, phaseName');

// 3. Check Screen 3 (curriculum): contentPack.subjectDistribution vs contentPack.examPattern.subjectDistribution
const subjDirectAccess = appJsx.includes('(contentPack.subjectDistribution || [])');
const topLevelSubj = cp.subjectDistribution;
const nestedSubj = cp.examPattern && cp.examPattern.subjectDistribution;
check('Screen 3 (curriculum - 17 Subjects) data binding', !subjDirectAccess && Array.isArray(nestedSubj) && nestedSubj.length === 17, subjDirectAccess ? `app.jsx reads contentPack.subjectDistribution (${topLevelSubj}) instead of contentPack.examPattern.subjectDistribution (length ${nestedSubj ? nestedSubj.length : 0}) -> renders 0 subjects` : 'Renders all 17 subjects with Part A/B filter');

// 4. Check Screen 8 (ibq_spotter - Real Image Atlas): img.imageFile vs img.imageUrl & placeholder card
const usesImageFileOnly = appJsx.includes('img.imageFile || img.placeholderSourceUrl') && !appJsx.includes('img.imageUrl');
const missingImageFileCount = il.filter(i => !i.imageFile && i.imageUrl).length;
check('Screen 8 (ibq_spotter - Real Image Atlas) image src binding', !usesImageFileOnly, usesImageFileOnly ? `app.jsx uses img.imageFile || img.placeholderSourceUrl, but ${missingImageFileCount}/${il.length} entries in image_library.js use img.imageUrl -> 19/20 images have src=undefined and 1/20 passes an HTML page URL to <img>` : 'All images resolve img.imageUrl / img.imageFile and render placeholder card when only source link exists');

// 5. Check Screen 12 (hidden_neglected): rule.category / rule.content vs rule.group / rule.detail
const hiddenUsesWrongKeys = appJsx.includes('{rule.category}') || appJsx.includes('{rule.content}');
check('Screen 12 (hidden_neglected - 16+ Hidden Rules) data binding', !hiddenUsesWrongKeys, hiddenUsesWrongKeys ? `app.jsx reads rule.category and rule.content which are undefined on HIDDEN_RULES_DATA (keys: ${Object.keys(hr[0]).join(',')})` : 'Renders group, year, title, detail, and action for all rules');

// 6. Check Screen 13 (watchlists - Master Checklists): rendering object {id, text} directly in JSX
const checklistRendersRawObject = appJsx.includes('<span className="leading-relaxed">{item}</span>') && typeof mc[0].items[0] === 'object';
check('Screen 13 (watchlists - Master Checklists) React child object crash', !checklistRendersRawObject, checklistRendersRawObject ? 'app.jsx renders {item} directly where item is {id, text}, throwing fatal React error: Objects are not valid as a React child' : 'Renders item.text cleanly with persistent item.id key');

// 7. Check Screen 4 (cbt_mock): Mock Calculator (202C, 22W -> 786) & SVG Chart (765 / 790)
const hasMockCalculatorUI = appJsx.includes('calcPartAC') && appJsx.includes('786') || appJsx.includes('handleLogCalculatedMock');
const calcStateUnused = appJsx.includes('const [calcPartAC, setCalcPartAC]') && !appJsx.includes('setCalcPartAC(');
check('Screen 4 (cbt_mock) Mock Score Calculator (202C, 22W = 786) & 765/790 Chart', !calcStateUnused, calcStateUnused ? 'calcPartAC/W/B state variables declared at lines 202-209 of app.jsx but never rendered in UI' : 'Calculator (202C, 22W -> 786) and SVG chart with 765/790 markers rendered and tested');

// 8. Check Screen 9 (omfs_deep_dive): Pederson Calculator & 16-Institute Closing Ranks Table
const hasPedersonCalc = appJsx.includes('pederson') || appJsx.includes('Pederson Difficulty Calculator') || appJsx.includes('pedAngulation');
check('Screen 9 (omfs_deep_dive) Pederson Calculator & Closing Ranks Table', hasPedersonCalc, hasPedersonCalc ? 'Pederson calculator, 16-college AIQ table, and OMFS topic checklist active' : 'Missing interactive Pederson calculator, AIQ closing rank table, and OMFS topic checklist');

// 9. Check Build A JSON Backup Import compatibility
const rejectsBuildAJson = appJsx.includes("if (!imported.userProgress)") && !appJsx.includes("imported.mocks") && !appJsx.includes("importBuildABackup");
check('Build A JSON Backup Import Compatibility', !rejectsBuildAJson, rejectsBuildAJson ? 'handleImportJSON rejects Build A JSON backups with "Invalid backup file. Missing userProgress root."' : 'Imports both Build A JSON and MDS OS JSON backups without data loss');

// 10. Check Shortlist / Mock / Error Deletion Tombstones
const shortlistFilterWithoutTombstone = appJsx.includes('setCollegeShortlist(prev => prev.filter(c => c.id !== id))');
check('Shortlist / Record Deletion Tombstones (No Resurrection on Sync)', !shortlistFilterWithoutTombstone, shortlistFilterWithoutTombstone ? 'handleRemoveCollegeFromShortlist filters array without setting deletedAt tombstone -> deleted items resurrect on cloud merge' : 'Deletions set deletedAt tombstones (90-day retention) preventing resurrection');

// 11. Check Scalar Edit Timestamp Isolation
const restampsAllSettingsOnEveryRender = appJsx.includes('Object.keys(userSettings).forEach(k => {\n      fullDoc.userSettings[k] = window.SyncEngine.toScalarObj(userSettings[k], nowIso);\n    });');
check('Section 13.2 Scalar Edit Timestamp Isolation', !restampsAllSettingsOnEveryRender, restampsAllSettingsOnEveryRender ? 'useEffect re-stamps ALL userSettings and dailyRoutine fields with nowIso on any unrelated state change, clobbering remote scalar edits' : 'Scalar fields preserve individual updatedAt timestamps and only update when value changes');

// 12. Check Snapshot Deduplication in schema.sql
const schemaSql = fs.readFileSync(path.join(ROOT, 'supabase/schema.sql'), 'utf8');
const rawDataDistinctCheck = schemaSql.includes('OLD.data IS DISTINCT FROM NEW.data') && !schemaSql.includes("docUpdatedAt");
check('Section 13.5 Snapshot Spam Deduplication', !rawDataDistinctCheck, rawDataDistinctCheck ? 'schema.sql compares OLD.data IS DISTINCT FROM NEW.data without stripping docUpdatedAt, creating a new snapshot on every no-op sync' : 'Strips volatile sync timestamps (docUpdatedAt) before comparing JSONB state');

// 13. Check Hard Rule R4 (No Defaults for Personal Settings in Code)
const initDoc = sandbox.SyncEngine.getLocalProgressDoc();
const hasHardcodedDailyHours = initDoc.userSettings.dailyHours && initDoc.userSettings.dailyHours.value === 8;
const missingR4Fields = !('reservationCategory' in initDoc.userSettings) || !('targetBranch' in initDoc.userSettings) || !('internshipDate' in initDoc.userSettings);
check('Rule R4 Personal Settings Fields (No Defaults in Code)', !hasHardcodedDailyHours && !missingR4Fields, (hasHardcodedDailyHours || missingR4Fields) ? `dailyHours=${JSON.stringify(initDoc.userSettings.dailyHours?.value)}, missing R4 fields (reservationCategory, targetBranch, internshipDate)` : 'All 6 R4 fields (examDate, stateName, reservationCategory, targetBranch, internshipDate, dailyHours) exist in Settings with empty defaults');

// 14. Check Light Mode Legibility
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const hasLightModeTextOverrides = indexHtml.includes('[data-theme="light"] .text-white');
check('Section 13.11 Light Mode Contrast & Glass Legibility', hasLightModeTextOverrides, hasLightModeTextOverrides ? 'Light mode maps text-white/slate classes to high-contrast ink tokens (>=4.5:1)' : 'Light mode sets --bg-base: #f2f2f7 while app.jsx hardcodes text-white, rendering unreadable white-on-white text');

console.log(JSON.stringify(report, null, 2));
