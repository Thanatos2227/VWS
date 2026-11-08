# Vetri Water Solutions (VWS) — Phase 01G Final Contradiction Resolution & Integrity Audit Report
**Document ID:** VWS-DOC-020  
**Project Phase:** Phase 01G — Final Contradiction Resolution & Owner Decision Gate  
**Status:** Authoritative Audit & Remediation Report — Complete, Verified & Frozen  
**Author:** Senior Software Architect, Firebase Security Engineer, Database Architect, Financial Systems Engineer, Google Drive Integration Engineer, and Independent QA Auditor  
**Date:** November 2026 (Phase 01G Contradiction Resolution)  

---

## 1. Executive Summary

Phase 01G constitutes the definitive, final contradiction resolution and owner decision gate for **Vetri Water Solutions (VWS)**.

An independent architectural review of the Phase 01F deliverables (`VWS_PHASE_01F_FINAL_ARCHITECTURE_REMEDIATION_REPORT.md`, `VWS_PHASE_01F_OWNER_APPROVAL_REGISTER.md`, and `VWS_DATABASE_SCHEMA.md`) identified residual technical discrepancies across several critical domains:
1. Competing task queue schemas between report text and database schema types.
2. Incomplete path-and-field security matrix granularity for client versus backend operations.
3. Disparate offline draft idempotency keys and incomplete conflict scenario definitions.
4. Technical overstatements regarding Managed Firestore exports, Point-In-Time Recovery (PITR), distributed lock recovery, and cryptographic SHA-256 integrity proofs.
5. Absolute guarantees regarding costs, reliability, and zero-loss offline durability.
6. Premature adoption of Integer Paise (REC-04) as mandatory in the schema while technically awaiting owner approval.
7. A document count discrepancy between the inventory report and the approval register.
8. Unresolved reporting attribution for staff salary disbursements (POQ-01).

In Phase 01G, all ten investigation areas (Tasks A through J) were resolved with rigorous evidence-based engineering. All ten authoritative blueprint documents (`VWS-DOC-001` through `VWS-DOC-010`) were updated and synchronized. All nine historical phase reports (`VWS-DOC-011` through `VWS-DOC-019`) were preserved without modification. Zero application code was created, no dependencies were installed, and execution has stopped completely awaiting explicit owner decisions.

---

## 2. Scope & Absolute Restrictions Compliance

| Strict Restriction | Execution Status | Empirical Verification Evidence |
| :--- | :---: | :--- |
| **No Application Code** | **PASS** | `Get-ChildItem -Path .` confirms zero `.ts`, `.tsx`, `.js`, or `.py` code files. |
| **No Framework Initialization** | **PASS** | No React, Vite, Capacitor, Android, or Firebase frameworks initialized. |
| **No Package Installations** | **PASS** | No `package.json`, `node_modules`, or package locks exist in the repository. |
| **No Infrastructure Deployment** | **PASS** | No live Cloud Functions, Cloud Scheduler jobs, or Firestore rules deployed. |
| **No Credential Generation** | **PASS** | No OAuth client secrets, refresh tokens, or service account keys generated. |
| **No Historical Report Deletions** | **PASS** | All reports (`DOC-011` through `DOC-019`) preserved unchanged in `docs/`. |
| **No Invented Owner Approvals** | **PASS** | REC-01 through REC-11 classified strictly as awaiting individual owner decisions. |

---

## 3. Review of Phase 01F Deliverables & Contradiction Diagnostics

The independent review evaluated three Phase 01F documents:
* **`VWS_DATABASE_SCHEMA.md` (DOC-005):** Contained task queue types (`SCHEDULED_DAILY_BACKUP`, `id`, `attempts`, `leaseOwner`) that conflicted with the Phase 01F report (`EXCEL_SYNC`, `taskId`, `retryCount`, `claimLease`). Also enforced integer paise as mandatory before owner approval of REC-04.
* **`VWS_PHASE_01F_FINAL_ARCHITECTURE_REMEDIATION_REPORT.md` (DOC-018):** Introduced an alternative task queue interface; lacked granular field-level client update restrictions; omitted explicit lock purging rules on disaster restoration; and used generalized phrasing for budget alerts and offline durability.
* **`VWS_PHASE_01F_OWNER_APPROVAL_REGISTER.md` (DOC-019):** Bundled recommendations into an all-or-nothing checkbox; cited an 18-document blueprint while 19 documents actually existed in `docs/`.

---

## 4. Task A — Canonical Task Queue: Single Authoritative Contract

The competing contracts between `TaskQueueRecord` and `SystemTaskRecord` have been unified into a single authoritative contract across all blueprint documents.

### 4.1 Canonical Contract Specification
* **Canonical Collection Path:** `system_tasks/{taskId}`
* **Task Identifier Strategy:** Strictly deterministic Document ID (`taskId` in `system_tasks/{taskId}`) matching or directly derived from `idempotencyKey` without random timestamp/UUID suffixes (e.g. `TASK_SCHEDULED_DAILY_BACKUP_{YYYY-MM-DD}`). Non-deterministic timestamp + UUID formats are strictly rejected because random suffixes produce differing document IDs on duplicate calls, which defeats Firestore's native atomic uniqueness enforcement.
* **Workflow Types (`CanonicalTaskType`):**
  1. `SCHEDULED_DAILY_BACKUP`: Autonomous 23:00 IST scheduled Cloud Function execution compiling Excel and JSON archives.
  2. `CLIENT_MANUAL_EXPORT`: Owner-initiated on-demand Excel export/sync from Web or Android client.
  3. `DATABASE_JSON_DUMP`: Dedicated database JSON serialization and Google Drive upload.
  4. `DRIVE_RESUMABLE_UPLOAD`: Dedicated multi-chunk streaming task for large payloads.
  5. `METADATA_AUDIT`: Integrity verification of backup manifests and Google Drive storage quota.
* **Execution Statuses (`CanonicalTaskStatus`):**
  `PENDING` | `CLAIMED` | `RUNNING` | `SUCCEEDED` | `RETRY_WAIT` | `FAILED_PERMANENT` | `WAITING_REAUTH`

### 4.2 Complete TypeScript Interface
```typescript
export interface SystemTaskRecord {
  taskId: string;                      // Canonical Deterministic Document ID (e.g. "TASK_SCHEDULED_DAILY_BACKUP_2026-03-15")
  taskType: CanonicalTaskType;         // Operation category
  status: CanonicalTaskStatus;         // Current lifecycle state
  idempotencyKey: string;              // Deterministic deduplication key (canonical token matching or deriving taskId)
  payload: Record<string, unknown>;    // Task-specific parameters (e.g. calendarYear, targetFolderId)
  
  // Execution & Lease Coordination
  initiatingSource: 'CLOUD_SCHEDULER' | 'CLIENT_WEB' | 'CLIENT_ANDROID' | 'WORKER_INTERNAL';
  initiatorInstanceId: string;         // Device instance ID or Cloud Function execution ID
  leaseOwner?: string | null;          // Currently executing worker instance ID
  leaseExpiry?: Timestamp | null;      // UTC lease deadline (3-minute TTL with heartbeats)
  heartbeatAt?: Timestamp | null;      // UTC timestamp of last worker heartbeat
  
  // Scheduling & Retry Backoff
  createdAt: Timestamp;                // Initial creation timestamp
  scheduledFor: Timestamp;            // Target execution timestamp
  attempts: number;                    // Execution attempts count (starts at 0)
  maxAttempts: number;                 // Maximum threshold before permanent failure (default: 5)
  nextRetryAt?: Timestamp | null;      // Backoff target timestamp when in RETRY_WAIT
  
  // Export Versioning & Checksums (where applicable)
  exportVersion?: number | null;       // Monotonic export sequence version
  payloadChecksum?: string | null;     // Pre-computed external SHA-256 hash of payload
  stagedPayloadUri?: string | null;    // Storage pointer or IndexedDB key for staged payload
  payloadSizeBytes?: number | null;    // Size of the pre-compiled binary/JSON payload
  driveFileId?: string | null;         // Created Google Drive file identifier
  
  // Diagnostics & Terminal Dead-Letter
  errorClassification?: string | null; // 'TRANSIENT_NETWORK' | 'INVALID_GRANT' | 'QUOTA_EXCEEDED' | 'CORRUPTION'
  terminalFailureReason?: string | null;// Detailed reason for transition to FAILED_PERMANENT
  lastError?: string | null;           // Most recent error message/code
  
  updatedAt: Timestamp;
  completedAt?: Timestamp | null;
}
```

### 4.3 State Machine Transitions & Authorized Actors
```
               +------------+
               |  PENDING   | <---------------+
               +-----+------+                 |
                     | (Worker claims lease)  |
                     v                        |
               +-----+------+                 |
               |  CLAIMED   |                 |
               +-----+------+                 |
                     | (Worker begins exec)   |
                     v                        |
               +-----+------+                 |
+------------->|  RUNNING   |                 |
|              +-----+------+                 |
|                    |                        |
|        +-----------+-----------+            |
|        |           |           |            |
|     (Success)  (Transient) (Auth Expired)   |
|        v           v             v          |
|  +-----------+ +------------+ +----------------+
|  | SUCCEEDED | | RETRY_WAIT | | WAITING_REAUTH |
|  +-----------+ +-----+------+ +-----+----------+
|                      |              |       |
|              (Backoff Expired) (Re-consent) |
+----------------------+              +-------+
|
| (Retries Exhausted / Fatal)
v
+------------------+
| FAILED_PERMANENT |
+------------------+
```
* **Client Permissions:** Clients (`CLIENT_WEB`, `CLIENT_ANDROID`) may ONLY create task documents with `status = 'PENDING'`, `attempts = 0`, and unset execution state (`leaseOwner`, `leaseExpiry`, `heartbeatAt`, `completedAt`, `payloadChecksum` all null or omitted). Security rules enforce map key validation (`hasOnly`) permitting strictly the 12 required creation fields and 5 nullable execution fields, rejecting any client-injected execution metadata or unexpected properties. Clients possess **ZERO update or delete permissions** on `system_tasks/{taskId}`.
* **Backend Permissions:** The Cloud Functions worker (Firebase Admin SDK) is the **sole actor authorized** to transition tasks to `CLAIMED`, `RUNNING`, `SUCCEEDED`, `RETRY_WAIT`, `FAILED_PERMANENT`, or `WAITING_REAUTH`, allocate monotonic export versions, and write `completedAt` and `payloadChecksum`.

