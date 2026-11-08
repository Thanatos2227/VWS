# Vetri Water Solutions (VWS) — Master Requirements Document
**Document ID:** VWS-DOC-001  
**Project Phase:** Phase 01G — Final Contradiction Resolution & Owner Decision Gate  
**Status:** Authoritative Blueprint — Reconciled & Validated with Confirmed Owner Decisions  
**Author:** Senior Software Architect, Database Architect, Security Engineer, QA Architect & Business Analyst  
**Date:** November 2026 (Phase 01G Final Contradiction Resolution)  

---

## 1. Executive Summary

**Vetri Water Solutions (VWS)** is a dedicated water tank cleaning, maintenance, and water treatment service provider. The business currently manages all operational site logs, customer billing data, official business expenditures, and personal finances manually using desktop Microsoft Excel spreadsheets.

While manual spreadsheets provided initial operational flexibility, the business has outgrown direct spreadsheet editing due to:
1. High risk of accidental cell overwriting, formula breakage, and deletion.
2. Inefficient and cumbersome data entry on mobile devices when in the field or on customer sites.
3. Lack of automated, real-time financial rollups (daily and annual totals across official and personal streams).
4. Absence of centralized cloud backup and version-controlled disaster recovery.
5. Inability to search or filter historical site records rapidly while on-site or speaking with clients.

The **Vetri Water Solutions Application** will transition the business to a modern, private, owner-only business management solution accessible across **Web (Desktop/Laptop/Mobile browsers)** and as an **Installable Android Application**. 

The system guarantees that Cloud Firestore serves as the **centralized single source of truth**, while continuing to automatically generate and maintain formatted, calendar-year Excel workbooks (`Vetri_Water_Solutions.xlsx`) and comprehensive database backup dumps synchronized directly to the owner's **Google Drive**.

This is strictly a private business-management application for the authorized business owner. It is **not** a customer-facing or staff-facing portal.

---

## 2. Problem Statement & Business Opportunity

### 2.1 Current State ("As-Is" Workflow)
* **Data Entry Mechanism:** The business owner enters customer site records, tank parameters, bill details, daily business costs, and personal day-to-day expenses directly into an Excel workbook on a laptop or mobile spreadsheet viewer.
* **Friction Points:**
  * Small mobile screen editing causes typographical errors and misaligned rows.
  * Form equations and summary totals are prone to manual corruption.
  * Searching for past customer records requires manual scanning or rudimentary spreadsheet searches.
  * Expense entries are prone to omission when the owner is mobile and away from the primary computing device.
  * Device loss or accidental file deletion poses an existential risk to historical business data.

### 2.2 Desired State ("To-Be" Solution)
* **Single-Owner Application:** A streamlined, responsive application with purpose-built input forms for **Site Details** and **Accounts**.
* **Zero Spreadsheet Overwrite Risk:** Data is captured into a transactional Cloud NoSQL database with automated validation.
* **Non-Destructive Correction Audit Trail:** Editing a past record creates an audit-linked correction record rather than mutating past history, preserving complete historical integrity.
* **Familiar Output Maintained:** The system automatically exports and synchronizes the exact visual and structural layout of the owner's legacy Excel workbook to Google Drive.
* **Dual Platform Access:** Instant synchronization between desktop web browser and Android mobile app.

---

## 3. Stakeholder & User Persona

| Attribute | Details |
| :--- | :--- |
| **Primary User** | Business Owner & Sole Operator of Vetri Water Solutions. |
| **User Role** | Single authorized administrator. No other staff, worker, or customer logins. |
| **Technical Proficiency** | Comfortable with smartphone apps, Google ecosystem, and basic Excel data entry. Not a programmer. |
| **Primary Work Environments** | On-site / in-field (mobile device in outdoor conditions), home office / vehicle (laptop or smartphone). |
| **Core Goals** | 1. Enter site job details in under 45 seconds.<br>2. Record daily official & personal expenses on the fly.<br>3. Inspect daily financial health and annual revenue at a glance.<br>4. Have a reliable Excel file automatically backed up in Google Drive without manual formatting. |

---

## 4. Master Functional Requirements (Authoritative Owner Decisions)

