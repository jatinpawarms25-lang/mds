# 🦷 NEET-MDS Top-10 Planner (Universal Apple-Inspired Workstation)
### Designed for NEET-MDS 2027 & INI-CET Aspirants • Target: AIR 1–10 • Target Branch: OMFS

**NEET-MDS Top-10 Planner** is an all-in-one daily study command center and study operating system built specifically for full-time NEET-MDS preparation (8 hours/day). Designed according to Apple Human Interface Guidelines (HIG), it delivers a fluid, glassmorphic workstation experience across Mac, iPhone, iPad, Android, Windows, and Linux.

---

## 🌟 Architecture & Data Stores (Three-Way Separation)

To ensure that future official updates never corrupt or erase student study records, the application is divided into three strictly independent data stores:

1. **`userProgress` (Local & Private — Cloud Synced):**
   - 8-hour daily routine execution blocks and streaks
   - 23-week plan checkboxes
   - 17-subject confidence levels, MCQ counters, and revision passes
   - Mock test scores and accuracy calculations
   - Mistake notebook with Leitner spaced repetition (+2, +7, +21 days)
   - Timed 15-image drill scores and history
   - Checklists and settings (exam date, target score, state portal)
   - **Rule:** Content updates can *never* overwrite `userProgress`. Cloud sync merges record-by-record and never blind-overwrites.

2. **`contentPack` (Versioned Exam Facts):**
   - Starts at version `2026-11-15.1` (Verified 15 Nov 2026 baseline)
   - Official exam pattern (Part A 100 Qs/75m lock, Part B 140 Qs/105m lock)
   - Top-10 scores & qualifying cut-offs across 2024–2026 cycles
   - High-yield topics for all 17 subjects with textbook anchors
   - Volatile formula numbers (Malamed LA doses, Gypsum W/P, Steiner Cephalometrics)
   - Guessing mathematics ($EV = 5p - 1$) and tie-break rules
   - OMFS closing ranks (KGMU, BHU, Rohtak, MAIDS, Deemed)
   - 16 hidden & neglected exam rules and 5 master checklists
   - Documented conflicts (J&K AIQ eligibility, Lidocaine doses, etc.)

3. **`imageLibrary` (Zero-AI Real Medical Image Vault):**
   - Real radiographs, histopathology slides, clinical photographs, and redrawn textbook diagrams
   - Strict **No-AI-Images** policy
   - Visible attribution: diagnosis, subject, source, author, license, and source link
   - Panzoom image viewer, flashcard mode, and timed 15-image drills

---

## ☁️ Real Cloud Sync Between Mac & Android (Section 3A — Priority #1)

The student studies on a **MacBook Air** and checks/logs on an **Android phone**. Progress logged on either device syncs automatically to the other.

### Architecture Highlights:
- **Backend:** Supabase Free Tier (PostgreSQL + Supabase Auth + Row Level Security).
- **Authentication:** Passwordless Email Magic Link & Email + Password fallback.
- **Offline-First:** Immediate write to device `localStorage`/IndexedDB; UI updates instantly without waiting for network; sync runs in the background. Works 100% in aeroplane mode.
- **Merge Engine (Heart of Sync):** Record-by-record union by `id`. The later `updatedAt` wins. Tombstones (`deletedAt`) ensure deletions propagate without resurrecting.
- **Conflict Protection:** Losing concurrent offline edits are preserved in a local **Sync Conflicts** list in Settings, restorable with one click.
- **Rolling Cloud Snapshots:** Automatically archives the last 3 snapshots in Supabase for one-tap disaster recovery rollback.
- **Privacy:** Strict Row Level Security policies ensure `auth.uid() = user_id`. No public reads, no social sharing.

### Step-by-Step Supabase Setup (Written for Non-Coders)

Follow these 4 simple steps to set up cloud sync in under 3 minutes:

#### Step 1: Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign up for a free account.
2. Click **"New Project"**, enter a project name (e.g., `neet-mds-planner`), set a secure database password, and choose your preferred region.