### 4.4 Task Queue Deterministic Identifier Strategy & Execution Guarantees
* **Canonical Deterministic Task ID Strategy:**
  * To guarantee atomic duplicate prevention at the database storage layer, every task document in `system_tasks/{taskId}` uses a **strictly deterministic Document ID** (`taskId`) matching or directly derived from its operation type and business scope.
  * **Deterministic Formats Across All Workflows:**
    * Scheduled Daily Backup: `TASK_SCHEDULED_DAILY_BACKUP_{YYYY-MM-DD}` (matching `idempotencyKey = "IDEMP_SCHEDULED_DAILY_BACKUP_{YYYY-MM-DD}"`).
    * Complete Database JSON Dump: `TASK_DATABASE_JSON_DUMP_{YYYY-MM-DD}` (matching `idempotencyKey = "IDEMP_DATABASE_JSON_DUMP_{YYYY-MM-DD}"`).
    * Client Manual Export: `TASK_CLIENT_MANUAL_EXPORT_{deviceId}_{calendarYear}_{payloadSha256}` (matching `idempotencyKey = "IDEMP_CLIENT_MANUAL_EXPORT_{deviceId}_{calendarYear}_{payloadSha256}"`).
      * *Canonical Identity Inputs:* Computed over canonical JSON of `{ initiatingSource, deviceId, calendarYear, exportScope, clientExportSeq, snapshotBoundary }`.
      * *Full Cryptographic Digest:* `payloadSha256` is the full 64-character hexadecimal SHA-256 digest, completely eliminating truncated 8-character hash collision risks.
    * Resumable Upload Chunk Stream: `TASK_DRIVE_RESUMABLE_UPLOAD_{sourceTaskId}_{chunkIndex}`.
    * Metadata Audit: `TASK_METADATA_AUDIT_{YYYY-MM-DD}`.
  * **Prohibition of Non-Deterministic IDs:** Timestamp + UUID task IDs (e.g. `TASK_{TYPE}_{TIMESTAMP}_{UUID8}`) are strictly prohibited across all interfaces, executors, and Cloud Functions. Non-deterministic IDs produce different document paths on repeated invocations of the same event, completely defeating database-level uniqueness enforcement.
* **Stable Identity Across Retries vs. Intentional New Exports:**
  * **Duplicate Network Retries (Preserved Identity):** When an export request is retried due to a dropped connection, timeout, or Google Drive 503 error, the client retransmits the **exact same canonical inputs** (`clientExportSeq` and `snapshotBoundary` remain identical). Consequently, `payloadSha256`, `taskId`, and `idempotencyKey` remain identical. The backend detects the existing document in `system_tasks/{taskId}`, prevents duplicate task creation, and safely resumes under `status = 'RETRY_WAIT'`, `attempts = attempts + 1`.
  * **Intentional New Exports (Distinct Identity):** When the owner deliberately initiates a *new* export action from the UI, the client increments the monotonic `clientExportSeq = clientExportSeq + 1` in client storage and captures the new `snapshotBoundary`. Because these canonical inputs advance, the resulting full `payloadSha256` is provably distinct. This deterministically generates a new `taskId`, permitting the new export to proceed immediately without being blocked by prior tasks, while preserving complete retry idempotency for each individual export.
* **Atomic Duplicate-Prevention Mechanism:**
  * Task creation executes via Firestore's atomic document creation (`create(system_tasks.doc(taskId), data)` or inside an atomic transaction).
  * If concurrent triggers fire simultaneously (e.g. duplicate Cloud Scheduler webhook delivery or rapid client double-tap), Firestore enforces document uniqueness atomically. Exactly one request creates the document; concurrent requests fail with an `ALREADY_EXISTS` status and safely receive the reference to the active in-flight task, completely preventing duplicate task records.
* **Retry Identity Preservation:**
  * Retries of transiently failed tasks strictly reuse the **original `taskId` and `idempotencyKey`**.
  * The executor updates the existing task document in-place (`status = 'RETRY_WAIT'`, `attempts = attempts + 1`, `nextRetryAt = timestamp`). The system NEVER spawns duplicate or successor task documents for retries.
* **Execution Guarantees & Realities:**
  * The task queue provides **at-least-once task delivery with atomic idempotent deduplication** across its 7-state lifecycle: `PENDING` $\to$ `CLAIMED` $\to$ `RUNNING` $\to$ `SUCCEEDED` / `RETRY_WAIT` / `FAILED_PERMANENT` / `WAITING_REAUTH`.
  * It does NOT claim theoretical "exactly-once execution". Handlers verify preconditions idempotently before external side effects (e.g., verifying whether a Drive file with the matching SHA-256 already exists in `Backups/` before streaming bytes).
* **Payload Integrity:** If a client attempts to submit a modified payload under an existing idempotency key, the submission is rejected with an idempotency mismatch error.
* **Explicit Separation of Idempotency Key Classes:** The architecture maintains two strictly separated domains of deterministic idempotency keys:
  1. *System-Task Idempotency Keys (`IDEMP_*`):* Deduplicate background queue tasks in `system_tasks/{taskId}` (e.g. `IDEMP_SCHEDULED_DAILY_BACKUP_{YYYY-MM-DD}`, `IDEMP_CLIENT_MANUAL_EXPORT_{deviceId}_{calendarYear}_{payloadSha256}`).
  2. *Business-Operation Idempotency Keys (`OP_IDEMP_*`):* Deduplicate client transactional mutations in `committed_operations/{idempotencyKey}` (e.g. `OP_IDEMP_{deviceId}_{targetDocId}_{baseServerRevision}_{revisionNumber}_{payloadHash}`).
  Neither format alters or supersedes the other; both preserve their strict deterministic derivations.

---

## 5. Task B — Firestore Security and Trust Boundaries

A complete path-and-field authorization matrix was established to ensure client devices cannot forge system state, corrupt locks, or bypass audit logging:

### 5.1 Comprehensive Path-and-Field Authorization Matrix
```
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
| Collection / Document Path         | Client | Client | Client | Client | Backnd | Backnd  | Immutable Fields              | Protected / Guarded   | Validation Requirements |
|                                    | Read   | Create | Update | Delete | Read   | Write   | (Cannot be altered on update) | Fields                | & Allowed Transitions   |
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
| `sites/{siteId}`                   | ALLOW  | DENY   | DENY   | DENY   | ALLOW  | ALLOW   | `createdAt`, `sequenceNumber`,| `isDeleted`,          | Direct Client Write:    |
|                                    |        |        |        |        |        |         | `originalRecordId`, `workDate`| `isLatestValidVersion`| DENY. All creation and  |
|                                    |        |        |        |        |        |         | `billValuePaise`, tank items  | `supersededBy`,       | corrections mediated    |
|                                    |        |        |        |        |        |         | (Historical business content) | `sequenceNumber`      | via backend callables.  |
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
| `accounts_daily/{dateId}`          | ALLOW  | DENY   | DENY   | DENY   | ALLOW  | ALLOW   | `createdAt`, `entryDate`,     | `revisionsCount`,     | Direct Client Write:    |
|                                    |        |        |        |        |        |         | `year`                        | `dailyGrandTotalPaise`| DENY. All creation and  |
|                                    |        |        |        |        |        |         |                               |                       | updates mediated via    |
|                                    |        |        |        |        |        |         |                               |                       | backend callables.      |
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
| `.../audit_log/{revisionId}`       | ALLOW  | DENY   | DENY   | DENY   | ALLOW  | ALLOW   | All fields strictly immutable | Entire document       | Direct Client Write:    |
|                                    |        |        |        |        |        |         | once written                  | (Cannot be edited)    | DENY. Appended strictly |
|                                    |        |        |        |        |        |         |                               |                       | by backend transaction. |
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
| `system_tasks/{taskId}`            | ALLOW  | ALLOW  | DENY   | DENY   | ALLOW  | ALLOW   | `taskId`, `idempotencyKey`,   | `status`, `attempts`, | Client can only CREATE  |
|                                    |        | (Pend) |        |        |        |         | `createdAt`, `scheduledFor`,  | `leaseOwner`, `lease- | with status='PENDING'.  |
|                                    |        |        |        |        |        |         | `initiatingSource`            | Expiry`, `completedAt`| Backend drives lifecycle|
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
| `system_counters/{counterId}`      | ALLOW  | DENY   | DENY   | DENY   | ALLOW  | ALLOW   | Document ID                   | `currentSeq`,         | Direct Client Write:    |
|                                    |        |        |        |        |        |         |                               | `exportVersion`       | DENY. Monotonic sequence|
|                                    |        |        |        |        |        |         |                               |                       | allocated by backend.   |
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
| `system_state/{documentId}`        | ALLOW  | DENY   | DENY   | DENY   | ALLOW  | ALLOW   | All fields to client          | Entire document       | Strict read-only to     |
|                                    |        |        |        |        |        |         |                               |                       | client. Admin SDK only. |
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
| `system_locks/{lockId}`            | ALLOW  | DENY   | DENY   | DENY   | ALLOW  | ALLOW   | Document ID                   | `leaseOwner`,         | Direct Client Write:    |
|                                    |        |        |        |        |        |         |                               | `leaseExpiresAt`,     | DENY. Distributed leases|
|                                    |        |        |        |        |        |         |                               | `activeTaskId`        | managed by backend.     |
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
| `backups_metadata/{backupId}`      | ALLOW  | DENY   | DENY   | DENY   | ALLOW  | ALLOW   | All fields to client          | Entire document       | Strict read-only to     |
|                                    |        |        |        |        |        |         |                               |                       | client. Admin SDK only. |
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
| `committed_operations/{idempKey}`  | DENY   | DENY   | DENY   | DENY   | ALLOW  | ALLOW   | All fields strictly immutable | Entire document       | Direct Client Access:   |
|                                    |        |        |        |        |        |         | once committed                | (Idempotency ledger)  | STRICTLY DENIED. Queried|
|                                    |        |        |        |        |        |         |                               |                       | via callable function   |
|                                    |        |        |        |        |        |         |                               |                       | `queryOperationStatus`. |
+------------------------------------+--------+--------+--------+--------+--------+---------+-------------------------------+-----------------------+-------------------------+
```

