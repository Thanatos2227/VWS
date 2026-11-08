# Vetri Water Solutions (VWS) — Feature Specification
**Document ID:** VWS-DOC-002  
**Project Phase:** Phase 01G — Final Contradiction Resolution & Owner Decision Gate  
**Status:** Authoritative Blueprint — Reconciled, Validated & Path-Aligned  
**Author:** Senior Software Architect, Database Architect, Security Engineer, QA Architect & Business Analyst  
**Date:** November 2026 (Phase 01G Final Contradiction Resolution)  

---

## 1. System Navigation & Information Architecture

The Vetri Water Solutions application is designed around high efficiency, minimal click-depth, and outdoor mobile legibility for the sole business owner.

```
                                  +-----------------------+
                                  |   Google Sign-In      |
                                  | (Single-Owner Guard)  |
                                  +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  |    Main Dashboard     |
                                  +-----------+-----------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
         +-----------------------+                         +-----------------------+
         |  Site Details Module  |                         |    Accounts Module    |
         +-----------+-----------+                         +-----------+-----------+
         | - New Site Entry Form |                         | - Daily Expense Entry |
         |   * Physical Bill #   |                         |   * Official Expenses |
         |   * Multiple Tanks    |                         |     - Attendance      |
         |     (OHT / UG, L*B*H) |                         |       (Wages+Tea+Bata)|
         |   * Maps URL / GPS    |                         |     - Staff Salary    |
         |   * Cash / Online     |                         |       (Monthly ind/all|
         |     (Explicit Choice) |                         |   * Personal Expenses |
         | - Correction History  |                         |     (Combined Ledger) |
         |   (v1 -> v2 -> v3)    |                         | - Daily Rollup View   |
         | - Search & Filtering  |                         | - Category Totals     |
         | - Recycle Bin (30-day)|                         | - Annual Summary View |
         +-----------+-----------+                         +-----------+-----------+
                     |                                                 |
                     +------------------------+------------------------+
                                              |
                                              v
                                  +-----------------------+
                                  | Backup & Sync Center  |
                                  | - Type 1: Excel (.xlsx|
                                  | - Type 2: DB JSON Dump|
                                  |   (Retained Forever)  |
                                  | - Resumable Uploads   |
                                  | - Drive Reauthorization|
                                  +-----------------------+
```

---

## 2. Module Specifications

### 2.1 Module 1: Authentication & Access Control (FS-AUTH)

#### 2.1.1 User Story
* *As the business owner, I want to sign in securely with my Google account so that no unauthorized individuals can view or tamper with my customer records, pricing, or personal financial details.*

#### 2.1.2 Functional Workflow
1. **Initial Screen:** User lands on a clean branded sign-in screen featuring the Vetri Water Solutions logo and a single primary action: **"Sign in with Google"**.
2. **OAuth Handshake:** System initiates Google OAuth 2.0 flow via Firebase Authentication (`GoogleAuthProvider`).
3. **Whitelist Verification:**
   * Upon successful token receipt, the application retrieves the authenticated user's email address.
   * If `user.email === CONFIG.AUTHORIZED_OWNER_EMAIL`:
     * Grant access, initiate user session, redirect to the Main Dashboard.
   * If `user.email !== CONFIG.AUTHORIZED_OWNER_EMAIL`:
     * Immediately terminate the session (`auth.signOut()`).
     * Transition to a secure **"Unauthorized Access"** screen displaying: *"This application is restricted to the authorized business owner. Your account ([email]) has not been granted access."*
     * Provide a single button to return to the sign-in screen.
4. **Session Persistence:**
   * The authenticated session remains persisted across browser reloads and Android app restarts via indexedDB/local secure storage.
