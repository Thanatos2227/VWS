# Vetri Water Solutions (VWS) — Phase 01D Architecture Corrections & Blueprint Consistency Audit Report
**Document ID:** VWS-DOC-016  
**Project Phase:** Phase 01D — Architecture Corrections & Blueprint Consistency Audit  
**Status:** Authoritative Audit Report — Locked & Ready for Final Owner Sign-Off  
**Author:** Principal Software Architect, Firebase/Google Cloud Architect, Database Architect, Security Engineer, QA Architect & Business Analyst  
**Date:** November 2026 (Phase 01D Comprehensive Audit)  

---

## 1. Executive Summary & Audit Context

### 1.1 Scope & Operational Boundary of Phase 01D
This audit report represents the formal completion of **Phase 01D — Architecture Corrections & Blueprint Consistency Audit** for the **Vetri Water Solutions (VWS)** business management application. 

Acting under strict architectural mandate, the engineering team executed a comprehensive consistency review and mathematical reconciliation across the entire existing technical documentation suite (`docs/`). All twelve identified architectural challenges (Challenges A through L) have been definitively resolved, codified, and synchronized across all nine foundational specification blueprints.

### 1.2 Strict Documentation-Only Compliance
In rigorous adherence to Phase 01D absolute constraints:
* **Zero application source code** has been written.
* **No frontend, backend, or mobile frameworks** (React, Vite, Capacitor, Firebase, Android) have been initialized.
* **Zero project dependencies** have been installed or modified.
* **Zero UI prototypes, demos, or mock applications** have been constructed.
* **Zero live cloud infrastructure** (Firebase collections, GCP services, IAM roles, or storage buckets) has been provisioned.
* **All historical phase reports** (`VWS_PHASE_01_REPORT.md`, `VWS_PHASE_01A_CORRECTION_REPORT.md`, `VWS_PHASE_01B_FINAL_REVIEW_REPORT.md`, `VWS_PHASE_01B_OWNER_DECISIONS_AMENDMENT_REPORT.md`, `VWS_PHASE_01C_FINAL_TECHNICAL_INTEGRITY_REPORT.md`) have been 100% preserved.
* **Implementation Phase 02 has NOT been initiated.** All engineering activities have stopped awaiting explicit, written owner sign-off.

---

## 2. Comprehensive Resolution of the 12 Architectural Challenges

```
+-------------------------------------------------------------------------------------------------------------+
|                                    CHALLENGE RESOLUTION DASHBOARD (PHASE 01D)                               |
+-----+---------------------------------------------+------------------------------------+--------------------+
| REF | ARCHITECTURAL CHALLENGE                     | RESOLUTION ARTIFACT / BLUEPRINT    | COMPLIANCE STATUS  |
+-----+---------------------------------------------+------------------------------------+--------------------+
| A   | Autonomous Daily Backup Scheduling          | VWS-DOC-004, VWS-DOC-008, 009      | FULLY RECONCILED   |
| B   | Three Distinct Artifact Roles Matrix        | VWS-DOC-007, VWS-DOC-008           | FULLY HARMONIZED   |
| C   | Drive Concurrency & Master Pointer Staging  | VWS-DOC-004, 005, 007, 008         | FULLY MITIGATED    |
| D   | Snapshot Immutability & Decoupled Task Queue| VWS-DOC-005, VWS-DOC-008           | FULLY ARCHITECTED  |
| E   | Extensible Tank Type System                 | VWS-DOC-001, 002, 003, 005         | FULLY INTEGRATED   |
| F   | Daily Accounts Edit Semantics & Audit Log   | VWS-DOC-002, 003, 005              | FULLY CODIFIED     |
| G   | Canonical Decision Register (DEC 01-25)     | VWS-DOC-010, VWS-DOC-016           | 100% LOCKED        |
| H   | Financial Safety Rules & Indian Currency    | VWS-DOC-001, 003, 005, 007         | ZERO PRECISION LOSS|
| I   | Reconcile 30-Day Purge with Indefinite Store| VWS-DOC-001, 005, 008              | FULLY ALIGNED      |
| J   | Standardized SI Decimal Storage Trajectory  | VWS-DOC-003, 008, 009              | EXACT SI DECIMAL   |
| K   | OAuth vs. REST API Error Disambiguation     | VWS-DOC-004, 006, 008              | PROTOCOL SEPARATED |
| L   | Four-Layer System Architecture Decomposition| VWS-DOC-004                        | 100% DECOMPOSED    |
+-----+---------------------------------------------+------------------------------------+--------------------+
```

