# Changelog (`CHANGELOG.md`)

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