### 4.1 Authentication & Security (FR-AUTH)
* **FR-AUTH-01 (Google Authentication):** System must exclusively support Google OAuth 2.0 Sign-In.
* **FR-AUTH-02 (Single-Owner Whitelist):** Only the specific, pre-configured Google account of the business owner is authorized to authenticate. All other Google accounts must be explicitly rejected with an unauthorized access screen.
* **FR-AUTH-03 (Database-Level Authorization):** Backend security rules (Cloud Firestore Rules) must strictly enforce read/write access solely to the verified Google UID/Email of the owner. Frontend-only checks are strictly forbidden.
* **FR-AUTH-04 (Secure Configuration):** The authorized owner email must be managed through secure backend configuration, never hardcoded in insecure client-side source.
* **FR-AUTH-05 (Session Management):** Persistent authentication state across mobile and web sessions with secure token refresh and explicit logout capability.
* **FR-AUTH-06 (Decoupled Drive Authorization):** Authentication (identity verification) is architecturally decoupled from Google Drive API authorization (least-privilege `drive.file` scope).
* **FR-AUTH-07 (Drive Reauthorization Protocol — Confirmed Decision):** When Google Drive access expires, is revoked, or becomes invalid on Android or Web:
  * The system detects the condition (HTTP 401 / token invalidity).
  * The application displays an informative notification explaining that Drive authorization is required.
  * The owner can initiate reauthorization via a dedicated one-click prompt.
  * Normal application usage and Cloud Firestore database saves are **never** blocked or rolled back by an expired Drive token.
  * Pending backup synchronization resumes automatically once authorization is re-established.
  * No mandatory persistent backend-managed authorization infrastructure is introduced solely to bypass reauthorization.

### 4.2 Site Details Management (FR-SITE)
* **FR-SITE-01 (Single Customer Job Model):** Capture one site visit / customer bill record containing:
  1. Date
  2. Customer Name
  3. Location
  4. Contact Number
  5. Google Location (manually pasted URL or captured GPS coordinates)
  6. Tank Details (dynamic array of tank specifications)
  7. Total Number of Tanks
  8. Bill Value
  9. Discount
  10. Final Value
  11. Physical Bill Number
  12. Payment Mode
* **FR-SITE-02 (Google Location Dual Capture):**
  * Support manual pasting of a Google Maps share link.
  * Support optional GPS coordinate capture (latitude, longitude) on compatible mobile/web devices.
  * GPS permission must be strictly optional; denial or unavailability of location permission must be handled gracefully without blocking form submission.
  * Store both coordinates (latitude/longitude) and Maps URL when available.
* **FR-SITE-03 (Tank Details & Initial UI Restrictions — PD-06 & Task D):**
  * Multiple tanks can belong to one site visit.
  * In the initial application user interface, tank type selection is strictly constrained to **`OHT` (Overhead Tank)** and **`UG` (Underground Tank)**. Free-text inputs and "Other" types are removed from the initial UI.
  * Each tank records its own:
    * **Tank Type:** Strictly `OHT` or `UG` in initial release UI (underlying schema remains extensible).
    * **Length:** Dimension in Feet ($L$).
    * **Breadth:** Dimension in Feet ($B$).
    * **Height:** Dimension in Feet ($H$).
    * **Capacity:** Volume in Litres ($L$).
  * Total number of tanks must be calculated from or validated against the tank entries array.
* **FR-SITE-04 (Single Combined Billing & Financial Safety — Correction H & Task K):**
  * All tanks cleaned during one site visit are covered under **one combined bill**.
  * A single combined Bill Value, Discount, Final Value, Bill Number, and Payment Mode apply to the site visit.
  * **Formula:** $\text{Final Value} = \text{Bill Value} - \text{Discount}$.
  * **Financial Safety Controls:**
    1. All calculations use native integer paise ($1\text{ INR} = 100\text{ paise}$).
    2. Input currency strings parsed directly into integer paise without floating-point conversion.
    3. Checked against `Number.MAX_SAFE_INTEGER` ceiling.
    4. Strict bounds: $\text{Bill Value} \ge 0$, $\text{Discount} \ge 0$, and $\text{Discount} \le \text{Bill Value}$.
    5. Formatted for display using Indian numbering system (`en-IN`: `₹1,00,000.00`).
    6. Practical operational validation ceilings (Architecture Recommendations): Single Bill Value $\le ₹10,00,000$ ($100,000,000$ paise); Single Expense $\le ₹5,00,000$ ($50,000,000$ paise); Daily Grand Total Expense $\le ₹25,00,000$ ($250,000,000$ paise). Configurable by owner for commercial contracts.
