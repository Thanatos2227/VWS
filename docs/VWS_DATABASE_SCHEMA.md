# Vetri Water Solutions (VWS) — Database Schema & Data Model
**Document ID:** VWS-DOC-005  
**Project Phase:** Phase 01G — Final Contradiction Resolution & Owner Decision Gate  
**Status:** Authoritative Blueprint — Reconciled, Validated & Path-Aligned  
**Author:** Senior Software Architect, Database Architect, Security Engineer, QA Architect & Business Analyst  
**Date:** November 2026 (Phase 01G Final Contradiction Resolution)  

---

## 1. Overview & Database Philosophy

Cloud Firestore (NoSQL Document Store) serves as the **primary, centralized single source of truth** for Vetri Water Solutions.

### Design Principles:
1. **Integer Paise Financial Precision (Proposed Architecture — REC-04 Awaiting Owner Decision):** To eliminate IEEE 754 floating-point rounding errors, the proposed architecture specifies storing monetary amounts internally as **integer paise** ($1\text{ INR} = 100\text{ paise}$). This implementation choice is an architecture recommendation strictly awaiting formal owner approval under REC-04; it is NOT pre-approved or mandatory. All schema fields ending in `*Paise` and related calculations are conditional on REC-04 approval. If approved, conversion to rupees occurs strictly at the presentation and Excel export boundaries. If rejected by the owner, an alternative string decimal or big-decimal representation will be engineered prior to code implementation without altering the owner's underlying business calculations.
2. **Zero Overwrite Architecture with Correction Chains:** Editing a saved record creates an immutable, audit-linked correction record ($v1 \to v2 \to v3$) rather than mutating past history. Only the latest valid version contributes to active financial totals.
3. **Deterministic Daily Rollups:** Account expenses are indexed by date (`YYYY-MM-DD`), guaranteeing exactly one consolidated official and personal record per calendar day.
4. **Calendar-Year Partitioning:** All records maintain an explicit `year` attribute (integer, Jan 1 to Dec 31) to permit rapid, single-query retrieval when generating annual Excel worksheets.
5. **Soft-Delete Resilience with 30-Day Recycle Bin:** Documents are never physically deleted in normal operation; an `isDeleted: true` flag and `expiresForPurgeAt` timestamp manage a 30-day recovery window.
6. **Offline Transaction Boundary (Tasks C, E):** Operations requiring distributed multi-document transactional isolation (sequence allocation, correction swaps, lease locks) require an active network connection. Offline saves are staged locally in client storage as drafts (`OfflineOperationDraft`) with `syncStatus: 'PENDING_COMMIT'` and committed upon network restoration. Local storage durability is subject to browser/OS storage eviction limits.

---

## 2. Collection Architecture & Entity Relationship

```
+-----------------------------------------------------------------------------------+
|                              CLOUD FIRESTORE SCHEMA                               |
+-----------------------------------------------------------------------------------+

  [ Collection: sites ] (Committed via Backend Cloud Function Admin SDK Transaction; Direct Client Write: DENY)
  ├── Doc: {siteId} (UUIDv4)
  │     ├── sequenceNumber: 1
  │     ├── year: 2026
  │     ├── workDate: "2026-03-15"
  │     ├── customerName: "Rajesh Kumar"
  │     ├── location: "Anna Nagar, Chennai"
  │     ├── contactNumber: "9876543210"
  │     ├── googleLocation: { mapsUrl, coordinates: { lat, lng }, captureMethod }
  │     ├── billNumber: "1042" (Physical bill book number)
  │     ├── paymentMode: "Cash" | "Online" (Mandatory explicit choice)
  │     ├── totalTanks: 2
  │     ├── tanks: [ Array of TankSpec (OHT, UG, L, B, H in ft, Capacity in L) ]
  │     ├── // Financial Fields (Conditional on REC-04 Approval - Integer Paise Proposed)
  │     ├── billValuePaise: 450000 (₹ 4,500.00)
  │     ├── discountPaise: 50000   (₹ 500.00)
  │     ├── finalValuePaise: 400000 (₹ 4,000.00)
  │     │   // Architectural Boundary: Cloud Firestore stores strictly committed, authoritative records.
  │     │   // Local staging/sync statuses (PENDING_COMMIT, UNCERTAIN_COMMIT, CONFLICT) exist only in client storage.
  │     │
  │     ├── // Non-Destructive Versioning & Corrections (v1 -> v2 -> v3)
  │     ├── version: 1
  │     ├── originalRecordId: "site_uuid_1001"
  │     ├── previousRecordId: null
  │     ├── isLatestValidVersion: true
  │     ├── status: "ACTIVE" | "SUPERSEDED"
  │     ├── correctedAt: null | Timestamp
  │     ├── correctionReason: null | string
  │     │
  │     ├── // Soft-Delete & 30-Day Recovery
  │     ├── isDeleted: false
  │     ├── deletedAt: null | Timestamp
  │     ├── deletedBy: null | string
  │     ├── expiresForPurgeAt: null | Timestamp
  │     └── createdAt / updatedAt: Timestamp
  │
  [ Collection: accounts_daily ] (Committed via Backend Cloud Function Admin SDK Transaction; Direct Client Write: DENY)
  ├── Doc: {entryDate} (e.g. "2026-03-15")
  │     ├── entryDate: "2026-03-15"
  │     ├── year: 2026
  │     ├── // Expense Fields (Conditional on REC-04 Approval - Integer Paise Proposed)
  │     ├── official: {
  │     │     refreshmentPaise, transportPaise, sparesHOPaise,
  │     │     staffAttendanceCount, staffAttendanceExpensePaise (Wages+Tea+Bata),
  │     │     salaryEntries: [ { type, staffName, amountPaise } ],
  │     │     staffSalaryPaise (Sum of salaryEntries),
  │     │     totalOfficialPaise
  │     │   }
  │     ├── personal: {
  │     │     transportPaise, refreshmentPaise, groceriesVegMilkPaise,
  │     │     lunchDinnerPaise, otherPaise, totalPersonalPaise
  │     │   }
  │     ├── dailyGrandTotalPaise: totalOfficialPaise + totalPersonalPaise
  │     ├── revisionsCount: 0
  │     ├── isDeleted: false
  │     └── createdAt / updatedAt: Timestamp
  │     │
  │     └── [ Subcollection: accounts_daily/{date}/audit_log ] (Appended via Backend Admin SDK Transaction; Direct Client Write: DENY)
  │           └── Doc: {revisionId} (Audit records tracking category edits)
  │
  [ Collection: system_counters ] (Trusted Backend Admin SDK Only; Direct Client Write: DENY)
  ├── Doc: "sites_seq" -> currentSeq: 148 (Authoritative sequence allocated via backend transaction)
  └── Doc: "drive_sync" -> exportVersion: 35
  │
  [ Collection: system_locks ] (Distributed Coordinator - Trusted Backend Admin SDK Only; Direct Client Write: DENY)
  └── Doc: "drive_export_coordinator" -> lockedBy, leaseExpiresAt (3-min TTL), activeTaskId
  │
  [ Collection: system_tasks ] (Canonical Task Queue - Direct Client Create: PENDING Only; Direct Client Update/Delete: DENY; Backend Lifecycle)
  └── Doc: {taskId} -> taskType, status, idempotencyKey, attempts, leaseOwner, leaseExpiry
  │
  [ Collection: system_state ] (Trusted Backend Admin SDK Only; Direct Client Write: DENY)
  └── Doc: "master_workbook_pointer"
        ├── currentDriveFileId: "1XyZ...901"
        ├── currentFileName: "VWS_Workbook_2026-11-06_rev42.xlsx"
        ├── currentExportVersion: 42
        ├── publicationStatus: "PUBLISHED_TO_ROOT" | "ROOT_COPY_FAILED"
        └── checksumSha256: "e3b0c442..."
  │
  [ Collection: backups_metadata ] (Trusted Backend Admin SDK Only; Direct Client Write: DENY)
  ├── Doc: {backupId}
        ├── timestamp: Timestamp
        ├── backupType: "EXCEL_BUSINESS" | "COMPLETE_DATABASE_JSON"
        ├── exportVersion: 35
        ├── driveFileId: "1AbCdEfGhIjKlMnOpQrSt"
        ├── sha256Checksum: "..."
        └── calendarYear: 2026
  │
  [ Collection: committed_operations ] (Idempotency & Fencing Ledger - Trusted Backend Admin SDK Only; Direct Client Access: DENY)
  └── Doc: {idempotencyKey} (e.g. "OP_IDEMP_devA_site_uuid_1001_null_1_e3b0c442...")
        ├── idempotencyKey: string
        ├── operationId: "op_uuid_..."
        ├── status: "IN_PROGRESS" | "COMMITTED" | "ABORTED_TERMINAL"
        ├── fenceToken: 1 (Monotonic fencing epoch)
        ├── leaseExpiresAt: Timestamp (60s lease)
        ├── workerId: "exec_uuid_..."
        ├── targetCollection: "sites" | "accounts_daily"
        ├── committedServerDocId: "site_uuid_..." | null
        ├── committedVersion: 1 | null
        ├── serverCommittedAt: Timestamp | null
        ├── terminalReason: string | null
        ├── abortedAt: Timestamp | null
        ├── clientDeviceId: string
        └── createdAt / updatedAt: Timestamp
```

