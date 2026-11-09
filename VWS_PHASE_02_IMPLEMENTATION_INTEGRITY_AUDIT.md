# VWS PHASE 02 — IMPLEMENTATION INTEGRITY AUDIT & ANDROID DELIVERY VERIFICATION

**Document ID:** DOC-022 / AUDIT-02  
**Date:** November 9, 2026  
**Project:** Vetri Water Solutions (VWS)  
**Workspace:** `E:\APEX\VETRI_WATER_SOLUTIONS`  
**Git Branch:** `master` (Baseline commit: `62e9bd5`)  
**Status:** AUTHORITATIVE AUDIT REPORT  

---

## EXECUTIVE SUMMARY

Following explicit project owner authorization to begin Phase 02 implementation, an empirical integrity audit was conducted across the entire codebase to evaluate production-readiness, governance compliance, offline durability, serverless atomicity, financial integrity, and Android delivery readiness.

### Core Verdict
The Phase 02 codebase exhibits high-quality frontend UI scaffolding, compliant ExcelJS financial export logic, strict TypeScript compilation, and robust serverless Cloud Functions logic. However, **critical architectural contradictions, governance leaks, and functional gaps prevent the system from operating as a unified, production-ready system in its current state**:

1. **Governance Leak (REC-04):** The pending integer paise recommendation has leaked into the database schema and Cloud Function payload interfaces (`*Paise` suffixes), violating its "Pending Owner Approval" status.
2. **Security & Client-Backend Contradiction:** Firestore security rules correctly deny all direct client mutations (`allow write: if false;`), but the client services (`siteService.ts`, `accountService.ts`) directly call client SDK mutation methods (`setDoc`, `runTransaction`) rather than invoking the Cloud Functions `httpsCallable` endpoints. Deploying the rules today would immediately break all client writes with `permission-denied`.
3. **Offline Durability Functional Gap:** The client has no offline operation queue, no exponential backoff retry engine, and no local conflict detection engine. `SyncConflictModal.tsx` was written as an isolated component but is never mounted in the application.
4. **Android Native Delivery Gap:** While `capacitor.config.ts` exists, the `android/` native platform directory has not been initialized. No Gradle scripts, AndroidManifest, or APK build pipelines currently exist.
5. **Excel & Financial Integrity:** **100% verified and compliant.** Dynamic `=SUMIF(...)` formulas and pre-calculated static values match DOC-007 Section 6.4 requirements. Non-circular SHA-256 JSON backup hashing is fully verified.
6. **Empirical Unit Tests:** **42 passing unit tests across 7 test suites** (reconciling the earlier reported 34 tests).

---

## 1. REC-04 — INTEGER PAISE GOVERNANCE AUDIT

### 1.1 Current Implementation Findings
An inspection of `src/utils/money.ts`, `src/types/database.ts`, `src/services/accountService.ts`, `src/services/siteService.ts`, `functions/src/operations/`, and `src/services/excelService.ts` revealed that **integer paise has become the pervasive internal data representation and schema model**:

- **Database Type Definitions (`src/types/database.ts`):**
  - `SiteDocument`: Contains `billValuePaise`, `discountPaise`, `finalValuePaise`.
  - `DailyAccountsDocument`: Contains `totalOfficialPaise`, `totalPersonalPaise`, `dailyGrandTotalPaise`.
  - `StaffAttendanceEntry`: Contains `wagesPaise`, `teaPaise`, `bataPaise`, `totalPaise`.
  - `StaffSalaryEntry`: Contains `amountPaise`.
  - `OfficialExpenseEntry`: Contains `amountPaise`.
  - `PersonalExpenseEntry`: Contains `amountPaise`.
- **Backend Cloud Functions (`functions/src/operations/commitSiteJob.ts`, `commitDailyAccounts.ts`):**
  - Cloud Functions payload validation explicitly checks `Number.isInteger(data.billValuePaise) && data.billValuePaise >= 0`.
  - Ledger transaction records persist all values in integer paise.
- **Client Forms & UI (`SiteEntryModal.tsx`, `AccountsScreen.tsx`):**
  - Form inputs correctly accept standard Indian Rupee amounts as requested by the owner (`DEC-07`).
  - Conversion occurs at the boundary using `rupeesToPaise()` and `paiseToRupees()` in `src/utils/money.ts`.