---

### Challenge A: Autonomous Daily Backups Architecture & Scheduling
* **Architectural Problem:** Client-side timers (in React SPA or Capacitor mobile container) cannot fire when the application is closed, the smartphone is suspended in deep sleep (Android Doze mode), or the owner takes time off and does not open the application on a given day.
* **Authoritative Solution:**
  1. **Google Cloud Scheduler:** Configured with cron expression `0 23 * * *` IST (17:30 UTC) to trigger execution 365 days a year without user interaction.
  2. **Google Cloud Functions (2nd Gen):** Serverless Node.js 20 microservice `vws-daily-backup-worker` executing under least-privilege service account `vws-backup-worker@{project}.iam.gserviceaccount.com`.
  3. **Daily Idempotency Key:** Worker enforces idempotency key `vws-daily-backup-YYYY-MM-DD`. If already executed, exits 200 OK immediately without duplicate processing.
  4. **Retry & Recovery:** 3 automatic retries with exponential backoff and jitter. If an execution fails, the subsequent run detects unbacked calendar days and executes catch-up snapshots.
  5. **Firebase Blaze Plan Requirement:** Upgrading to Firebase Blaze (Pay-As-You-Go) is required to deploy Cloud Scheduler and Cloud Functions v2. Real-world cost is **$0.00 / month** as 30 monthly invocations fit completely inside the 2,000,000 free monthly invocations quota.
  6. **Companion Client Sync:** Client-side debounced sync (2 min after record save) operates as an immediate companion layer during active work sessions.

---

### Challenge B: Three Distinct Artifact Roles Matrix
* **Architectural Problem:** Conflating Excel spreadsheets with database disaster recovery backups creates severe data loss risks because Excel lacks soft-deleted records, document UUIDs, and correction version chains.
* **Authoritative Solution:** Codified the **Three Distinct Artifacts Matrix**:
  1. **Artifact 1: Managed Firestore Export (Disaster Recovery):** Cloud Firestore Admin API exporting raw LevelDB SST files to Google Cloud Storage (GCS). Full engine state; ACID point-in-time; 100% database reconstruction.
  2. **Artifact 2: Daily Complete Database JSON Snapshot (Portable Backup):** Canonical UTF-8 serialized JSON dumps saved to Google Drive `Database_Backups/` with external `.sha256` manifest. Retained indefinitely without auto-pruning. Contains full collections, version chains, and soft-deleted tombs.
  3. **Artifact 3: Master Excel Workbook (Human Reporting):** Formatted `.xlsx` file generated via `ExcelJS` placed in Google Drive root (`Vetri_Water_Solutions.xlsx`). Excludes deleted and superseded records from formulas; strictly for human inspection and customer audit.

---

### Challenge C: Google Drive Concurrency, Immutable Staging & Master Pointer
* **Architectural Problem:** Google Drive API v3 chunked resumable upload endpoints lack multi-chunk transactional atomicity. Direct in-place writes to `Vetri_Water_Solutions.xlsx` risk corruption if network drops or a lease expires mid-stream.
* **Authoritative Solution:**
  1. **Immutable Version Staging:** The compiled workbook is uploaded first to a dedicated folder as an immutable versioned file:
     `Backups/VWS_Workbook_YYYY-MM-DD_rev{rev}.xlsx`
  2. **Atomic Firestore Pointer Reference (`system_state/master_workbook_pointer`):**
     Following successful upload and SHA-256 verification, worker commits an atomic transaction to Firestore:
     `currentDriveFileId`, `currentFileName`, `currentExportVersion`, `checksumSha256`, `snapshotBoundary`, `updatedAt`, `committedBy`.
  3. **Safe Root Publication:** File is copied/published to `Vetri_Water_Solutions.xlsx` at root only after the pointer is committed. If root publication fails, the staged version and pointer remain 100% authoritative.
  4. **Server-Side Stale Upload Rejection:** If an upload completes with `version <= system_state/master_workbook_pointer.currentExportVersion`, the upload is declared STALE and rejected without modifying the master workbook.
  5. **Opaque ETag Governance:** Google Drive ETags are treated strictly as opaque strings and never parsed or compared numerically.