---

## 3. Detailed Data Dictionaries & TypeScript Schemas

### 3.1 `sites` Collection Schema

```typescript
export type PaymentMode = 'Cash' | 'Online';

/**
 * Extensible Tank Type System (PD-06 Enforced & Reconciled - Task D)
 * Authoritative Owner Decision PD-06: The initial release UI exposes strictly 'OHT' and 'UG'.
 * Technical schema extensibility is preserved via TypeScript type union so that future tank
 * types can be introduced without database redesign, but UI form selectors and Zod schemas
 * in the initial release strictly disallow unapproved custom types or free-text inputs.
 */
export type PredefinedTankType = 'OHT' | 'UG';
export type TankType = PredefinedTankType | (string & {});

export type RecordStatus = 'ACTIVE' | 'SUPERSEDED';

export interface TankSpec {
  tankId: string;              // Unique identifier within the site job (e.g., "tank_1")
  tankType: TankType;          // Strictly 'OHT' | 'UG' in initial release UI (PD-06)
  length: number;              // Length in Feet (ft, decimal)
  breadth: number;             // Breadth in Feet (ft, decimal)
  height: number;              // Height in Feet (ft, decimal)
  capacity: number;            // Volume in Litres (L)
  measurementUnit: 'Feet';     // Authoritative unit: Feet
  capacityUnit: 'Litres';      // Authoritative unit: Litres
  notes?: string;              // Optional remarks
}

/**
 * Tank Type Validation Rules (Task D Reconciled):
 * 1. UI presents strictly 'OHT' (Overhead Tank) and 'UG' (Underground Tank) as the ONLY options.
 * 2. In accordance with confirmed decision PD-06, the initial UI exposes NO 'Other', NO 'Custom',
 *    and NO user-defined free-text tank inputs.
 * 3. Validation: Zod schema asserts `tankType === 'OHT' || tankType === 'UG'`.
 */

export interface GoogleLocationData {
  mapsUrl?: string;            // Manually pasted Google Maps link or generated pin
  coordinates?: {              // Captured device GPS coordinates (optional)
    latitude: number;
    longitude: number;
  } | null;
  captureMethod: 'MANUAL_URL' | 'GPS' | 'BOTH' | 'NONE';
}

export interface SiteRecord {
  id: string;                  // Firestore Document ID (UUIDv4)
  sequenceNumber: number;      // Monotonically increasing sequential index (1, 2, 3...)
  year: number;                // Calendar Year partition (e.g. 2026, Jan 1 to Dec 31)
  workDate: string;            // ISO Date string: "YYYY-MM-DD"
  customerName: string;        // Customer full name / residential / business name
  location: string;            // Street address, area, or locality
  contactNumber: string;       // Primary contact phone string (10-digit, +91, landline with STD)
  googleLocation: GoogleLocationData; // Maps URL and/or GPS coordinates
  
  // Single Combined Billing Fields (Proposed in Integer Paise under REC-04 - Pending Owner Approval)
  // Note: All *Paise fields below represent proposed integer paise architecture conditional on REC-04 approval.
  // If the owner rejects REC-04, an alternative decimal representation (e.g. string decimal) will be substituted without altering owner business rules.
  billNumber: string;          // Manually entered from physical bill book (DO NOT auto-generate; DEC-09)
  paymentMode: PaymentMode;    // Strictly 'Cash' | 'Online' (Mandatory explicit selection; DEC-07)
  totalTanks: number;          // Total number of tanks (derived/validated: tanks.length; DEC-06)
  tanks: TankSpec[];           // Array of tank specifications (min length: 1, max: 20; DEC-08)
  
  billValuePaise: number;      // Gross billing in integer paise (e.g. 450000 = ₹4,500.00; conditional on REC-04)
                               // Proposed Ceiling: <= 100,000,000 paise (₹10,00,000) [REC-07 Warning Prompt]
  discountPaise: number;       // Discount in paise (>= 0, <= billValuePaise; conditional on REC-04)
  finalValuePaise: number;     // Net bill in paise (billValuePaise - discountPaise; conditional on REC-04)
  
  // Architectural Boundary: Cloud Firestore stores strictly committed, authoritative records.
  // Local-only draft lifecycle statuses (PENDING_COMMIT, UNCERTAIN_COMMIT, CONFLICT) are tracked
  // exclusively in client-side storage (IndexedDB on Web, SQLite on Android) via OfflineOperationDraft.
  
  // Non-Destructive Versioning & Correction History Fields (v1 -> v2 -> v3)
  version: number;             // Version index: 1 for original, 2, 3... for corrections
  originalRecordId: string;    // Pointer to initial root record ID
  previousRecordId?: string | null; // Pointer to immediate predecessor version
  status: RecordStatus;        // 'ACTIVE' or 'SUPERSEDED'
  isLatestValidVersion: boolean; // TRUE only for the active record that counts toward totals
  correctedAt?: Date | null;   // Timestamp when correction was created
  correctionReason?: string;   // Optional reason for correction entered by owner (PD-01)
  
  // Soft-Delete & 30-Day Recovery Fields
  isDeleted: boolean;          // Soft delete flag (default: false)
  deletedAt?: Date | null;     // Timestamp when moved to Recycle Bin
  deletedBy?: string | null;   // Owner email who initiated deletion
  expiresForPurgeAt?: Date | null; // Timestamp 30 days after deletion date
  
  createdAt: Date;             // Server creation timestamp
  updatedAt: Date;             // Server modification timestamp
  createdBy: string;           // Owner email address
}
```

**Security & Trust Boundary (Backend Cloud Function Mediation):**
Authoritative site creation and corrections are strictly mediated by trusted backend Cloud Functions (`commitSiteJob`, `commitSiteCorrection`) executing atomic transactions with `system_counters/sites_seq` sequence allocation via the Firebase Admin SDK. Untrusted client runtimes (Web browser, Android app) are explicitly **DENIED direct write access** (`allow write: if false`). Client creation and correction requests trigger authenticated backend callable functions, ensuring that sequence allocation, predecessor version deactivation (`isLatestValidVersion: false`, `supersededBy`), and non-destructive version chaining cannot be bypassed or tampered with by client runtimes.

---

### 3.2 `accounts_daily` Collection Schema