- **Excel Export Engine (`src/services/excelService.ts`):**
  - Export logic converts integer paise back to Rupee decimals (`valuePaise / 100`) before rendering Excel rows and formula operands.

### 1.2 Governance Conflict Analysis
- **Violation:** Under Phase 01G baseline governance, `REC-04` (Integer paise representation) is explicitly cataloged as **PENDING OWNER APPROVAL**. It has **not** been approved by the owner (`DEC-01` through `DEC-25` are the only approved decisions).
- **Coupling Impact:** The codebase has directly encoded `Paise` into the Firestore document property names. If the project owner formally rejects REC-04 in favor of float rupees (e.g., standard numbers in rupees), all database schemas, Cloud Function contracts, client service mappers, and unit tests will require renaming.

### 1.3 Safe Deferral & Isolation Strategy
To prevent financial data corruption and maintain governance integrity without breaking the current working build:
1. **Maintain Pure Domain Converters:** Keep `rupeesToPaise` and `paiseToRupees` in `src/utils/money.ts` as mathematical transformation utilities.
2. **Encapsulate Data Access Layer:** Implement an explicit Firestore serialization adapter in `src/services/adapters/financialAdapter.ts`. If REC-04 is rejected, only the adapter needs to map database fields, isolating UI components and calculation utilities from schema naming.
3. **No Migration Necessary:** Because the production database contains zero production records (fresh Phase 02 implementation), no migration or rewriting of live financial data is required.
4. **Owner Decision Gate:** REC-04 must remain flagged as PENDING until the owner explicitly signs off.

---

## 2. REC-07 — FINANCIAL CEILINGS & WARNING THRESHOLDS AUDIT

### 2.1 Current Implementation Findings
Inspection of `src/utils/money.ts`, `SiteEntryModal.tsx`, `AccountsScreen.tsx`, and `functions/src/operations/` reveals the exact status of financial ceilings:

```typescript
// src/utils/money.ts
export const FINANCIAL_THRESHOLDS = {
  SITE_BILL_CEILING_RUPEES: 1000000,      // ₹10,00,000
  EXPENSE_ENTRY_CEILING_RUPEES: 500000,   // ₹5,00,000
  DAILY_TOTAL_CEILING_RUPEES: 2500000,    // ₹25,00,000
};
```

1. **Soft Warnings Only (Non-Blocking):**
   - In `SiteEntryModal.tsx` (Lines 212–218): If the bill exceeds ₹10,00,000, a high-visibility amber warning box (`High Value Warning`) is displayed to the user.
   - In `AccountsScreen.tsx` (Lines 185–192): If any single expense exceeds ₹5,00,000 or the daily total exceeds ₹25,00,000, an amber warning banner is rendered.
   - **No Hard Block:** The user is **not** blocked from saving. The submit button remains fully active and operational.
2. **Zero Backend Enforcement:**
   - Cloud Functions (`commitSiteJob.ts`, `commitDailyAccounts.ts`) enforce only non-negativity and integer types (`valuePaise >= 0`). They do not enforce maximum ceiling cutoffs.
3. **Hardcoded Thresholds:**
   - The threshold constants are currently hardcoded in `src/utils/money.ts` rather than being loaded from a runtime configuration document.

### 2.2 Rejection Impact Analysis
- `REC-07` remains **PENDING OWNER APPROVAL**.
- If the owner rejects REC-07:
  - No database schema changes are required.
  - No Cloud Function modifications are required.
  - The warning banners can be completely disabled simply by removing the warning alert component from `SiteEntryModal.tsx` and `AccountsScreen.tsx` (or setting threshold constants to `Infinity`).

---

## 3. OFFLINE DURABILITY & CONFLICT RESOLUTION AUDIT

### 3.1 Critical Gap: Missing Offline Operation Queue
While Firestore client SDK persistence is enabled via `persistentLocalCache` with `persistentMultipleTabManager` in `src/config/firebase.ts`, the **custom application-level offline durability architecture is entirely missing**:

1. **No `OfflineOperationDraft` Model:** The interface for client mutation drafts does not exist.
2. **No Persistent Mutation Queue:** There is no queue persisted in IndexedDB to hold pending mutations (`commitSiteJob`, `commitDailyAccounts`) when network connectivity is lost.
3. **No Retry Engine or Exponential Backoff:** There is no retry manager, jittered backoff algorithm, maximum retry limit, or Dead Letter Queue (DLQ) for failed mutations.
4. **No Local Conflict Detection:** The client does not perform optimistic concurrency checks comparing local base document versions against server versions before submission.