5. **Sign Out:** An explicit **"Sign Out"** button is permanently accessible in the top-right user menu.
6. **Google Drive Storage Authorization Flow & Reauthorization:**
   * When Google Drive storage is first accessed or when an authorization token expires or is revoked:
     * System displays an informational banner: *"Google Drive backup authorization required. Click to authorize."*
     * Clicking triggers the standard Google OAuth consent flow for `drive.file` scope.
     * Core application functionality and Cloud Firestore database saves are **never** blocked by expired Drive tokens.
     * Once authorized, pending backup tasks resume automatically.

---

### 2.2 Module 2: Main Dashboard (FS-DASH)

#### 2.2.1 Purpose & Layout
The dashboard serves as the central operational cockpit, providing immediate situational awareness over business operations, current calendar year performance, and system health.

#### 2.2.2 Key Components
1. **Header Bar:**
   * Business Brand: Vetri Water Solutions.
   * Calendar Year Selector: Dropdown selector defaulting to current calendar year (e.g. `2026`).
   * Cloud Sync Health Pill: Visual indicator (`Synced`, `Syncing (Resumable)...`, `Offline - Cached`, `Drive Auth Required`).
   * Owner Profile Avatar & Sign Out trigger.
2. **Top-Level KPI Metric Cards (Active Calendar Year):**
   * **Total Sites Serviced:** Count of valid active customer site records (excluding soft-deleted and superseded versions).
   * **Gross Bill Value:** Formatted currency (₹).
   * **Total Discounts Given:** Formatted currency (₹).
   * **Net Billing Revenue:** Formatted currency (₹).
   * **Total Official Expenses:** Formatted currency (₹).
   * **Net Business Margin:** Formatted currency (`Net Billing Revenue - Official Expenses`).
3. **Primary Module Cards:**
   * **Site Details Card:** Action button **"Manage Sites & Customers"** + quick-action **"+ New Customer Site Entry"**.
   * **Accounts Card:** Action button **"Manage Accounts & Expenses"** + quick-action **"+ Add Daily Expense"**.
4. **Quick Backup Utility Bar:**
   * Button: **"Download Excel (.xlsx)"** (Instant local device download with freshness status).
   * Button: **"Sync to Google Drive"** (Triggers immediate cloud export of Excel and Database JSON backup).

---

### 2.3 Module 3: Site Details Management (FS-SITE)

#### 2.3.1 Form Data Fields & Validation Rules

| Field Label | Technical Name | Input Type | Required? | Confirmed Validation Rules & Defaults |
| :--- | :--- | :--- | :--- | :--- |
| **Date** | `workDate` | Date Picker | Yes | Defaults to today (`YYYY-MM-DD`). Cannot be empty. |
| **Customer Name** | `customerName` | Text | Yes | Min 2 chars, max 100 chars. Auto-capitalizes words. |
| **Location** | `location` | Text | Yes | Locality, town, or street address. Min 2 chars. |
| **Contact Number** | `contactNumber` | Tel / Text | Yes | Flexible valid phone format (accepts 10-digit mobile, +91, landline with STD; does not unnecessarily block valid business numbers). |
| **Google Location** | `googleLocation` | URL / GPS | Optional | Support manually pasting a Google Maps link OR capturing device GPS coordinates. GPS permission is strictly optional; handle denied/unavailable permission gracefully. Store coordinates and Maps URL when available. |
| **Total Number of Tanks**| `totalTanks` | Number | Yes | Integer $\ge 1$. Calculated automatically from or validated against tank entries array. |
| **Tank Details** | `tanks` | Dynamic Array | Yes | At least 1 tank item required (see Section 2.3.2). |
| **Bill Value (₹)** | `billValue` | Numeric | Yes | Gross billing amount for all tanks. Stored internally in integer paise ($1\text{ INR} = 100\text{ paise}$). |
| **Discount (₹)** | `discount` | Numeric | Yes | Decimal $\ge 0.00$. Cannot exceed `billValue`. Stored internally in integer paise. |
| **Final Value (₹)** | `finalValue` | Read-only | Auto | Reactive formula: `billValue - discount`. |
| **Physical Bill Number** | `billNumber` | Text | Yes | Manually entered from the owner's physical bill book (e.g. `1042`, `VWS-502`). **Do not auto-generate.** |
| **Payment Mode** | `paymentMode` | Dropdown/Radio | Yes | Strictly **`Cash`** or **`Online`**. **Mandatory selection — system must NOT silently default to Cash.** Customers pay immediately. No pending/partial workflows. |