```typescript
export interface SalaryEntry {
  type: 'INDIVIDUAL' | 'COMBINED_LUMP_SUM';
  staffName?: string;          // Staff member name (if individual entry; DEC-14)
  amountPaise: number;         // Monetary amount in integer paise (conditional on REC-04 approval)
  salaryMonth?: string;        // Target calendar month of salary (e.g. "2026-03" for March salary paid in April; POQ-01 pending)
  notes?: string;              // Specific remarks (e.g. "March Salary")
}

export interface OfficialExpenseData {
  // Note: All *Paise fields below represent proposed integer paise architecture conditional on REC-04 approval.
  refreshmentPaise: number;            // Tea, snacks, drinking water for crew in paise (conditional on REC-04)
  transportPaise: number;              // Fuel, toll, vehicle hire in paise (conditional on REC-04)
  sparesHOPaise: number;               // Replacement pipes, chemicals, brushes in paise (conditional on REC-04)
  staffAttendanceCount: number;        // Daily worker headcount present (Integer >= 0; DEC-13)
  staffAttendanceExpensePaise: number; // Combined attendance monetary expense in paise (Wages+Tea+Refreshments+Bata; DEC-13; conditional on REC-04)
  salaryEntries: SalaryEntry[];        // Primary array for staff salary disbursements (DEC-14)
  staffSalaryPaise: number;            // Derived: SUM(salaryEntries.amountPaise; conditional on REC-04)
  notes?: string;                      // Specific remarks
  totalOfficialPaise: number;          // Sum of monetary fields in paise (conditional on REC-04)
}

export interface PersonalExpenseData {
  // Note: All *Paise fields below represent proposed integer paise architecture conditional on REC-04 approval.
  transportPaise: number;              // Personal fuel, personal travel in paise (conditional on REC-04)
  refreshmentPaise: number;            // Personal beverages, snacks in paise (conditional on REC-04)
  groceriesVegMilkPaise: number;       // Household groceries, vegetables, milk in paise (conditional on REC-04)
  lunchDinnerPaise: number;            // Personal / family dining in paise (conditional on REC-04)
  otherPaise: number;                  // Miscellaneous personal items in paise (conditional on REC-04)
  notes?: string;                      // Specific remarks
  totalPersonalPaise: number;          // Sum of personal monetary fields in paise (conditional on REC-04)
}

export interface DailyAccountRecord {
  id: string;                          // Document ID formatted as "YYYY-MM-DD"
  entryDate: string;                   // ISO Date string: "YYYY-MM-DD"
  year: number;                        // Calendar Year (Jan 1 to Dec 31; DEC-05)
  
  official: OfficialExpenseData;       // Official business expense breakdown
  personal: PersonalExpenseData;       // Combined household / personal ledger
  
  dailyGrandTotalPaise: number;        // totalOfficialPaise + totalPersonalPaise (conditional on REC-04; Proposed Ceiling: <= 250,000,000 paise / ₹25,00,000 [REC-07 Warning Prompt])
  revisionsCount: number;              // Monotonic counter of edits made to this date
  
  // Architectural Boundary: Cloud Firestore stores strictly committed, authoritative records.
  // Local-only draft lifecycle statuses (PENDING_COMMIT, UNCERTAIN_COMMIT, CONFLICT) are tracked
  // exclusively in client-side storage (IndexedDB on Web, SQLite on Android) via OfflineOperationDraft.
  
  // Soft-Delete & 30-Day Recovery Fields
  isDeleted: boolean;                  // Soft delete flag (default: false)
  deletedAt?: Date | null;
  deletedBy?: string | null;
  expiresForPurgeAt?: Date | null;     // 30-day retention threshold
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Daily Accounts Category Edit Semantics & Audit Log Schema (Correction F)
 * Subcollection: accounts_daily/{entryDate}/audit_log/{revisionId}
 * 
 * Edit Semantics:
 * 1. Default Field Edit: Entering a value in a category field REPLACES the existing value.
 *    Example: Changing Transport from ₹200 to ₹350 updates transportPaise to 35000.
 * 2. Incremental Add Action: Adding an incremental expense requires clicking "+ Add Expense"
 *    which opens a quick-entry prompt: newAmount = previousAmount + additionalAmount.
 * 3. Non-Destructive Audit History: Every edit appends an immutable audit record in this subcollection,
 *    storing previous amount, new amount, delta, user, timestamp, and optional reason (PD-01, PD-02, PD-04).
 */
export interface DailyAccountCategoryAudit {
  revisionId: string;                  // UUIDv4
  entryDate: string;                   // "YYYY-MM-DD"
  timestamp: Date;                     // UTC timestamp of the edit
  editedBy: string;                    // Owner email address
  section: 'OFFICIAL' | 'PERSONAL';
  categoryKey: string;                 // e.g. "transportPaise", "sparesHOPaise", "groceriesVegMilkPaise"
  categoryLabel: string;               // Human-readable label: e.g. "Official Spares / H.O."
  previousAmountPaise: number;         // Amount prior to edit (conditional on REC-04)
  newAmountPaise: number;              // Amount after edit (conditional on REC-04)
  deltaAmountPaise: number;            // newAmountPaise - previousAmountPaise (conditional on REC-04)
  editMode: 'REPLACE' | 'INCREMENT';   // REPLACE (default edit) or INCREMENT ("+ Add Expense")
  reason?: string;                     // Optional edit reason (PD-01)
}
```

**Security & Trust Boundary (Backend Cloud Function Mediation):**
Daily account ledger creation, category updates, and revision audit records are strictly mediated by trusted backend Cloud Functions (`commitDailyAccountsUpdate`) executing atomic transactions via the Firebase Admin SDK. Untrusted client runtimes (Web browser, Android app) are explicitly **DENIED direct write access** to both `accounts_daily` and `audit_log` (`allow write: if false`). Client update requests trigger authenticated backend callable functions, guaranteeing that every financial edit recalculates daily grand totals and atomically appends an immutable revision record to `accounts_daily/{entryDate}/audit_log/{revisionId}`.

---

### 3.3 `system_counters` Collection Schema

```typescript
export interface CounterRecord {
  id: string;                          // "sites_seq" | "drive_sync"
  currentSeq?: number;                 // Current monotonic site sequence number
  exportVersion?: number;              // Monotonic application export sequence version
  updatedAt: Date;
}
```

**Security & Trust Boundary (Backend Admin SDK Exclusive):**
Authoritative sequence allocation (`sites_seq`, `drive_sync`) is strictly restricted to trusted backend transactions (Firebase Admin SDK in Cloud Functions). Untrusted client runtimes (Web browser, Android app) are explicitly **DENIED write access** (`allow write: if false`). Client creation requests trigger backend callable functions or queue pending tasks in `system_tasks`, ensuring zero client manipulation or corruption of sequence counters.

---

### 3.4 `backups_metadata` Collection Schema

```typescript
export interface BackupMetadataRecord {
  id: string;                          // Firestore Auto-ID
  timestamp: Date;                     // UTC timestamp of backup
  backupType: 'EXCEL_BUSINESS' | 'COMPLETE_DATABASE_JSON';
  exportVersion: number;               // Sequential export version token
  driveFileId: string;                 // Google Drive File ID
  driveFileName: string;               // e.g. "VWS_DB_Backup_2026-11-06_v35.json"
  driveETag?: string;                  // Google Drive HTTP ETag from upload response
  sha256Checksum: string;              // Cryptographic SHA-256 hash for integrity verification
  schemaVersion: number;               // Database schema version (e.g. 1) for compatibility
  retentionPolicy: 'INDEFINITE';       // Authoritative decision: Retained indefinitely in Google Drive
  isOfflineExport: boolean;            // True if generated from local offline cache
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  calendarYear: number;                // Active calendar year exported
  recordsAudited: {
    activeSites: number;               // Count of latest valid active sites
    correctionsCount: number;          // Count of correction versions preserved
    accountsDays: number;              // Count of daily account ledgers
    totalCollections: number;          // Total collections serialized
  };
  fileSizeBytes?: number;
  errorMessage?: string;
}
```

**Security & Trust Boundary (Backend Admin SDK Exclusive):**
Creation and modification of backup manifests (`backups_metadata/{backupId}`) are strictly restricted to trusted backend Cloud Functions (Firebase Admin SDK). Untrusted client runtimes (Web browser, Android app) are explicitly **DENIED write access** (`allow write: if false`). This prevents client runtimes from falsifying SHA-256 integrity checksums, recording fabricated backups, or altering audit metadata.

---

### 3.5 `system_locks` Collection Schema (Distributed Lease Coordinator)

```typescript
export interface DriveExportCoordinatorRecord {
  id: 'drive_export_coordinator';
  lockedBy: string;                    // Backend worker instance ID holding lease (e.g. "worker_cf_2ndgen_abc123")
  leaseExpiresAt: Date;                // UTC expiration timestamp (3-minute TTL with heartbeats)
  activeTaskId: string;                // Pointer to system_tasks document
  inProgressExportVersion: number;     // Monotonic version currently in flight
  lastCommittedExportVersion: number;  // Latest confirmed export version
  lastCommittedDriveFileId?: string;   // Google Drive File ID of latest master
  lastCommittedChecksum?: string;      // Cryptographic SHA-256 of latest export
  updatedAt: Date;
}
```

**Security & Trust Boundary (Backend Admin SDK Exclusive):**
Distributed lock coordination (`system_locks/drive_export_coordinator`) is strictly restricted to trusted backend Cloud Functions (Firebase Admin SDK). Lease acquisition, heartbeat renewal, expired-lease reclamation, and lease release are executed exclusively by the trusted backend. Untrusted client runtimes (Web browser, Android app) are explicitly **DENIED write access** (`allow write: if false`). This prevents client runtimes from acquiring, holding, or corrupting coordinator leases.

---

### 3.6 `system_tasks` Collection Schema (Canonical Task Queue — Task A Contract)

The root collection `system_tasks` serves as the **single authoritative contract** for all asynchronous backup, sync, export, and verification operations across Web, Mobile, and Cloud Functions. All competing models are consolidated into this single path (`system_tasks/{taskId}`).

