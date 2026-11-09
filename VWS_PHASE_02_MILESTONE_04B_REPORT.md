# VWS PHASE 02 — MILESTONE 04B REPORT: CLIENT-TO-BACKEND CALLABLE INTEGRATION

**Document ID:** DOC-023 / M04B-REPORT  
**Date:** November 9, 2026  
**Project:** Vetri Water Solutions (VWS)  
**Workspace:** `E:\APEX\VETRI_WATER_SOLUTIONS`  
**Git Baseline:** `ec12c1c`  
**Phase:** 02 — Implementation  
**Status:** COMPLETE — AWAITING OWNER REVIEW  

---

## EXECUTIVE SUMMARY

In accordance with the findings of `docs/VWS_PHASE_02_IMPLEMENTATION_INTEGRITY_AUDIT.md`, Milestone 04B was executed to resolve the critical architectural contradiction where client services (`siteService.ts`, `accountService.ts`) performed direct client-side Firestore mutations while canonical security rules (`firestore.rules`) strictly denied client writes (`allow write: if false;`).

All protected business mutations have now been redirected exclusively through authenticated 2nd Gen Firebase Cloud Functions via a newly created typed callable client. Direct client mutation paths (`setDoc`, `updateDoc`, `deleteDoc`, `addDoc`, `runTransaction`, `writeBatch`) have been completely eliminated from the client data layer and verified via static architectural test assertions.

All builds (client and serverless functions) pass cleanly with zero TypeScript errors. The automated test suite has expanded from 42 to **69 passing tests across 12 test files with 0 failures**.

---

## 1. FILES CREATED AND MODIFIED

### 1.1 Created Files

| File Path | Purpose |
| :--- | :--- |
| `src/services/api/callableClient.ts` | Central typed callable API client wrapping `httpsCallable`, error normalizer, network failure detection, and canonical `OP_IDEMP_` idempotency generation. |
| `src/services/adapters/financialAdapter.ts` | Governance adapter isolating UI inputs (Rupees) from persisted schema fields (`*Paise`) to protect the codebase pending `REC-04` owner approval. |
| `functions/src/operations/commitSiteStatusChange.ts` | Authenticated Cloud Function enforcing the 8 Atomic Commit Invariants for soft-delete (30-day Recycle Bin) and restoration. |
| `functions/src/operations/purgeExpiredSites.ts` | Authenticated administrative Cloud Function for permanent purging of records that have exceeded their 30-day retention window (`expiresForPurgeAt`). |
| `tests/architecture/directMutationForbidden.test.ts` | Static code inspection test asserting that client services contain zero direct Firestore mutation calls (`setDoc`, `updateDoc`, `runTransaction`). |
| `tests/unit/callableClient.test.ts` | Unit tests for error normalization, network dropout detection (`UNKNOWN` status), device ID storage, and idempotency key formatting. |
| `tests/unit/siteServiceCallable.test.ts` | Unit tests verifying that site creation, correction, soft-delete, and restore route through callable Cloud Functions. |
| `tests/unit/accountServiceCallable.test.ts` | Unit tests verifying that daily accounts updates route through callable Cloud Functions with correct category totals and audit logging. |
| `tests/unit/backendCallableOperations.test.ts` | Unit tests validating owner authentication guards (`assertAuthorizedOwner`), contract validation, and the 8 Atomic Commit Invariants. |

### 1.2 Modified Files

| File Path | Nature of Modifications |
| :--- | :--- |
| `src/config/firebase.ts` | Exported `functions` instance targeting region `asia-south1` and hooked local Functions Emulator on port 5001. |
| `src/services/siteService.ts` | Refactored `createSiteEntry`, `createSiteCorrection`, `softDeleteSite`, and `restoreSite` to invoke `callableClient.ts`. Completely removed `setDoc`, `updateDoc`, and `runTransaction`. Preserved real-time read queries. |
| `src/services/accountService.ts` | Refactored `saveDailyAccounts` to invoke `callableClient.ts`. Completely removed `runTransaction`. Preserved real-time read subscriptions. |
| `functions/src/index.ts` | Exported `commitSiteStatusChange` and `purgeExpiredSites` alongside existing operations. |
| `functions/src/operations/commitSiteJob.ts` | Added `committedSequenceNumber` to operation record to ensure idempotent replays return sequence number. |
| `functions/src/operations/commitDailyAccounts.ts` | Added optional itemized `salaryEntries` support to preserve individual staff salary breakdowns. |
| `vite.config.ts` | Configured module resolution aliases for backend function testing in local Vitest runner. |