* **FR-SITE-05 (Physical Bill Number Entry):**
  * The Bill Number is manually entered by the owner from their physical bill book (e.g. `1042`, `VWS-502`).
  * The system must **not** auto-generate or overwrite the physical bill number.
* **FR-SITE-06 (Immediate Payment Requirement & Mode Validation):**
  * All customers pay immediately upon job completion.
  * Payment Mode must be explicitly selected as **`Cash`** or **`Online`**.
  * *Integrity Rule:* The system must **not** silently default a missing or invalid payment mode to Cash; the form must mandate an explicit selection before saving.
  * No pending payments, partial payments, credit ledgers, or outstanding balances in the initial release.
* **FR-SITE-07 (Non-Destructive Correction History Lifecycle):**
  * Editing an existing record must **NOT** overwrite the original record.
  * System creates a new immutable correction record linked to the original via `originalRecordId` and immediate predecessor via `previousRecordId`.
  * Increment version sequentially ($v1 \to v2 \to v3$).
  * Predecessor records are marked `isLatestValidVersion: false` and `status: "SUPERSEDED"`.
  * **Only the latest valid version contributes to active financial totals.** Superseded versions are excluded from totals to prevent double-counting.
  * Excel export retains corrections as separate identifiable rows referencing the original entry.
* **FR-SITE-08 (Search & Filter Engine):** Enable instantaneous search by Customer Name, Bill Number, Location, and Contact Number. Support date range filtering.
* **FR-SITE-09 (Aggregate Financial Totals):** Provide real-time computed totals for total sites serviced, gross bill value, total discounts granted, and net final billing value.
* **FR-SITE-10 (Correction Reason Optional — Confirmed PD-01):** The reason for correction input field is strictly optional. The system must never prevent, reject, or block a correction commit because the reason field is blank.
* **FR-SITE-11 (Chronological Version Timeline — Confirmed PD-02 & PD-04):** The application must provide a dedicated history timeline modal / slide-over drawer accessible via an indicator chip (e.g. `v3 (Corrected)`). It displays the complete chronological chain ($v1 \to v2 \to v3$) with version numbers, timestamps, modifying user, and visual highlighting of modified field differences.
* **FR-SITE-12 (Latest Valid Version Default View — Confirmed PD-03):** The primary Site Details ledger table must display strictly the latest valid version of each site job (`isLatestValidVersion == true`). Superseded predecessors are hidden from the active list to prevent visual clutter and confusion.
* **FR-SITE-13 (Tank Type Technical Extensibility with Strict OHT/UG UI — Confirmed PD-06 & Task D):** The initial UI form exposes strictly `OHT` and `UG` as selectable options. The underlying data model and TypeScript types (`TankType = PredefinedTankType | (string & {})`) retain technical extensibility so that future specialized tank types can be added without database migrations or code redesign. Custom free-text input is intentionally disabled in the initial release in strict adherence to owner decision PD-06.

### 4.3 Accounts & Expense Management (FR-ACC)
* **FR-ACC-01 (Dual Expense Segregation):** The Accounts module contains two separate expense sections:
  1. **Official Expenses**
  2. **Personal Expenses**
* **FR-ACC-02 (Official Expenses Categories):**
  1. Refreshment
  2. Transport
  3. Spares / HO
  4. Staff Attendance
  5. Staff Salary
* **FR-ACC-03 (Staff Attendance Accounting — Authoritative Decision):**
  * Record daily staff attendance count (worker headcount).
  * Record **one combined Staff Attendance Expense** amount.
  * **The combined Staff Attendance Expense includes:**
    * Daily staff wages.
    * Tea.
    * Refreshments.
    * Bata.
  * **Formula:** $\text{Staff Attendance Expense} = \text{Daily Wages} + \text{Tea/Bata}$.
  * The system must **not** create separate wage and Bata expense fields.
  * The combined amount contributes exactly once to Official Expenses.