```typescript
export type CanonicalTaskType = 
  | 'SCHEDULED_DAILY_BACKUP'   // Autonomous 23:00 IST Cloud Function execution (Excel + JSON to Drive)
  | 'CLIENT_MANUAL_EXPORT'     // On-demand client-initiated Excel export/sync from Web or Android
  | 'DATABASE_JSON_DUMP'       // Complete database JSON serialization and Drive upload
  | 'DRIVE_RESUMABLE_UPLOAD'   // Dedicated multi-chunk resumable upload stream for large payloads
  | 'METADATA_AUDIT';          // Integrity verification of backup manifests and Google Drive quota

export type CanonicalTaskStatus = 
  | 'PENDING'                  // Created, awaiting claim by worker or executor
  | 'CLAIMED'                  // Claimed under atomic lease by active executor
  | 'RUNNING'                  // Payload generation / upload stream currently in-flight
  | 'SUCCEEDED'                // Successfully executed, verified, and committed
  | 'RETRY_WAIT'               // Transient failure; waiting for nextRetryAt exponential backoff
  | 'FAILED_PERMANENT'         // Terminal dead-letter state (max attempts exhausted or fatal error)
  | 'WAITING_REAUTH';          // Blocked on OAuth invalid_grant; waiting for owner consent

export interface SystemTaskRecord {
  taskId: string;                      // Canonical Deterministic Document ID (e.g. "TASK_SCHEDULED_DAILY_BACKUP_2026-03-15")
  taskType: CanonicalTaskType;         // Operation category
  status: CanonicalTaskStatus;         // Current state in canonical lifecycle
  idempotencyKey: string;              // Deterministic deduplication key (canonical token matching or deriving taskId)
  payload: Record<string, unknown>;    // Task-specific parameters (e.g. calendarYear, exportType)
  
  // Execution & Lease Coordination
  initiatingSource: 'CLOUD_SCHEDULER' | 'CLIENT_WEB' | 'CLIENT_ANDROID' | 'WORKER_INTERNAL';
  initiatorInstanceId: string;         // Device instance ID or Cloud Function execution ID
  leaseOwner?: string | null;          // Currently executing worker instance ID
  leaseExpiry?: Date | null;           // UTC lease deadline (3-minute TTL with heartbeats)
  heartbeatAt?: Date | null;           // UTC timestamp of last worker heartbeat
  
  // Scheduling & Retry Backoff
  createdAt: Date;                     // Initial task creation timestamp
  scheduledFor: Date;                  // Target execution timestamp
  attempts: number;                    // Execution attempts count (starts at 0)
  maxAttempts: number;                 // Maximum threshold before permanent failure (default: 5)
  nextRetryAt?: Date | null;           // Backoff target timestamp when in RETRY_WAIT
  
  // Export Versioning & Checksums (where applicable)
  exportVersion?: number | null;       // Monotonic export sequence version
  payloadChecksum?: string | null;     // Pre-computed external SHA-256 hash of payload
  stagedPayloadUri?: string | null;    // Storage pointer or IndexedDB key for staged payload
  payloadSizeBytes?: number | null;    // Size of the pre-compiled binary/JSON payload
  driveFileId?: string | null;         // Created Google Drive file identifier
  
  // Diagnostics & Terminal Dead-Letter
  errorClassification?: string | null; // e.g. 'TRANSIENT_NETWORK', 'INVALID_GRANT', 'QUOTA_EXCEEDED'
  terminalFailureReason?: string | null;// Cause of transition to FAILED_PERMANENT
  lastError?: string | null;           // Most recent error message/code
  
  updatedAt: Date;                     // Server update timestamp
  completedAt?: Date | null;           // UTC completion timestamp
}

/**
 * Ephemeral Local Client Blob Cache
 * Stored in IndexedDB for performance staging only
 */
export interface LocalBlobCacheItem {
  taskId: string;                      // Matches system_tasks ID
  payloadBlob: Blob;                   // Compiled binary Excel or JSON blob
  cachedAt: Date;
}
```

#### Task Queue Deterministic Identifier Strategy & Idempotency Guarantees
1. **Canonical Deterministic Task ID Strategy:**
   - **Unified Document ID & Deduplication Key:** To guarantee atomic duplicate prevention at the database storage layer, every task document in `system_tasks/{taskId}` uses a **strictly deterministic Document ID** (`taskId`) derived from its operation type and business scope.
   - **Deterministic Identifier Formats Across Workflows:**
     - Autonomous Scheduled Backup: `TASK_SCHEDULED_DAILY_BACKUP_{YYYY-MM-DD}` (matching `idempotencyKey = "IDEMP_SCHEDULED_DAILY_BACKUP_{YYYY-MM-DD}"`)
     - Complete Database JSON Dump: `TASK_DATABASE_JSON_DUMP_{YYYY-MM-DD}` (matching `idempotencyKey = "IDEMP_DATABASE_JSON_DUMP_{YYYY-MM-DD}"`)
     - Client Manual Export: `TASK_CLIENT_MANUAL_EXPORT_{deviceId}_{calendarYear}_{payloadSha256}` (matching `idempotencyKey = "IDEMP_CLIENT_MANUAL_EXPORT_{deviceId}_{calendarYear}_{payloadSha256}"`)
       - *Canonical Identity Inputs:* Computed over the canonical JSON of `{ initiatingSource, deviceId, calendarYear, exportScope, clientExportSeq, snapshotBoundary }`.
       - *Full Cryptographic Digest:* `payloadSha256` is the full 64-character hexadecimal SHA-256 digest (e.g., `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`), completely eliminating truncated 8-character hash collision risks.
     - Resumable Upload Chunk Stream: `TASK_DRIVE_RESUMABLE_UPLOAD_{sourceTaskId}_{chunkIndex}` (matching `idempotencyKey = "IDEMP_DRIVE_RESUMABLE_UPLOAD_{sourceTaskId}_{chunkIndex}"`)
     - Metadata Audit: `TASK_METADATA_AUDIT_{YYYY-MM-DD}` (matching `idempotencyKey = "IDEMP_METADATA_AUDIT_{YYYY-MM-DD}"`)
   - **Prohibition of Non-Deterministic IDs:** Timestamp-and-UUID task IDs (e.g. `TASK_{TYPE}_{TIMESTAMP}_{UUID8}`) are strictly prohibited. Non-deterministic IDs produce different document paths for identical trigger events, defeating database-level uniqueness enforcement.
2. **Stable Identity Across Retries vs. Intentional New Exports:**
   - **Duplicate Network Retries (Preserved Identity):** When an export request is retried due to a dropped connection, timeout, or Google Drive 503 error, the client retransmits the **exact same canonical inputs** (`clientExportSeq` and `snapshotBoundary` remain identical). Consequently, `payloadSha256`, `taskId`, and `idempotencyKey` remain identical. The backend detects the existing document in `system_tasks/{taskId}`, prevents duplicate task creation, and updates `status = 'RETRY_WAIT'`, `attempts = attempts + 1`.
   - **Intentional New Exports (Distinct Identity):** When the owner deliberately initiates a *new* export action from the UI, the client increments the monotonic `clientExportSeq = clientExportSeq + 1` in client storage and captures the new `snapshotBoundary`. Because these canonical inputs advance, the resulting full `payloadSha256` is provably distinct. This deterministically generates a new `taskId`, permitting the new export to proceed immediately without being blocked by prior tasks, while preserving complete retry idempotency for each individual export.
3. **Atomic Duplicate-Prevention Mechanism:**
   - Task creation executes via Firestore's atomic document creation (`create(system_tasks.doc(taskId), data)` or inside an atomic transaction).
   - If concurrent triggers fire simultaneously (e.g. duplicate Cloud Scheduler webhook delivery or rapid client double-clicks), Firestore enforces document uniqueness atomically. Exactly one request creates the document; concurrent requests fail with an `ALREADY_EXISTS` code and receive the reference to the active in-flight task, completely preventing duplicate tasks.
4. **Retry Identity Preservation:**
   - When a task encounters a transient error (network dropout, temporary Google Drive 503 rate limit), the backend executor transitions the task to `status = 'RETRY_WAIT'`, increments `attempts = attempts + 1`, and computes `nextRetryAt` via exponential backoff.
   - **Original Identity Preserved:** The original `taskId` and `idempotencyKey` are preserved across all retries. The executor updates the existing task document in-place. The system NEVER spawns duplicate or successor task documents for retries.
5. **Execution Semantics & Limitations:**
   - The queue provides **at-least-once delivery with atomic idempotent deduplication**.
   - It does NOT claim theoretical "exactly-once execution". Handlers verify preconditions idempotently before external side effects (e.g., verifying whether a Drive file with the matching SHA-256 already exists in `Backups/` before streaming bytes).