---

## 2. CALLABLE FUNCTIONS CONNECTED

Every protected business mutation in the application is now wired directly to a dedicated 2nd Gen Firebase Cloud Function:

```
[Client UI] 
    │
    ▼
[src/services/siteService.ts & accountService.ts]
    │
    ▼ (via src/services/adapters/financialAdapter.ts)
[src/services/api/callableClient.ts]
    │
    ├─► callCommitSiteJob()           ──► Cloud Function: commitSiteJob
    ├─► callCommitSiteCorrection()    ──► Cloud Function: commitSiteCorrection
    ├─► callCommitSiteStatusChange()  ──► Cloud Function: commitSiteStatusChange
    ├─► callCommitDailyAccounts()     ──► Cloud Function: commitDailyAccountsUpdate
    ├─► callQueryOperationStatus()    ──► Cloud Function: queryOperationStatus
    └─► callPurgeExpiredSites()       ──► Cloud Function: purgeExpiredSites
```

1. **`commitSiteJob`:**
   - **Trigger:** Tapping "Save Site Entry" on `SiteEntryModal` (SCR-04/05).
   - **Functionality:** Allocates monotonic sequence number from `system_counters/sites_seq`, writes Version 1 site document with `isLatestValidVersion: true`, and updates `committed_operations` ledger in a single atomic transaction.
2. **`commitSiteCorrection`:**
   - **Trigger:** Tapping "Save Correction" on `SiteEntryModal` in edit mode (SCR-05).
   - **Functionality:** Verifies expected predecessor version, supersedes predecessor (`isLatestValidVersion: false`, `status: 'SUPERSEDED'`), writes linked Version 2/3 document, and transitions operation record to `COMMITTED`.
3. **`commitSiteStatusChange`:**
   - **Trigger:** Tapping "Delete" in `SiteListScreen` (SCR-03) or "Restore" in `RecycleBinScreen` (SCR-07).
   - **Functionality:**
     - `SOFT_DELETE`: Sets `isDeleted: true`, calculates 30-day `expiresForPurgeAt`, and sets `deletedBy: callerEmail`.
     - `RESTORE`: Sets `isDeleted: false`, resets purge expiration, and returns record to active queries.
4. **`commitDailyAccountsUpdate`:**
   - **Trigger:** Tapping "Save Daily Accounts" on `AccountsScreen` (SCR-08/09).
   - **Functionality:** Recalculates category totals in integer paise, appends immutable audit entry to `accounts_daily/{entryDate}/audit_log/{revisionId}`, and updates daily summary.
5. **`queryOperationStatus`:**
   - **Trigger:** Client network recovery or retry disambiguation.
   - **Functionality:** Returns exact status (`COMMITTED`, `NOT_COMMITTED`, or `UNKNOWN`).
6. **`purgeExpiredSites`:**
   - **Trigger:** Scheduled retention job or administrative cleanup.
   - **Functionality:** Queries and permanently deletes records where `isDeleted == true && expiresForPurgeAt <= now`.

---

## 3. REMAINING DIRECT-WRITE PATHS

### Verdict: ZERO REMAINING DIRECT-WRITE PATHS.

An exhaustive static code scan across the entire frontend application was executed:
- Prohibited methods scanned: `setDoc`, `updateDoc`, `deleteDoc`, `addDoc`, `runTransaction`, `writeBatch`.
- Results in `src/services/siteService.ts`: **0 matches.**
- Results in `src/services/accountService.ts`: **0 matches.**
- Results in `src/components/`: **0 matches.**

