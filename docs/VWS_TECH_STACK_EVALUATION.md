# Vetri Water Solutions (VWS) — Technology Stack Evaluation & Architecture Decisions
**Document ID:** VWS-DOC-009  
**Project Phase:** Phase 01G — Final Contradiction Resolution & Owner Decision Gate  
**Status:** Authoritative Blueprint — Reconciled & Validated with Confirmed Owner Decisions  
**Author:** Senior Software Architect, Database Architect, Security Engineer, QA Architect & Business Analyst  
**Date:** November 2026 (Phase 01G Final Contradiction Resolution)  

---

## 1. Executive Evaluation Summary

This document evaluates the proposed technology stack against architectural constraints, operational longevity, cross-platform performance, cost efficiency, and security for the **Vetri Water Solutions** private business management system.

```
+-----------------------------------------------------------------------------------+
|                            RECOMMENDED TECHNOLOGY STACK                           |
+-----------------------+-----------------------------+-----------------------------+
| Layer                 | Selected Technology         | Key Alternative Considered  |
+-----------------------+-----------------------------+-----------------------------+
| UI Framework          | React 18+ (SPA)             | Vue 3 / Svelte              |
| Programming Language  | TypeScript 5.x              | JavaScript (ES6+)           |
| Financial Precision   | Integer Paise Arithmetic    | Floating-Point / Decimal.js |
| Build Tool & Bundler  | Vite                        | Next.js / Create React App  |
| Styling Framework     | Tailwind CSS v3/v4          | Material UI (MUI) / Chakra  |
| Mobile Runtime        | Capacitor 6.x               | React Native / Flutter      |
| Device Geolocation    | @capacitor/geolocation      | Raw HTML5 Geolocation only  |
| Authentication        | Firebase Authentication     | Supabase Auth / Auth0       |
| Primary Database      | Cloud Firestore (NoSQL)     | Supabase (PostgreSQL)       |
| Spreadsheet Engine    | ExcelJS                     | SheetJS (xlsx)              |
| Cloud Backup Transport| Google Drive Resumable API  | Simple Multipart Upload     |
| Multi-Device Concurrency| Firestore Serialized Coordinator| Pure Client Lock / If-Match |
| Task Queue Engine     | Canonical Firestore Queue   | Fragmented ad-hoc queues /  |
|                       | (`system_tasks/{taskId}`)   | client memory only          |
| Backup Scheduling     | Cloud Scheduler + Cloud Fn  | Client-Only Timer (Fails    |
|                       | (2nd Gen) [Firebase Blaze]  | when app is closed)         |
| Backend Secret Storage| Google Cloud Secret Manager | Hardcoded Env / Plain DB    |
| Web Hosting CDN       | Firebase Hosting            | Vercel / Cloudflare Pages   |
+-----------------------+-----------------------------+-----------------------------+
```

---

## 2. In-Depth Component Evaluations & Trade-Off Analysis

### 2.1 UI Framework: React 18+ vs. Vue vs. Svelte
* **Evaluation:**
  * **React 18+:** Exceptional ecosystem for enterprise forms, mature state hooks, ubiquitous library support (React Hook Form, TanStack Query), seamless integration with Capacitor.
  * **Vue / Svelte:** Lower initial boilerplate, but smaller ecosystem for specialized libraries like ExcelJS, Google Drive SDK wrappers, and Capacitor community plugins.
* **Trade-Off Decision:** **React 18+ Selected.** Offers maximum resilience, extensive documentation, and zero friction when compiling into Capacitor Android WebViews.

---