* **FR-ACC-04 (Staff Salary Accounting — Authoritative Decision):**
  * Staff Salary is strictly reserved for monthly salary disbursements.
  * Supports:
    * Individual staff salary entries (e.g. staff member name and amount).
    * Combined monthly salary entries (lump-sum monthly payment).
  * The system preserves the distinction between individual and combined entries in data records and reports.
  * **Strict Anti-Duplication Rule:** Daily worker wages are already included in Staff Attendance Expense. Daily wages must **never** be counted again under Staff Salary.
  * The database schema defines an unambiguous single source of truth for salary totals.
* **FR-ACC-05 (Personal Expenses Categories):**
  1. Transport
  2. Refreshment
  3. Groceries / Vegetables / Milk
  4. Lunch / Dinner
  5. Other
  * Maintained as one combined household/personal expense ledger.
* **FR-ACC-06 (Daily Financial Rollup Calculations):**
  * $\text{Daily Official Total} = \sum(\text{5 Official Categories})$.
  * $\text{Daily Personal Total} = \sum(\text{5 Personal Categories})$.
  * $\text{Daily Grand Total} = \text{Daily Official Total} + \text{Daily Personal Total}$.
* **FR-ACC-07 (Annual Financial Rollup Calculations):**
  * Annual Official Total = sum of all Daily Official Totals in the calendar year.
  * Annual Personal Total = sum of all Daily Personal Totals in the calendar year.
  * Annual Grand Total = Annual Official Total + Annual Personal Total.
  * Annual category totals for each of the 5 official and 5 personal categories.
  * Calculated strictly from valid, non-deleted daily records for the selected calendar year.
* **FR-ACC-08 (Layout Parity):** Emulate the visual side-by-side layout of the owner's reference spreadsheet (Official Expenses on Left, Personal Expenses on Right) in desktop views.
* **FR-ACC-09 (Category Edit Semantics & Audit History — Correction F):**
  * Editing an existing expense category in daily accounts **replaces** its current value by default (`editMode: 'REPLACE'`).
  * Adding an additional expense to an existing category requires a deliberate **"+ Add Expense"** action (`editMode: 'INCREMENT'`), which adds to the previous value.
  * Every edit appends an immutable revision audit log in `accounts_daily/{entryDate}/audit_log/{revisionId}` recording timestamp, modifying user, category name, before amount, after amount, delta, and optional reason (PD-01, PD-02, PD-04).
  * Monotonic `revisionsCount` is tracked on the daily record.

### 4.4 Calendar-Year Excel Organization (FR-XLS)
* **FR-XLS-01 (Workbook File Specification):** Master workbook named `Vetri_Water_Solutions.xlsx` formatted as an Open XML (.xlsx) spreadsheet. CSV format is prohibited.
* **FR-XLS-02 (Calendar-Year Partitioning):**
  * Strictly structured by **Calendar Year** (`January 1` to `December 31`).
  * For every active calendar year, create two worksheets:
    * `[YEAR] - Site Details` (e.g. `2026 - Site Details`)
    * `[YEAR] - Accounts` (e.g. `2026 - Accounts`)
  * Monthly worksheets are strictly prohibited.
  * Historical annual worksheets must be preserved across years.
* **FR-XLS-03 (Site Details Worksheet Layout):**
  * Exactly one customer/site bill occupies one primary row in the annual worksheet.
  * Multiple tanks are represented clearly within that row using structured multi-line cell formatting (`Alt+Enter`) detailing Tank Type (`OHT`/`UG`), Dimensions ($L \times B \times H$ ft), and Capacity ($L$).
  * Retain original and correction records as separate identifiable rows referencing their relationship.
  * Preserve original chronological record-entry sequence.
  * Apply professional styling, borders, column widths, and Indian currency formatting (`₹ #,##0.00`).
* **FR-XLS-04 (Accounts Worksheet Layout):**
  * Official Expenses on the left; Personal Expenses on the right.
  * Daily expense rows with daily totals, category totals, and annual totals using native dynamic Excel `=SUM(...)` formulas.
  * Matches the visual style and structure of the owner's supplied spreadsheet reference.