**Authorized Direct Reads Preserved:**
Direct Firestore read queries are preserved in accordance with `firestore.rules` (`allow read: if isOwner();`):
- `subscribeActiveSites(calendarYear, callback)` (`onSnapshot`)
- `subscribeRecycleBin(callback)` (`onSnapshot`)
- `getSiteVersionHistory(originalRecordId)` (`getDocs`)
- `subscribeDailyAccountsForYear(calendarYear, callback)` (`onSnapshot`)
- `getDailyAccountForDate(entryDate)` (`getDoc`)
- `getDailyAccountAuditLog(entryDate)` (`getDocs`)

---

## 4. BACKEND CONTRACT VERIFICATION

All Cloud Functions were verified against the Phase 01G specification:

1. **Authentication & Authorization Guard:**
   - Every function invokes `assertAuthorizedOwner(request.auth)`.
   - Requests without an authenticated token throw `unauthenticated` (`HttpsError`).
   - Requests with an email other than `vetriwatersolutions@gmail.com` throw `permission-denied` (`HttpsError`).
2. **Canonical Idempotency Pattern:**
   - Every function validates `data.idempotencyKey.startsWith('OP_IDEMP_')`.
   - System tasks use `IDEMP_*`, while business mutations use `OP_IDEMP_*`.
3. **8 Atomic Commit Invariants:**
   - Verified inside single `runTransaction` blocks across all mutation functions:
     1. Operation record exists in `committed_operations`.
     2. Operation status is `IN_PROGRESS`.
     3. Operation `fenceToken` matches current worker fence token.
     4. Operation `workerId` matches current worker ID.
     5. Authoritative backend time (`Timestamp.now()`) has not exceeded `leaseExpiresAt`.
     6. Operation has not been aborted (`abortedAt === null`).
     7. Expected base revision matches target document.
     8. Business document mutation and `COMMITTED` ledger transition execute atomically.
4. **Transaction Retry Clock Safety:**
   - `backendNow = Timestamp.now()` is recalculated dynamically inside every callback execution, guaranteeing clock freshness during transaction retries.
5. **Network Failure & Non-False Commit Safety:**
   - When a network disconnect or fetch error occurs during callable invocation, `normalizeCallableError` flags `isNetworkFailure: true`.
   - The error message explicitly communicates that the status is `UNKNOWN` and provides the idempotency key, preventing false commit acknowledgements or duplicate submissions.

---

## 5. TESTS EXECUTED AND RESULTS

### 5.1 Compilation Builds

```powershell
# 1. Cloud Functions TypeScript Compilation
npx tsc -p functions
# Result: Exit Code 0 (functions/lib/ generated with zero errors)

# 2. Client Production Bundle Compilation
npm run build (tsc -b && vite build)
# Result: Exit Code 0 (dist/ generated with zero errors)

# 3. Canonical Firestore Security Rules Pre-deploy Hook
$env:VWS_OWNER_EMAIL="vetriwatersolutions@gmail.com"; npm run build:rules
# Result: Exit Code 0 (Compiled fail-closed firestore.rules)
```

### 5.2 Automated Vitest Test Suite

Executed via `npx vitest run`:

```text
✓ tests/rules/firestore.rules.test.ts (7 tests)
✓ tests/architecture/directMutationForbidden.test.ts (4 tests)
✓ tests/unit/callableClient.test.ts (9 tests)
✓ tests/unit/siteServiceCallable.test.ts (6 tests)
✓ tests/unit/accountServiceCallable.test.ts (2 tests)
✓ tests/unit/backendCallableOperations.test.ts (6 tests)
✓ tests/unit/idempotency.test.ts (8 tests)
✓ tests/unit/money.test.ts (8 tests)
✓ tests/unit/tank.test.ts (6 tests)
✓ tests/unit/components.test.tsx (7 tests)
✓ tests/unit/excelService.test.ts (5 tests)
✓ tests/unit/excelIntegrityVerification.test.ts (1 test)

Test Files:  12 passed (12)
Tests:       69 passed (69)
Failures:    0
Duration:    11.80s
```