### 2.2 Financial Precision: Integer Paise vs. Floating-Point vs. Decimal.js (Tasks F, G)
* **Governance Status (Option A — REC-04 Awaiting Owner Decision):** Integer paise is proposed by engineering to avoid floating-point artifacts. It remains an Architecture Recommendation awaiting owner approval. Code implementation is blocked until decided.
* **Evaluation:**
  * JavaScript IEEE 754 floating-point numbers fail at exact decimal math (e.g. `1450.10 + 380.20 = 1830.3000000000002`), introducing corruption into financial ledgers.
  * Heavy decimal libraries (e.g. `decimal.js`, `bignumber.js`) introduce runtime bundle weight and syntax verbosity (`a.plus(b)`).
  * JavaScript's native safe integer boundary is `Number.MAX_SAFE_INTEGER` ($2^{53} - 1 = 9,007,199,254,740,991$ paise = ₹90,071,992,547,409.91 / ~₹90,071 crore). Storing amounts in **integer paise** ($1\text{ INR} = 100\text{ paise}$) allows safe internal calculations up to **₹90,071 crores** without precision loss.
  * *Excel Precision Boundary:* Excel numeric cells use IEEE 754 64-bit floating-point with 15-digit precision. For VWS amounts (up to ₹25,00,000, 8 digits), Excel represents numbers without precision loss, but Excel cells do not share identical precision mechanics to integer arithmetic.
* **Trade-Off Recommendation:** **Native Integer Paise Proposed (REC-04).** Fast, standard mathematical operators (`+`, `-`, `*`), zero external dependencies, 100% precision in internal logic.

---

### 2.3 Mobile Platform Strategy: Capacitor vs. React Native vs. Flutter vs. Pure PWA

```
+-----------------------------------------------------------------------------------------------------+
| CRITERION              | CAPACITOR 6.X (CHOSEN) | REACT NATIVE          | FLUTTER         | PWA ONLY|
+------------------------+------------------------+-----------------------+-----------------+---------+
| Codebase Parity        | 100% (Single Codebase) | 70-80% (Forked UI)    | 0% (Dart split) | 100%    |
| Native Android APK     | Yes (Installable)      | Yes (Native Widgets)  | Yes (Canvas)    | No (URL)|
| ExcelJS In-Memory Gen  | Flawless (Web APIs)    | Requires Native Bridge| Dart port needed| Flawless|
| Google Drive API Flow  | Shared Web OAuth       | Platform Auth Bridges | Dart packages   | Shared  |
| Maintenance Overhead   | Extremely Low          | Moderate / High       | High (Two stacks| Zero    |
| Offline Reliability    | Excellent (IndexedDB)  | Excellent (SQLite)    | Excellent       | Poor*   |
+-----------------------------------------------------------------------------------------------------+
```

* **Architectural Justification for Capacitor:**
  1. Allows 100% of the React code, forms, styling, correction history logic, and ExcelJS generation logic to run inside an installable Android APK without rewriting UI in React Native primitives (`<View>`, `<Text>`).
  2. Avoids maintaining two separate codebases (e.g. Flutter + React Web), reducing long-term maintenance costs to near zero for a private owner application.
  3. Provides native plugins for Android back-button handling, status bar styling, native file system storage, and optional GPS capture.

---

### 2.4 Google Drive Upload Strategy: Resumable Upload vs. Multipart Upload
* **Evaluation:**
  * **Multipart Upload:** Sends metadata and binary bytes in a single HTTP request. If mobile connectivity hiccups at 95% of an Excel workbook or JSON dump upload, the entire operation fails and must be restarted from byte 0.
  * **Resumable Upload (`uploadType=resumable`):** Initiates an upload session, streams data in chunks, queries received byte ranges upon connection drops, and resumes from the exact interruption offset.
* **Trade-Off Decision:** **Google Drive Resumable Upload Protocol Selected.** Essential for field reliability on rural or fluctuating cellular mobile networks.

---

### 2.5 Authentication & Google Drive Authorization Architecture (Tasks A, B)
* **Evaluation:**
  * Storing a permanent OAuth refresh token in local storage or unencrypted Android preferences creates severe security exposure if the device is lost, stolen, or compromised.
  * Personal `@gmail.com` accounts cannot use Google Workspace domain-wide delegation (service accounts cannot impersonate personal accounts).
  * Decoupling user identity login (Firebase Authentication via Google Sign-In) from cloud storage authorization (Google Drive API access token with `https://www.googleapis.com/auth/drive.file` scope) guarantees that database access and local record creation are **never blocked** if Drive tokens expire or are revoked.
  * To enable autonomous daily backups 365 days a year via Cloud Functions worker `vws-daily-backup-worker`, the owner provisions backend credentials once via an authenticated Cloud Function (`provisionBackendDriveCredentials`). The Cloud Function exchanges the auth code and stores the refresh token in **Google Cloud Secret Manager** (`projects/{project}/secrets/vws-drive-backend-refresh-token`).