* **FR-XLS-05 (Excel Superseded Record Presentation — Confirmed PD-05):**
  * Original and corrected records appear as separate identifiable rows in `[YEAR] - Site Details` to preserve complete audit history.
  * Superseded rows are formatted with a soft gray background fill (`#E2E8F0`) and strikethrough typography on financial columns.
  * Dynamic worksheet summary formulas must use `=SUMIF()` or equivalent logic to strictly exclude superseded and deleted records from financial totals.

### 4.5 Dual Google Drive Backup Architecture & Indefinite Retention (FR-DRV)
* **FR-DRV-01 (Dedicated Cloud Storage):** Maintain a dedicated root folder named `Vetri Water Solutions` on the owner's Google Drive.
* **FR-DRV-02 (Two Distinct Backup Types):**
  1. **Type 1 — Excel Business Backup:**
     * Live master workbook: `Vetri_Water_Solutions.xlsx`.
     * Timestamped historical Excel copies in `Backups/` subfolder.
     * Used for business reporting, manual downloads, and spreadsheet viewing.
  2. **Type 2 — Complete Database Backup (JSON):**
     * Complete Firestore document dumps stored in `Database_Backups/` subfolder.
     * Contains all site records, all correction versions, predecessor links, soft-deleted records, audit metadata, daily accounts, and sequence counters.
     * Required for full catastrophic database restoration (since Excel does not contain version chains or deleted tombs).
* **FR-DRV-03 (Indefinite Daily JSON Backup Retention & Non-Circular Checksum):**
  * **Every successfully verified daily database JSON backup must be retained indefinitely.**
  * The system must **never** automatically delete or prune older daily database backups.
  * Each backup preserves its exact timestamp, sequential export version, document counts, and schema version.
  * **Non-Circular Cryptographic Verification:** Cryptographic SHA-256 hash is computed over the raw canonical UTF-8 bytes of the serialized JSON payload. The hash is stored externally in a companion manifest file (`.json.sha256`), Firestore metadata, and Drive file properties—never embedded inside the payload it hashes.
  * Chronological identification format: `Database_Backups/VWS_DB_Backup_YYYY-MM-DD_v{exportVersion}.json`.
  * Incomplete or failed uploads must **never** be recorded as valid backups.
* **FR-DRV-04 (Storage Growth & Capacity Transparency — Correction J):**
  * Each daily JSON backup dump is projected to require approximately 50 KB to 2.0 MB (scaling with multi-year business volume).
  * Standard SI Decimal Units calculation ($1\text{ KB} = 1,000\text{ B}$, $1\text{ MB} = 10^6\text{ B}$, $1\text{ GB} = 10^9\text{ B}$):
    * 1 Year (365 dumps): $18.25\text{ MB} - 730\text{ MB}$ ($0.12\% - 4.87\%$ of 15 GB).
    * 3 Years (1,095 dumps): $54.75\text{ MB} - 2.19\text{ GB}$ ($0.37\% - 14.60\%$ of 15 GB).
    * 5 Years (1,825 dumps): $91.25\text{ MB} - 3.65\text{ GB}$ ($0.61\% - 24.33\%$ of 15 GB).
    * 10 Years (3,650 dumps): $182.5\text{ MB} - 7.30\text{ GB}$ ($1.22\% - 48.67\%$ of 15 GB).
  * While Google Drive's standard 15 GB free quota provides ample headroom for years of VWS business backups, the system must **not** claim unlimited storage or zero long-term cost.
  * System queries Drive Quota API (`about.get`) before uploads: warns at 80% capacity (12 GB), issues high-priority warning at 90% (13.5 GB), and handles `403 storageQuotaExceeded` without blocking core Firestore operations.
