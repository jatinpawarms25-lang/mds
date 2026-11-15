# Phase 0 Verification Report (`docs/VERIFICATION.md`)

- **Repository Path Verified:** `/Users/jatinpawar/Downloads/MDS_Desktop_OS`
- **Baseline Backup Created:** `MDS_Desktop_OS_pre_phase0_backup.zip` (3.0 MB)
- **Baseline Git Tag:** `v0-baseline` (commit `27175e2`)
- **Post-Fix Git Tag:** `v0-phase0-verified`
- **Static Fallback Preserved:** `build-a-planner.html` (usable locally with `localStorage` persistence and Build A JSON export/import until Phase 1 passes)

---

## 1. Repository Layout, Dependencies, Licences & Bundle Sizes

| File / Directory | Size | Role & Licence Audit |
|---|---:|---|
| `index.html` | 11.1 KB | App shell, Apple HIG CSS variables, Light/Dark/System theme rules, reduced-motion & reduced-transparency media queries |
| `app.jsx` | 206.4 KB | Single-file React 18 frontend source (all 15 screens) |
| `app.js` | 201.8 KB | Babel-compiled production bundle (~48 KB gzipped; well under the 250 KB gzipped budget) |
| `build-a-planner.html` | 5.4 KB | Static Build A planner preserved alongside MDS OS with local persistence and JSON backup |
| `js/sync_engine.js` | 47.9 KB | Offline-first sync engine, field-level scalar timestamps, 90-day tombstones, Build A JSON importer, 12 self-tests |
| `js/content_pack.js` | 14.1 KB | Store 2 (`contentPack` v`2026-11-15.1`): 2026 baseline exam facts, 17 subjects, cut-offs, OMFS ranks |
| `js/image_library.js` | 26.8 KB | Store 3 (`imageLibrary`): 22 curated medical image entries (Wikimedia Commons, Open-i/PMC, Servier Medical Art, Radiopaedia link-only placeholder) |
| `js/study_data.js` | 23.4 KB | 23-week roadmap, 19 hidden rules, 5 master checklists |
| `supabase/schema.sql` | 4.3 KB | PostgreSQL DDL (`user_progress`, `user_progress_snapshots`), RLS policies (`auth.uid() = user_id`), Realtime publication, deduplicated snapshot trigger |
| `api/update-proxy.js` | 6.2 KB | Serverless proxy for NBEMS, MCC, and DCI notices; detects Cloudflare 403/Turnstile and returns `"Manual check needed"` |
| `serve_sync.py` | 8.6 KB | Python 3 local server + `/api/update-proxy` + `/api/sync` + `/download-report` |
| `MDS_Desktop_OS.app` | ~1.2 MB | Native macOS AppKit + WebKit wrapper compiled and ad-hoc signed by `package_desktop_app.sh` |
| `vendor/react.min.js` | 10.8 KB | React 18.2.0 UMD (MIT Licence) |
| `vendor/react-dom.min.js` | 131.8 KB | ReactDOM 18.2.0 UMD (MIT Licence) |
| `vendor/supabase.min.js` | 220.1 KB | `@supabase/supabase-js` v2 UMD (MIT Licence) |
| `vendor/tailwindcss.js` | 407.3 KB | Tailwind CSS Play CDN runtime (MIT Licence — scheduled for replacement with build-time CSS in Phase 1) |
| `vendor/babel.min.js` | 2.38 MB | `@babel/standalone` copied from `/tmp/babel.min.js` into `vendor/` for reproducible local compilation |

---

## 2. Section 15 Verification Commands Audit

| # | Check / Command | Initial (`v0-baseline`) | Post-Fix (`v0-phase0-verified`) | Evidence |
|---|---|---|---|---|
| **15.1** | Zero curly quotes (`U+2018..U+201D`) & Rule R11 strict 7-bit ASCII across code files | **PARTIAL (`PASS` curly quotes / `FAIL` R11 ASCII)** — 0 curly quotes, but 581 non-ASCII chars (`—`, `–`, `•`, `₹`, emojis) across 12 code files | **PASS** | `node scripts/audit_screens.js`: 0 curly quotes and 0 non-ASCII characters (`charCodeAt > 127`) across all 15 code files |
| **15.2** | Compile `app.jsx` to `app.js` via Babel | **PARTIAL** — Relied on volatile `/tmp/babel.min.js` | **PASS** | Copied `babel.min.js` to `vendor/babel.min.js`; compiled `app.jsx` -> `app.js` (201,762 bytes, 0 errors) |
| **15.3** | `node --check app.js` & `node --check js/sync_engine.js` | **PASS** | **PASS** | Exit code `0` for both files under Node `v26.12.1` |
| **15.4** | Run `SyncEngine.runSelfTests()` in Node | **PASS (9/9 assertions)** | **PASS (12/12 assertions)** | All original 9 assertions pass + added Test 9 (Build A JSON import), Test 10 (Shortlist tombstone delete & 90-day retention), and Test 11 (Scalar timestamp isolation) |
| **15.5** | Package & sign native macOS app (`./package_desktop_app.sh`) | **PASS** | **PASS** | `swiftc` compiled `app_native/main.swift` and `codesign --force --deep --sign -` signed `MDS_Desktop_OS.app` (exit code `0`) |