#### Step 2: Run the Database Schema SQL
1. In your Supabase Dashboard, click **"SQL Editor"** in the left sidebar.
2. Click **"New Query"**.
3. Open the file [`supabase/schema.sql`](file:///Users/jatinpawar/Downloads/MDS_Desktop_OS/supabase/schema.sql) in this project, copy the entire SQL script, paste it into the editor, and click **"Run"**.
   - This creates the `user_progress` and `user_progress_snapshots` tables with full Row Level Security and the 3-snapshot rotation trigger.

#### Step 3: Enable Email Authentication
1. In your Supabase Dashboard, navigate to **Authentication &rarr; Providers &rarr; Email**.
2. Ensure **Email provider is Enabled** (both Magic Link and Password logins work automatically).

#### Step 4: Connect the App on Mac and Android
1. In Supabase Dashboard, go to **Project Settings &rarr; API**.
2. Copy your **Project URL** (e.g. `https://xyzcompany.supabase.co`) and **`anon` `public` API Key**.
3. Open the app on your Mac, go to **Settings &rarr; Cross-Device Real Cloud Sync**, and paste your URL and Anon Key. Click **"Save Configuration & Connect"**.
4. Sign in using your email (via Magic Link or Password).
5. Open the app on your Android phone, enter the same URL and Anon Key in Settings, and sign into the same account.
6. **Done!** Every mock test logged, subject confidence updated, or mistake card reviewed will sync between both devices.

---

## 🧪 Section 3A Sync Diagnostic Test Suite

The app includes an automated test harness verifying all 8 Section 3A test requirements:

1. **Test 1:** Log mock on Device A &rarr; appears on Device B with identical score (786).
2. **Test 2:** Tick subjects & add error on B &rarr; appear on A.
3. **Test 3:** Both devices offline, each adds different mocks &rarr; reconnect &rarr; both mocks survive.
4. **Test 4:** Both offline, edit same error differently &rarr; reconnect &rarr; later edit wins, losing edit saved in `syncConflicts` (restorable).
5. **Test 5:** Delete mock on A &rarr; tombstone deletion wins, does not resurrect on B.
6. **Test 6:** Network dropped mid-sync &rarr; local-first storage safe, clean retry on reconnect.
7. **Test 7:** Sign out, study offline, sign back in &rarr; offline local work merges into cloud cleanly.
8. **Test 8:** Fresh install on new device &rarr; downloads complete progress matching existing device.

*To run these tests inside the running app, go to **Settings &rarr; Run Section 3A Sync Diagnostics**.*

---

## 🚀 How to Run & Install on Any Device

### 1. Run on Mac (Native Desktop Experience)
```bash
cd /Users/jatinpawar/Downloads/MDS_Desktop_OS
./launch.sh
```
- Launches the native **`MDS_Desktop_OS.app`** in a frameless 1400×920 AppKit window.
- Automatically boots the background Wi-Fi synchronization server on port `8765`.
- Can be dragged directly into your macOS `/Applications/` folder.

### 2. Install on Android Phone & Tablet
1. Connect your Android device to the **same Wi-Fi** network as your Mac.
2. Open Google Chrome or Brave on Android and visit:
   ```
   http://192.168.31.104:8765
   ```
   *(Or the IP address printed in terminal by `./launch.sh`)*
3. Tap the **"Install App"** pill inside the app, or tap Chrome Menu (**⋮**) &rarr; **"Install App"** / **"Add to Home screen"**.
4. MDS OS installs as a standalone app with a high-resolution icon in your app drawer, offline service worker caching, and quick app shortcuts.

### 3. Install on iPhone & iPad
1. Connect to the same Wi-Fi network and open Safari on `http://192.168.31.104:8765`.
2. Tap the Safari **Share** icon (**􀈂**) at the bottom navigation bar.
3. Scroll down and tap **"Add to Home Screen"** (**􀎽**).
4. Launches full screen with a black-translucent status bar and zero browser chrome.

### 4. Install on Windows & PC
1. Open Google Chrome or Microsoft Edge and navigate to `http://localhost:8765`.
2. Click the **Install** icon in the URL omnibox to install the desktop PWA.

---

## 💾 Manual Backups & JSON Escape Hatch

In addition to Supabase cloud sync, MDS OS includes complete manual backup controls:
1. **Export Progress JSON:** In Settings, click **"Export Progress JSON"** to download your full timestamped `userProgress` document.
2. **Import Progress JSON:** In Settings, select any previously exported `.json` file. Prompts confirmation before restoring.
3. **Copy / Paste Backup Code:** Instant clipboard transfer of essential study metrics.

---

## 📡 Auto-Update via Internet & Honest Technical Limits

### Official Watchlist Monitored:
- **NBEMS Official Portal:** `https://natboard.edu.in/`
- **NBEMS NEET-MDS Page:** `https://natboard.edu.in/viewnbeexam?exam=neetmds`
- **NBE Secondary / Caution Portal:** `https://nbe.edu.in/`
- **MCC MDS Counselling Portal:** `https://mcc.nic.in/mds-counselling/`
- **Dental Council of India (DCI / NDC):** `https://dciindia.gov.in/`

### Honest Technical Notice (CORS & Cloudflare):
- During research on 15 Nov 2026, `natboard.edu.in` presented a Cloudflare human-verification turnstile challenge.
- Browsers enforce strict Cross-Origin Resource Sharing (CORS) security. Pure client-side web apps cannot silently scrape NBEMS or bypass bot protections.
- **The app will never fake "live" indicators or attempt to bypass CAPTCHAs.**

### Optional Free Update Proxy (`api/update-proxy.js`):
- A serverless function is included in [`api/update-proxy.js`](file:///Users/jatinpawar/Downloads/MDS_Desktop_OS/api/update-proxy.js).
- Can be deployed to Vercel, Netlify, or Cloudflare Workers in under 2 minutes for automated notice headline scraping.
- If unconfigured, the app defaults honestly: *"Proxy not set up — tap a source to check it manually"*.

---

## 🩻 Medical Image Audit & Compliance

- Full image audit is documented in [`IMAGE-CREDITS.md`](file:///Users/jatinpawar/Downloads/MDS_Desktop_OS/IMAGE-CREDITS.md).
- Preloaded with 22 verified real medical images sourced strictly from **Wikimedia Commons**, **Open-i (NLM/PMC)**, **Radiopaedia.org**, and **Servier Medical Art (SMART)**.
- **Zero AI-generated images, zero synthetic radiographs, zero hallucinations.**
- Every image has visible credit lines, author attribution, license, and direct links to its original medical publication.

---

## ⌨️ Desktop Keyboard Shortcuts

- `⌘K` or `Ctrl+K`: Open Apple Spotlight Command Palette (search subjects, formulas, spotters, and cutoffs).
- `Esc`: Close any active modal, zoom lightbox, or action sheet.
- `Space`: Pause or resume active Pomodoro focus sprint.