* **FR-DRV-05 (Autonomous Backup Engine, Immutable Staging & Durable Tasks — Corrections A–L & Tasks B, E, F, G):**
  * **Autonomous Cloud Scheduler Architecture (Tasks B, F, G):** Daily autonomous backups are orchestrated by Google Cloud Scheduler with standard 5-field cron `0 23 * * *` and `--time-zone="Asia/Kolkata"` triggering Cloud Functions (2nd Gen) worker `vws-daily-backup-worker` under dedicated Service Account on Firebase Blaze.
  * **Backend Authorization Architecture (Task B):** The Cloud Function retrieves the owner's OAuth 2.0 refresh token securely from **Google Cloud Secret Manager** (`projects/{project}/secrets/vws-drive-backend-refresh-token`) via least-privilege IAM (`roles/secretmanager.secretAccessor`), exchanging it for access tokens to interact with the owner's personal `@gmail.com` Google Drive.
  * **Missed Backup Semantics (Task F):** Delayed executions snapshot the live database state at the time of execution, recording honest `snapshotStartTime` and `snapshotEndTime` temporal boundaries rather than fabricating past history.
  * **Cost Transparency & Budget Alert (Tasks G, E):** Backups run on the Blaze plan (REC-01) with free tier compute; storage and build services are monitored via a proposed ₹500/month Google Cloud Budget Alert (REC-02) with 50%, 80%, and 100% notification thresholds. *Critical Distinction:* A Google Cloud Budget Alert is an alerting notification mechanism, NOT a hard automated spending cap that terminates cloud services. Actual charges may exceed ₹500 if runaway cloud activities occur.
  * **Companion Client Layer:** Client-side debounced sync (2 min after save) serves as an immediate-response companion layer during active work sessions.
  * **Immutable Version Staging with Authoritative Master Pointer (Task E):** Direct writes to root `Vetri_Water_Solutions.xlsx` are prohibited. Workbooks are staged in `Backups/VWS_Workbook_YYYY-MM-DD_rev{rev}.xlsx`, verified, and the authoritative pointer is committed in `system_state/master_workbook_pointer`. The root workbook is updated as a convenience copy; if root copy fails, `publicationStatus` is flagged `ROOT_COPY_FAILED`, and the staged backup remains 100% authoritative.
  * **Decoupled Task Queue (Tasks A, C):** Cloud Firestore canonical durable queue (`system_tasks/{taskId}`) separates snapshot generation from snapshot upload. Upload retries stream the pre-compiled immutable payload without re-querying mutable database state.
  * Resumable Upload protocol (`uploadType=resumable`) handles mobile network transport.
* **FR-DRV-06 (Data Authority Principle):**
  * Cloud Firestore is the **single source of truth**.
  * Excel and JSON dumps are generated backup artifacts.
  * A Drive upload failure must **never** undo, block, or lose a successfully saved database record.
* **FR-DRV-07 (Offline Export Freshness Indication):**
  * Distinguish exports generated from live cloud data from those generated from local offline cache.
  * Display clear data freshness and completeness status badges; never mislabel an offline export as complete cloud data.
* **FR-DRV-08 (Reconcile 30-Day Firestore Purge with Indefinite Drive Retention — Correction I):**
  * Active Firestore soft-deleted records are purged after 30 days to keep operational indices lean and queries fast.
  * Historical daily JSON backups in Google Drive are retained indefinitely with zero pruning.
  * Purged records cease to exist in active Firestore, but remain permanently recoverable from historical daily JSON backups created prior to purge.

### 4.6 Record Deletion & 30-Day Recovery Lifecycle (FR-DEL)
* **FR-DEL-01 (Soft Deletion):** Deleting a record performs a soft delete (`isDeleted: true`), preserving record ID, `deletedAt` timestamp, and `deletedBy` user identity.
* **FR-DEL-02 (Recycle Bin Interface):** Deleted records are accessible in a Recycle Bin view.
* **FR-DEL-03 (30-Day Retention Period):** Support restoration of deleted records for **30 days**.
* **FR-DEL-04 (Restoration Safety):** Restoring a record returns it to the active ledger, preserving its original sequence number and audit history. Restoring a record must **never** accidentally re-activate a superseded version.
* **FR-DEL-05 (Exclusion from Financial Totals):** Deleted records are strictly excluded from active dashboard calculations and standard Excel exports.
* **FR-DEL-06 (Permanent Deletion Safeguard):** Permanent physical deletion occurs only after the 30-day recovery period has elapsed, subject to verified cloud backup safeguards.

---

## 5. Non-Functional Requirements (NFR)