#### 2.3.2 Tank Details Subform Specification (Task D & Confirmed Decision PD-06)
A single customer site visit may encompass multiple water tanks (e.g. 1 Overhead Tank + 1 Underground Tank, or multiple Overhead Tanks).

* **Tank Item Schema & Field Rules:**
  1. **Tank Type (Strictly OHT / UG in Initial UI — PD-06 / Task D):**
     * Two-option quick selector toggle / segmented control:
       * `[ OHT ]` (Overhead Tank)
       * `[ UG ]` (Underground Tank)
     * **No Free-Text / Custom Input in Initial Release:** In strict accordance with confirmed owner decision PD-06, the initial UI exposes strictly `OHT` and `UG`. Custom or free-text inputs are not exposed in the form. (Underlying database schema and TypeScript definitions retain extensibility for future additions without requiring migrations).
  2. **Length ($L$):** Numeric decimal in **Feet** (ft).
  3. **Breadth ($B$):** Numeric decimal in **Feet** (ft).
  4. **Height ($H$):** Numeric decimal in **Feet** (ft).
  5. **Capacity:** Numeric volume in **Litres (L)**.
* **Dynamic Controls:**
  * Action button: **"+ Add Another Tank"**.
  * Action button per row: **"Remove Tank"** (active only when total tanks > 1).
  * Auto-update: The parent field `Total Number of Tanks` automatically increments/decrements based on the array length.
* **Offline Draft Indicator (Task I):**
  * When saving offline, the site entry is persisted to the local cache with status badge: *"Saved Locally - Pending Cloud Commit"* (`syncStatus: 'PENDING_COMMIT'`). The server sequence number is assigned automatically upon reconnection.

#### 2.3.3 Single Combined Billing Workflow
* All tanks cleaned during a customer site visit are covered under **one combined bill**.
* Exactly one combined Bill Value, Discount, Final Value, Physical Bill Number, and Payment Mode apply to the entire job.
* Individual tanks do **not** carry separate independent prices.

#### 2.3.4 Correction History Lifecycle (Original v1 $\to$ Correction v2 $\to$ Correction v3 — Locked PD-01 to PD-04)
To maintain an immutable financial and operational audit trail, editing a saved customer record follows strict non-destructive correction mechanics:

```
[ Original Record v1 ] (id: "site_1001", status: "SUPERSEDED", isLatestValidVersion: false)
         |
         v (Owner initiates Edit -> updates dimensions or discount)
[ Correction Record v2 ] (id: "site_1002", originalRecordId: "site_1001", previousRecordId: "site_1001",
                          version: 2, status: "SUPERSEDED", isLatestValidVersion: false)
         |
         v (Owner initiates subsequent Edit)
[ Correction Record v3 ] (id: "site_1003", originalRecordId: "site_1001", previousRecordId: "site_1002",
                          version: 3, status: "ACTIVE", isLatestValidVersion: true, correctedAt: Timestamp)
```

1. **Immutable Records:** Submitting an edit does **NOT** overwrite any past document.
2. **Correction Chain Fields:**
   * `originalRecordId`: Points to root record (v1).
   * `previousRecordId`: Points to immediate predecessor (v2).
   * `version`: Sequential integer ($1, 2, 3 \dots$).
   * `correctedAt`: Server timestamp.
   * `correctionReason`: **Optional explanation entered by the owner (Authoritative Decision PD-01).** Leaving the field blank must never prevent or block a correction save.