### 3.2 SyncConflictModal Isolation
- `src/components/sync/SyncConflictModal.tsx` (Screen SCR-11) was implemented as a mock/standalone component.
- **Audit Discovery:** `SyncConflictModal` is **never imported, mounted, or rendered anywhere in `App.tsx` or any child screen**. It is dead code in the current bundle.
- The 3-way merge/review options specified in DOC-004 (Keep Local, Keep Server, Overwrite) are unattached to any state machine or data layer.

### 3.3 Offline vs Cloud Functions Independence
- Because the client services currently attempt direct Firestore SDK calls (`setDoc`, `runTransaction`) rather than queueing callable functions, Firestore SDK internal offline caching provides rudimentary read/write cache for local development.
- However, because direct writes violate the target security model, **true offline durability with serverless atomicity does not function**.

---

## 4. BACKEND ATOMICITY & SECURITY ARCHITECTURE AUDIT

### 4.1 Cloud Functions Implementation & 8 Atomic Invariants
The backend functions in `functions/src/operations/commitSiteJob.ts` were audited line-by-line:

```typescript
// Invariant Verification in commitSiteJob.ts:
// 1. Operation record exists
// 2. record.status === 'IN_PROGRESS'
// 3. record.fenceToken === workerFenceToken
// 4. record.leaseExpiresAt.toMillis() > backendNow.toMillis()
// 5. record.status !== 'ABORTED'
// 6. Target business record base revision matches expectedBaseRevision
// 7. Atomic transaction writes business document AND updates operation to COMMITTED
// 8. record.workerId === currentWorkerId
```

- **Findings:**
  - All 8 atomic commit invariants are implemented inside a single `db.runTransaction(...)` block.
  - Dynamic re-evaluation of `backendNow = Timestamp.now()` is correctly executed inside the transaction callback, ensuring safety during automatic Firestore transaction retries.
  - Sequence allocation is executed atomically from `system_counters/sites_seq` (`counterDoc.data().lastSequenceNumber + 1`).
  - Worker fencing tokens and 60-second lease expiries conform to Phase 01G specifications.
  - Compilation: `functions/lib/` compiles cleanly with zero TypeScript errors under NodeNext ESM (`npx tsc -p functions`).

### 4.2 CRITICAL CONTRADICTION: Client Services vs Security Rules
A severe architectural conflict exists between the client data layer and the Firestore security rules:

1. **Firestore Rules (`firestore.rules.template`):**
   ```text
   match /sites/{siteId} {
     allow read: if isOwner();
     allow write: if false; // Deny all direct client writes; must route through Cloud Functions
   }
   match /accounts_daily/{dateId} {
     allow read: if isOwner();
     allow write: if false; // Deny all direct client writes
   }
   ```
2. **Client Implementation (`src/services/siteService.ts`, `src/services/accountService.ts`):**
   ```typescript
   // src/services/siteService.ts (Line 42):
   await setDoc(siteRef, siteDoc); // DIRECT CLIENT WRITE
   
   // src/services/accountService.ts (Line 54):
   await runTransaction(db, async (txn) => { ... txn.set(entryRef, entryDoc); ... }); // DIRECT CLIENT WRITE
   ```
3. **Impact:** If `firestore.rules` is deployed to Firebase, **every single client create, update, or delete operation will fail immediately with `FirebaseError: Missing or insufficient permissions`**. The client currently bypasses the 8 atomic commit invariants and Cloud Functions entirely.

### 4.3 Google Drive Authorization Boundaries
- `functions/src/backup/scheduledBackup.ts` correctly targets Secret Manager for `vws-drive-backend-refresh-token` (complying with DOC-006).
- Client backup in `src/components/backup/BackupScreen.tsx` provides local Excel file downloads and JSON export with SHA-256 integrity hashing, correctly isolating browser clients from backend service credentials.

### 4.4 Automated Backend Tests
- **Status:** **0 tests.** While 42 frontend and rule assertion tests exist, there are zero executable integration tests executing `commitSiteJob.ts`, `commitDailyAccounts.ts`, or `queryOperationStatus.ts` against the Firebase Local Emulator Suite.

---

## 5. FINANCIAL & EXCEL INTEGRITY AUDIT