* **Trade-Off Decision:** **Decoupled Architecture with Secret Manager Token Storage Selected (Authoritative Decision).**
  * Client devices hold only short-lived access tokens refreshed via Google Identity Services.
  * Cloud Functions backend accesses Google Drive via Secret Manager-stored refresh token with least-privilege IAM (`roles/secretmanager.secretAccessor`).
  * Explicit, non-blocking reauthorization banner displayed if tokens expire or are revoked (`REAUTH_REQUIRED`).
  * Pending backup sync items queue in the canonical task queue (`system_tasks/{taskId}`) with state `WAITING_REAUTH` and automatically drain upon reauthorization.
  * Zero long-lived credentials stored insecurely on client devices.

---

### 2.6 Primary Database: Cloud Firestore vs. Supabase (PostgreSQL) vs. SQLite
* **Evaluation:**
  * **Cloud Firestore (Chosen):**
    * Native real-time document synchronization.
    * Built-in client-side offline persistence (`enableIndexedDbPersistence`) that functions out of the box on both mobile web and Android Capacitor apps.
    * Robust declarative security rules enforcing single-owner access at zero server maintenance cost.
    * Generous free tier quotas: 50,000 document reads, 20,000 document writes per day, and 1 GiB total storage. For a single-owner operation logging 5–20 entries daily, usage consumes less than 1% of the daily allowance.
  * **Supabase (PostgreSQL):** Relational strengths are excellent, but offline write-queuing in browser/Capacitor clients is significantly more complex than Firestore's built-in offline cache. Free tier pauses projects after 7 days of inactivity.
* **Trade-Off Decision:** **Cloud Firestore Selected.** Optimal offline support, zero server operations, and permanent zero-cost hosting within documented free tier quotas.

---

### 2.7 Spreadsheet Engine: ExcelJS vs. SheetJS (xlsx) vs. xlsx-populate
* **Evaluation:**
  * **SheetJS (Community Edition):** Basic data export works, but styling (custom background fills, cell borders, double bottom underlines, and custom font colors) is locked behind their commercial Pro license ($$$).
  * **ExcelJS (Chosen):** Fully open-source (MIT), comprehensive support for cell background colors, complex font hierarchies, thin/thick/double cell borders, Indian currency formatting, structured multi-line cell rendering (`Alt+Enter`), and native dynamic Excel formula generation (`=SUM(...)`).
* **Trade-Off Decision:** **ExcelJS Selected.** Perfectly satisfies the mandate to replicate the visual beauty and formula intelligence of the reference Excel workbook.

---

### 2.8 Backup Retention & Cloud Storage Trade-Off Analysis (Correction J)
* **Evaluation:**
  * Automated pruning (e.g. keeping only the last 30 or 90 days of daily dumps) saves cloud storage space but permanently destroys the granular ability to audit historical daily states or recover from undetected multi-month data corruption.
  * Indefinite retention of all daily database JSON dumps retains 100% of historical recovery states, but consumes cumulative Google Drive storage over time.
  * Standard Google Drive accounts include 15 GB of shared free storage (Google Drive, Gmail, Google Photos).
  * Standardized decimal SI storage calculations ($1\text{ KB} = 1,000\text{ B}$, $1\text{ MB} = 10^6\text{ B}$, $1\text{ GB} = 10^9\text{ B}$) for daily payloads of $50\text{ KB} - 2.0\text{ MB}$:
    * **Year 1:** $18.25\text{ MB} - 730\text{ MB}$ ($0.12\% - 4.87\%$ of 15 GB).
    * **Year 5:** $91.25\text{ MB} - 3.65\text{ GB}$ ($0.61\% - 24.33\%$ of 15 GB).
    * **Year 10:** $182.5\text{ MB} - 7.30\text{ GB}$ ($1.22\% - 48.67\%$ of 15 GB).