### 5.2 Architectural Enforcement Distinctions
1. **Architectural Channel Separation (Direct Client SDK vs Backend Callable Functions):**
   - **Direct Client SDK Channel:** Evaluated by Firestore Security Rules. Authenticated clients possess read access across business and system collections, and restricted creation access to `system_tasks/{taskId}` (strictly `status: 'PENDING'`). Direct client writes to business collections (`sites`, `accounts_daily`, `audit_log`) and system collections (`system_counters`, `system_locks`, `system_state`, `backups_metadata`) are **strictly DENIED (`allow write: if false`)**. Direct client read and write access to `committed_operations` is **STRICTLY DENIED (`allow read, write: if false`)**.
   - **Authenticated Backend Cloud Functions Channel:** Application mutations and reconciliation queries are submitted as authenticated HTTPS Callable requests (`commitSiteJob`, `commitSiteCorrection`, `commitDailyAccountsUpdate`, `queryOperationStatus`). The backend validates identity (`context.auth.token.email === OWNER_EMAIL`), checks data constraints, and executes multi-document atomic transactions via the Firebase Admin SDK.
   - *Definitional Guard:* A callable backend function request is an application RPC invocation over HTTPS. It is **NEVER** described or treated as a direct client Firestore write.
2. **Business Record Permissions & Write Mediation:**
   - Direct client writes to `sites`, `accounts_daily`, and `audit_log` are strictly DENIED to guarantee that client runtimes cannot bypass backend validation, forge sequence numbers, break non-destructive version chains, or update ledgers without auditing.
   - **`commitSiteJob`:** Authenticated callable function. Atomically reads and increments `system_counters/sites_seq`, validates site payload, and writes `sites/{siteId}` with authoritative sequence number.
   - **`commitSiteCorrection`:** Authenticated callable function. Atomically validates base version, deactivates predecessor (`isLatestValidVersion: false`, `supersededBy: newId`), and writes successor `sites/{newId}` with incremented version number.
   - **`commitDailyAccountsUpdate`:** Authenticated callable function. Atomically recalculates category totals, updates `accounts_daily/{dateId}`, and appends an immutable revision audit record to `accounts_daily/{dateId}/audit_log/{revisionId}`.
3. **System Tasks Isolation & Strict Map Key Validation:** Clients can enqueue tasks with initial parameters (`status: 'PENDING'`, `attempts: 0`, and execution fields unset/null). Firestore Security Rules enforce strict map key validation (`keys().hasOnly(...)`) permitting strictly the 12 required task fields and 5 nullable execution fields, immediately rejecting any client attempt to inject execution proofs, worker leases, export versions, error fields, or unexpected properties. Clients possess zero update or delete permissions.
4. **Distributed Locks & Sequence Allocation Trust Boundaries (Admin SDK Exclusivity):** Untrusted client runtimes (Web browser, Android app) have **zero write access** (`allow write: if false`) to `system_counters` and `system_locks`.
   - **Authoritative Sequence Allocation:** Site sequence numbers (`sites_seq`) and Drive export versions (`drive_sync`) are allocated strictly inside trusted Cloud Functions transactions using the Firebase Admin SDK. Clients never increment counters directly.
   - **Distributed Locks:** Lease acquisition, heartbeat renewal, expired-lease reclamation (3-minute TTL), and lease release on `system_locks/drive_export_coordinator` are executed exclusively by backend Cloud Functions (Admin SDK). This prevents untrusted or compromised client runtimes from acquiring, holding, or corrupting coordinator leases.
5. **Historical Data Immutability vs Lifecycle Metadata:** When an existing site is corrected, its business payload (`billValuePaise`, `tankMeasurements`, `customerName`, `workDate`, `billNumber`) is permanently immutable. Only lifecycle metadata (`isLatestValidVersion`, `supersededBy`, `supersededAt`, `updatedAt`) is updated on the predecessor document in the same transaction that creates the successor version.
6. **Admin SDK Independent Validation:** Because the Firebase Admin SDK completely bypasses Firestore Security Rules, all Cloud Functions independently validate caller authentication, schema constraints, and business invariants before performing writes.
7. **Separation of Local Draft States from Committed Firestore Records:** Cloud Firestore business collections (`sites`, `accounts_daily`) contain strictly committed, authoritative records created or updated via backend transactions. Local draft synchronization statuses (`PENDING_COMMIT`, `UNCERTAIN_COMMIT`, `CONFLICT`) are private client runtime states tracked exclusively in `OfflineOperationDraft` within client storage (IndexedDB on Web, SQLite on Android). Authoritative Firestore records possess NO syncStatus field; records exist in the cloud strictly in an authoritative committed state.
8. **Committed Operations Ledger & `queryOperationStatus` Reconciliation:** Direct client reads and writes to `committed_operations` are strictly DENIED in Firestore Security Rules (`allow read, write: if false;`). Reconciliation of in-flight operations (`UNCERTAIN_COMMIT`) is mediated exclusively by the authenticated backend callable Cloud Function `queryOperationStatus`, which validates owner identity and business-operation idempotency key syntax (`^OP_IDEMP_[A-Za-z0-9_.-]+$`) before querying the ledger via Admin SDK.
9. **Backend Task Payload Validation & Authoritative Request Metadata:** The backend worker independently validates payload schemas by task type (`CLIENT_MANUAL_EXPORT`, `DATABASE_JSON_DUMP`, `DRIVE_RESUMABLE_UPLOAD`, `METADATA_AUDIT`). Client metadata (`requestedBy`, `clientTimestamp`) is treated strictly as untrusted diagnostic metadata; calling identity is derived from verified authentication context (`context.auth.token.email === OWNER_EMAIL`), authoritative timestamps are generated server-side via `FieldValue.serverTimestamp()`, and client-supplied checksums, versions, or Drive IDs are strictly rejected as execution evidence.
10. **Server-Controlled Operation Lifecycle, Strict Lease Validation & Fencing Tokens:** The backend eliminates any reliance on client-elapsed grace periods ($\Delta t \ge 90\text{s}$) to establish non-commitment. Any client-provided timestamp (`firstDispatchedAt`) is treated strictly as untrusted client diagnostic metadata; backend evaluation time `backendNow` is derived via trusted backend runtime `Timestamp.now()`. Crucially, `backendNow` **MUST be recalculated inside every execution of the transaction callback**, including automatic transaction retries; reusing a timestamp captured outside the callback or from prior retry attempts is strictly prohibited. Authoritative commitment is governed entirely by a server-controlled lifecycle (`IN_PROGRESS`, `COMMITTED`, `ABORTED_TERMINAL`) within `committed_operations/{idempotencyKey}`. Two-phase execution claims the operation under a 60-second lease with a monotonic `fenceToken`. Atomic commit transactions verify all Eight Mandatory Invariants (record exists, `IN_PROGRESS`, `fenceToken` match, `workerId` match, lease active via freshly evaluated `Timestamp.now()`, not aborted, valid expected base revision, no conflicting operation committed). Lease expiry makes an operation eligible for takeover; it does not independently terminate an active worker. Commit and takeover transactionally contend on the operation ledger record; the transaction serialization outcome is the authoritative safety boundary. A replacement worker atomically takes over an expired lease by incrementing `fenceToken` and reassigning `workerId`, rendering stale workers incapable of committing. Active workers can extend valid leases via fenced renewals following the same ownership and fencing checks. Terminal abort (`ABORTED_TERMINAL`) and business commit are mutually exclusive under transactional concurrency; aborted operations are permanently dead and cannot be reverted by old workers. Confirmed `NOT_COMMITTED` is returned strictly and only when a durable `ABORTED_TERMINAL` record exists; all in-progress, expired, recovering, unrecorded, or indeterminate operations return `status: 'UNKNOWN'`, which strictly blocks client divergent editing and resubmissions.
11. **Single Authoritative Rules Source (`firestore.rules.template`) & CI/CD Substitution:** In the repository, `firestore.rules.template` is the single, authoritative, version-controlled source file (containing the placeholder `__VWS_OWNER_EMAIL__`). The deployment file `firestore.rules` is an ephemeral artifact generated solely during the pre-deploy build hook (`scripts/build-rules.mjs`), which validates and substitutes `process.env.VWS_OWNER_EMAIL`. Any missing, empty, or mismatched owner configuration terminates the build script with exit code 1, aborting `firebase deploy` and keeping existing cloud rules untouched.
12. **Rules Validation Methodology & VER-10 Implementation-Time Suite:** In Phase 01G (Documentation-Only), validation is strictly limited to static AST and lexical token balancing (25/25 braces, 4/4 brackets, 39/39 parentheses, 0 HTML entities). No live Firebase Rules compiler or Local Emulator Suite tests were executed in Phase 01G. Prior to implementation approval in Phase 02, the mandatory 15-test unit suite (`tests/security/firestore-rules.spec.ts`) must be executed against the Firebase Local Emulator Suite under `VER-10`.