| ID | Category | Requirement Specification |
| :--- | :--- | :--- |
| **NFR-01** | **Availability & Reliability** | Firestore 99.9% target design objective. Offline draft cache provides resilience during connectivity dropouts. |
| **NFR-02** | **Performance & Latency** | Form submission < 1.0s on 4G networks. Client-side financial calculations < 50ms using integer arithmetic. |
| **NFR-03** | **Financial Precision** | Proposed internal representation in **integer paise** ($1\text{ INR} = 100\text{ paise}$; REC-04 awaiting owner approval) to eliminate floating-point rounding errors. Converted to rupees for UI and Excel. |
| **NFR-04** | **Security & Privacy** | Single-owner whitelist enforced at identity provider, client routes, and database security rules. No public read/write. |
| **NFR-05** | **Data Integrity & Traceability** | Strict schema validation. Immutable audit trail via correction records. Predecessor links and atomic version transitions prevent duplicate totals. |
| **NFR-06** | **Device Permissions Graceful Fallback**| GPS location capture is strictly optional; refusal of device location permissions must not impede record creation. |
| **NFR-07** | **Drive Auth Graceful Degradation**| Expiration or revocation of Drive authorization alerts the owner but never blocks database operations. |
| **NFR-08** | **Maintainability & Portability** | Clean TypeScript typing throughout, zero runtime `any` types, shared codebase across Web and Android via Capacitor. |

---

## 6. Scope Boundaries

```
+---------------------------------------------------------------------------------+
|                              IN-SCOPE (MVP PHASE 01G)                           |
+---------------------------------------------------------------------------------+
| 1. Google OAuth 2.0 authentication with strict single-user email whitelist.     |
| 2. Single customer job model with multiple tanks (OHT, UG) under one job.       |
| 3. Structured tank measurements: Length x Breadth x Height (ft), Capacity (L).  |
| 4. Single combined bill per site: Bill Value, Discount, Final Value, Mode.      |
| 5. Integer paise internal currency precision strategy (REC-04 proposed).        |
| 6. Manual entry of physical bill book number (no auto-generation).              |
| 7. Immediate payment model: Cash or Online (mandatory selection; no defaulting).|
| 8. Dual-mode Google Location: Manually pasted Maps URL + GPS coordinates.       |
| 9. Transaction-safe correction history: v1 -> v2 -> v3 with audit links.        |
| 10. Optional correction reason (PD-01) and chronological history modal (PD-02). |
| 11. Latest valid version default list (PD-03) and history access (PD-04).       |
| 12. Strict OHT/UG UI form selection with technical schema extensibility (PD-06).|
| 13. Official & Personal expense logging with daily and annual aggregations.     |
| 14. Staff attendance count + combined attendance expense (wages + tea/bata).    |
| 15. Staff salary supporting individual and combined monthly salary entries.     |
| 16. Soft deletion with Recycle Bin and 30-day restoration window.               |
| 17. Calendar-year partitioned Excel workbook generation (ExcelJS).              |
| 18. Excel superseded row gray/strikethrough styling & active sum formulas(PD-05)|
| 19. Dual Google Drive Backup: Type 1 (Excel) and Type 2 (Complete Database JSON)|
| 20. Indefinite retention of all daily database JSON backups in Google Drive.    |
| 21. Non-circular raw byte SHA-256 verification and companion manifests.         |
| 22. Serialized synchronization coordinator with Firestore lease locks.          |
| 23. Cloud-durable task queue for multi-device sync recovery and app reinstall.  |
| 24. Interactive Drive reauthorization on Android/Web without blocking DB.      |
| 25. Resumable Google Drive uploads with anti-overwrite version safeguards.      |
| 26. Cross-platform support: Responsive Web and Installable Android App.         |
| 27. Secret Manager backend OAuth storage for autonomous scheduled worker.       |
| 28. Offline draft queue (syncStatus: PENDING_COMMIT) for transaction safety.    |
+---------------------------------------------------------------------------------+
|                             OUT-OF-SCOPE FOR PHASE 01G                          |
+---------------------------------------------------------------------------------+
| 1. Writing application code, packages, or initializing repos/projects.          |
| 2. Complex pending payment, credit ledger, or partial installment tracking.     |
| 3. Customer-facing or staff-facing portals.                                     |
| 4. Third-party payment gateway integration (Razorpay/Stripe).                   |
+---------------------------------------------------------------------------------+
```
