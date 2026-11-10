# VWS PHASE 02 — FIREBASE LOCAL WORKSPACE ALIGNMENT REPORT
**Document Identifier:** DOC-028 / VWS-ALIGN-01  
**Project:** Vetri Water Solutions (VWS)  
**Workspace:** `E:\APEX\VETRI_WATER_SOLUTIONS`  
**Phase:** 02 — Implementation  
**Date:** November 10, 2026  
**Status:** COMPLETE & VERIFIED (LOCAL WORKSPACE ALIGNMENT)  

---

## 1. Executive Summary & Objective

The local Vetri Water Solutions (VWS) codebase, configuration fallbacks, build scripts, emulator test suite, and declarative Firestore index configurations have been aligned to the newly authorized Firebase project:

| Configuration Item | Previous Value | Authoritative New Value | Status |
|---|---|---|---|
| **Firebase Project ID** | `vetri-water-solutions` | `vws-s-8bef5` | **ACTIVE & ENFORCED** |
| **Project Display Name** | Vetri Water Solutions | `VWS's` | **CONFIRMED** |
| **Authorized Owner Identity** | `vetriwatersolution@gmail.com` | `vetriwatersolution@gmail.com` | **CONFIRMED & PRESERVED** |
| **Android Application ID** | `com.vetri.watersolutions` | `com.vetri.watersolutions` | **CONFIRMED & PRESERVED** |
| **Cloud Functions Region** | `asia-south1` | `asia-south1` | **PRESERVED (DOC-004)** |
| **Auth Domain** | `vetri-water-solutions.firebaseapp.com` | `vws-s-8bef5.firebaseapp.com` | **ACTIVE & ENFORCED** |
| **Storage Bucket** | `vetri-water-solutions.appspot.com` | `vws-s-8bef5.firebasestorage.app` | **ACTIVE & ENFORCED** |
| **Active Config Old Project Occurrences** | 5 occurrences | **0 occurrences** | **ELIMINATED** |

---

## 2. Complete Inventory of Modified and Created Files

| # | File Path | Status | Nature of Modification | Description of Change |
|---|---|---|---|---|
| 1 | `.firebaserc` | **NEW** | Project Aliasing | Created canonical Firebase CLI alias mapping `"default": "vws-s-8bef5"`. |
| 2 | `firestore.indexes.json` | **NEW** | Declarative Index Definition | Defined composite index on collection `sites` (`isDeleted` ASC, `expiresForPurgeAt` ASC) required by `purgeExpiredSites`. |
| 3 | `firebase.json` | **MODIFIED** | Firebase Project Schema | Registered `"indexes": "firestore.indexes.json"` under `firestore` configuration block. |
| 4 | `package.json` | **MODIFIED** | Build & Test Scripts | Updated `emulator:exec` script flag from `--project vetri-water-solutions` to `--project vws-s-8bef5`. |
| 5 | `src/config/firebase.ts` | **MODIFIED** | Client SDK Initialization | Updated fallback strings for `authDomain`, `projectId`, and `storageBucket` to `vws-s-8bef5` endpoints. Removed hardcoded mock app ID fallback. |
| 6 | `functions/src/backup/scheduledBackup.ts` | **MODIFIED** | Cloud Functions Fallback | Updated fallback Secret Manager project ID from `'vetri-water-solutions'` to `'vws-s-8bef5'`. Recompiled to `functions/lib/`. |
| 7 | `.env.example` | **MODIFIED** | Onboarding Template | Updated documentation comments and default variable templates to reference `vws-s-8bef5`. |
| 8 | `.env` | **MODIFIED** | Local Environment (Gitignored) | Updated `VITE_FIREBASE_AUTH_DOMAIN=vws-s-8bef5.firebaseapp.com`, `VITE_FIREBASE_PROJECT_ID=vws-s-8bef5`, `VITE_FIREBASE_STORAGE_BUCKET=vws-s-8bef5.firebasestorage.app`. |

---

## 3. Configuration & Bundle Validation Results

A full audit of the compiled production frontend bundle and functions build was conducted:

1. **Production Frontend Compilation:**
   - Command: `npm run build` (`tsc -b && vite build`) $\to$ **Exit code 0** (1632 modules transformed in 10.72s).
   - Inspected compiled JavaScript bundle (`dist/assets/index-BqSYlzBr.js`):
     - `authDomain`: Verified compiled as `"vws-s-8bef5.firebaseapp.com"`.
     - `projectId`: Verified compiled as `"vws-s-8bef5"`.
     - `storageBucket`: Verified compiled as `"vws-s-8bef5.firebasestorage.app"`.
     - `fh`: Verified compiled as `"vetriwatersolution@gmail.com"`.
2. **Old Project Identifier Audit:**
   - Executed pattern match across `dist/assets/*.js` for `vetri-water-solutions`: **0 matches found**.
   - Executed pattern match across active codebase configuration: **0 matches found**.
   - All remaining occurrences of `vetri-water-solutions` are strictly confined to historical documentation files (`DOC-022` through `DOC-027`).

---

## 4. Firestore Index Verification

The newly created `firestore.indexes.json` was verified against the actual backend query implementation in `functions/src/operations/purgeExpiredSites.ts`:

```typescript
// functions/src/operations/purgeExpiredSites.ts (lines 26-30)
const expiredSnap = await adminDb.collection('sites')
  .where('isDeleted', '==', true)
  .where('expiresForPurgeAt', '<=', backendNow)
  .get();
```