### 5.1 Multi-Year Sheet Partitioning & DOC-007 Compliance
`src/services/excelService.ts` was audited against DOC-007:
1. **Sheet Partitioning:** Generates `[YEAR] - Site Details` and `[YEAR] - Accounts` partitioned dynamically by work date.
2. **Multi-Tank Cell Layout:** Multiple tanks per site are formatted cleanly within a single cell separated by line breaks (`Alt+Enter` / `\n`) per Section 4.1.
3. **Superseded History Styling:** Historical replaced site rows are styled with Gray-50 background (`#F1F5F9`) and muted text, matching historical audit trail rules.
4. **Formula Calculation & Value Preservation (DOC-007 §6.4):**
   - The export engine writes both the dynamic Excel formula (e.g., `=SUMIF(...)`, `=C5-D5`) AND the pre-calculated numeric value (`result.result = calculatedValue`).
   - This guarantees that spreadsheet viewers that do not evaluate formulas upon opening (such as mobile Excel or basic web viewers) display accurate financial totals immediately without calculation latency.

### 5.2 Non-Circular JSON Backup & Cryptographic Checksum
- `src/components/backup/BackupScreen.tsx` generates a comprehensive JSON export of all local and server collections.
- Non-circular SHA-256 cryptographic checksum calculation was verified:
  ```typescript
  // Checksum is calculated over normalized deterministic JSON string excluding the checksum field itself
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  ```
- Executable verification test `tests/unit/excelIntegrityVerification.test.ts` passed: generates binary Excel buffer, reloads with ExcelJS, and confirms worksheet integrity and cell formula structures.

---

## 6. ANDROID APPLICATION DELIVERY AUDIT

### 6.1 Native Platform Status: PRE-ALPHA SHELL
The project is not currently capable of generating an Android APK.

| Component | Target Requirement | Current State | Deficit |
| :--- | :--- | :--- | :--- |
| **Capacitor Core** | `@capacitor/core` ^6.0.0 | Installed in `package.json` | OK |
| **Capacitor CLI** | `@capacitor/cli` ^6.0.0 | Installed in `package.json` | OK |
| **Capacitor Config** | `capacitor.config.ts` | Configured (`appId: com.vetri.watersolutions`) | OK |
| **Android Platform** | `android/` directory | **MISSING** | `npx cap add android` never executed |
| **Gradle Wrapper** | `gradlew`, `gradlew.bat` | **MISSING** | No build scripts exist |
| **Android Manifest** | `AndroidManifest.xml` | **MISSING** | No permissions configured |
| **App Icons & Splash** | `res/drawable*` | **MISSING** | Default assets only |
| **Keystore Signing** | `release-keystore.jks` | **MISSING** | No release signing config |

### 6.2 Step-by-Step Instructions to Achieve APK Generation
To advance Android delivery from configuration shell to an installable APK:

#### Step 1: Initialize Android Native Platform
```powershell
# Build web production bundle first
npm run build

# Add the native Android platform (requires internet/network access outside sandbox)
npx cap add android
```

#### Step 2: Configure Permissions in `android/app/src/main/AndroidManifest.xml`
Ensure permissions for network, storage, and optional GPS tagging are present:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

#### Step 3: Build Debug APK
```powershell
# Sync web assets to native Android project
npx cap sync android

# Compile Debug APK using Gradle wrapper
cd android
./gradlew assembleDebug
# Output APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

#### Step 4: Configure Release Keystore & Build Release APK
```powershell
# Generate signing key (one-time)
keytool -genkey -v -keystore vws-release-key.jks -alias vws-key -keyalg RSA -keysize 2048 -validity 10000

# Compile signed Release APK
./gradlew assembleRelease
# Output APK location: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 7. PROGRESS REPORT & TEST COUNT RECONCILIATION

### 7.1 Reconciling Test Count Discrepancies
- **Earlier Claimed Count:** 34 tests.
  - Suite breakdown (34 tests): `idempotency.test.ts` (8), `tank.test.ts` (6), `money.test.ts` (8), `components.test.tsx` (7), `excelService.test.ts` (5).
- **Subsequent Count:** 41 tests.
  - Added `tests/rules/firestore.rules.test.ts` (7 declarative security rule assertion tests) -> Total 41 tests.
- **Current Authoritative Test Count:** **42 tests across 7 test files**.
  - Added `tests/unit/excelIntegrityVerification.test.ts` (1 end-to-end binary workbook generation, disk I/O, reload, and formula inspection test) -> **Total 42 tests**.