---

## 6. Task C — Offline Idempotency, Uncertain-Commit Reconciliation & Conflict Protocol

### 6.1 Canonical `OfflineOperationDraft` Interface
```typescript
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
  operationType: 
    | 'CREATE_SITE'
    | 'UPDATE_SITE_CORRECTION'
    | 'UPDATE_ACCOUNTS'
    | 'RESTORE_RECORD'
    | 'SOFT_DELETE_RECORD';
  targetCollection: 'sites' | 'accounts_daily';
  targetDocId: string;                 // Real doc ID or client temporary draft ID (e.g. "temp_site_abc123")
  createdAt: Date;                     // Initial local creation timestamp
  lastModifiedLocally: Date;           // Latest local edit timestamp
  baseServerRevision: number | null;   // Version of document on server when edit started (null for new sites)
  payload: Record<string, unknown>;    // Entity payload stored in proposed integer paise (conditional on REC-04 approval)
  syncStatus: OfflineSyncStatus;       // Local-only draft synchronization lifecycle state
  conflictStatus: 'NONE' | 'STALE_BASE_VERSION' | 'CONCURRENT_COLLISION' | 'RESOLVED';
  retryCount: number;                  // Local synchronization attempt count
  lastSyncError?: string | null;       // Most recent sync error message
  committedServerDocId?: string | null;// Authoritative Firestore doc ID returned upon server commit
}
```

### 6.2 Deterministic Conflict Behaviors Across Scenarios A through L
* **Draft Identity & Mutation Lifecycle:**
  * **Unchanged Retry:** If a sync attempt fails (network timeout, drop) and the draft payload is untouched, the client preserves the original `operationId`, `revisionNumber`, and `idempotencyKey`. The server checks idempotency and avoids redundant re-execution.
  * **Payload Modification:** If the owner edits a pending draft (prior to upload or after a failed attempt where outcome is known to not be committed), the client allocates a **brand-new `operationId`** (new UUIDv4), increments `revisionNumber = revisionNumber + 1`, updates `lastModifiedLocally`, and recomputes `idempotencyKey` with the new payload hash. This prevents the server from mistaking modified data as an identical replay of an earlier attempt.
  * **Server-Committed Ack-Lost Handling:** If the server commits the transaction (e.g. site created, sequence incremented, accounts updated), but the network drops before the acknowledgment reaches the client: upon reconnect, the client transitions the draft to `UNCERTAIN_COMMIT` and queries the server with the original `idempotencyKey`. The server detects the completed commit, returns the existing commit metadata (`committedServerDocId`, server timestamp), and skips re-execution. Zero duplicate financial entries, zero sequence skips, and zero silent overwrites occur.
* **Uncertain-Commit Editing & Pre-Sync Reconciliation Protocol:**
  * **Trigger State:** An upload attempt was dispatched, but cellular/Wi-Fi connection dropped before a conclusive server response was received (`syncStatus: 'UNCERTAIN_COMMIT'`).
  * **Reconciliation Query:** If the owner attempts to edit this draft while disconnected or upon reconnecting, the client **MUST NOT permit blind editing or blind resubmission**. Because direct client reads to `committed_operations` are strictly DENIED in Firestore Security Rules (`allow read, write: if false;`), the client queries commit status by invoking the authenticated backend HTTPS Callable Cloud Function `queryOperationStatus({ idempotencyKey, firstDispatchedAt })` via Firebase Admin SDK:
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
    * **Server-Controlled Operation Lifecycle & Strict Fencing Protocol:**
      Relying on elapsed client time ($\Delta t \ge 90\text{s}$) to establish non-commitment is fundamentally unsafe in distributed systems because network delays, serverless throttling, or clock skew could permit an in-flight transaction to commit after the timeout window.
      Instead, authoritative commitment is governed by a **server-controlled lifecycle** (`IN_PROGRESS`, `COMMITTED`, `ABORTED_TERMINAL`) within `committed_operations/{idempotencyKey}` under two-phase atomic execution, strict lease validation, and monotonic fencing:
      - **Phase 1 (Pre-claim Lease):** When a backend worker accepts a mutation request, it creates or claims `committed_operations/{idempotencyKey}` with `status: 'IN_PROGRESS'`, sets `leaseExpiresAt = backendNow + 60s`, generates a unique `workerId`, and sets or increments `fenceToken`. If already `COMMITTED`, the cached result is returned immediately; if `ABORTED_TERMINAL`, the request is rejected with a terminal error; if another active worker holds the lease (`leaseExpiresAt > backendNow`), the duplicate is returned `status: 'UNKNOWN'`.
      - **Phase 2 (Atomic Business & Ledger Commit):** In a single atomic Firestore multi-document transaction, the worker validates all Eight Mandatory Commit Invariants before executing any write:
        1. Operation record exists in `committed_operations/{idempotencyKey}`.
        2. Status is exactly `IN_PROGRESS`.
        3. Fencing token equals the worker's token (`record.fenceToken === workerFenceToken`).
        4. Worker ownership invariant holds (`record.workerId === currentWorkerId`).
        5. Lease has not expired, evaluated using trusted backend runtime time (`record.leaseExpiresAt > backendNow` where `backendNow = Timestamp.now()` is freshly evaluated inside the current transaction callback execution attempt).
        6. Operation has not been terminally aborted (`record.status !== 'ABORTED_TERMINAL'` and `record.abortedAt == null`).
        7. Target business record's expected base revision is still valid (site create: target doc does not exist; site correction: predecessor $v(n-1).\text{isLatestValidVersion} == \text{true}$; daily accounts: `revisionsCount === expectedBaseRevision`).
        8. No conflicting operation has already committed on the target business record.
        *Failure Action:* If ANY of these 8 checks fail, the transaction aborts immediately without writing business records or marking the operation `COMMITTED`. Business mutation and ledger commit remain strictly atomic.
      - **Lease Expiry, Monotonic Fencing & Takeover Protocol:**
        * *Lease Expiry vs Worker Termination:* In distributed asynchronous serverless environments, an execution container may stall (e.g. JVM/V8 GC pauses, network delays) without terminating. Lease expiry (`leaseExpiresAt <= backendNow`) makes an operation eligible for takeover; it does NOT independently terminate or halt an executing worker.
        * *Transactional Serialization Boundary & Contention:* Commit and takeover must transactionally contend on the exact same operation ledger record (`committed_operations/{idempotencyKey}`).
          - The system never claims that checking time (`leaseExpiresAt > backendNow`) guarantees physical commit occurs before the lease deadline. Rather, **the transaction serialization outcome on `committed_operations/{idempotencyKey}` is the authoritative safety boundary.**
          - If commit wins serialization first, a competing or subsequent takeover transaction observes `COMMITTED` and stops.
          - If takeover wins serialization first, the old worker fails Invariant 3 (`fenceToken`) and Invariant 4 (`workerId`).
        * *Atomic Takeover:* A replacement worker takes over an expired operation (`status === 'IN_PROGRESS' && leaseExpiresAt <= backendNow`) inside an atomic transaction by incrementing `fenceToken = priorRecord.fenceToken + 1`, resetting `leaseExpiresAt = backendNow + 60s`, and assigning `workerId = replacementWorkerId`.
        * *Why Stale Workers Cannot Commit:* When a stale worker awakens and attempts its commit transaction, its checks fail because `record.fenceToken > staleWorkerFenceToken`, `record.workerId !== staleWorkerId`, and its lease expired. Transaction concurrency control aborts the stale commit completely.
        * *Fenced Lease Renewal:* An active worker may extend its lease before expiry only via a dedicated server transaction that verifies the exact same ownership and fencing rules: `record.status === 'IN_PROGRESS' && record.fenceToken === workerFenceToken && record.workerId === currentWorkerId && record.leaseExpiresAt > backendNow`, extending `leaseExpiresAt = backendNow + 60s`. If takeover won first, renewal fails on `workerId` and `fenceToken`.
        * *Authoritative Server Time Derivation & Backend Clock Invariants:* Backend evaluation time `backendNow = Timestamp.now()` **MUST be recalculated inside every execution of the transaction callback** (`db.runTransaction(async (transaction) => { const backendNow = Timestamp.now(); ... })`), including automatic transaction retries. Reusing a timestamp captured outside the transaction callback or from an earlier retry attempt is **strictly prohibited**. `Timestamp.now()` is generated by the trusted backend runtime (Node.js Cloud Functions execution container clock) during the transaction read phase; it is NOT a Firestore server-resolved sentinel timestamp (`FieldValue.serverTimestamp()`). Client timestamps (`firstDispatchedAt`) are untrusted diagnostic telemetry.
      - **Terminal Abort Safety (`ABORTED_TERMINAL`):**
        * Non-retryable validation failures transition the operation to `status: 'ABORTED_TERMINAL'`, setting `terminalReason`, `abortedAt = serverTimestamp()`, and `leaseExpiresAt = null`.
        * Once marked `ABORTED_TERMINAL`, future commits are permanently blocked (Condition 2 and Condition 6 fail permanently).
        * Old workers cannot revert state back to `IN_PROGRESS` or `COMMITTED` because commit transactions assert `status === 'IN_PROGRESS'`.
        * Terminal abort and business commit are mutually exclusive under transactional concurrency: Firestore optimistic concurrency ensures that whichever transaction commits first wins, causing the other to abort.
        * A retry after terminal abort requires the client to allocate a new `operationId` (UUIDv4), increment `revisionNumber = revisionNumber + 1`, and recompute a fresh deterministic `idempotencyKey` (`OP_IDEMP_...`).
    * **Deterministic Dispatch Across All 5 Execution States:**
      The backend queries `committed_operations/{idempotencyKey}` via Admin SDK and returns:
      - **State 1 (`COMMITTED`):** Record exists with `status === 'COMMITTED'`. Returns `status: 'COMMITTED'` with commit details.
        * *Branch A Client Action:* Marks draft `COMMITTED`, loads server record into local state, and routes subsequent edits as linear correction versions ($v_{committed+1}$). Zero duplicate records, zero skipped sequence numbers.
      - **State 2 (Confirmed Terminal `NOT_COMMITTED`):** Record exists with `status === 'ABORTED_TERMINAL'`. (This is the **ONLY** condition under which `NOT_COMMITTED` is permitted). Returns `status: 'NOT_COMMITTED'` with `terminalReason`.
        * *Branch B Client Action:* Confirms the operation was never committed and is guaranteed to never commit in the future. The owner is permitted to edit the draft immediately. The client allocates a new `operationId` (UUIDv4), increments `revisionNumber = revisionNumber + 1`, updates `lastModifiedLocally`, recomputes `idempotencyKey` with the new payload hash, and sets `syncStatus: 'PENDING_COMMIT'`.
      - **State 3 (`PENDING` / In Progress):** Record exists with `status === 'IN_PROGRESS'` and `leaseExpiresAt > serverNow`. Returns **`status: 'UNKNOWN'`** with `retryable: true`, `errorMessage: 'Operation currently executing on backend'`.
      - **State 4 (Expired or Recovering Operation):** Record exists with `status === 'IN_PROGRESS'` and `leaseExpiresAt <= serverNow`. Returns **`status: 'UNKNOWN'`** with `retryable: true`, `errorMessage: 'Operation lease expired; awaiting supervisor recovery'`.
      - **State 5 (Unavailable or Indeterminate Result):** Record does NOT exist in `committed_operations` (request in flight or not yet received), OR transient error/timeout occurs during lookup. Returns **`status: 'UNKNOWN'`** with `retryable: true`, `errorMessage: 'Operation status indeterminate; awaiting verification'`.
    * **Branch C Guard (Mandatory Client Guard on `UNKNOWN`):**
      Whenever `status === 'UNKNOWN'` is returned (for all unresolved, in-progress, expired, unrecorded, or indeterminate cases):
      - The draft is **strictly retained in `syncStatus: 'UNCERTAIN_COMMIT'`**.
      - Divergent local editing is **strictly BLOCKED**.
      - Blind resubmission is **strictly BLOCKED**.
      - UI Banner: *"Previous save attempt is awaiting server verification. Editing and resubmission are paused until connection and execution status are verified."*
      - The client continues verification polling with exponential backoff until a terminal server outcome (`COMMITTED` or confirmed `NOT_COMMITTED`) is received before unlocking edits.