---

### Challenge D: Snapshot Immutability & Decoupled Task Queue Lifecycle
* **Architectural Problem:** Re-querying mutable Firestore collections when retrying an interrupted upload violates point-in-time consistency and produces mismatched checksums.
* **Authoritative Solution:**
  1. **Decoupled Two-Stage Queue:**
     * `BACKUP_SNAPSHOT_GENERATE`: Queries collections at cutoff timestamp boundary `snapshotBoundary = serverTimestamp()`, compiles canonical UTF-8 JSON payload, computes raw SHA-256 hash, and stages payload in durable storage. Transitions to `SNAPSHOT_CREATED`.
     * `BACKUP_SNAPSHOT_UPLOAD`: Reads the *exact pre-compiled staged payload*. Upload retries NEVER re-query mutable database collections. Streams chunks, verifies hash, and uploads companion `.sha256` manifest.
  2. **Lifecycle State Machine:**
     `SNAPSHOT_PENDING` $\to$ `SNAPSHOT_CREATED` $\to$ `UPLOAD_PENDING` $\to$ `UPLOADING` $\to$ `UPLOAD_COMPLETE`. Failure states: `UPLOAD_FAILED`, `WAITING_REAUTH`, `STALE_REJECTED`.

---

### Challenge E: Extensible Tank Type System
* **Architectural Problem:** Restricting tank types to a rigid TypeScript union `'OHT' | 'UG'` in code creates database migration locks and deployment bottlenecks whenever custom customer tanks (e.g. Sump, Fire Tank) are encountered.
* **Authoritative Solution:**
  1. **Extensible Type Definition:**
     ```typescript
     export type PredefinedTankType = 'OHT' | 'UG';
     export type TankType = PredefinedTankType | (string & {});
     ```
  2. **Validation & UI Rules:** Predefined values `OHT` and `UG` are suggested as quick one-click chips in the UI. An "Other / Custom" option allows entering custom tank types, which are trimmed, validated (1–50 characters, sanitized), and stored directly without database redesign.
  3. **Reporting Compatibility:** Dynamic Excel worksheets and mobile list views render custom tank types naturally in multi-line cells (`Alt+Enter`).

---

### Challenge F: Daily Accounts Category Edit Semantics & Revision Audit Log
* **Architectural Problem:** Ambiguity regarding whether editing a daily accounts category replaces the previous value or adds to it, and absence of an audit log for accounts modifications.
* **Authoritative Solution:**
  1. **Default Replacement Semantics:** Editing an existing expense category in the form **replaces** its current value by default. (e.g., editing Transport from ₹200 to ₹350 updates the value to ₹350).
  2. **Deliberate Incremental Addition ("+ Add Expense"):** Adding an incremental expense requires a deliberate "+ Add Expense" action, which opens an incremental dialog: $\text{newAmount} = \text{previousAmount} + \text{additionalAmount}$.
  3. **Non-Destructive Revision Audit Log:** Every edit appends an immutable audit record in subcollection:
     `accounts_daily/{entryDate}/audit_log/{revisionId}`
     Captures: `timestamp`, `editedBy`, `categoryKey`, `previousAmountPaise`, `newAmountPaise`, `deltaAmountPaise`, `editMode` (`'REPLACE'` | `'INCREMENT'`), and optional `reason` (aligning with PD-01, PD-02, and PD-04). Parent document tracks monotonic `revisionsCount`.