3. **Active Version Isolation (No Double-Counting):**
   * Firestore transactional update atomically sets `isLatestValidVersion: false` on predecessor versions and `isLatestValidVersion: true` on the new version.
   * **Only the latest valid version contributes to active dashboard metrics and annual revenue totals.**
4. **UI Presentation & Timeline Modal (Authoritative Decisions PD-02, PD-03, PD-04):**
   * **Default Table View (PD-03):** The default Site Details table shows only the latest valid version (v3) tagged with a visual badge `v3 (Corrected)`.
   * **Version History Modal (PD-02 & PD-04):** Clicking the badge opens the chronological history timeline, displaying the full progression of v1, v2, and v3 with version numbers, timestamps, modifying user, and field diffs highlighted.
5. **Excel Export Representation (Authoritative Decision PD-05):**
   * Both original and correction records appear as separate identifiable rows.
   * Superseded original rows are styled with a soft gray background (`#E2E8F0`) and strikethrough text on financial values so that Excel formulas only sum active versions.

#### 2.3.5 Soft Deletion & 30-Day Recycle Bin Lifecycle
* Clicking "Delete" prompts a confirmation dialog.
* Deleting sets `isDeleted: true`, `deletedAt: Timestamp`, `deletedBy: userEmail`, `expiresForPurgeAt: Timestamp + 30 Days`.
* **Exclusion from Financial Totals:** Soft-deleted records are immediately excluded from active calculations and standard Excel exports.
* **Recycle Bin View:** Soft-deleted records are accessible in the **Recycle Bin** for **30 days**.
* **Safe Restoration:** Clicking "Restore" clears `isDeleted`. Restoring a record returns it to active status with its original sequence number and audit history intact. Restoring a record must **never** accidentally re-activate a superseded version.

---

### 2.4 Module 4: Accounts & Expense Management (FS-ACC)

#### 2.4.1 Architectural Split: Official vs. Personal
The accounts module is split into two distinct accounting streams to maintain complete tax and business clarity while honoring the owner's existing spreadsheet layout.

```
+---------------------------------------------------------------------------------------------------------+
|                                        ACCOUNTS MODULE DASHBOARD                                        |
+--------------------------------------------------------------------+------------------------------------+
|                       OFFICIAL EXPENSES (LEFT)                     |      PERSONAL EXPENSES (RIGHT)     |
+--------------------------------------------------------------------+------------------------------------+
| 1. Refreshment                                                     | 1. Transport                       |
| 2. Transport                                                       | 2. Refreshment                     |
| 3. Spares / HO                                                     | 3. Groceries / Vegetables / Milk   |
| 4. Staff Attendance                                                | 4. Lunch / Dinner                  |
|    - Headcount (Staff Attendance Count [Int])                      | 5. Other                           |
|    - One combined Staff Attendance Expense (₹)                     |                                    |
|      (Formula: Daily Wages + Tea + Refreshments + Bata)            |                                    |
| 5. Staff Salary                                                    |                                    |
|    - Monthly salary disbursements                                  |                                    |
|      (Individual staff entries OR Combined monthly lump-sum)       |                                    |
|    * Daily wages are NEVER counted under Staff Salary              |                                    |
+--------------------------------------------------------------------+------------------------------------+
| DAILY OFFICIAL TOTAL: [ Calculated Sum ]                           | DAILY PERSONAL TOTAL: [ Calc Sum ] |
+--------------------------------------------------------------------+------------------------------------+
|                                    DAILY GRAND TOTAL = OFFICIAL + PERSONAL                              |
+---------------------------------------------------------------------------------------------------------+
```