* **Stale-Base Conflict Behavior (`STALE_BASE_VERSION`):**
  * If, upon reconnection and server query, the client discovers that while the draft was in-flight or offline, another device (or online session) modified the same record, advancing the server's version beyond `baseServerRevision` (`serverVersion > draft.baseServerRevision`):
    * The draft is flagged as `syncStatus: 'CONFLICT'`, `conflictStatus: 'STALE_BASE_VERSION'`.
    * Automatic commit halts immediately.
    * The **Conflict Review Modal (SCR-11)** is surfaced to the owner, presenting the latest committed server version side-by-side with the local draft.
    * The owner explicitly resolves the conflict (e.g. discard local draft, apply local draft as a new correction version on top of the newer server record, or merge non-overlapping account categories).
* **Scenario A (Offline site create):** Staged as draft with temporary ID. Reconnection executes server transaction on `system_counters/sites_seq`, allocates sequential monotonic number, commits record.
* **Scenario B (Multiple offline sites on one device):** Staged in chronological order. Reconnection processes drafts sequentially in an atomic batch, assigning monotonic sequence numbers $N, N+1, N+2$.
* **Scenario C (Duplicate upload retry):** Client resubmits identical `operationId` and `idempotencyKey`. Server checks idempotency log; detects prior commit; returns success without re-executing.
* **Scenario D (Offline edit vs online correction):** Mobile edits $v_2$ offline while laptop creates $v_3$ online. Reconnect compares `baseServerRevision (2)` against server version (3); base is stale; commit halts; draft flagged `SYNC_CONFLICT: STALE_BASE_VERSION`. Conflict Review Modal (SCR-11) displayed.
* **Scenario E (Two devices correcting same version offline):** Both mobile and laptop correct $v_2$ offline. First device to reconnect commits $v_3$ and deactivates $v_2$. Second device transaction detects $v_2.\text{isLatestValidVersion} == \text{false}$, halts commit, and prompts conflict review.
* **Scenario F (Accounts different categories offline vs online):** Phone edits Transport while laptop edits Spares for same date. Server transaction merges non-overlapping categories, updates grand total, and appends two audit entries.
* **Scenario G (Accounts same category edited on two devices):** Both devices edit Transport for same date. Second transaction detects stale revision; commit halts; flagged `SYNC_CONFLICT: CONCURRENT_COLLISION`. SCR-11 modal prompts owner choice.
* **Scenario H (Network interruption during commit / Ack Lost):** If commit did not reach server, draft transitions to `UNCERTAIN_COMMIT` and retries query. If commit succeeded on server, client query receives confirmation without duplicate row creation or duplicate sequence increment.
* **Scenario I (App termination during sync):** Sync manager scans local storage on next launch for `PENDING_COMMIT` drafts and resumes synchronization pipeline.
* **Scenario J (Device storage loss before sync):** Physical hardware damage or device loss before reconnect loses local unsynced drafts. Cloud Firestore state remains uncorrupted.
* **Scenario K (Permanent validation failure):** Malformed data rejected by security rules flags draft as `FAILED_VALIDATION`. Retained in Drafts Review Tray with error explanation for owner correction.
* **Scenario L (App reinstall with pending drafts):** Operating system wipes private app storage on uninstall. Unsynced drafts cannot be recovered from cloud. Warning displayed if unsynced drafts exist.

### 6.3 Local Storage Durability Boundaries
While offline drafts in IndexedDB (Web) and SQLite (Android) provide high operational resilience during connectivity dropouts, the system **cannot guarantee zero data loss** against local device failure, operating system storage eviction under disk pressure, or manual cache clearing prior to synchronization.

---

## 7. Task D — Backup, PITR, Checksums & Disaster Recovery Corrections

### 7.1 Managed Firestore Export vs PITR Disambiguation
* **Artifact 1 (Managed Export):** Google Cloud managed export serializing document entities to a Cloud Storage bucket (`gs://{project}-firestore-backups/`). It is **not** a raw LevelDB dump. It does NOT export Firebase Authentication accounts, Secret Manager secrets, Security Rules, Composite Indexes, Cloud Functions code, Cloud Scheduler jobs, or IAM bindings.
* **Point-In-Time Recovery (PITR):** PITR is a separate Cloud Firestore capability providing continuous recovery within a sliding window (default up to 7 days). It must be explicitly enabled and incurs separate Firestore storage costs. Ordinary scheduled exports do NOT provide PITR automatically. Configuration details and costs are classified under implementation-time verification (`VER-09`).

### 7.2 Strict Credential Exclusion & Reconstruction Policy
The following credentials and ephemeral states are strictly **EXCLUDED** from all database backup dumps:
* OAuth 2.0 refresh tokens and client secrets.
* Service account private keys and IAM credentials.
* Secret Manager secret payloads and KMS keys.
* Session cookies and transient auth tokens.
* Active `system_locks` lease documents.

*Independent Reconstruction:* User accounts are recreated in Firebase Auth; Secret Manager secret shells are created via CLI and populated by a one-time owner reauthorization; rules, indexes, and Cloud Functions are redeployed from Git.

### 7.3 Distributed Lock Recovery Protocol
Restoring a backup must **NEVER restore an active or expired distributed lease document as an active lock**.
* During restoration, all records in `system_locks` are purged or reset to idle (`lockedBy = null`, `leaseExpiresAt = 0`).
* Restored tasks in `system_tasks` with status `RUNNING` or `CLAIMED` are safely reset to `RETRY_WAIT` or `PENDING` with `leaseOwner = null`.