---

### Challenge G: Canonical Decision Register (DEC-01 through DEC-25) & Traceability
* **Architectural Problem:** Fragmented decisions spread across multiple phase reports without a single consolidated numbering system.
* **Authoritative Solution:** Consolidated all 19 foundational requirements and 6 approved defaults into the **Canonical Decision Register (DEC-01 through DEC-25)** in `docs/VWS_OPEN_QUESTIONS.md`. All 25 decisions are formally classified as **LOCKED**. Complete end-to-end traceability is detailed in Section 3 of this report.

---

### Challenge H: Financial Safety Rules, Integer Paise & Indian Currency Formatting
* **Architectural Problem:** JavaScript IEEE 754 floating-point inaccuracies, string-to-float parsing errors, lack of safe integer bounds, and non-standard currency formatting.
* **Authoritative Solution:**
  1. **Integer Paise Standard:** All monetary amounts are stored and calculated strictly in integer paise ($1\text{ INR} = 100\text{ paise}$).
  2. **JavaScript Safe Integer Guard:** All inputs and calculated sums are validated against `Number.MAX_SAFE_INTEGER` ($9,007,199,254,740,991$ paise = ₹90 trillion), eliminating arithmetic overflow risks.
  3. **Strict String-to-Paise Parsing (No Float Math):**
     Input currency strings are parsed by splitting on `.` and executing integer multiplication on rupees and padding on paise, avoiding `Math.round(parseFloat(str) * 100)` float hazards.
  4. **Strict Financial Bounds:** All billing amounts, discounts, and expenses must be $\ge 0$. Discounts must satisfy $\text{discountPaise} \le \text{billValuePaise}$.
  5. **Indian Currency Formatting:** Display formatted via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })` (e.g. `₹1,00,000.00`). Excel currency formatted with `[$₹-en-IN] #,##,##0.00`.

---

### Challenge I: Reconciliation of 30-Day Firestore Purge with Indefinite Drive Retention
* **Architectural Problem:** Potential perceived conflict between the 30-day soft-delete purge in active Cloud Firestore and the indefinite retention policy for daily Google Drive JSON backups.
* **Authoritative Solution:**
  1. **Active Firestore Operational Hygiene:** Soft-deleted site records (`isDeleted: true`) are automatically hard-purged from Cloud Firestore after 30 days. This keeps operational queries lean, minimizes index size, and ensures low mobile sync latency.
  2. **Permanent Drive Archival:** Daily JSON dumps in Google Drive (`Database_Backups/`) are cumulative point-in-time snapshots retained indefinitely. Every soft-deleted record is captured in up to 30 distinct historical daily backup dumps prior to its active database purge.
  3. **Disaster Recovery Extraction:** If a record purged two years ago requires audit inspection, it remains 100% extractable from historical daily JSON dumps.

---

### Challenge J: Standardized SI Decimal Units Storage Trajectory & Quota Safeguards
* **Architectural Problem:** Inconsistent binary vs. decimal unit definitions and arbitrary storage projections.
* **Authoritative Solution:**
  1. **Strict SI Decimal Units ($1\text{ KB} = 1,000\text{ B}$, $1\text{ MB} = 10^6\text{ B}$, $1\text{ GB} = 10^9\text{ B}$):**
     Based on daily payloads of $50\text{ KB} - 2.0\text{ MB}$ across a finite 15 GB shared Google storage quota:
     * **Year 1 (365 days):** $18.25\text{ MB} - 730\text{ MB}$ ($0.12\% - 4.87\%$ of 15 GB quota).
     * **Year 3 (1,095 days):** $54.75\text{ MB} - 2.19\text{ GB}$ ($0.37\% - 14.60\%$ of 15 GB quota).
     * **Year 5 (1,825 days):** $91.25\text{ MB} - 3.65\text{ GB}$ ($0.61\% - 24.33\%$ of 15 GB quota).
     * **Year 10 (3,650 days):** $182.5\text{ MB} - 7.30\text{ GB}$ ($1.22\% - 48.67\%$ of 15 GB quota).
  2. **Quota Monitoring & Safeguards:** Drive Quota API (`about.get`) queries storage usage before uploads. Status notice displayed at 80% capacity (12 GB); persistent high-priority warning banner at 90% capacity (13.5 GB). Quota exhaustion (`403 storageQuotaExceeded`) alerts owner while keeping core Firestore database operations 100% unblocked.

