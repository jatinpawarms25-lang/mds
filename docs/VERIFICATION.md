# Phase 0 Verification Report (`docs/VERIFICATION.md`)

- **Repository Path Verified:** `/Users/jatinpawar/Downloads/MDS_Desktop_OS`
- **App Brand:** **ApexMDS** (rebranded from MDS OS on branch `feat/v3-phase0-r1`, backup tag `v3-pre-phase0-backup`)
- **Prior Baseline Tags:** `v0-baseline` (`27175e2`), `v0-phase0-verified`, `v6-liquid-glass-7repos` (`fabe680`), `3b88ead`
- **Static Fallback Preserved:** `public/build-a-planner.html`

---

## 1. Phase 0 (v3) Audit & Reconciled Fixes

| # | Area | Status | Finding & Action |
|---|---|---|---|
| 1 | `rank <= closingRank` rule | **FIXED** | Added live AIR checker in `CollegesScreen.tsx` enforcing `rank <= closingRank` (e.g., AIR 10 does not reach KGMU 6 or AMU 9). |
| 2 | 2026 Bulletin Date | **FIXED** | Updated `src/data/contentPack.ts` `bulletinDate` to `"March 2026 (sources vary between 11 Mar and 13 Mar; verify against official NBEMS PDF)"`. |
| 3 | Pederson Difficulty Index | **FIXED** | Clarified quoting variance around 7 (`3-4 Slightly Difficult, 5-6 Moderately Difficult, 7-10 Very Difficult per Pederson 1988; some sources quote 5-7 / 8-10`) in `OmfsDeepDiveScreen.tsx`. |
| 4 | Personal Defaults (R4) | **PASS** | `scripts/ci_checks.mjs --defaults` enforces zero hardcoded personal exam dates or states. |
| 5 | App Name & Icon | **FIXED** | Rebranded to **ApexMDS** in `index.html`, `public/manifest.json`, and `src/App.tsx`; created `public/icon.svg`. |

---

## 2. Ten Architectural Conflicts Between Pre-v3 Code and Master Build Prompt (v3)

1. **Outdated `docs/VERIFICATION.md`:** Previously described the pre-Vite `app.jsx` / `serve_sync.py` architecture rather than the current Vite + React + TypeScript + Cloudflare build.
2. **Hand-rolled FSRS vs `ts-fsrs@6.0.0`:** `src/memory/fsrs.ts` uses custom FSRS-5 math instead of `ts-fsrs` v6 `defineScheduler` (FSRS-6 default, FSRS-7 opt-in, A14 golden test vectors).
3. **PDF Studio Defects (Part 11):** `src/reports/pdfReportEngine.ts` uses `sanitizeAscii` (stripping Unicode units/symbols), a weak `NUM_FACT` regex, a 9-subject substring matcher instead of the canonical 17-subject word-boundary matcher, and hardcoded `960` / `34, 32, 1` constants.
4. **Glass Layer Overuse (Part 13):** `.glass-card` blurs content cards across screens instead of restricting glass to navigation/control layers with `Auto / High / Low` quality tiers.
5. **Static Image Atlas (Part 7 & E1):** `src/data/imageLibrary.ts` has 21 static entries instead of a 150-concept `concepts` + `images` pipeline (Europe PMC `OPEN_ACCESS:y`, Zenodo/DENTEX, Wikimedia API, Review Inbox, 40+ real images across 6+ subjects).
6. **Sync & Storage Gaps (Part 4-5):** Uses `idb` instead of Dexie; needs `devices` / `conflicts` verification, `04:00` local day-rollover checks, and the 10,000-op convergence test.
7. **Rank & Exam Facts (Part 2):** Required `rank <= closingRank` enforcement, `March 2026` bulletin label, and Pederson band verification.
8. **Question Bank & Calibration (Part 8):** Missing Sure/Maybe/Guess + Attempt/Skip EV (`5p - 1`), Brier score, and post-mock Marks-Leak report.
9. **Content Intelligence Centre (Part 9):** Missing automated source fetch logs, Cloudflare manual-check fallback UI, and Bulletin Day mode.
10. **Planner & Counselling (Part 10):** Missing 3-scenario date-driven 23-week reflow, night-before adaptive ranking, and Sunday weekly PDF / `.ics` / Web Push.