### 7.4 Cryptographic SHA-256 Digest Semantics
A cryptographic SHA-256 hash computed over canonical UTF-8 bytes verifies **exact byte-level comparison against a trusted recorded digest**.
* It proves the file was not corrupted or truncated in transit or storage.
* It does NOT prove the underlying source data was complete or correct when exported.
* It does NOT prove mathematical accuracy of internal business calculations.
* It does NOT defend against an attacker who has write access to both the file and the companion manifest in Google Drive.

### 7.5 Reconciled 12-Stage Disaster Recovery Procedure
The complete 12-stage recovery sequence with required infrastructure, credentials, actors, verifications, and limitations is fully specified in Section 9.4 of `VWS_BACKUP_STRATEGY.md`. An empirical restoration drill will be conducted during Phase 02 (`VER-09`).

---

## 8. Task E — Cost & Reliability Claim Corrections

All exaggerated guarantees across the documentation suite were corrected to accurate engineering standards:
1. **Google Cloud Budget Alert (REC-02):** Reclassified from a "cost guarantee" to an **alerting notification mechanism**. It does NOT halt services or cap billing automatically; actual charges may exceed ₹500 if runaway cloud activities occur.
2. **Reliability:** Replaced claims of "guaranteed 99.9% uptime" with an **engineering design objective of 99.9% availability**, subject to production monitoring.
3. **Offline Durability:** Replaced "zero-loss offline operation" with **high-resilience local draft staging**, acknowledging browser and OS storage eviction limits.
4. **Financial Precision:** Replaced "100% financial accuracy" with **elimination of IEEE 754 floating-point rounding errors via integer paise arithmetic**, noting business calculation correctness requires verification.
5. **Credential Security:** Replaced "zero token leakage" with **zero client-side token exposure via Google Cloud Secret Manager backend storage**.
6. **Data Integrity:** Replaced "100% data integrity" with **cryptographic byte-level comparison against stored digests**.

---

## 9. Task F — Integer Paise Decision Status (REC-04)

### 9.1 Governance Classification: Option A
Integer paise remains an **Architecture Recommendation awaiting owner decision (REC-04)**. It has NOT been pre-approved.
* All dependent implementation choices in source code remain **blocked** pending the owner's explicit decision.
* **If Approved:** The application schema, Firestore rules, and client forms will use `amountPaise: number`.
* **If Rejected:** An alternative architecture (such as string-based decimal representation `"1450.50"` or decimal libraries) must be engineered before code development begins.

### 9.2 Safe Integer & Currency Ceiling Math Verification
* JavaScript `Number.MAX_SAFE_INTEGER` = $2^{53} - 1 = 9,007,199,254,740,991$ paise = ₹90,071,992,547,409.91 (~₹90,071 crore).
* Proposed operational warning ceilings (REC-07):
  * Bill Value: ₹10,00,000 ($10^8$ paise, 8 digits)
  * Single Expense: ₹5,00,000 ($5 \times 10^7$ paise, 8 digits)
  * Daily Grand Total: ₹25,00,000 ($2.5 \times 10^8$ paise, 9 digits)
* **Excel Numeric Cell Boundary:** Excel stores numbers as 64-bit IEEE 754 floating-point numbers with 15 decimal digits of precision. For VWS operational scales (up to ₹25 lakhs, 8–10 digits), Excel represents numbers without precision loss, but Excel cells do not share identical precision mechanics with internal integer math.

---

## 10. Task G — Document Inventory Reconciliation

The discrepancy between the Phase 01F report (which listed DOC-001 through DOC-019) and the approval register (which cited eighteen documents) is resolved. An inspection of the actual `docs/` folder confirmed that 19 documents existed at the conclusion of Phase 01F. With the addition of the two Phase 01G deliverables, the total repository documentation count is **21 documents**.

```
+---------------------------------------------------------------------------------------------------------------------------------------+
|                                                  VWS MASTER DOCUMENT INVENTORY (PHASE 01G)                                            |
+------------+--------------------------------------------------------+-------------------+----------------+-------------+--------------+
| Doc ID     | Filename                                               | Document Type     | Classification | Phase State | Action Taken |
+------------+--------------------------------------------------------+-------------------+----------------+-------------+--------------+
| VWS-DOC-001| `VWS_MASTER_REQUIREMENTS.md`                           | Specification     | Authoritative  | Phase 01G   | MODIFIED     |
| VWS-DOC-002| `VWS_FEATURE_SPECIFICATION.md`                         | Specification     | Authoritative  | Phase 01G   | MODIFIED     |
| VWS-DOC-003| `VWS_BUSINESS_RULES.md`                                | Specification     | Authoritative  | Phase 01G   | MODIFIED     |
| VWS-DOC-004| `VWS_SYSTEM_ARCHITECTURE.md`                           | Architecture      | Authoritative  | Phase 01G   | MODIFIED     |
| VWS-DOC-005| `VWS_DATABASE_SCHEMA.md`                               | Architecture      | Authoritative  | Phase 01G   | MODIFIED     |
| VWS-DOC-006| `VWS_SECURITY_ARCHITECTURE.md`                         | Architecture      | Authoritative  | Phase 01G   | MODIFIED     |
| VWS-DOC-007| `VWS_EXCEL_EXPORT_SPECIFICATION.md`                    | Specification     | Authoritative  | Phase 01G   | MODIFIED     |
| VWS-DOC-008| `VWS_BACKUP_STRATEGY.md`                               | Architecture      | Authoritative  | Phase 01G   | MODIFIED     |
| VWS-DOC-009| `VWS_TECH_STACK_EVALUATION.md`                         | Evaluation        | Authoritative  | Phase 01G   | MODIFIED     |
| VWS-DOC-010| `VWS_OPEN_QUESTIONS.md`                                | Register          | Authoritative  | Phase 01G   | MODIFIED     |
| VWS-DOC-011| `VWS_PHASE_01_REPORT.md`                               | Phase Report      | Historical     | Phase 01    | PRESERVED    |
| VWS-DOC-012| `VWS_PHASE_01A_CORRECTION_REPORT.md`                   | Phase Report      | Historical     | Phase 01A   | PRESERVED    |
| VWS-DOC-013| `VWS_PHASE_01B_FINAL_REVIEW_REPORT.md`                 | Phase Report      | Historical     | Phase 01B   | PRESERVED    |
| VWS-DOC-014| `VWS_PHASE_01B_OWNER_DECISIONS_AMENDMENT_REPORT.md`     | Phase Report      | Historical     | Phase 01B   | PRESERVED    |
| VWS-DOC-015| `VWS_PHASE_01C_FINAL_TECHNICAL_INTEGRITY_REPORT.md`     | Phase Report      | Historical     | Phase 01C   | PRESERVED    |
| VWS-DOC-016| `VWS_PHASE_01D_ARCHITECTURE_CORRECTIONS_REPORT.md`     | Phase Report      | Historical     | Phase 01D   | PRESERVED    |
| VWS-DOC-017| `VWS_PHASE_01E_FINAL_VALIDATION_REPORT.md`             | Phase Report      | Historical     | Phase 01E   | PRESERVED    |
| VWS-DOC-018| `VWS_PHASE_01F_FINAL_ARCHITECTURE_REMEDIATION_REPORT.md`| Phase Report      | Historical     | Phase 01F   | PRESERVED    |
| VWS-DOC-019| `VWS_PHASE_01F_OWNER_APPROVAL_REGISTER.md`             | Approval Register  | Historical     | Phase 01F   | PRESERVED    |
| VWS-DOC-020| `VWS_PHASE_01G_FINAL_CONTRADICTION_RESOLUTION_REPORT.md`| Phase Report      | Current Report  | Phase 01G   | CREATED       |
| VWS-DOC-021| `VWS_PHASE_01G_OWNER_DECISION_GATE.md`                 | Decision Gate      | Owner Gate      | Phase 01G   | CREATED       |
+------------+--------------------------------------------------------+-------------------+----------------+-------------+--------------+
```
*Note on Historical Supersession:* All nine historical reports (`DOC-011` through `DOC-019`) remain completely unmodified. Where a historical report references outdated intermediate concepts (such as LevelDB exports or ad-hoc task queue paths), it is superseded by the corresponding Phase 01G authoritative blueprint documents (`DOC-001` through `DOC-010`).

---

## 11. Task H — Staff Salary Attribution Status (POQ-01)

Pending Owner Question **POQ-01** remains unanswered and preserved for owner decision.
* **Option A (Cash Flow Basis):** Attributing salary expense to the date cash was actually disbursed. (Retaining optional `salaryMonth` tag for work-month filtering).
* **Option B (Work Month Basis):** Attributing salary expense strictly to the earned work period regardless of disbursement date.
* **Operational Independence:** Daily operational expense logging and site billing are **not blocked** by this pending choice. The database schema preserves `salaryMonth?: string` ("YYYY-MM") as an optional attribute to support either reporting model once selected.

---

## 12. Task I — Updated Recommendation & Verification Registers