6. **Security & Trust Boundary (Client Creation Isolated from Execution):**
   - **Direct Client SDK Permissions:** Authenticated clients (`isAuthorizedOwner()`) may ONLY create task documents in `system_tasks/{taskId}` via direct Firestore Client SDK.
     - *Allowed Field List:* Rules enforce `keys().hasOnly(...)` permitting strictly the 12 required task fields (`taskId`, `taskType`, `status`, `idempotencyKey`, `payload`, `initiatingSource`, `initiatorInstanceId`, `createdAt`, `scheduledFor`, `attempts`, `maxAttempts`, `updatedAt`) plus 5 nullable execution fields (`leaseOwner`, `leaseExpiry`, `heartbeatAt`, `completedAt`, `payloadChecksum`). Any unexpected fields are rejected.
     - *Creation Invariants:* `status == 'PENDING'`, `attempts == 0`, `maxAttempts > 0`, `initiatingSource in ['CLIENT_WEB', 'CLIENT_ANDROID']`, `taskId == taskId`, and task type restricted to client-triggerable workflows.
     - *Execution State Unset:* `leaseOwner`, `leaseExpiry`, `heartbeatAt`, `completedAt`, and `payloadChecksum` must be `null` or omitted.
     - *Prohibited Fields:* Clients can NEVER inject backend worker fields (`exportVersion`, `driveFileId`, `stagedPayloadUri`, `payloadSizeBytes`, `errorClassification`, `terminalFailureReason`, `lastError`, `nextRetryAt`).
     - *Zero Client Mutability:* Clients possess **ZERO update or delete permissions** (`allow update, delete: if false`).
   - **Field Authority & Scheduling Classification (12 Required + 5 Nullable Execution Fields):**
     To ensure that untrusted client runtimes cannot manipulate worker execution or inject unverified state, every field is strictly classified:
     1. **Client-Provided Diagnostic Metadata:**
        - `initiatingSource`: Non-authoritative diagnostic origin (`'CLIENT_WEB'` | `'CLIENT_ANDROID'`).
        - `initiatorInstanceId`: Non-authoritative client session/device UUID.
        - `createdAt`: Client-generated creation timestamp (treated strictly as diagnostic telemetry; backend logs authoritative receipt time).
     2. **Backend-Validated Scheduling Inputs:**
        - `taskId`: Client-submitted document ID, strictly validated against deterministic schema (`TASK_{TYPE}_{SCOPE_OR_IDENTITY}`). Must match regex `^TASK_[A-Za-z0-9_.-]+$`.
        - `taskType`: Validated to match client-triggerable enum (`CLIENT_MANUAL_EXPORT`, `DATABASE_JSON_DUMP`, `DRIVE_RESUMABLE_UPLOAD`, `METADATA_AUDIT`).
        - `idempotencyKey`: Deterministic deduplication key, strictly validated against regex `^IDEMP_[A-Za-z0-9_.-]+$`. It strictly mirrors the task document ID by replacing the leading `"TASK_"` prefix with `"IDEMP_"`: `idempotencyKey === "IDEMP_" + taskId.substring(5)`. Redundant prefixes such as `IDEMP_TASK_*` or business prefixes like `OP_IDEMP_*` are strictly rejected.
        - `payload`: Input parameter map, validated against strict schema per task type (e.g. positive integer bounds, valid target folders).
        - `scheduledFor`: Client-requested dispatch timestamp. The backend validates and bounds this input: it **MUST NOT** be in the past by more than 24 hours, nor scheduled more than 7 days into the future. Out-of-bounds scheduling is rejected.
        - `maxAttempts`: Client-requested retry limit. The backend strictly clamps this input ($1 \le \text{maxAttempts} \le 5$). Arbitrary client retry limits (e.g. 100 or 1000) are clamped to the server ceiling (5) to prevent runaway worker executions.
     3. **Backend-Generated Authoritative Values:**
        - `status`: Created strictly as `'PENDING'`; all transitions (`CLAIMED`, `RUNNING`, `SUCCEEDED`, `RETRY_WAIT`, `FAILED_PERMANENT`, `WAITING_REAUTH`) are executed solely by backend Cloud Functions via Admin SDK.
        - `attempts`: Created strictly as `0`; incremented solely by backend Cloud Functions.
        - `updatedAt`: Initial client timestamp; overwritten with authoritative server timestamp (`FieldValue.serverTimestamp()`) on every backend transition.
        - `leaseOwner`, `leaseExpiry`, `heartbeatAt`, `completedAt`, `payloadChecksum`: Must be `null` on creation; written and updated strictly by backend Admin SDK workers.
   - **Trusted Backend Authority:** The Cloud Functions worker (Firebase Admin SDK) is the **sole actor authorized** to transition tasks, manage leases, record checksums, and update completion metadata.
7. **Backend Task Payload Validation, Request Metadata & Sovereign Evidence Invariants:**
   - **Explicit Separation of Idempotency Key Classes:**
     The architecture maintains two separate, non-overlapping classes of deterministic idempotency keys:
     - *System-Task Idempotency Keys (`IDEMP_*`):* Deduplicate background queue tasks in `system_tasks/{taskId}`.
       * **Format Contract:** Strictly matches regex `^IDEMP_[A-Za-z0-9_.-]+$`.
       * **1-to-1 Task ID Binding:** Derived deterministically from the document ID by replacing the leading `"TASK_"` prefix with `"IDEMP_"`: `idempotencyKey === "IDEMP_" + taskId.substring(5)`. Redundant prefixes such as `IDEMP_TASK_*` or business prefixes like `OP_IDEMP_*` are strictly rejected.
       * **Canonical Examples:** `IDEMP_SCHEDULED_DAILY_BACKUP_{YYYY-MM-DD}`, `IDEMP_DATABASE_JSON_DUMP_{YYYY-MM-DD}`, `IDEMP_CLIENT_MANUAL_EXPORT_{deviceId}_{calendarYear}_{payloadSha256}`, `IDEMP_DRIVE_RESUMABLE_UPLOAD_{sourceTaskId}_{chunkIndex}`, `IDEMP_METADATA_AUDIT_{YYYY-MM-DD}`.
     - *Business-Operation Idempotency Keys (`OP_IDEMP_*`):* Deduplicate client transactional mutations in `committed_operations/{idempotencyKey}`.
       * **Format Contract:** Strictly matches regex `^OP_IDEMP_[A-Za-z0-9_.-]+$`.
       * **Deterministic Formula:** `OP_IDEMP_{deviceId}_{targetDocId}_{baseServerRevision}_{revisionNumber}_{payloadHash}` (where `baseServerRevision` is string integer or `'null'`, `revisionNumber` is numeric integer $\ge 1$, and `payloadHash` is the 64-character hexadecimal SHA-256 digest).
       * **Canonical Example:** `OP_IDEMP_devA_site_uuid_1001_null_1_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
     Neither format alters or supersedes the other; both preserve their strict deterministic derivations and disjoint namespaces.
   - **Backend Payload Validation by Permitted Task Type:**
     Before claiming or running a task, the backend worker independently validates `task.payload` against its task type schema:
     - `CLIENT_MANUAL_EXPORT`: Validates `calendarYear` (integer $\ge 2024$ and $\le$ currentYear + 1), `exportScope` (`'ANNUAL_SUMMARY'` | `'FULL_WORKBOOK'`), `clientExportSeq` (integer $\ge 1$), and `snapshotBoundary` (ISO 8601 string or null). Out-of-bounds inputs fail permanently (`FAILED_PERMANENT`).
     - `DATABASE_JSON_DUMP`: Validates `targetCollections` (non-empty array containing subset of `['sites', 'accounts_daily', 'system_counters', 'system_state', 'backups_metadata']`).
     - `DRIVE_RESUMABLE_UPLOAD`: Validates `targetFolderId` (matches `system_state/drive_config.rootFolderId` or registered subfolder), `mimeType` (`'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'` | `'application/json'`), `fileName` (`^VWS_[A-Za-z0-9_.-]+$`), and `fileSizeBytes` ($0 < \text{bytes} \le 52,428,800$).
     - `METADATA_AUDIT`: Validates `auditScope` (`'ALL'` | `'BACKUPS_ONLY'` | `'INTEGRITY_CHECK'`) and optional `calendarYear`.
     - `SCHEDULED_DAILY_BACKUP`: Autonomous backend trigger only; direct client creation denied by security rules (`taskType in [...]`).
   - **Authoritative Request Metadata & Prohibition of Client Evidence:**
     - *Untrusted Request Metadata:* Client-provided envelope properties like `requestedBy` (`'OWNER_MANUAL'`) and `clientTimestamp` are treated strictly as non-authoritative diagnostic request metadata.
     - *Authoritative Caller Identity:* Sourced exclusively from verified authentication context (`context.auth.token.email === OWNER_EMAIL` with `email_verified == true`).
     - *Authoritative Server Timestamps:* All authoritative business timestamps and audit logs are generated exclusively on the server using `admin.firestore.FieldValue.serverTimestamp()`.
     - *Prohibition of Client Evidence:* Client-asserted hashes (`payloadChecksum`), monotonic sequence versions (`exportVersion`), Google Drive file IDs (`driveFileId`), and lifecycle proofs are never accepted as evidence. The server generates, calculates, increments, and validates all checksums, versions, and API outputs server-side.

---

### 3.7 `system_state` Collection Schema (Master Workbook Pointer & Drive Config)

Direct in-place writes to `Vetri_Water_Solutions.xlsx` in Google Drive root are strictly prohibited to prevent corruption mid-upload. All uploads are staged as versioned files (`Backups/VWS_Workbook_YYYY-MM-DD_rev{rev}.xlsx`), followed by an atomic update to this pointer.

```typescript
export interface MasterWorkbookPointerRecord {
  id: 'master_workbook_pointer';
  currentDriveFileId: string;          // Authoritative Google Drive file ID of latest verified workbook (in Backups/)
  currentFileName: string;             // e.g. "VWS_Workbook_2026-11-06_rev42.xlsx"
  currentExportVersion: number;        // Monotonic export revision number
  checksumSha256: string;              // Cryptographic SHA-256 hex digest of verified workbook
  snapshotBoundary: Date;              // Authoritative temporal cutoff boundary of data included
  publicationStatus: 'STAGED' | 'POINTER_COMMITTED' | 'PUBLISHED_TO_ROOT' | 'ROOT_COPY_FAILED'; // Publication status (Task E)
  rootDriveFileId?: string | null;     // Drive file ID of the convenience root copy 'Vetri_Water_Solutions.xlsx'
  updatedAt: Date;                     // UTC timestamp when pointer was committed
  committedBy: string;                 // Device ID or Cloud Worker that committed revision
}