#### 2.4.2 Daily Expense Entry Form Specification & Edit Semantics (Correction F)
* **Entry Mode:** Date-centric. User selects a date (defaults to today) and logs official and personal expenses. Keyed by `YYYY-MM-DD`.
* **Category Edit Semantics (Correction F):**
  * **Default Replacement:** Editing an existing expense category replaces its previous value.
    * *Example:* Changing Refreshment from ₹100 to ₹150 sets the new total to ₹150.
  * **Deliberate Incremental Add Action:** Clicking **"+ Add Expense"** next to any category opens an incremental addition modal: $\text{newTotal} = \text{previousTotal} + \text{addedAmount}$.
  * **Immutable Audit History Modal:** Each daily account record contains an audit history timeline (`accounts_daily/{entryDate}/audit_log/{revisionId}`) recording modified field, previous value, new value, delta, user email, timestamp, and optional reason (PD-01, PD-02, PD-04).
* **Official Expenses Fields:**
  1. `offRefreshment` (Numeric, ₹, Default: 0)
  2. `offTransport` (Numeric, ₹, Default: 0)
  3. `offSparesHO` (Numeric, ₹, Default: 0)
  4. `offStaffAttendanceCount` (Integer $\ge 0$, Default: 0) — *Worker headcount present*.
  5. `offStaffAttendanceExpense` (Numeric, ₹, Default: 0) — *One combined attendance-related monetary expense. **Includes Daily Wages + Tea + Refreshments + Bata.** The system does NOT provide separate wage/bata fields.*
  6. `offStaffSalary` (Numeric, ₹, Default: 0) — *Monthly salary disbursements*.
     * Mode: Segmented control: `[ Combined Monthly Total ]` or `[ Individual Breakdown ]`.
     * If Individual Breakdown is chosen, user enters `staffName` + `amount`; the system derives the total into `staffSalary`.
     * *Anti-Duplication Guard:* Daily wages are already in Staff Attendance; daily wages must **never** be counted again under Staff Salary.
  7. *Official Notes / Remarks* (Text, Optional).
* **Personal Expenses Fields (Combined Household Ledger):**
  1. `persTransport` (Numeric, ₹, Default: 0)
  2. `persRefreshment` (Numeric, ₹, Default: 0)
  3. `persGroceriesVegMilk` (Numeric, ₹, Default: 0)
  4. `persLunchDinner` (Numeric, ₹, Default: 0)
  5. `persOther` (Numeric, ₹, Default: 0)
  6. *Personal Notes / Remarks* (Text, Optional).

#### 2.4.3 Reactive Financial Formulas
* $\text{Daily Official Total} = \text{offRefreshment} + \text{offTransport} + \text{offSparesHO} + \text{offStaffAttendanceExpense} + \text{offStaffSalary}$
* $\text{Daily Personal Total} = \text{persTransport} + \text{persRefreshment} + \text{persGroceriesVegMilk} + \text{persLunchDinner} + \text{persOther}$
* $\text{Daily Grand Total} = \text{Daily Official Total} + \text{Daily Personal Total}$
* $\text{Annual Official Total} = \sum_{\text{calendar year}} \text{Daily Official Totals}$
* $\text{Annual Personal Total} = \sum_{\text{calendar year}} \text{Daily Personal Totals}$
* $\text{Annual Grand Total} = \text{Annual Official Total} + \text{Annual Personal Total}$
* *Precision Rule:* All calculations execute using integer paise internally ($1\text{ INR} = 100\text{ paise}$) to avoid floating-point inaccuracies.

---

### 2.5 Module 5: Excel Workbook Generation (FS-XLS)

#### 2.5.1 Specifications & Mechanics
* **Engine:** Client-side generation using `ExcelJS` library.
* **File Naming:** `Vetri_Water_Solutions.xlsx` (.xlsx, not CSV).
* **Calendar-Year Partitioning:**
  * For every active calendar year (Jan 1 to Dec 31):
    * `[YEAR] - Site Details` (e.g. `2026 - Site Details`)
    * `[YEAR] - Accounts` (e.g. `2026 - Accounts`)
  * Monthly sheets are strictly prohibited. Historical annual worksheets are preserved.