### 12.1 Architecture Recommendations (REC-01 through REC-11)
All eleven recommendations are unbundled and presented for individual owner evaluation:
1. `REC-01`: Firebase Blaze Plan Upgrade (Pay-As-You-Go).
2. `REC-02`: Google Cloud ₹500/month Budget Alert (50%, 80%, 100% notification thresholds).
3. `REC-03`: Google Cloud Secret Manager Token Storage (`vws-drive-backend-refresh-token`).
4. `REC-04`: Integer Paise Internal Financial Representation ($1\text{ INR} = 100\text{ paise}$).
5. `REC-05`: Authoritative Master Pointer Staging (`Backups/` staged file vs root convenience copy).
6. `REC-06`: Offline Transaction Draft Queue (`syncStatus: 'PENDING_COMMIT'`).
7. `REC-07`: Operational Keystroke Validation Ceilings (₹10L bill, ₹5L expense, ₹25L daily total).
8. `REC-08`: Decimal SI Storage Projections & Drive Quota Monitoring (80%, 90% alerts).
9. `REC-09`: Canonical Task Queue Schema (`system_tasks/{taskId}`).
10. `REC-10`: Offline Draft Idempotency & Conflict Review Protocol (`OfflineOperationDraft` + SCR-11).
11. `REC-11`: Server-Side Authenticated Secret Manager Provisioning Ceremony (`provisionBackendDriveCredentials`).

### 12.2 Implementation-Time Verifications (VER-01 through VER-10)
1. `VER-01`: Capacitor 6.x Geolocation fallback on Android 14/15.
2. `VER-02`: Cloud Functions 2nd Gen cold start latency, memory profiling, and package compatibility on Node.js 22 LTS.
3. `VER-03`: Android Keystore hardware backing (StrongBox / TEE) verification.
4. `VER-04`: Google Drive resumable upload chunk resumption under simulated network interruption.
5. `VER-05`: ExcelJS font, soft gray fill, strikethrough, and formula parity in Google Sheets.
6. `VER-06`: IndexedDB storage quota and cache persistence verification (`navigator.storage.persist()`).
7. `VER-07`: Secret Manager token retrieval and exchange latency under cold starts (< 1,500ms).
8. `VER-08`: Multi-device concurrent offline conflict detection and SCR-11 modal verification.
9. `VER-09`: Cloud Firestore PITR configuration validation and 12-stage restoration drill.
10. `VER-10`: Cloud Firestore Security Rules unit testing against the Firebase Local Emulator Suite (`tests/security/firestore-rules.spec.ts`).

---

## 13. Task J — Cross-Document Consistency Matrix

| Item Audited | Authority Document | Agreement Status | Verification Note |
| :--- | :--- | :---: | :--- |
| **Task Queue Path** | `VWS_DATABASE_SCHEMA.md`, `VWS_SECURITY_ARCHITECTURE.md`, `VWS_BACKUP_STRATEGY.md` | **PASS** | Unified on `system_tasks/{taskId}` across all documents. |
| **Task Types** | `VWS_DATABASE_SCHEMA.md`, `VWS_BACKUP_STRATEGY.md` | **PASS** | Standardized to all 5 canonical workflow types. |
| **Task Status Names** | `VWS_DATABASE_SCHEMA.md`, `VWS_SECURITY_ARCHITECTURE.md`, `VWS_BACKUP_STRATEGY.md` | **PASS** | Unified on 7 canonical statuses. |
| **Task Field Names** | `VWS_DATABASE_SCHEMA.md`, `VWS_BACKUP_STRATEGY.md` | **PASS** | Unified (`taskId`, `attempts`, `leaseOwner`, `leaseExpiry`). |
| **Offline Operation Draft** | `VWS_DATABASE_SCHEMA.md`, `VWS_BUSINESS_RULES.md` | **PASS** | Unified on canonical `OfflineOperationDraft` interface. |
| **Offline Conflict States**| `VWS_DATABASE_SCHEMA.md`, `VWS_BUSINESS_RULES.md` | **PASS** | Unified (`NONE`, `STALE_BASE_VERSION`, `CONCURRENT_COLLISION`, `RESOLVED`).|
| **Firestore Security Matrix**| `VWS_SECURITY_ARCHITECTURE.md` | **PASS** | Covers all collections with granular client/backend permissions. |
| **OAuth Lifecycle** | `VWS_SECURITY_ARCHITECTURE.md`, `VWS_SYSTEM_ARCHITECTURE.md` | **PASS** | Fully synchronized with Secret Manager flow. |
| **Drive Folder Hierarchy** | `VWS_SYSTEM_ARCHITECTURE.md`, `VWS_BACKUP_STRATEGY.md` | **PASS** | Dedicated root `Vetri Water Solutions/` with subfolders. |
| **Backup Artifacts** | `VWS_BACKUP_STRATEGY.md` | **PASS** | Three distinct non-interchangeable artifacts defined. |
| **Disaster Recovery Limits**| `VWS_BACKUP_STRATEGY.md` | **PASS** | What Artifact 1 restores vs does not restore explicitly documented. |
| **SHA-256 Semantics** | `VWS_BACKUP_STRATEGY.md`, `VWS_BUSINESS_RULES.md` | **PASS** | Byte-level integrity comparison; no false guarantees. |
| **Financial Representation**| `VWS_DATABASE_SCHEMA.md`, `VWS_BUSINESS_RULES.md`, `VWS_TECH_STACK_EVALUATION.md` | **PASS** | Integer paise consistently classified as REC-04 proposed. |
| **Excel Columns A–P** | `VWS_EXCEL_EXPORT_SPECIFICATION.md` | **PASS** | Column P (`Record Status`, hidden) verified in table and formulas. |
| **Salary Attribution** | `VWS_DATABASE_SCHEMA.md`, `VWS_BUSINESS_RULES.md`, `VWS_OPEN_QUESTIONS.md` | **PASS** | POQ-01 preserved as pending owner decision. |
| **Owner Decisions** | `VWS_OPEN_QUESTIONS.md` | **PASS** | DEC-01 through DEC-25 confirmed and locked. |
| **Recommendations** | `VWS_OPEN_QUESTIONS.md` | **PASS** | REC-01 through REC-11 awaiting individual owner decision. |
| **Runtime Verifications** | `VWS_OPEN_QUESTIONS.md` | **PASS** | VER-01 through VER-10 scheduled for Phase 02. |

---

## 14. Validation & Evidence Table (Section 14 Compliance)