---

### Challenge K: OAuth 2.0 Error Disambiguation vs. Google Drive REST API HTTP Codes
* **Architectural Problem:** Conflating OAuth token endpoint responses (`invalid_grant`) with Drive REST API HTTP status codes (`401`, `403`).
* **Authoritative Solution:**
  1. **OAuth 2.0 Token Endpoint Errors (`oauth2.googleapis.com`):**
     * `invalid_grant`: Refresh token expired (e.g. 6-month inactivity), revoked by user, or password reset.
     * `invalid_request`: Malformed parameters or clock skew.
     * `unauthorized_client`: OAuth client ID / Android SHA-1 mismatch.
     * *Action:* Transition sync task to `WAITING_REAUTH`, prompting interactive user sign-in.
  2. **Google Drive REST API HTTP Status Codes (`googleapis.com/drive`):**
     * `HTTP 401 Unauthorized`: Short-lived access token expired. Triggers silent background token refresh.
     * `HTTP 403 Forbidden (authError)`: Scope revoked. Prompts interactive re-consent.
     * `HTTP 403 Forbidden (storageQuotaExceeded)`: Google Drive is full. Keeps core Firestore unblocked; alerts owner.
     * `HTTP 403 Forbidden (userRateLimitExceeded)`: Transient rate limiting. Retries with exponential backoff.
  3. **Platform Token Storage:** Web GIS access tokens held in transient memory (never in `localStorage`). Android tokens stored in `EncryptedSharedPreferences` backed by hardware **Android Keystore System** (AES-256-GCM). Least-privilege `drive.file` scope strictly maintained.

---

### Challenge L: Four-Layer System Architecture Decomposition
* **Architectural Problem:** Lack of explicit component boundaries, data flow definitions, and failure modes across client, managed cloud, serverless workers, and external APIs.
* **Authoritative Solution:** Formally decomposed the architecture into four distinct layers in `docs/VWS_SYSTEM_ARCHITECTURE.md`:
  * **Layer 1: Frontend Clients:** React 18 SPA + Capacitor 6.x Android container with offline IndexedDB/SQLite cache.
  * **Layer 2: Firebase Managed Services:** Firebase Auth (Google Sign-In), Cloud Firestore (Single Source of Truth), Security Rules, Firebase Hosting CDN.
  * **Layer 3: Serverless Scheduled Backend Worker:** Cloud Scheduler (`0 23 * * *` IST) + Cloud Functions (2nd Gen) worker on Firebase Blaze with daily idempotency key and catch-up recovery.
  * **Layer 4: External Google APIs:** Google Drive REST API v3 (Folder: `Vetri Water Solutions`, Resumable Upload protocol, Quota API `about.get`).

---

## 3. Canonical Traceability Matrix (DEC-01 through DEC-25)

The following matrix provides comprehensive end-to-end traceability from canonical owner decisions to functional requirements, business rules, database schemas, and architectural specifications:

```
+-----------------------------------------------------------------------------------------------------------------------------------------+
|                                                      CANONICAL TRACEABILITY MATRIX                                                      |
+--------+----------------------------+-----------------------+---------------------+-----------------------+-----------------------------+
| DEC ID | DECISION SUMMARY           | MASTER REQUIREMENTS   | BUSINESS RULES      | DATABASE SCHEMA       | SYSTEM & BACKUP ARCH        |
+--------+----------------------------+-----------------------+---------------------+-----------------------+-----------------------------+
| DEC-01 | Single-Owner Private App   | FR-AUTH-01, 02        | BR-PREC-01          | Overview Sec 1        | VWS-DOC-004 Sec 1           |
| DEC-02 | Google OAuth Whitelist     | FR-AUTH-02, 03        | Section 10 Matrix   | Security Rules Sec 3  | VWS-DOC-006 Sec 2, 3        |
| DEC-03 | Web SPA & Android APK      | Executive Summary 1   | Section 10 Matrix   | Types Sec 3.1         | VWS-DOC-004 Sec 2.1, 7      |
| DEC-04 | Firestore Master Authority | FR-DRV-06             | Section 10 Matrix   | Overview Sec 1        | VWS-DOC-004 Sec 2.2, 008 S1 |
| DEC-05 | Calendar Year (Jan 1-Dec 31)| FR-XLS-02             | BR-DATE-01          | sites.year, acc.year  | VWS-DOC-007 Sec 2           |
| DEC-06 | Multiple Tanks One Bill    | FR-SITE-01, 04        | BR-TANK-02          | SiteRecord.tanks[]    | VWS-DOC-007 Sec 3.2         |
| DEC-07 | Cash/Online Immediate Pay  | FR-SITE-06            | BR-PAY-01           | PaymentMode Enum      | VWS-DOC-002 Sec 2.3.1       |
| DEC-08 | Tank Ft & Litres Units     | FR-SITE-03            | BR-TANK-01          | TankSpec ft / Litres  | VWS-DOC-007 Sec 3.1         |
| DEC-09 | Manual Paper Bill Number   | FR-SITE-05            | BR-BILL-01          | SiteRecord.billNumber | VWS-DOC-007 Sec 3.1         |
| DEC-10 | Google Location Dual Mode  | FR-SITE-02            | BR-LOC-01           | GoogleLocationData    | VWS-DOC-004 Sec 1           |
| DEC-11 | Combined Personal Ledger   | FR-ACC-01, 05         | BR-CALC-A02         | PersonalExpenseData   | VWS-DOC-007 Sec 4.1         |
| DEC-12 | Soft Delete & 30-Day Bin   | FR-DEL-01 to 05       | BR-DEL-01           | isDeleted, expiresPurge| VWS-DOC-008 Sec 7, 13      |
| DEC-13 | Staff Attendance Combined  | FR-ACC-03             | BR-STAF-01          | staffAttendanceExpense| VWS-DOC-007 Sec 4.1         |
| DEC-14 | Staff Salary Monthly Only  | FR-ACC-04             | BR-STAF-02          | SalaryEntry[], salary | VWS-DOC-007 Sec 4.1         |
| DEC-15 | Dual Backup Streams        | FR-DRV-02             | Section 11.1        | backups_metadata      | VWS-DOC-008 Sec 3           |
| DEC-16 | Indefinite JSON Retention  | FR-DRV-03             | BR-DRV-01           | retentionPolicy: INDEF| VWS-DOC-008 Sec 9.1         |
| DEC-17 | Non-Circular Checksum      | FR-DRV-03             | BR-DRV-04           | sha256Checksum field  | VWS-DOC-008 Sec 9.1         |
| DEC-18 | Drive Reauthorization Decou| FR-AUTH-07            | BR-DRV-03           | system_tasks queue    | VWS-DOC-006 Sec 4.2         |
| DEC-19 | Autonomous Cloud Scheduler | FR-DRV-05             | Section 10 Matrix   | system_tasks idempot  | VWS-DOC-004 S2.3, 008 S11   |
| DEC-20 | Correction Reason Optional | FR-SITE-10 (PD-01)    | BR-CORR-01          | correctionReason?     | VWS-DOC-002 Sec 2.3.4       |
| DEC-21 | Correction Version Timeline| FR-SITE-11 (PD-02)    | BR-CORR-02          | originalRecordId, prev | VWS-DOC-002 Sec 2.3.4       |
| DEC-22 | Default Latest Valid View  | FR-SITE-12 (PD-03)    | BR-CORR-03          | isLatestValidVersion   | VWS-DOC-002 Sec 2.3.4       |
| DEC-23 | History Modal Access       | FR-SITE-11 (PD-04)    | BR-CORR-02          | Composite Indexes      | VWS-DOC-002 Sec 2.3.4       |
| DEC-24 | Excel Superseded Styling   | FR-XLS-05 (PD-05)     | BR-XLS-03           | status: SUPERSEDED     | VWS-DOC-007 Sec 3.3         |
| DEC-25 | Extensible Tank Types      | FR-SITE-13 (PD-06)    | BR-TANK-01          | PredefinedTankType     | VWS-DOC-007 Sec 3.1         |
+--------+----------------------------+-----------------------+---------------------+-----------------------+-----------------------------+
```