export interface DriveConfigRecord {
  id: 'drive_config';
  rootFolderId: string;                // ID of dedicated 'Vetri Water Solutions' folder created by app
  rootFolderName: string;              // "Vetri Water Solutions"
  backendAuthStatus: 'ACTIVE' | 'WAITING_BACKEND_REAUTH' | 'UNPROVISIONED';
  lastBackendSyncAt?: Date | null;
  lastSecretRotationAt?: Date | null;
  updatedAt: Date;
}
```

**Security & Trust Boundary (Backend Admin SDK Exclusive):**
Master workbook pointers and Drive configuration (`system_state/{stateId}`) are strictly restricted to trusted backend Cloud Functions (Firebase Admin SDK). Untrusted client runtimes (Web browser, Android app) are explicitly **DENIED write access** (`allow write: if false`). This guarantees that only verified, staged uploads can update the authoritative master file pointer.

---

### 3.8 `committed_operations` Collection Schema (Idempotency & Fencing Ledger — Backend Only)

The root collection `committed_operations` acts as the serverless commit verification and fencing ledger. It guarantees that requests dispatched prior to network disconnects can be deterministically audited, fenced, and reconciled without redundant side effects, sequence skips, or zombie worker races.

```typescript
export type OperationLedgerStatus = 
  | 'IN_PROGRESS'        // Claimed by backend worker; currently executing under lease
  | 'COMMITTED'          // Atomically committed alongside business mutations
  | 'ABORTED_TERMINAL';  // Formally terminated; permanently dead and fenced

export interface CommittedOperationRecord {
  idempotencyKey: string;              // Primary Key (e.g. "OP_IDEMP_devA_site_uuid_1001_null_1_e3b0c442...")
  operationId: string;                 // UUIDv4 identifying originating draft revision
  status: OperationLedgerStatus;       // Server-controlled lifecycle state
  fenceToken: number;                  // Monotonic epoch token preventing stale worker commits
  leaseExpiresAt: Timestamp | null;    // Server-enforced lease deadline (60s lease TTL)
  workerId: string | null;             // Unique serverless execution ID
  targetCollection: 'sites' | 'accounts_daily'; // Target domain collection
  
  // Committed Result (Populated atomically in the commit transaction when status === 'COMMITTED')
  committedServerDocId?: string | null;// Authoritative Firestore doc ID created or updated
  committedVersion?: number | null;    // Authoritative committed version/revision
  serverCommittedAt?: Timestamp | null;// Server timestamp of atomic commit
  
  // Terminal Abort Metadata (Populated when status === 'ABORTED_TERMINAL')
  terminalReason?: string | null;      // Cause of terminal failure or supervisor fencing
  abortedAt?: Timestamp | null;        // Server timestamp when operation was permanently aborted
  
  clientDeviceId: string;              // Client device identifier
  createdAt: Timestamp;                // Server creation timestamp
  updatedAt: Timestamp;                // Server update timestamp
}
```

#### Server-Controlled Lifecycle, Lease Expiry & Fencing Architecture
1. **Initial Claim / Pre-Processing (Phase 1):**
   When an authenticated mutation endpoint (`commitSiteJob`, `commitSiteCorrection`, `commitDailyAccountsUpdate`) is invoked, the backend worker first executes a transaction on `committed_operations/{idempotencyKey}`:
   - If the record already exists with `status === 'COMMITTED'`, the cached commit result is returned immediately (idempotent replay).
   - If the record exists with `status === 'ABORTED_TERMINAL'`, the request is rejected immediately with a terminal non-retryable error (`terminalReason`).
   - If the record exists with `status === 'IN_PROGRESS'` and `leaseExpiresAt > backendNow`, another worker container is actively executing the operation; return `status: 'UNKNOWN'` with `retryable: true`.
   - If the record exists with `status === 'IN_PROGRESS'` but `leaseExpiresAt <= backendNow` (prior worker stalled, crashed, or timed out), the takeover protocol is initiated.
   - If the record does NOT exist, the worker creates it with `status: 'IN_PROGRESS'`, `fenceToken: 1`, `leaseExpiresAt: backendNow + 60s`, `workerId: currentWorkerId`, `clientDeviceId`, `createdAt: serverTimestamp()`, and `updatedAt: serverTimestamp()`.

2. **Lease Expiry, Monotonic Fencing & Takeover Protocol:**
   - **Lease Expiry vs Worker Termination:** In distributed, asynchronous serverless execution environments, an execution container may stall (e.g. due to JVM/V8 garbage collection pauses, CPU throttling, or network partitions) without being abruptly terminated. **Lease expiry (`leaseExpiresAt <= backendNow`) makes an operation eligible for takeover; it does NOT independently terminate or halt an executing worker.**
   - **Transactional Serialization Boundary & Contention:** Commit and takeover must transactionally contend on the exact same operation ledger record (`committed_operations/{idempotencyKey}`).
     * **Checking Time Does Not Guarantee Physical Commit Timing:** The system never claims that checking time (`leaseExpiresAt > backendNow`) guarantees physical commit occurs before the lease deadline. Network latency, runtime scheduling, or Firestore write queueing can cause physical write execution to complete slightly after a timestamp comparison. Rather, **the transaction serialization outcome on `committed_operations/{idempotencyKey}` is the authoritative safety boundary.**
     * **If Commit Wins Serialization First:** If the original worker's commit transaction serializes and commits first, a competing or subsequent takeover transaction reading `committed_operations/{idempotencyKey}` will observe `status === 'COMMITTED'` and must immediately stop and abort without mutating business records or re-executing the operation.
     * **If Takeover Wins Serialization First:** If the replacement worker's takeover transaction commits first, the takeover updates the document (incrementing `fenceToken = priorRecord.fenceToken + 1`, reassigning `workerId = replacementWorkerId`, and extending `leaseExpiresAt = backendNow + 60s`). When the old worker's commit transaction attempts to commit, Firestore's optimistic concurrency control detects the document version conflict; during transaction retry, the old worker fails Invariant 3 (`record.fenceToken !== oldWorkerFenceToken`) and Invariant 4 (`record.workerId !== oldWorkerId`), rolling back completely.
   - **Atomic Replacement Worker Takeover:** A replacement worker or subsequent client retry takes over an expired operation (`status === 'IN_PROGRESS' && leaseExpiresAt <= backendNow`) inside an atomic Firestore transaction that:
     1. Reads `committed_operations/{idempotencyKey}`.
     2. Asserts `record.status === 'IN_PROGRESS'` and `record.leaseExpiresAt <= backendNow`.
     3. Increments `fenceToken = priorRecord.fenceToken + 1`.
     4. Sets `leaseExpiresAt = backendNow + 60s`.
     5. Sets `workerId = replacementWorkerId`.
     6. Updates `updatedAt = serverTimestamp()`.
   - **Fenced Lease Renewal Protocol:** If an active worker requires additional execution time before its 60-second lease expires, it may renew its lease ONLY via a dedicated server transaction that verifies the exact same ownership and fencing rules:
     `record.status === 'IN_PROGRESS' && record.fenceToken === workerFenceToken && record.workerId === currentWorkerId && record.leaseExpiresAt > backendNow`.
     If verified, it extends `leaseExpiresAt = backendNow + 60s`. If the renewal contends with a takeover that won serialization first, renewal fails on `workerId` and `fenceToken`, causing the worker to halt execution without attempting to commit.
   - **Authoritative Server Time Derivation & Backend Clock Invariants:**
     Backend evaluation time `backendNow = Timestamp.now()` **MUST be recalculated inside every execution of the transaction callback** (`db.runTransaction(async (transaction) => { const backendNow = Timestamp.now(); ... })`), including automatic transaction retries.
     * **Prohibition of External Timestamp Reuse:** Reusing a timestamp captured outside the transaction callback or from an earlier retry attempt is **strictly prohibited**. When Cloud Firestore automatically retries a transaction due to concurrency contention, the callback executes anew; recalculating `backendNow` within the callback ensures the worker evaluates against an up-to-date clock value rather than an obsolete timestamp from prior retry intervals.
     * **Not a Server-Resolved Sentinel:** `Timestamp.now()` is generated by the trusted backend runtime (the local system clock of the Cloud Functions Node.js container) during the read phase of the transaction. It is **NOT** a Firestore server-resolved sentinel timestamp (`FieldValue.serverTimestamp()`, which can only be evaluated upon document write on the database server and cannot be inspected or compared during a transaction read phase).
     * **Read-Phase Conditional Invariants:** Because Firestore transactions require all reads to precede all writes, conditional checks (`record.leaseExpiresAt > backendNow`) must compare against an immediate timestamp provided by the trusted backend execution environment.
     * **Client Telemetry Untrusted:** Client timestamps (`firstDispatchedAt`, `clientTimestamp`) are untrusted diagnostic telemetry and are NEVER trusted or used in lease comparisons.

3. **Eight Mandatory Atomic Commit Invariants (Phase 2):**
   The business document creation (`sites` or `accounts_daily`), counter increments (`system_counters/sites_seq`), and ledger update are committed in a **single atomic Firestore transaction** (`db.runTransaction()`). Within this same transaction callback, the backend worker must verify ALL EIGHT of the following conditions before executing any write:
   1. **Operation Record Exists:** `committed_operations/{idempotencyKey}` must exist in Firestore.
   2. **Status is Exactly `IN_PROGRESS`:** `record.status === 'IN_PROGRESS'`. If `COMMITTED` or `ABORTED_TERMINAL`, the transaction aborts.
   3. **Fencing Token Equality:** `record.fenceToken === workerFenceToken`. If a takeover occurred, `record.fenceToken > workerFenceToken`, causing immediate transaction abort.
   4. **Worker Ownership Invariant:** `record.workerId === currentWorkerId`. Guarantees that the worker attempting the commit is the exact execution instance currently owning the lease.
   5. **Authoritative Lease Validity:** `record.leaseExpiresAt > backendNow`, where `backendNow = Timestamp.now()` is freshly evaluated inside the current transaction callback execution attempt. If the lease has lapsed, the worker is stale and cannot commit.
   6. **Operation Has Not Been Terminally Aborted:** `record.status !== 'ABORTED_TERMINAL'` and `record.abortedAt == null`.
   7. **Target Business Record Expected Base Revision is Still Valid:**
      - For site creation: Target `siteId` must not already exist in `sites/`.
      - For site correction: Predecessor version $v(n-1)$ must exist with `isLatestValidVersion === true` and `supersededBy == null`.
      - For daily accounts: Existing ledger `revisionsCount === expectedBaseRevision`.
   8. **No Conflicting Operation Has Already Committed:** No conflicting concurrent operation has already committed on the target business record (e.g. no intervening correction committed by another session, no conflicting category update committed for the same date).

   **Failure Action:** If ANY of these 8 checks fail, the transaction **MUST NOT write the business mutation or mark the operation `COMMITTED`**. The transaction aborts immediately and rolls back completely.
   **Atomicity Guarantee:** The business mutation and ledger transition to `COMMITTED` remain strictly atomic. It is physically impossible for a business record to commit without the ledger entry, or for the ledger entry to be marked `COMMITTED` without the business record.

4. **Terminal Abort Safety (`ABORTED_TERMINAL`):**
   - **Server-Controlled Terminal Transition:** Non-retryable validation failures (e.g. fatal schema errors, corrupted payloads, duplicate business constraints) transition the operation to `status: 'ABORTED_TERMINAL'`, setting `terminalReason: reasonCode`, `abortedAt: serverTimestamp()`, `leaseExpiresAt: null`, and `updatedAt: serverTimestamp()`.
   - **Permanent Prevention of Future Commits:** Once recorded as `ABORTED_TERMINAL`, the operation is permanently dead. Condition 2 (`record.status === 'IN_PROGRESS'`) and Condition 5 will permanently fail on all future commit attempts.
   - **Inability of Old Workers to Revert State:** An old worker cannot change an aborted operation back to `IN_PROGRESS` or `COMMITTED`. Any worker update or commit transaction asserts `record.status === 'IN_PROGRESS' && record.fenceToken === workerFenceToken`. Reading `ABORTED_TERMINAL`, the transaction aborts immediately.
   - **Mutual Exclusivity Under Transactional Concurrency:** Terminal abort and business commit are mutually exclusive because both are executed inside atomic Firestore multi-document transactions targeting the same document `committed_operations/{idempotencyKey}`. Under Firestore serializable transaction isolation:
     * If commit commits first, the abort transaction retries, reads `COMMITTED`, and cancels the abort.
     * If abort commits first, the commit transaction retries, reads `ABORTED_TERMINAL`, fails Condition 2, and cancels the commit and business mutation.
     Under no circumstances can an operation be both `COMMITTED` and `ABORTED_TERMINAL`.
   - **Retry After Terminal Abort (New Identity Required):** When a client queries and receives `status: 'NOT_COMMITTED'` with `terminalReason`, any retry requires the client to allocate a **brand-new `operationId`** (UUIDv4), increment `revisionNumber = revisionNumber + 1`, update `lastModifiedLocally`, and recompute a **fresh deterministic `idempotencyKey`** (`OP_IDEMP_...`). The aborted idempotency key remains permanently locked in `ABORTED_TERMINAL`.

**Security & Trust Boundary (Direct Client Access Strictly Denied):**
Direct client SDK reads and writes to `committed_operations` are **STRICTLY DENIED** in Firestore Security Rules (`allow read, write: if false;`). Client devices cannot query or enumerate committed operation records directly.
Reconciliation is performed strictly through the authenticated backend HTTPS Callable Cloud Function `queryOperationStatus({ idempotencyKey, firstDispatchedAt })`, which validates owner identity and queries the ledger via the Firebase Admin SDK.

---

### 3.9 Local Client Offline Draft Queue Schema (IndexedDB / SQLite — Task C Canonical Contract)

To support offline data entry while preserving multi-document Firestore transaction integrity upon reconnection, local modifications are staged locally in client storage (IndexedDB on Web, SQLite / Capacitor Preferences on Android):

```typescript
export type OfflineOperationType = 
  | 'CREATE_SITE'
  | 'UPDATE_SITE_CORRECTION'
  | 'UPDATE_ACCOUNTS'
  | 'RESTORE_RECORD'
  | 'SOFT_DELETE_RECORD';