* **Site Details Sheet Structure (Authoritative Decision PD-05):**
  * Exactly one customer/site bill occupies one primary row.
  * Multiple tanks are rendered cleanly within that row via multi-line text (`Alt+Enter`):
    * Tank Types: `OHT` \n `UG`
    * Measurements: `10x8x6 ft` \n `12x10x6 ft`
    * Capacities: `5,000 L` \n `10,000 L`
  * Original and correction records appear as separate identifiable rows referencing their relationship.
  * **Superseded Row Formatting:** Superseded original rows are styled with a soft gray background fill (`#E2E8F0`) and strikethrough typography on financial columns.
  * **Dynamic Formula Logic:** Summary formulas at the bottom use `=SUMIF()` to strictly sum active records, excluding superseded and deleted rows.
  * Entry sequence is preserved.
* **Accounts Sheet Structure:**
  * Official on left (Columns A–H), Spacer (Column I), Personal on right (Columns J–O), and Daily Grand Total (Column P).
  * Matches the visual style and structure of the owner's supplied spreadsheet reference.
  * Native dynamic formulas (`=SUM(...)`) and Indian currency formatting (`₹ #,##0.00`).

---

### 2.6 Module 6: Dual Google Drive Backup Center & Indefinite Retention (FS-DRV)

#### 2.6.1 Cloud Directory Topology & Two Distinct Backup Types
```
My Google Drive /
└── Vetri Water Solutions /                             <-- Dedicated Application Folder
    ├── Vetri_Water_Solutions.xlsx                      <-- Master Live Workbook (Always latest)
    │
    ├── Backups /                                       <-- Type 1: Excel Historical Snapshots
    │   ├── VWS_Backup_2026-11-06_220000.xlsx
    │   └── ...
    │
    └── Database_Backups /                              <-- Type 2: Complete Database Backups (JSON)
        ├── VWS_Database_Dump_2026-11-06_220000.json   <-- Retained Indefinitely
        └── ...
```

#### 2.6.2 Backup Types & Recovery Scope (Corrections A–L & Tasks B, E, F, G)
1. **Type 1 — Excel Business Backup (Artifact 3):**
   * Used for day-to-day business reporting, manual device downloads, and spreadsheet viewing (lossy; not for database restoration).
   * **Authoritative Master vs Convenience Root Copy (Task E):** Master workbook is uploaded first as an immutable versioned file under `Backups/VWS_Workbook_YYYY-MM-DD_rev{rev}.xlsx`, verified, pointer atomically committed in `system_state/master_workbook_pointer` (`currentDriveFileId`), and then published to root `Vetri_Water_Solutions.xlsx`. If root copy fails, status is `ROOT_COPY_FAILED`, but the staged version in `Backups/` remains completely safe, intact, and 100% authoritative.
2. **Type 2 — Complete Database Backup (JSON) — Indefinite Retention (Artifact 2):**
   * Comprehensive JSON export containing all Firestore collections: `sites` (including all historical correction versions and soft-deleted records), `accounts_daily`, `system_counters`, and audit metadata.
   * **Retained Indefinitely:** Every verified daily JSON dump is preserved permanently in `Database_Backups/` without automated deletion or pruning.
   * **Non-Circular Cryptographic Checksum:** SHA-256 hash is computed over the raw canonical UTF-8 JSON bytes and stored externally in a companion manifest (`.json.sha256`) and in Firestore metadata.
   * Required for full catastrophic database restoration, since Excel does not carry version chains or deleted tombs.