```
+---------------------------------------------------------------------------------------------------------------------------------------+
|                                                      VALIDATION & EVIDENCE MATRIX                                                     |
+----+-----------------------------+-----------------------------+--------------+-------------------------------------+-----------------+
| #  | Finding Area                | Source Document             | Section      | Change Made in Phase 01G            | Result          |
+----+-----------------------------+-----------------------------+--------------+-------------------------------------+-----------------+
| 01 | Task Queue Contract         | `VWS_DATABASE_SCHEMA.md`    | Sec 3.6      | Unified on system_tasks/{taskId}    | PASS            |
| 02 | Task Queue Schema Alignment | `VWS_BACKUP_STRATEGY.md`    | Sec 12.3     | Aligned with canonical fields       | PASS            |
| 03 | Granular Security Matrix    | `VWS_SECURITY_ARCHITECTURE` | Sec 3 & 4    | Complete path-and-field permissions | PASS            |
| 04 | Client Task Modification    | `VWS_SECURITY_ARCHITECTURE` | Sec 4.1 & 5  | Client update/delete blocked        | PASS            |
| 05 | Lock Recovery Protocol      | `VWS_SECURITY_ARCHITECTURE` | Sec 4.2      | Defined reclamation & reset rules   | PASS            |
| 06 | Business Immutability       | `VWS_SECURITY_ARCHITECTURE` | Sec 4.3      | Preserved historical data on edit   | PASS            |
| 07 | Admin SDK Independent Check | `VWS_SECURITY_ARCHITECTURE` | Sec 4.4      | Mandated backend validation checks  | PASS            |
| 08 | Offline Draft Schema        | `VWS_DATABASE_SCHEMA.md`    | Sec 3.8      | Canonical OfflineOperationDraft     | PASS            |
| 09 | Conflict Scenarios A to L   | `VWS_BUSINESS_RULES.md`     | Sec 12.3     | Documented 12 deterministic cases   | PASS            |
| 10 | Offline Durability Limits   | `VWS_SYSTEM_ARCHITECTURE.md`| Sec 7.1      | Acknowledged storage eviction limits| PASS            |
| 11 | Managed Export vs PITR      | `VWS_BACKUP_STRATEGY.md`    | Sec 3.1      | Separated ordinary export from PITR | PASS            |
| 12 | PITR Configuration Drill    | `VWS_BACKUP_STRATEGY.md`    | Sec 3.1 & 9  | Scheduled restoration drill (VER-09)| IMPL VERIF REQ  |
| 13 | Credential Exclusion Policy | `VWS_BACKUP_STRATEGY.md`    | Sec 9.4      | Explicitly excluded secrets/tokens  | PASS            |
| 14 | Lock Restoration Safeguard  | `VWS_BACKUP_STRATEGY.md`    | Sec 9.4      | Never restores active leases        | PASS            |
| 15 | SHA-256 Digest Semantics    | `VWS_BACKUP_STRATEGY.md`    | Sec 9.4      | Corrected to byte-level comparison  | PASS            |
| 16 | 12-Stage Recovery Table     | `VWS_BACKUP_STRATEGY.md`    | Sec 9.4      | Detailed actor, infra, limitations  | PASS            |
| 17 | Budget Alert Correction     | `VWS_MASTER_REQUIREMENTS`   | Sec 4.5      | Not a hard spending cap             | PASS            |
| 18 | Reliability Target          | `VWS_MASTER_REQUIREMENTS`   | Sec 5        | Design objective, not guaranteed SLA| PASS            |
| 19 | Integer Paise Status        | `VWS_DATABASE_SCHEMA.md`    | Sec 1        | Classified as REC-04 proposed       | PENDING OWNER   |
| 20 | Safe Integer Math Check     | `VWS_BUSINESS_RULES.md`     | Sec 1.1      | Verified 2^53 - 1 ceiling & Excel diff| PASS            |
| 21 | Document Inventory Count    | `VWS_OPEN_QUESTIONS.md`     | Sec 1        | Reconciled actual 21 documents count| PASS            |
| 22 | Staff Salary Attribution    | `VWS_OPEN_QUESTIONS.md`     | Sec 5        | Preserved POQ-01 for owner decision | PENDING OWNER   |
| 23 | Unbundled Recommendations   | `VWS_OPEN_QUESTIONS.md`     | Sec 3        | Detailed individual REC entries     | PENDING OWNER   |
| 24 | Historical Reports Unchanged| Repository Root             | `docs/`      | All 9 historical reports preserved  | PASS            |
| 25 | Zero Application Code Added | Repository Root             | `.`          | Strictly Markdown documentation only | PASS            |
| 26 | Counters & Locks Exclusivity | `VWS_DATABASE_SCHEMA.md`    | Sec 3.3, 3.5 | Restricted to backend Admin SDK only | PASS            |
| 27 | Task Queue Deduplication     | `VWS_DATABASE_SCHEMA.md`    | Sec 3.6      | At-least-once + atomic deduplication | PASS            |
| 28 | Offline Mutation Lifecycle   | `VWS_DATABASE_SCHEMA.md`    | Sec 3.8      | Unchanged retry vs new rev on edit   | PASS            |
| 29 | Status Terminology Aligned   | `VWS_PHASE_01G_REPORT.md`   | Sec 4.3      | Corrected WAITING_REAUTH in diagram  | PASS            |
| 30 | Task ID Strategy Unified     | `VWS_DATABASE_SCHEMA.md`    | Sec 3.6      | Deterministic IDs; timestamp+UUID dropped | PASS            |
| 31 | Cloud/Local State Separated  | `VWS_DATABASE_SCHEMA.md`    | Sec 2, 3.1,3.2| syncStatus removed from Firestore schema  | PASS            |
| 32 | Uncertain-Commit Protocol    | `VWS_DATABASE_SCHEMA.md`    | Sec 3.8      | Pre-edit query & UNCERTAIN_COMMIT state   | PASS            |
| 33 | Canonical Status Standardized| `VWS_OWNER_DECISION_GATE.md`| REC-09       | Standardized FAILED_PERMANENT across docs | PASS            |
| 34 | Full SHA-256 Digest Identity | `VWS_DATABASE_SCHEMA.md`    | Sec 3.6      | Full payloadSha256 replaces payloadHash8  | PASS            |
| 35 | Security Model Reconciliation| `VWS_SECURITY_ARCHITECTURE` | Sec 2, 3, 4, 5| Reconciled direct client SDK write DENY on business records vs callable functions | PASS            |
| 36 | Strict Task Creation Rules  | `VWS_SECURITY_ARCHITECTURE` | Sec 4.1, 5, 8| hasOnly map key validation; owner email deploy substitution; syntax verified | PASS            |
| 37 | Committed Ops & Rules Audit | `VWS_SECURITY_ARCHITECTURE` | Sec 2,3,4,5,8| Committed ops callable lookup; payload validation; CI/CD fail-closed; VER-10 suite | PASS            |
| 38 | Final Consistency Micro-Patch| DOC-005, DOC-006, DOC-020   | Across docs  | OP_IDEMP_ separation; race-safe UNKNOWN; untrusted metadata; VER-10 evidence | PASS            |
| 39 | Reconciliation Safety Patch  | DOC-005, DOC-006, DOC-020   | Sec 3.8,4.3.1,6.2| Server-controlled lifecycle; fenceToken; 90s rule removed; exact 5-state dispatch | PASS            |
| 40 | Strict Lease & Terminal Safety| DOC-005, DOC-006, DOC-020   | Sec 3.8,4.3.1,6.2| 8 atomic commit checks; workerId; backend Timestamp.now(); transaction serialization boundary | PASS            |
| 41 | Final Micro-Reconciliation   | DOC-004, DOC-005, DOC-006, DOC-008, DOC-010, DOC-020 | Sec 2.3, 3.6, 3.8, 4.1, 5, 8, 9.4, 12, 16 | Retry clock re-evaluation; task field classification & bounds; Node.js 22 LTS; single rules source; VER-10 & readiness distinction | PASS            |
| 42 | Targeted Final Corrections   | DOC-005, DOC-006, DOC-008, DOC-020 | Sec 3.6, 16.1, 10, 4.1           | Task idempotency unified (IDEMP_* vs OP_IDEMP_*); VER-10 accuracy; Drive client vs backend auth demarcation | PASS            |
| 43 | Final Targeted Patch        | DOC-006, DOC-007, DOC-008, DOC-010, DOC-020 | Sec 6.2, 8, 6.4, 4.1, 10, 14    | Canonical Secret Manager name unified; ExcelJS calculated value requirement added | PASS            |
| 44 | Document Register Audit     | DOC-001 through DOC-010, DOC-020, DOC-021 | Full Docs Registry, Sec 14      | Authoritative 21-document mapping verified; DOC-004/007/008/009/010 citations reconciled; DOC-007 §6.4 codified | PASS            |
+----+-----------------------------+-----------------------------+--------------+-------------------------------------+-----------------+
```

---

## 15. Technical Risk Log

```
+----+-----------------------------+----------+-------------------------------------------------------------+
| ID | Risk Description            | Severity | Architectural Mitigation Strategy                           |
+----+-----------------------------+----------+-------------------------------------------------------------+
| R1 | Unintentional Blaze Charges | Moderate | Proposed ₹500/month Budget Alert (REC-02) with 50/80/100%   |
|    | from runaway Cloud Functions|          | notifications; alerts owner without hard-stopping services. |
| R2 | Google Drive OAuth Revoked  | Low      | Decoupled architecture (DEC-18, REC-03). Cloud Firestore DB |
|    | or Expired by Owner         |          | operations never blocked. Tasks enter WAITING_REAUTH state. |
| R3 | Offline Concurrency Conflict| Low      | Optimistic version concurrency with Operation UUIDs (REC-10)|
|    | Across Devices              |          | triggers SCR-11 review modal. Zero silent overwrites.       |
| R4 | Local Storage Eviction      | Low      | Informational UI banner warns owner of unsynced drafts to   |
|    | Prior to Network Sync       |          | prevent manual cache clearing or browser data wiping.       |
| R5 | ExcelJS Memory Spike on     | Low      | Cloud Function allocated 512 MB RAM; annual calendar-year   |
|    | Large Multi-Year Exports    |          | partitioning keeps annual row counts well below 5,000 rows. |
+----+-----------------------------+----------+-------------------------------------------------------------+
```

---

## 16. Phase 02 Readiness Assessment & Final Stop Notice

### 16.1 Phase 02 Readiness Gate Decision
The Phase 01G architectural readiness of Vetri Water Solutions is structured into four explicit, verifiable categories:

1. **Documentation-Level Review Completed:**
   - All 21 architectural and specification files have been thoroughly reviewed and harmonized.
   - Cross-document contradictions across task identity, deterministic task IDs, offline reconciliation, and security boundaries have been fully resolved.

2. **Static Inspection Completed:**
   - Security rule templates (`firestore.rules.template` and DOC-006 Section 5) pass static syntax and AST balancing inspections (25/25 braces, 4/4 brackets, 39/39 parentheses, 0 HTML entity corruptions).
   - Database schema field classifications and callable contract specifications match across DOC-005, DOC-006, and DOC-020.

3. **Runtime & Emulator Verification Pending (`VER-01` through `VER-10`):**
   - Empirical validation (including cold-start latency, offline sync retry curves, Cloud Functions on Node.js 22 LTS, and the automated Firestore Rules emulator test suite `VER-10`) is scheduled for execution once implementation begins in Phase 02.
   - Any claim that the architecture is "100% verified and free of internal contradictions" is explicitly **rejected** while empirical tests such as `VER-10` remain unexecuted. Full empirical verification is strictly deferred to Phase 02.

4. **Owner Decisions Pending:**
   - All 25 Owner Decisions (`DEC-01` through `DEC-25`) are confirmed, locked, and fully aligned.
   - All 11 Architecture Recommendations (`REC-01` through `REC-11`), including integer paise (`REC-04`), are pending explicit owner approval at the Phase 01G Decision Gate (`docs/VWS_PHASE_01G_OWNER_DECISION_GATE.md`).
   - Pending Owner Question `POQ-01` (historical transaction balance confirmation) is recorded for owner input without blocking system setup or data entry.

### 16.2 Mandatory Architectural Stop Condition
> [!IMPORTANT]
> **PHASE 01G EXECUTION STOP NOTICE**
> 
> In accordance with project instructions:
> 1. All architectural investigations, cross-document harmonizations, schema updates, security matrix formulations, and documentation remediations for **Phase 01G documentation scope are COMPLETE** (with empirical verification pending under VER-01 through VER-10 in Phase 02).
> 2. **ZERO application source code has been created.**
> 3. **NO frameworks, build tools, or packages have been initialized or installed.**
> 4. **NO live cloud resources or databases have been modified or deployed.**
> 5. **Phase 02 MUST NOT BEGIN.**
> 
> The engineering team has **STOPPED ALL EXECUTION**. The blueprint and the **Phase 01G Owner Decision Gate** (`docs/VWS_PHASE_01G_OWNER_DECISION_GATE.md`) are submitted for owner review. The owner alone decides when the project moves from documentation to implementation.