* **Trade-Off Decision:** **Indefinite Daily JSON Backup Retention Selected (Authoritative Owner Decision).**
  * Retains every verified daily JSON backup indefinitely with SHA-256 checksums and version metadata.
  * Storage quota is actively monitored via Drive API `about.get` with informational warnings at 80% and 90% utilization to prevent unexpected quota exhaustion without requiring automatic pruning.

---

### 2.9 Concurrency Architecture: Distributed Lease Coordinator & Immutable Staging vs. HTTP If-Match (Correction C)
* **Evaluation:**
  * Relying on HTTP `If-Match: {ETag}` in Google Drive API v3 fails because Drive chunked resumable upload endpoints do not offer transactional multi-device isolation across streaming chunks.
  * Comparing opaque string ETags with numeric sequence tokens is invalid.
  * Direct in-place writes to `Vetri_Water_Solutions.xlsx` risk catastrophic file corruption if network fails or lease expires mid-stream.
  * A client-side lock alone cannot coordinate across separate physical devices (e.g. Android phone vs. Desktop laptop).
* **Trade-Off Decision:** **Cloud Firestore Serialized Lease Coordinator with Immutable Version Staging Selected.**
  * Distributed lease document (`system_locks/drive_export_coordinator`) provides atomic 3-minute leases with heartbeat renewals.
  * Workbooks are staged as immutable versioned files under `Backups/VWS_Workbook_YYYY-MM-DD_rev{rev}.xlsx`, verified, pointer committed in `system_state/master_workbook_pointer`, and published safely to root.
  * Guarantees that only one device exports at a time; stale uploads are rejected before touching the master workbook.

---

### 2.10 Daily Backup Scheduling: Cloud Scheduler + Cloud Functions v2 vs. Client-Only Timers (Tasks B, F, G)
* **Evaluation:**
  * **Client-Only Timers (React / Capacitor / OS Alarms):**
    * *Fatal Technical Limitation:* A client-side timer **cannot fire** when the application is closed, the phone is in deep sleep (Android Doze mode), or the owner does not open the application on a given calendar day (e.g., weekends, holidays, off-duty periods).
    * Relying solely on client timers violates the confirmed requirement: "Daily autonomous database backup".
  * **Serverless Cloud Scheduled Worker (Authoritative Architecture):**
    * Google Cloud Scheduler configured with standard 5-field cron expression `0 23 * * *` and explicit parameter `--time-zone="Asia/Kolkata"` (17:30 UTC).
    * Triggers Google Cloud Functions (2nd Gen) worker `vws-daily-backup-worker` running under dedicated service account `vws-backup-worker@{project}.iam.gserviceaccount.com`.
    * Targets 99.9% autonomous execution reliability regardless of owner device state.
    * Incorporates daily idempotency key (`vws-daily-backup-YYYY-MM-DD`), 3 exponential retries with jitter, and honest temporal boundaries (`snapshotStartTime` / `snapshotEndTime`) for delayed executions.
    * Uses **Google Cloud Secret Manager** (`projects/{project}/secrets/vws-drive-backend-refresh-token`) to retrieve the owner's OAuth 2.0 refresh token securely, dynamically generating short-lived access tokens for personal `@gmail.com` Google Drive uploads without exposing long-lived credentials to clients (Task B).
* **Firebase Blaze Plan Requirement & Transparent Cost Reality (Task G, E):**
  * Deploying Cloud Scheduler, Cloud Functions (2nd Gen), and Secret Manager requires upgrading the Firebase project to the **Blaze Plan (Pay-As-You-Go)** (REC-01).
  * Compute invocations (30 runs/month) and data egress fall well within the monthly free tier allowances (2,000,000 invocations free, 3 Cloud Scheduler jobs free).
  * However, subtle recurring charges can occur: Cloud Build container builds during deployment, Artifact Registry storage (~$0.10/GB/month), Secret Manager active version storage ($0.06/version/month), and minimal network egress.
  * To ensure cost visibility, an architecture recommendation proposes a **Google Cloud Budget Alert of ₹500/month** (REC-02) with notifications at 50%, 80%, and 100%. *Critical Distinction:* A budget alert is an alerting and notification mechanism, NOT a hard automated cap that halts cloud services. Actual charges may exceed ₹500 if runaway cloud activities occur.