export type OfflineConflictStatus = 
  | 'NONE'
  | 'STALE_BASE_VERSION'
  | 'CONCURRENT_COLLISION'
  | 'RESOLVED';

export type OfflineSyncStatus = 
  | 'PENDING_COMMIT'           // Draft saved locally; awaiting synchronization
  | 'UNCERTAIN_COMMIT'         // Commit payload transmitted; acknowledgment lost or disconnected
  | 'COMMITTED'                // Verified committed on Cloud Firestore
  | 'FAILED_VALIDATION'        // Rejected by validation constraints or security rules
  | 'CONFLICT';                // Stale base or concurrent edit requiring owner reconciliation

export interface OfflineOperationDraft {
  operationId: string;                 // UUIDv4 identifying this specific draft revision
  idempotencyKey: string;              // Deterministic key: 'OP_IDEMP_{deviceId}_{targetDocId}_{baseServerRevision}_{revisionNumber}_{payloadHash}'
  deviceId: string;                    // Unique client device instance identifier
  revisionNumber: number;              // Local draft revision counter (starts at 1; incremented whenever payload is modified)
  operationType: OfflineOperationType; // Semantic modification type
  targetCollection: 'sites' | 'accounts_daily';
  targetDocId: string;                 // Real doc ID or client-temporary ID (e.g. "temp_site_abc123")
  
  createdAt: Date;                     // Initial local creation timestamp
  lastModifiedLocally: Date;           // Latest local edit timestamp
  baseServerRevision: number | null;   // Version of the document on server when edit started (null for new creates)
  