---

## 4. Comprehensive Technical & Operational Risk Register

```
+-----------------------------------------------------------------------------------------------------------------------------------------+
|                                                          PROJECT RISK REGISTER                                                          |
+----+------------------------------+--------+---------+---------------------------------------------------+------------------------------+
| ID | RISK DESCRIPTION             | IMPACT | LIKELI- | ARCHITECTURAL MITIGATION                          | CONTINGENCY PROTOCOL         |
|    |                              |        | HOOD    |                                                   |                              |
+----+------------------------------+--------+---------+---------------------------------------------------+------------------------------+
| R1 | Cellular Drop During Upload  | High   | High    | Google Drive Resumable Upload protocol queries    | Cloud Firestore durable task |
|    | on Mobile Field Network      |        |         | received bytes (HTTP 308) and resumes stream.     | queue retries seamlessly.    |
+----+------------------------------+--------+---------+---------------------------------------------------+------------------------------+
| R2 | Concurrent Save Race Between | High   | Medium  | Cloud Firestore Serialized Lease Coordinator      | Stale upload rejected; master|
|    | Android Phone and Web App    |        |         | (`system_locks`) & immutable version staging.     | workbook pointer protected.  |
+----+------------------------------+--------+---------+---------------------------------------------------+------------------------------+
| R3 | Google Drive Token Expiry    | Medium | High    | Decoupled reauthorization flow; core Firestore    | Persistent warning banner;   |
|    | or Revocation (invalid_grant)|        |         | database writes remain 100% unblocked.            | 1-click re-consent on demand.|
+----+------------------------------+--------+---------+---------------------------------------------------+------------------------------+
| R4 | Accidental Master Record     | High   | Low     | Soft-deletion only (`isDeleted: true`); 30-day    | Restore from Recycle Bin UI; |
|    | Deletion by Owner            |        |         | recovery window; hard delete disabled in rules.   | point-in-time JSON restore.  |
+----+------------------------------+--------+---------+---------------------------------------------------+------------------------------+
| R5 | Floating-Point Financial     | High   | Low     | 100% native integer paise arithmetic; string-to-  | Validation schema rejects    |
|    | Ledger Rounding Corruption   |        |         | paise parser without intermediate float math.     | float decimals and NaN.      |
+----+------------------------------+--------+---------+---------------------------------------------------+------------------------------+
| R6 | Long-Term Storage Expiry on  | Medium | Medium  | Decimal SI calculations; Drive Quota API query;   | Informational alert at 80%;  |
|    | Shared 15 GB Google Account  |        |         | warning banners at 80% and 90% utilization.       | high-priority alert at 90%.  |
+----+------------------------------+--------+---------+---------------------------------------------------+------------------------------+
| R7 | Cloud Scheduler Execution    | Medium | Low     | Exponential backoff retry (3 attempts with        | Next daily run detects gap;  |
|    | Failure / Drive API Outage   |        |         | jitter); daily idempotency key prevents duplicates| executes catch-up snapshots. |
+----+------------------------------+--------+---------+---------------------------------------------------+------------------------------+
| R8 | Device Loss or Android       | High   | Low     | Firestore cloud synchronization; tokens protected | Download latest JSON dump    |
|    | Hardware Theft               |        |         | by Android Keystore & EncryptedSharedPreferences. | and restore on new device.   |
+----+------------------------------+--------+---------+---------------------------------------------------+------------------------------+
```