* **Trade-Off Decision: Cloud Scheduler + Cloud Functions (2nd Gen) with Secret Manager Selected as Authoritative Engine with Client Companion Sync.**
  * Cloud Scheduler provides guaranteed autonomous backup coverage 365 days a year.
  * Client-side debounced sync (2 min after save) serves as an immediate-response companion layer during active work sessions.

---

### 2.11 Offline Mode vs. Firestore Transactions: Draft Queue Strategy (Tasks E, I)
* **Evaluation:**
  * Cloud Firestore client SDK natively supports offline persistence (`enableIndexedDbPersistence`), caching reads and queuing normal writes.
  * However, **Cloud Firestore multi-document transactions (`runTransaction`) fail completely when offline**, as transactions require active two-way server roundtrips to verify read locks and execute atomic commits.
  * In VWS, critical operations depend on multi-document transactions:
    1. Monotonic site sequence number allocation (`system_counters/sites_seq`).
    2. Atomic correction version swaps ($v(n-1)$ deactivated while $v(n)$ activated).
    3. Daily accounts atomic update and audit log subcollection append.
    4. Concurrency lease coordinator locks.
  * If these operations were attempted via direct offline transactions, they would throw errors and block field data entry.
* **Trade-Off Decision: Offline Draft Queue with Reconciliation (`syncStatus: 'PENDING_COMMIT'`) Selected.**
  * When offline, new site entries and account edits are saved locally to IndexedDB as drafts (`OfflineOperationDraft`) with `syncStatus: 'PENDING_COMMIT'`.
  * Temporary client IDs are used; server sequence allocation is deferred.
  * The UI presents an amber badge: *"Saved Locally - Pending Cloud Commit"*.
  * Upon network reconnection, the application synchronization manager automatically initiates the transactions sequentially, secures official monotonic numbers, commits the correction swaps atomically, and updates `syncStatus` to `'COMMITTED'`.
  * If concurrent edits occurred on another device during offline operation, the sync engine detects stale base versions (`SYNC_CONFLICT: STALE_BASE_VERSION`) and displays the **Sync Conflict Review Modal (SCR-11)** for explicit owner resolution, guaranteeing zero silent overwrites.
  * This guarantees 100% field usability without compromising database consistency or monotonic sequence integrity.

---

### 2.12 Task Queue Architecture: Canonical `system_tasks/{taskId}` vs. Fragmented Queues (Task C)
* **Evaluation:**
  * Earlier architectural iterations referenced fragmented task queue paths (`system_tasks/backup_queue`, `pending_drive_sync`, `system_tasks/{taskId}`).
  * Ad-hoc queue paths introduce runtime ambiguity, fragmented query logic, and brittle recovery semantics across multi-device clients and Cloud Functions background workers.
  * In-memory queues fail when an application is closed, backgrounded by Android OS, or uninstalled.
* **Trade-Off Decision: Canonical Cloud Firestore Task Queue (`system_tasks/{taskId}`) Selected (REC-09).**
  * All asynchronous background operations (Excel workbook generation, complete JSON database backups, Google Drive resumable uploads, and health audits) are persisted as discrete documents in `system_tasks/{taskId}`.
  * Implements a strict, formal state machine: `PENDING` → `CLAIMED` → `RUNNING` → `SUCCEEDED`, with resilient failure transitions `RUNNING` → `RETRY_WAIT` → `CLAIMED`, terminal failure `RUNNING` → `FAILED_PERMANENT`, and credential degradation `RUNNING` → `WAITING_REAUTH`.
  * Decouples heavy snapshot generation from network-dependent Drive upload streaming.
  * Durable in Cloud Firestore: tasks survive browser reloads, mobile app restarts, and OS-level memory reclamation.