  payload: Record<string, unknown>;    // Entity payload stored in proposed integer paise (conditional on REC-04 approval)
  syncStatus: OfflineSyncStatus;       // Local-only draft synchronization lifecycle state
  conflictStatus: OfflineConflictStatus;// Concurrency conflict classification
  retryCount: number;                  // Local synchronization attempt count
  lastSyncError?: string | null;       // Most recent sync error message
  committedServerDocId?: string | null;// Authoritative Firestore doc ID returned upon server commit
}
```

#### Offline Draft Identity & Mutation Lifecycle Specification
1. **Initial Draft Staging:**
   - When a record is created or edited while offline, the client generates a unique `operationId` (UUIDv4), initializes `revisionNumber = 1`, and computes `idempotencyKey = 'OP_IDEMP_{deviceId}_{targetDocId}_{baseServerRevision}_{revisionNumber}_{payloadHash}'` (e.g., `'OP_IDEMP_devA_site_uuid_1001_null_1_e3b0c442...'`).
   - The draft is written to private local storage (IndexedDB on Web, SQLite on Android) with `syncStatus: 'PENDING_COMMIT'`.
2. **Unchanged Retry Identity Preservation:**
   - If a synchronization upload attempt fails due to a network drop, timeout, or server reboot, and the local draft has **not been modified by the user**, subsequent synchronization retries **strictly preserve the original `operationId`, `revisionNumber`, and `idempotencyKey`**.
   - Preserving this identity guarantees that the server's idempotency check can recognize a retransmitted request.
3. **Modified Payload Revisioning Lifecycle:**
   - If the user modifies any field in a pending offline draft (whether before the first synchronization attempt or after a failed attempt where outcome is known to not be committed), the client **MUST NOT reuse the prior identity**.
   - Instead, the client assigns a **brand-new `operationId`** (new UUIDv4), increments `revisionNumber = revisionNumber + 1`, updates `lastModifiedLocally = new Date()`, and recalculates `idempotencyKey` incorporating the new payload hash and revision number.
   - This prevents the server from mistaking updated data for a retransmitted duplicate of earlier, superseded data, ensuring zero silent discards of user edits.
4. **Server-Committed Ack-Lost Handling (Zero Financial Duplication):**
   - If the server receives an upload, successfully commits the transaction (e.g., allocates sequence number, writes `sites/{siteId}`, updates audit log), but the network drops before the HTTP response or acknowledgment reaches the client device:
     - The client draft transitions to `syncStatus: 'UNCERTAIN_COMMIT'`.
     - Upon network recovery, the client executes an idempotency query with the original `operationId` and `idempotencyKey`.
     - The server transaction checks its committed operations ledger by `idempotencyKey`. Finding the existing committed record, it **bypasses re-execution**, skips sequence re-incrementing, and immediately returns the previously committed record metadata (`committedServerDocId`, server timestamp).
     - The client receives this confirmation, marks the draft `COMMITTED`, records `committedServerDocId`, and clears the draft safely without creating duplicate financial records or causing sequence number skips.
5. **Uncertain-Commit Editing & Pre-Sync Reconciliation Protocol:**
   - **Trigger State:** An upload attempt was dispatched, but cellular/Wi-Fi connection dropped before a conclusive server response was received (`syncStatus: 'UNCERTAIN_COMMIT'`).
   - **Reconciliation Query:** If the owner attempts to edit this draft while disconnected or upon reconnecting, the client **MUST NOT permit blind editing or blind resubmission**. Because direct client reads to `committed_operations` are strictly DENIED in Firestore Security Rules (`allow read, write: if false;`), the client queries commit status by invoking the authenticated backend HTTPS Callable Cloud Function `queryOperationStatus({ idempotencyKey, firstDispatchedAt })` via Firebase Admin SDK:
     ```typescript
     export type OperationCommitStatus = 'COMMITTED' | 'NOT_COMMITTED' | 'UNKNOWN';

     export interface QueryOperationStatusRequest {
       idempotencyKey: string;             // Business-operation key format: ^OP_IDEMP_[A-Za-z0-9_.-]+$
       firstDispatchedAt?: string | null; // Untrusted diagnostic telemetry only
     }

     export interface QueryOperationStatusResponse {
       status: OperationCommitStatus;
       idempotencyKey: string;
       // Populated when status === 'COMMITTED':
       committedServerDocId?: string | null;
       targetCollection?: 'sites' | 'accounts_daily' | null;
       committedVersion?: number | null;
       serverCommittedAt?: string | null;
       // Populated when status === 'NOT_COMMITTED':
       terminalReason?: string | null;
       // Populated when status === 'UNKNOWN':
       errorMessage?: string | null;
       retryable?: boolean;
     }
     ```
     - **Server-Controlled Dispatch Logic Across All 5 Execution States:**
       The backend queries `committed_operations/{idempotencyKey}` via the Admin SDK and executes the following deterministic dispatch:
       * **State 1: `COMMITTED`**
         - *Server Condition:* Record exists with `status === 'COMMITTED'`.
         - *Backend Response:* `status: 'COMMITTED'`, with `committedServerDocId`, `targetCollection`, `committedVersion`, and `serverCommittedAt`.
         - *Client Action (Branch A):* Marks local draft `COMMITTED`, loads committed server record into local state, and routes subsequent edits as linear correction versions ($v_{committed+1}$).
         - *Outcome:* Zero duplicate site creation, zero skipped sequence numbers, zero split histories.
       * **State 2: Confirmed Terminal `NOT_COMMITTED`**
         - *Server Condition:* Record exists with `status === 'ABORTED_TERMINAL'`. (This is the **ONLY** condition under which `NOT_COMMITTED` is permitted).
         - *Backend Response:* `status: 'NOT_COMMITTED'`, with `terminalReason`.
         - *Client Action (Branch B):* Confirms the operation was never committed and is guaranteed to never commit in the future. The owner is permitted to edit the draft immediately. The client allocates a new `operationId` (UUIDv4), increments `revisionNumber = revisionNumber + 1`, updates `lastModifiedLocally`, recomputes `idempotencyKey` with the new payload hash, and sets `syncStatus: 'PENDING_COMMIT'`.
         - *Outcome:* Zero lost user edits; idempotency key accurately reflects new content without split history risks.
       * **State 3: `PENDING` / In Progress**
         - *Server Condition:* Record exists with `status === 'IN_PROGRESS'` and `leaseExpiresAt > serverNow`.
         - *Backend Response:* **`status: 'UNKNOWN'`**, with `retryable: true`, `errorMessage: 'Operation currently executing on backend'`.
         - *Client Action (Branch C Guard):* Draft is **retained in `syncStatus: 'UNCERTAIN_COMMIT'`**. Potentially conflicting edits and resubmissions are **strictly BLOCKED**.
       * **State 4: Expired or Recovering Operation**
         - *Server Condition:* Record exists with `status === 'IN_PROGRESS'` and `leaseExpiresAt <= serverNow`.
         - *Backend Response:* **`status: 'UNKNOWN'`**, with `retryable: true`, `errorMessage: 'Operation lease expired; awaiting supervisor recovery'`.
         - *Client Action (Branch C Guard):* Draft is **retained in `syncStatus: 'UNCERTAIN_COMMIT'`**. Potentially conflicting edits and resubmissions are **strictly BLOCKED**.
       * **State 5: Unavailable or Indeterminate Result**
         - *Server Condition:* Record does NOT exist in `committed_operations` (request may still be in network transit or not yet received), OR transient Firestore error/timeout occurs during lookup.
         - *Backend Response:* **`status: 'UNKNOWN'`**, with `retryable: true`, `errorMessage: 'Operation status indeterminate; awaiting verification'`.
         - *Client Action (Branch C Guard):* Draft is **retained in `syncStatus: 'UNCERTAIN_COMMIT'`**. Potentially conflicting edits and resubmissions are **strictly BLOCKED**.
     - **Mandatory Client Guard on `UNKNOWN`:**
       Whenever `status === 'UNKNOWN'` is returned (for all unresolved, in-progress, expired, unrecorded, or indeterminate cases):
       - The client **MUST NOT permit divergent local editing**.
       - The client **MUST NOT permit blind resubmission**.
       - UI Banner: *"Previous save attempt is awaiting server verification. Editing and resubmission are paused until connection and execution status are verified."*
       - The client continues verification polling with exponential backoff until a terminal server outcome (`COMMITTED` or confirmed `NOT_COMMITTED`) is received before unlocking edits.
6. **Stale-Base Conflict Behavior (`STALE_BASE_VERSION`):**
   - If, upon reconnection and server query, the client discovers that while the draft was in-flight or offline, another device (or online session) modified the same record, advancing the server's version beyond `baseServerRevision` (`serverVersion > draft.baseServerRevision`):
     - The draft is flagged as `syncStatus: 'CONFLICT'`, `conflictStatus: 'STALE_BASE_VERSION'`.
     - Automatic commit halts immediately.
     - The **Conflict Review Modal (SCR-11)** is surfaced to the owner, presenting the latest committed server version side-by-side with the local draft.
     - The owner explicitly resolves the conflict (e.g. discard local draft, apply local draft as a new correction version on top of the newer server record, or merge non-overlapping account categories).

---

## 4. Indexing Strategy & Query Optimization

### 4.1 Single-Field Indexes
* `sites.year` (Ascending)
* `sites.workDate` (Ascending / Descending)
* `sites.billNumber` (Ascending)
* `sites.originalRecordId` (Ascending)
* `accounts_daily.year` (Ascending)
* `accounts_daily.entryDate` (Ascending / Descending)

### 4.2 Composite Indexes (Configured in `firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "sites",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isDeleted", "order": "ASCENDING" },
        { "fieldPath": "isLatestValidVersion", "order": "ASCENDING" },
        { "fieldPath": "year", "order": "ASCENDING" },
        { "fieldPath": "sequenceNumber", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "sites",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isDeleted", "order": "ASCENDING" },
        { "fieldPath": "isLatestValidVersion", "order": "ASCENDING" },
        { "fieldPath": "workDate", "order": "DESCENDING" },
        { "fieldPath": "sequenceNumber", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "sites",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "originalRecordId", "order": "ASCENDING" },
        { "fieldPath": "version", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "sites",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isDeleted", "order": "ASCENDING" },
        { "fieldPath": "deletedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "accounts_daily",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isDeleted", "order": "ASCENDING" },
        { "fieldPath": "year", "order": "ASCENDING" },
        { "fieldPath": "entryDate", "order": "ASCENDING" }
      ]
    }
  ]
}
```