### Declarative Index Specification in `firestore.indexes.json`
```json
{
  "indexes": [
    {
      "collectionGroup": "sites",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isDeleted",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "expiresForPurgeAt",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**Verification Assessment:**
- Compound queries combining an equality filter (`isDeleted == true`) with an inequality/range comparison (`expiresForPurgeAt <= backendNow`) strictly require this composite index in Firestore Native Mode.
- Index fields, order, and query scope match the code contract precisely.
- Index deployment is staged and ready for `firebase deploy --only firestore:indexes --project vws-s-8bef5`.

---

## 5. Automated Build & Test Verification Results

All automated test suites were executed and achieved **100% pass rates**:

### 5.1. Cloud Functions TypeScript Compilation
- Command: `cd functions && npm run build`
- **Result:** **Exit code 0**. `functions/lib/` recompiled cleanly.

### 5.2. Vitest Unit & Architecture Suite
- Command: `npx vitest run --exclude "tests/integration/**"`
- **Result:** **13 test files passed (13 / 13)**
- **Total Tests:** **78 passed (78 / 78)** (Duration: 14.64s)
- Verifications passed:
  - Declarative security rules integrity (`firestore.rules.test.ts`): 10 passed.
  - Idempotency contract & format validation (`idempotency.test.ts`): 8 passed.
  - Integer paise governance (`money.test.ts`): 8 passed.
  - File downloader & native fallback (`fileDownloader.test.ts`): 3 passed.
  - Callable client normalization & error handling (`callableClient.test.ts`): 9 passed.
  - Account service callable routing (`accountServiceCallable.test.ts`): 2 passed.
  - Site service callable routing (`siteServiceCallable.test.ts`): 6 passed.
  - Owner auth guard & login gatekeeper (`components.test.tsx`): 8 passed.
  - Architectural assertion: no direct client writes (`directMutationForbidden.test.ts`): 4 passed.
  - Tank calculations & validation (`tank.test.ts`): 6 passed.
  - Backend callable authorization guards (`backendCallableOperations.test.ts`): 8 passed.
  - Excel export generation & formulas (`excelService.test.ts`, `excelIntegrityVerification.test.ts`): 6 passed.

### 5.3. Live Firebase Emulator Suite Integration Tests (`vws-s-8bef5`)
- Command: `npm run emulator:exec` (`firebase emulators:exec --only firestore,auth,functions --project vws-s-8bef5 "npm run test:emulator"`)
- **Result:** **1 test file passed (1 / 1)**
- **Total Tests:** **18 passed (18 / 18)** (Duration: 40.86s)
- **Live Verifications under `vws-s-8bef5` Emulator:**
  - `commitSiteJob` (v1 creation, idempotency, atomic sequence allocation): **PASSED**
  - `commitSiteCorrection` (v1 $\rightarrow$ v2 $\rightarrow$ v3 chain, status tracking): **PASSED**
  - `commitSiteStatusChange` (soft-delete and restoration): **PASSED**
  - `purgeExpiredSites` (compound index query execution): **PASSED**
  - `commitDailyAccountsUpdate` (financial ledger + immutable audit log): **PASSED**
  - Failure & security scenarios (unauthenticated, unauthorized attacker, old owner email rejection): **PASSED**
  - Security rules assertions (client direct writes denied, owner reads allowed): **PASSED**

---

## 6. Security & Invariant Confirmation

1. **Owner-Only Security Architecture:**
   - Sole authorized owner remains `vetriwatersolution@gmail.com`.
   - Verified that `OwnerAuthGuard.tsx`, `firestore.rules`, and `functions/src/config.ts` enforce identity checks against `vetriwatersolution@gmail.com`.
2. **Zero Direct Client Mutations:**
   - Client writes to `/sites`, `/accounts_daily`, `/system_counters`, and `/committed_operations` remain blocked under declarative security rules (`allow write: if false`).
3. **No Credential Exposure:**
   - `.env` remains strictly excluded from version control via `.gitignore`.
   - No secret keys, refresh tokens, or passwords were committed or exposed.
4. **Governance Invariants:**
   - `REC-04` (integer paise), `REC-06`, `REC-07`, `REC-10`, and `POQ-01` remain strictly **PENDING**.

---

## 7. Remaining Blockers & Next Actions

1. **Web App API Key & App ID Snippet in `.env`:**
   - The project owner needs to paste the genuine `apiKey` and `appId` generated by the Firebase Console for `vws-s-8bef5` into `.env` (currently holding development placeholder `AIzaSyBv_...`) prior to physical Android testing.
2. **Firebase Console Android SHA-1 Registration:**
   - The owner must register the debug SHA-1 (`DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95`) in the Firebase Console under `vws-s-8bef5` $\to$ Project Settings $\to$ Android app (`com.vetri.watersolutions`) to enable native Google Sign-In.
3. **Cloud Infrastructure Deployment (Future Step):**
   - Cloud Firestore database initialization in `asia-south1`.
   - Deployment of rules: `firebase deploy --only firestore:rules --project vws-s-8bef5`.
   - Deployment of indexes: `firebase deploy --only firestore:indexes --project vws-s-8bef5`.
   - Deployment of Cloud Functions: `firebase deploy --only functions --project vws-s-8bef5`.
4. **Android APK Rebuild (Future Step):**
   - Execute `npx cap sync android` and `cd android && ./gradlew assembleDebug` once genuine credentials and SHA-1 binding are confirmed.