---

## 5. Phase 02 Implementation Readiness Checklist

With the technical blueprint locked and verified, Phase 02 can proceed immediately upon owner sign-off. Below is the structured implementation sequence:

```
[ PHASE 02 IMPLEMENTATION ROADMAP ]

Stage 1: Repository & Environment Initialization
  ├── Initialize Git repository with structured branch protection
  ├── Scaffold React 18 + TypeScript + Vite workspace
  ├── Configure Tailwind CSS with VWS visual palette
  └── Configure Capacitor 6.x Android project with Keystore integration

Stage 2: Firebase & Cloud Infrastructure Setup
  ├── Create Google Cloud / Firebase project (Upgrade to Blaze Plan)
  ├── Deploy production Cloud Firestore Security Rules (VWS-DOC-006)
  ├── Deploy composite index configuration (firestore.indexes.json)
  └── Configure OAuth 2.0 Web Client ID & Android SHA-1 fingerprint

Stage 3: Core Domain Services & Integer Paise Financial Engine
  ├── Implement integer paise arithmetic & strict string parser (VWS-DOC-003)
  ├── Implement Zod validation schemas with extensible TankType (VWS-DOC-005)
  ├── Implement Version Manager Service (v1 -> v2 -> v3 correction chains)
  └── Implement Recycle Bin Service (30-day soft-delete lifecycle)

Stage 4: Cross-Platform UI Module Development
  ├── Build Main Dashboard with real-time KPI metrics & sync badge (VWS-DOC-002)
  ├── Build Site Details Module: Multi-tank form, Maps URL, Cash/Online choice
  ├── Build History Modal with chronological version timeline & diffs (PD-02)
  └── Build Accounts Module: Side-by-side Official/Personal ledger & Attendance

Stage 5: ExcelJS Generation & Google Drive Transport Engine
  ├── Implement ExcelJS workbook generator matching legacy formatting (VWS-DOC-007)
  ├── Implement Canonical UTF-8 JSON serializer & raw SHA-256 hasher (VWS-DOC-008)
  ├── Implement Google Drive Resumable Upload client with chunked streaming
  ├── Implement Firestore Distributed Lease Coordinator (system_locks)
  └── Implement Immutable Master Workbook Staging & Pointer Commitment (system_state)

Stage 6: Serverless Scheduled Worker Deployment
  ├── Implement Cloud Function v2: vws-daily-backup-worker
  ├── Configure Google Cloud Scheduler (Cron 0 23 * * * IST)
  └── Test failure retries, daily idempotency key, and catch-up recovery

Stage 7: End-to-End Verification & Owner Sign-Off
  ├── Execute multi-device concurrency test (Android + Web concurrent saves)
  ├── Execute offline cache simulation & reconnection drainage test
  ├── Execute catastrophic disaster recovery test from Google Drive JSON dump
  └── Deliver installable Android APK and production Web application to owner
```

---

## 6. Formal Blueprint Sign-Off Statement

### 6.1 Audit Certification
As Principal Software Architect, Database Architect, and Security Engineer, I hereby certify that:
1. The **Vetri Water Solutions (VWS)** documentation suite (`docs/`) is 100% internally consistent, technically viable, and mathematically sound.
2. All twenty-five business decisions and approved defaults are formally locked in the **Canonical Decision Register (DEC-01 through DEC-25)**.
3. Every architectural challenge (A through L) has been resolved with production-grade engineering patterns.
4. The documentation-only boundary of Phase 01 has been rigorously respected: **no application source code has been written and no cloud services have been deployed**.

### 6.2 Mandatory Hold Condition
**Phase 02 (Application Implementation) MUST NOT begin without the business owner's explicit written approval.** All engineering activities are halted at this milestone.

---
*Report End — Vetri Water Solutions Phase 01D Architecture Audit Complete.*

