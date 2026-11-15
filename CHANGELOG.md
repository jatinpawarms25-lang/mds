# Changelog (`CHANGELOG.md`)

## [4.0.0-phase4] - 2026-11-15

### Added
- **DB-Enforced Image Rules (`supabase/migrations/002_image_library.sql`)**: Created `image_library` (Data Domain C) with `CHECK (ai_generated = false)` and `published_requires_attribution` CHECK constraint requiring `licence`, `author`, `credit_line`, `source_page_url`, and `citation`.
- **Non-Destructive Image-Occlusion & Candidate Queue (`src/data/imageOcclusion.ts`, `ImageAtlasScreen.tsx`, `MemoryScreen.tsx`)**: Added `(x, y, w, h)` coordinate occlusion editor, candidate approval workflow (Rule R3), and FSRS image-occlusion flashcard rendering.
- **Phase 4 Unit Tests (`src/data/__tests__/imageLibrary.test.ts`)**: Verified all 22 baseline images, attribution rejection, SQL CHECK constraints, and occlusion coordinate normalization (25/25 total tests passing).

## [3.0.0-phase3] - 2026-11-15

### Added
- **Phase 2B Memory Pro (`src/memory/simulator.ts`)**: Added 30/60/90-day workload simulator, fuzz-window load balancing (`balanceIntervalLoad`), and empirical FSRS parameter optimizer (`optimizeFsrsParameters`, >= 100 review logs) with unit tests (`simulator.test.ts`).
- **Phase 3 Apple Glass Design System (`src/index.css`, `scripts/check_ui_tokens.mjs`)**: Refined Light/Dark glass tokens, `.num-tabular` figures, 60 fps Android mobile GPU blur optimization (`<= 767px`), `prefers-reduced-transparency` / `prefers-reduced-motion` fallbacks, and automated token verification.

## [2.0.0-phase2a] - 2026-11-15

### Added
- **MDS Memory Engine (`src/memory/`)**: Implemented pure TypeScript FSRS-5 scheduler (`fsrs.ts`) and Classic Anki SM-2 fallback (`sm2.ts`) verified against the live Anki manual and `ts-fsrs`, plus `Basic`, `Basic-reversed`, and `Cloze` note-to-card generation (`notes.ts`), daily review queue with sibling burying (`queue.ts`), and RFC-4180 CSV import/export (`csv.ts`).
- **Algorithm Verification Docs (`docs/ALGORITHMS.md`)**: Recorded exact FSRS-5 / SM-2 formulas, Anki learning-step Hard behavior, 8-lapse leech threshold (plus half-threshold warnings), fuzz >= 2.5d, and 60s answer timer cap.
- **Memory Review UI & Closed Loop (`src/screens/MemoryScreen.tsx`, `ErrorLogScreen.tsx`)**: Added token-styled Memory screen with keyboard shortcuts (`Space`/`1-4`), 7-day due forecast, CSV import/export, scheduler options, and one-click **Mistake Log -> Flashcard** conversion.
- **Unit Tests (`src/memory/__tests__/`)**: Added 8 unit tests covering FSRS retrievability/intervals/learning steps/leeches/fuzz, SM-2 ease & overdue credit, note types, sibling burying, and CSV round-trip (18/18 total tests passing).

## [1.0.0-phase1] - 2026-11-15

### Added
- **Vite + React + TypeScript + Build-Time Tailwind Architecture**: Replaced CDN React/Babel/Tailwind scripts with Vite production bundling (`dist/`), `React.lazy` code splitting across all 15 screens, and strict TypeScript checking.
- **TypeScript HLC Sync Engine (`src/sync/`)**: Implemented Hybrid Logical Clock (`hlc.ts`), IndexedDB storage via `idb` (`db.ts`), deterministic per-record merge with 90-day tombstones and restorable `syncConflicts` (`merge.ts`), and offline-first outbox + Realtime wake-up + 45s polling fallback + Magic Link / 6-digit OTP / Password auth (`syncEngine.ts`).
- **Supabase Cloud-First Schema (`supabase/migrations/001_phase1_cloud_sync.sql`)**: Added `user_records` (PK `(user_id, collection, id)`), `upsert_user_records` RPC (higher HLC wins, rejects clocks > 5 min ahead), immutable insert-only `attempts` / `study_sessions` / `review_logs`, server-side `admin_users`, deduplicated `user_snapshots` (last 3), and `keep_alive()` RPC.
- **CI, Keep-Alive & Backup Automation**: Added `scripts/ci_checks.mjs` (`--ascii`, `--secrets`, `--defaults`), `scripts/weekly_backup.mjs`, `scripts/rls_isolation_check.mjs`, and `.github/workflows/{ci.yml, supabase-keepalive.yml, weekly-backup.yml}`.
- **Unit & Convergence Tests (`src/sync/__tests__/`)**: Verified HLC ordering, 3-device 10,000-operation randomized convergence with zero lost records, conflict preservation, tombstone non-resurrection, and RLS SQL policy structure (10/10 tests passing).