---

## 3. Section 13 Claimed vs Verified Reconciliation Table

| # | Section 13 Row | Report Label | Initial (`v0-baseline`) | Post-Fix (`v0-phase0-verified`) | Evidence & Findings |
|---|---|---|---|---|---|
| **13.1** | Smart quotes | `CONFLICT` | **PASS (curly) / FAIL (R11)** | **PASS** | `0` curly quotes in `v0-baseline`; sanitized all remaining typographic dashes (`U+2013`/`U+2014`) and symbols so all 15 code files are 100% 7-bit ASCII. |
| **13.2** | Sync merge loses scalar edits | `CONFLICT` | **FAIL** | **PASS** | **Bug found in `v0-baseline`:** `app.jsx` save `useEffect` called `toScalarObj(userSettings[k], nowIso)` on every render, re-stamping ALL `userSettings` and `dailyRoutine` fields with `nowIso` whenever any unrelated state changed, and `SyncEngine.subscribe` did not propagate remote `userSettings` updates. **Fixed:** Added `SyncEngine.updateScalarIfChanged()` (verified by Self-Test 11) and wired all state slices in `SyncEngine.subscribe`. |
| **13.3** | Self-test 6 was fake | `CONFLICT` | **PASS** | **PASS** | Inspected `js/sync_engine.js`: Test 6 performs a real `localStorage.setItem` -> `getItem` -> `JSON.parse` deep equality roundtrip. |
| **13.4** | No Realtime | `CONFLICT` | **FAIL (UI missing toggle)** | **PASS** | `supabase/schema.sql` enables `supabase_realtime` and `js/sync_engine.js` subscribes to `postgres_changes`, but `v0-baseline` lacked the claimed Realtime toggle in Settings and lacked a local multi-tab channel. **Fixed:** Added `setRealtimeEnabled` toggle in Settings and `BroadcastChannel('mds_os_sync_channel')` for instant local multi-tab sync. |
| **13.5** | Snapshot spam | `CLAIMED FIXED` | **FAIL** | **PASS** | **Bug found in `v0-baseline`:** `supabase/schema.sql` checked `OLD.data IS DISTINCT FROM NEW.data`, which was always true because `docUpdatedAt` inside `data` changed on every sync. **Fixed:** Trigger now checks `(OLD.data - 'docUpdatedAt' - 'lastSyncedAt') IS DISTINCT FROM (NEW.data - 'docUpdatedAt' - 'lastSyncedAt')`, and `syncNow()` skips cloud `upsert` when `stripVolatileTimestamps(mergedDoc)` matches remote. |
| **13.6** | Fake update proxy | `CONFLICT` | **PASS** | **PASS** | `api/update-proxy.js` and `serve_sync.py` perform real HTTP requests and return `status: "blocked", statusText: "Manual check needed"` with direct portal links when Cloudflare challenges occur. |
| **13.7** | Invented exam date + hardcoded state | `CONFLICT` | **FAIL (partial R4 violation)** | **PASS** | `examDate` and `stateName` were empty `''`, but `dailyHours` defaulted to `8` and R4 fields `internshipDate`, `reservationCategory`, and `targetBranch` were missing from Settings. **Fixed:** All 6 personal fields (`examDate`, `internshipDate`, `stateName`, `reservationCategory`, `targetBranch`, `dailyHours`) now initialize to `''` with no defaults in code. |
| **13.8** | Missing screens (timed mock, atlas, quiz, colleges, after-result) | `CONFLICT` | **FAIL (6 broken screens)** | **PASS** | **Bugs found in `v0-baseline`:** (1) `watchlists` crashed React (`Objects are not valid as a React child` on `{id, text}`); (2) `curriculum` rendered 0 subjects (`contentPack.subjectDistribution` was nested under `examPattern`); (3) `ibq_spotter` read `img.imageFile` instead of `img.imageUrl` (19/20 images `src=undefined`, 1/20 HTML URL in `<img>`); (4) `hidden_neglected` read undefined `rule.category`/`rule.content`; (5) `plan` read undefined `week.work`/`week.mocks`; (6) `cbt_mock` omitted the Mock Score Calculator (202C, 22W = 786) and `omfs_deep_dive` omitted the Pederson calculator. **Fixed:** All 15 screens render and pass `scripts/audit_screens.js`. |
| **13.9** | Shortlist / tracker session-only | `CLAIMED FIXED` | **FAIL (delete resurrection + Build A import rejected)** | **PASS** | **Bugs found in `v0-baseline`:** (1) Removing a college from `collegeShortlist` used `.filter()` without a `deletedAt` tombstone, so cloud merge resurrected deleted items; (2) `normalizeDoc()` skipped `counsellingTracker` and `documentsChecklist`; (3) `handleImportJSON` rejected Build A JSON backups. **Fixed:** Added tombstone deletions (90-day retention, Self-Test 10), normalized all tracker maps, and added `SyncEngine.importBackupPayload` (Self-Test 9). |
| **13.10** | Broken launch script | `CLAIMED FIXED` | **PASS** | **PASS** | `launch.sh`, `serve_sync.py`, and `package_desktop_app.sh` all exist, pass syntax checks, and launch cleanly. |
| **13.11** | Glass and motion not Apple-like | `CLAIMED FIXED` | **FAIL (Light mode unreadable)** | **PASS (CSS fixed; GUI screenshot blocked by OS sandbox)** | **Bug found in `v0-baseline`:** Switching to Light mode (`data-theme="light"`) set `--bg-base: #f2f2f7` while `app.jsx` hardcoded `text-white`, rendering white text on a white/light-grey background. **Fixed:** Added high-contrast (`>= 4.5:1`) light-mode semantic overrides and `@media (prefers-reduced-transparency: reduce)` in `index.html`. *Honest Sandbox Note (Rule R7/R8):* Spawning `WKWebView` for automated PNG screenshots inside the agent CLI sandbox is blocked by macOS (`NSCocoaErrorDomain Code=513` on `~/Library/WebKit` and `com.apple.coreservices.launchservicesd`), so verification was completed via `scripts/audit_screens.js` DOM/CSS inspection + native `MDS_Desktop_OS.app` compilation. |