### 7.2 Full Test Suite Execution Summary
Executed via `npx vitest run`:
```text
✓ tests/rules/firestore.rules.test.ts (7 tests)
✓ tests/unit/idempotency.test.ts (8 tests)
✓ tests/unit/tank.test.ts (6 tests)
✓ tests/unit/money.test.ts (8 tests)
✓ tests/unit/components.test.tsx (7 tests)
✓ tests/unit/excelService.test.ts (5 tests)
✓ tests/unit/excelIntegrityVerification.test.ts (1 test)

Test Files:  7 passed (7)
Tests:       42 passed (42)
Exit Code:   0 (SUCCESS)
```

### 7.3 Authoritative Milestone Status Matrix

| Milestone | Description | Previously Claimed | Actual Verified Status | Gap / Blocker |
| :--- | :--- | :--- | :--- | :--- |
| **M01** | Tooling & Monorepo Setup | Completed | **COMPLETED** | Vite, TS, Tailwind, Firebase SDK installed and passing build |
| **M02** | Security Rules & Pre-deploy Hook | Completed | **COMPLETED** | Rules compiled with owner email assert; 7 rule tests passing |
| **M03** | Domain Types & Pure Business Logic | Completed | **PARTIAL / LEAK** | Core logic works, but `REC-04` integer paise leaked into schema |
| **M04** | Cloud Functions Backend Operations | Completed | **BLOCKED (UNCONNECTED)** | Functions compile cleanly with 8 invariants, but client does not call them and zero backend integration tests exist |
| **M05** | Client Shell & Single-Owner Guard | Completed | **COMPLETED** | AuthGuard blocks non-owner with instant logout |
| **M06** | Site Management (SCR-03 to SCR-07) | Completed | **PARTIAL** | UI fully functional, but writes directly to Firestore SDK bypassing Cloud Functions |
| **M07** | Daily Accounts (SCR-08, SCR-09) | Completed | **PARTIAL** | UI and calculations compliant, but direct Firestore client writes |
| **M08** | Offline Durability & Sync Conflict | Completed | **INCOMPLETE** | No mutation queue, no backoff retry; `SyncConflictModal` is unmounted dead code |
| **M09** | Excel Export & Local Backup Engine | Completed | **COMPLETED** | Multi-year Excel, dynamic formulas, and SHA-256 JSON dump verified |
| **M10** | Android Platform Setup & APK | In Progress | **NOT STARTED** | `android/` directory not generated; no Gradle files or APK pipelines |

---

## 8. CRITICAL BLOCKERS

1. **Security Rules vs Client Mutation Contradiction:**
   - Deploying `firestore.rules` blocks all client operations because the client services do not use `httpsCallable` Cloud Functions.
2. **Missing Client Offline Mutation Queue:**
   - Without an IndexedDB mutation queue and retry manager, the app cannot guarantee zero data loss during network dropouts in field operations.
3. **Absence of Android Platform Assets:**
   - An installable Android APK cannot be provided to the owner until `npx cap add android` is executed and Gradle builds are established.
4. **Unresolved Governance Item (REC-04):**
   - The owner has not formally approved integer paise. If rejected, renaming schema fields across the monorepo will cause regressions unless an adapter layer is introduced.

---

## 9. RECOMMENDED NEXT IMPLEMENTATION TASK

### Recommended Next Step: Milestone 04B — Client-to-Backend Callable Wiring & Firestore Adapter
To resolve the primary blocker safely without altering any owner decisions or requiring cloud deployment:
1. **Implement `src/services/api/callableClient.ts`:**
   - Wrap `httpsCallable(functions, 'commitSiteJob')` and `commitDailyAccountsUpdate` with automatic fallback and error mapping.
2. **Refactor `siteService.ts` and `accountService.ts`:**
   - Route all job creations, corrections, and accounts submissions through the callable functions rather than raw client `setDoc` calls.
3. **Decouple Financial Representation via Data Adapter:**
   - Introduce `src/services/adapters/financialAdapter.ts` to isolate `rupees` (UI) from `paise` (database) so REC-04 can be accepted or rejected seamlessly by the owner.
4. **Mount `SyncConflictModal.tsx`:**
   - Bind the conflict modal to global state in `AppLayout.tsx` so version mismatches trigger the side-by-side review UI as specified in SCR-11.