*Note: All 69 tests represent executable TypeScript unit, architecture, and rule assertion tests. No mock test is mislabeled as an emulator integration test.*

---

## 6. GOVERNANCE DEPENDENCIES

1. **`REC-04` — Integer Paise Representation (PENDING OWNER APPROVAL):**
   - **Isolation:** Conversion logic has been encapsulated behind `src/services/adapters/financialAdapter.ts`.
   - **Persisted Fields Identified:** `billValuePaise`, `discountPaise`, `finalValuePaise`, `totalOfficialPaise`, `totalPersonalPaise`, `dailyGrandTotalPaise`, `refreshmentPaise`, `transportPaise`, `sparesHOPaise`, `staffAttendanceExpensePaise`, `staffSalaryPaise`, `groceriesVegMilkPaise`, `lunchDinnerPaise`, `otherPaise`.
   - **Safe Boundary:** If the owner approves REC-04, no changes are required. If the owner rejects REC-04, only `financialAdapter.ts` needs adjustment.
2. **`REC-07` — Financial Ceilings (PENDING OWNER APPROVAL):**
   - Soft warning banners in UI forms remain non-blocking. No Cloud Function hard-blocks high-value amounts.
3. **`POQ-01` — Staff Salary Month Attribution (PENDING OWNER INPUT):**
   - Salary records continue to record payment work dates (`paidDate`) without enforcing a specific payroll attribution month until owner guidance is received.

---

## 7. UPDATED MILESTONE STATUS

| Milestone | Title | Status | Notes |
| :--- | :--- | :--- | :--- |
| **M01** | Tooling & Monorepo Setup | **COMPLETED** | Vite, TS, Tailwind, Firebase initialized. |
| **M02** | Security Rules & Pre-deploy Hook | **COMPLETED** | Canonical fail-closed rules compiled and tested. |
| **M03** | Domain Types & Pure Business Logic | **COMPLETED** | Pure domain calculations verified. |
| **M04** | Cloud Functions Backend Operations | **COMPLETED** | 2nd Gen callables with 8 invariants implemented. |
| **M04B** | **Client-to-Backend Callable Integration** | **COMPLETED** | Direct client writes eliminated; all mutations routed through callables. |
| **M05** | Client Shell & Single-Owner Guard | **COMPLETED** | Single-owner auth gatekeeper active. |
| **M06** | Site Management (SCR-03 to SCR-07) | **COMPLETED** | Connected to `commitSiteJob`, `commitSiteCorrection`, and `commitSiteStatusChange`. |
| **M07** | Daily Accounts (SCR-08, SCR-09) | **COMPLETED** | Connected to `commitDailyAccountsUpdate`. |
| **M08** | Offline Durability & Sync Conflict | **NEXT TASK** | Needs IndexedDB mutation queue, retry engine, and mounted `SyncConflictModal`. |
| **M09** | Excel Export & Local Backup Engine | **COMPLETED** | DOC-007 §6.4 compliance and SHA-256 dump verified. |
| **M10** | Android Platform Setup & APK | **PENDING** | Requires `npx cap add android` and Gradle APK pipeline. |

---

## 8. NEXT RECOMMENDED TASK

### Milestone 08: Client Offline Durability & Sync Conflict Engine
Now that client mutations route through a centralized callable client, the next recommended step is to implement client-side offline durability without modifying cloud infrastructure:

1. **Implement `src/services/offline/offlineQueue.ts`:**
   - Store pending mutations in an IndexedDB object store (`offline_mutation_drafts`).
2. **Implement Retry Engine with Exponential Backoff:**
   - Jittered retry engine with dead-letter queue (DLQ) for failed mutations.
3. **Mount `SyncConflictModal.tsx` (SCR-11):**
   - Connect the unmounted modal in `AppLayout.tsx` to handle optimistic concurrency version conflicts when network reconnects.
4. **Enable Seamless Offline-to-Online Flush:**
   - Automatically dequeue and commit mutations in FIFO sequence upon network restoration.