### Removed
- **Localhost & Native Wrapper Dependencies**: Removed `serve_sync.py`, `launch.sh`, `MDS_Desktop_OS.app`, `app_native/`, `package_desktop_app.sh`, and legacy `app.jsx`/`app.js`/`vendor/` in favor of installable HTTPS PWA (`public/manifest.json`, `public/sw.js`).

## [0.1.0-phase0] - 2026-11-15

### Added
- **Pre-Flight Safety Backup & Baseline Tag**: Created `MDS_Desktop_OS_pre_phase0_backup.zip` and tagged untouched repository state as `v0-baseline`.
- **Static Build A Fallback (`build-a-planner.html`)**: Preserved the Build A static planner with `localStorage` persistence and JSON backup export/import alongside MDS OS until Phase 1 passes.
- **Lossless Build A JSON Backup Importer (`SyncEngine.importBackupPayload`)**: Imports both Build A JSON backups (`{ exported, mocks, errors, shortlist, counselling, stateQuota }`) and MDS OS JSON backups (`{ userProgress }`) without data loss.
- **Automated Phase 0 Verification Harness (`scripts/audit_screens.js`)**: Verifies all Section 15 commands, Section 13 reconciliation items, Rule R4 personal settings defaults, and Rule R11 strict 7-bit ASCII compliance.
- **Phase 0 Verification Report (`docs/VERIFICATION.md`)**: Recorded `PASS`/`FAIL` evidence across all Section 15 and Section 13 checks, plus the 10-line architectural conflict summary.
- **Interactive Calculators & Controls**: Added NBEMS Mock Score Calculator (`202C, 22W -> 786`) in `cbt_mock`, Interactive Pederson Difficulty Index Calculator (`1+2+3 = 6`) in `omfs_deep_dive`, and Realtime Sync Toggle + Rule R4 fields in `settings`.

### Fixed
- **Screen 13 (`watchlists`) React Crash**: Fixed `Objects are not valid as a React child` fatal crash when rendering `{ id, text }` checklist items.
- **Screen 3 (`curriculum`) Blank Subject List**: Bound `contentPack.examPattern.subjectDistribution` so all 17 BDS subjects render properly with Part A/B filtering.
- **Screen 8 (`ibq_spotter`) Broken Image URLs & Placeholders**: Bound `img.imageUrl || img.imageFile` across all 22 medical image entries and added an Apple-style linked placeholder card when `isPlaceholder` is set.
- **Screen 12 (`hidden_neglected`) & Screen 2 (`plan`) Missing Text**: Bound `rule.group`/`rule.detail` and `week.goal`/`week.phaseName` so all 19 hidden rules and 23 study weeks display complete text.
- **Section 13.2 Scalar Edit Timestamp Clobbering**: Added `SyncEngine.updateScalarIfChanged()` so unchanged scalar fields retain their original `updatedAt` timestamps when unrelated state updates occur.
- **Section 13.5 Snapshot Spam**: Updated `supabase/schema.sql` trigger and `SyncEngine.syncNow()` to strip volatile timestamps (`docUpdatedAt`, `lastSyncedAt`) before comparing JSONB payloads.
- **Section 13.9 Shortlist & Record Deletion Resurrection**: Replaced array `.filter()` removal with soft-delete tombstones (`deletedAt`, `_deleted: true`) retained for 90 days (Rule R9).
- **Section 13.11 Light Mode Unreadable Contrast**: Added `[data-theme="light"]` high-contrast (`>= 4.5:1`) text and surface rules plus `@media (prefers-reduced-transparency: reduce)` in `index.html`.
- **Rule R4 & Rule R11 Compliance**: Removed hardcoded personal defaults (`dailyHours`, etc.) in `createEmptyProgressDoc()` and sanitized all 15 code files to strict 7-bit ASCII (`0` characters `> 127`).