---

## 4. Ten Architectural Conflicts Between Current v2 Code and the Target Prompt (To Resolve in Phases 1-6)

1. **Single-Blob Cloud Row vs Per-Record Table (Phase 1.5):** `supabase/schema.sql` currently stores all user state in a single `user_progress(user_id, data JSONB)` row instead of normalized `user_records(user_id, collection, id, data, hlc, deleted, device_id, seq, server_updated_at)` and append-only `review_logs` / `attempts` / `study_sessions` tables.
2. **Wall-Clock ISO Timestamps vs Hybrid Logical Clocks (Phase 1.6):** `js/sync_engine.js` resolves conflicts using client `new Date().toISOString()` wall-clock timestamps instead of a drift-safe Hybrid Logical Clock (HLC) with a server-assigned monotonic `seq` cursor and 5-minute ahead rejection.
3. **`localStorage` vs IndexedDB + Persistent Outbox (Phase 1.4 & 1.7):** Local persistence currently uses synchronous `localStorage` instead of IndexedDB (`Dexie` or `idb`) with `navigator.storage.persist()` and an exponential-backoff persistent outbox.
4. **Monolithic `app.jsx` + Runtime Tailwind vs Vite + React + TypeScript + Build-Time CSS (Phase 1.2):** The app currently ships as a 2,100-line `app.jsx` compiled via standalone Babel and a 407 KB runtime `vendor/tailwindcss.js` script instead of a code-split Vite + React + TypeScript build with build-time CSS.
5. **Local Python Server Dependency vs Static HTTPS Hosting (Phase 1.1 & 5.5):** Live notice fetching and PDF download currently rely on `serve_sync.py` (`localhost:8765`), whereas Phase 1 requires zero dependency on `serve_sync.py`/`launch.sh` and deployment to a free HTTPS host (Cloudflare Pages / Vercel / Netlify) with baked-in public Supabase env vars.
6. **Simple 3-Step Leitner (+2/+7/+21d) vs FSRS Spaced-Repetition Engine (Phase 2):** Mistake review currently uses a static `+2d -> +7d -> +21d` counter instead of a pure TypeScript `ts-fsrs` scheduler with Anki-style note/card split (`decks`, `presets`, `notes`, `cards`, append-only `review_logs`, `fsrs_params`) and event-sourced memory state.
7. **Glass Card Overuse vs Navigation-Only Glass + Quality Tiers (Phase 3):** Current UI applies `.glass-card` (`backdrop-filter: blur(24px)`) to content cards across screens rather than restricting blur strictly to floating navigation/control layers (max 3 blurred layers, 20 px mobile cap) with Auto/High/Low glass quality tiers and solid high-contrast clinical/question surfaces.
8. **Static JS Image Array vs Slot-Based Visual Intelligence + DB CHECK Constraints (Phase 4):** `js/image_library.js` currently holds 22 static entries (below the 40+ minimum viable target across 6+ subjects) instead of database `image_slots` and `images` tables enforcing Rule R2 PostgreSQL `CHECK` constraints (`ai_generated = false`, mandatory `licence`, `author`, `credit_line`, `source_page_url`, `citation`).
9. **Static JS Content & 14 Sample Mock Questions vs Versioned DB & 240-Question Pool (Phase 5):** Exam facts and questions currently live in `js/content_pack.js` and `app.jsx` (only 7 Part A + 7 Part B sample questions in `CBT_PART_A/B_MOCK_QUESTIONS`) instead of versioned `content_items`, `questions`, `notices`, and `releases` tables with an importer and review queue.
10. **Static Schedule & Basic Score List vs Reflowing Plan, Adaptive Daily Blocks & Analytics (Phase 6):** The 23-week plan is currently a static array rather than backwards-generated from the exam date across 3 scenarios (earliest/expected/latest), and lacks night-before adaptive block ranking (`weakness x forgetting_risk x weight`), negatives budget auditing, and automated unit tests for the 2026 Round-1 OMFS closing ranks.