3. **Autonomous Cloud Scheduling vs. Companion Sync (Tasks B, F, G):**
   * **Authoritative Engine:** Google Cloud Scheduler with standard 5-field cron `0 23 * * *` and `--time-zone="Asia/Kolkata"` triggers Cloud Functions (2nd Gen) worker on Firebase Blaze.
   * **Backend Authorization Architecture (Task B):** The worker reads the owner's OAuth 2.0 refresh token securely from **Google Cloud Secret Manager** (`projects/{project}/secrets/vws-drive-backend-refresh-token`), IAM-restricted to `roles/secretmanager.secretAccessor` on the worker service account, exchanging it for short-lived access tokens to access personal `@gmail.com` Drive folders.
   * **Missed Backup Semantics (Task F):** Delayed runs capture the database state at the time of execution, recording honest `snapshotStartTime` / `snapshotEndTime` temporal boundaries rather than fabricating past snapshots.
   * **Blaze Cost Transparency (Tasks G, E):** Backups run on the Blaze plan with free tier compute; monitored via a proposed ₹500/month budget alert (REC-02) with 50%, 80%, and 100% notification thresholds. *Note:* The budget alert is an alerting notification mechanism, not a hard automated cap that stops billing or service.
   * **Companion Layer:** Client-side debounced sync (2 min after save) serves as an immediate-response companion layer during active work sessions.
4. **Canonical Task Queue (Task C Resolution):**
   * Cloud-durable canonical task queue (`system_tasks/{taskId}`) coordinates snapshot generation and upload stages across Cloud Functions and clients. Retries stream the pre-compiled immutable payload without re-querying mutable database state.
5. **Offline Export vs. Cloud Export Freshness Indication:**
   * When online, exports generate from live Cloud Firestore data (`Freshness: Live Cloud Data`).
   * When offline, exports generate from local cache (`Freshness: Offline Local Cache — Sync Pending`). The UI clearly displays this distinction and never labels an offline export as complete cloud data.
6. **Interactive Reauthorization Handling & Error Disambiguation (Task A):**
   * When Drive authorization expires (`invalid_grant`) or returns HTTP 401/403, a warning badge alerts the owner: *"Drive Authorization Required"*. Clicking it launches the Google reauthorization prompt. Database operations remain completely unblocked.
7. **Storage Quota Monitoring (SI Decimal Units / Correction J):**
   * Automatic quota query (`about.get`) alerts the owner at 80% (12 GB) and 90% (13.5 GB) of the 15 GB shared Google storage. If Drive reaches 100% capacity, uploads stop with a clear error without degrading database operations.
8. **Purge Reconciliation (Correction I):**
   * Active Firestore soft-deleted records are purged after 30 days to keep live database latency low, while indefinite Drive JSON retention preserves permanent archival records forever.

---

## 3. Screen Inventory & State Specifications

| Screen Code | Screen Name | Route | Key States Handled |
| :--- | :--- | :--- | :--- |
| **SCR-01** | Sign-In Screen | `/login` | Unauthenticated, Authenticating, Unauthorized Access Alert. |
| **SCR-02** | Master Dashboard | `/` | Loading metrics, Ready, Offline indicator, Backup health badge. |
| **SCR-03** | Site Details List | `/sites` | Latest valid records shown by default, Search active, Date filter. |
| **SCR-04** | New Site Entry | `/sites/new` | Multi-tank subform, Optional GPS capture, Mandatory Cash/Online selection. |
| **SCR-05** | Edit / Correction Modal| `/sites/edit/:id`| Pre-filled form, Creates linked correction record (v2, v3), Optional reason. |
| **SCR-06** | Version History Modal | `/sites/history/:id`| Chronological timeline of v1 $\to$ v2 $\to$ v3 with timestamps and diffs. |
| **SCR-07** | Recycle Bin | `/recycle-bin` | Displays soft-deleted records within 30-day window, One-click restore. |
| **SCR-08** | Accounts Ledger | `/accounts` | Side-by-side (desktop), Tabbed (mobile), Calendar year selector. |
| **SCR-09** | Daily Expense Form | `/accounts/daily`| Attendance (Wages+Tea+Bata), Salary mode (Ind/All), Real-time sum. |
| **SCR-10** | Backup & Sync Center| `/backup` | Type 1 (Excel) & Type 2 (JSON) sync, Resumable status, Indefinite retention log. |
| **SCR-11** | Sync Conflict Review Modal| Modal / Overlay | Stale base detection diffs, Apply offline changes, Discard draft, Edit values. |
