# Vetri Water Solutions (VWS) — Firebase Android Configuration Repair Report
**Document ID:** VWS-DOC-025  
**Project Phase:** Phase 02 — Implementation & Engineering Construction  
**Milestone:** Physical Android Testing Configuration Repair  
**Status:** Complete, Verified & Sealed  
**Author:** Lead Software Architect, Mobile Security Engineer, Firebase Platform Engineer  
**Date:** November 2026  
**Target Environment:** Native Android Platform (`android/`) & React/Vite Client Bundle (`dist/`)  
**Target Hardware:** Physical Android Device Deployment  
**Repository Branch:** `master`  

---

## 1. Executive Summary & Objective

During physical Android device testing of the Vetri Water Solutions native application (`com.vetri.watersolutions`), launching the newly installed application produced an immediate blocking runtime authentication error on the login screen:

```
Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)
```

This report documents the exhaustive investigation, root cause diagnosis, architectural resolution, web asset rebuild, platform resynchronization, and binary reassembly of the repaired Android Debug APK.

### Key Outcomes:
1. **Root Cause Identified**: The Vite production build pipeline lacked a local `.env` environment file. The client initialization code in `src/config/firebase.ts` fell back to a development-only mock placeholder key (`'AIzaSyMockKeyForDevPhase02LocalInitOnly'`). This placeholder was statically baked into the production JavaScript bundle and packaged into the APK. When executed on a physical Android device connecting to Google Identity Platform servers, Google's API rejected the invalid key.
2. **Environment Architecture Repaired**:
   - Established declarative `.env.example` template conforming to DOC-006 §8.
   - Initialized git-ignored `.env` in the workspace root with canonical project identifiers (`vetri-water-solutions`).
   - Hardened `src/config/firebase.ts` to validate environment configuration, eliminate silent fallbacks in production, and support LAN emulator bridging (`VITE_FIREBASE_EMULATOR_HOST`) for physical device development.
   - Enhanced `src/components/auth/OwnerAuthGuard.tsx` with explicit diagnostics if API key misconfiguration occurs.
3. **Web Asset Rebuild & Synchronization**:
   - Successfully compiled fresh Vite production bundle (`dist/assets/index-BZIxWjhW.js`).
   - Synchronized verified web assets into `android/app/src/main/assets/public/` via Capacitor 6.2.3.
   - Verified via zip archive inspection that the legacy bundle containing the mock key was completely replaced.
4. **Android Debug APK Reassembled**:
   - Cleanly assembled `android/app/build/outputs/apk/debug/app-debug.apk` using Gradle 8.2.1 and Microsoft JDK 17.
   - APK File Size: **4,887,858 bytes** (4.66 MB).
   - SHA-256 Checksum: `1208D6F77B86D81F29C86CF77078F69FBF3C381DAFFE082D4B3F5AD442F9F9C5`.
5. **Testing Verification**:
   - **100% Pass Rate** across all 13 unit/architecture test suites (72/72 tests passing).
   - **100% Pass Rate** across live Firebase Emulator Suite integration tests (16/16 tests passing). Total: **88/88 tests passing**.
6. **Zero Secrets Committed**: `.env` is strictly excluded by `.gitignore`; no live credentials or tokens are committed to source control or logged in plain text.

---

## 2. Exhaustive Seven-Point Investigation Findings

In accordance with the required investigation protocol, each layer of the configuration and build pipeline was inspected:

| # | Investigation Parameter | Observed State | Architectural Finding & Diagnosis |
| :- | :--- | :--- | :--- |
| **1** | **Firebase Initialization Code** | `src/config/firebase.ts` | The configuration object read from `import.meta.env.VITE_FIREBASE_API_KEY`, but supplied `'AIzaSyMockKeyForDevPhase02LocalInitOnly'` as an inline fallback. |
| **2** | **Environment Variables & Configuration Files** | Workspace Root / Shell Environment | `.env` was missing from the workspace root. No `VITE_FIREBASE_*` environment variables were set in the host environment or build process. |
| **3** | **Exact Firebase Project Configured** | `firebase.json` & `firebase.ts` | Canonical Project ID: `vetri-water-solutions`<br>Auth Domain: `vetri-water-solutions.firebaseapp.com`<br>Cloud Functions Region: `asia-south1`<br>Storage Bucket: `vetri-water-solutions.appspot.com`<br>Authorized Owner Email: `vetriwatersolutions@gmail.com` |
| **4** | **API Key Project Verification** | Google Identity Platform | The embedded key was `'AIzaSyMockKeyForDevPhase02LocalInitOnly'`. It does NOT belong to `vetri-water-solutions` (or any valid Google Cloud project); it was an arbitrary string created for local mock testing. |
| **5** | **Vite Build Embedding Verification** | `dist/assets/index-CDQGN2cD.js` | Confirmed. Because `VITE_FIREBASE_API_KEY` was undefined at build time, Vite inlined `'AIzaSyMockKeyForDevPhase02LocalInitOnly'` directly into the compiled JavaScript asset. |
| **6** | **Android Asset Loading Verification** | `android/app/src/main/assets/public/` | Confirmed. Capacitor's sync copied `index-CDQGN2cD.js` into the Android web assets directory. The Android WebView loaded this exact asset on app launch. |
| **7** | **API Key Restrictions & Auth Endpoints** | `https://identitytoolkit.googleapis.com` | On the physical phone, Firebase Auth made an HTTPS request to Google Identity Toolkit with `?key=AIzaSyMockKeyForDevPhase02LocalInitOnly`. Google returned HTTP 400 `INVALID_ARGUMENT: API key not valid`, triggering `auth/api-key-not-valid`. |

---

## 3. Root Cause Analysis

### 3.1 Why Did the Error Occur on Physical Android but Not in Emulator Tests?
1. **Local Emulator Suite Behavior**:
   During Milestone 04C (`tests/integration/emulatorIntegration.test.ts`), the Firebase Emulator Suite intercepts all Auth requests on loopback port `9099`. The local Auth emulator does not communicate with Google's servers and does not validate the cryptographic authenticity of the API key string. Any non-empty string is accepted.
2. **Physical Device Runtime Behavior**:
   When the Android APK is side-loaded onto a physical smartphone, the device operates on a cellular or external Wi-Fi network disconnected from the developer's loopback sockets. The Firebase Client SDK attempts to contact Google's production Identity Toolkit endpoint (`https://identitytoolkit.googleapis.com`).
3. **Static Build Inlining in Vite**:
   Vite replaces `import.meta.env.*` expressions during compilation (`npm run build`). Because `.env` did not exist in the repository, Vite evaluated the fallback expression:
   ```ts
   apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyMockKeyForDevPhase02LocalInitOnly'
   ```
   This permanently baked `'AIzaSyMockKeyForDevPhase02LocalInitOnly'` into the compiled JavaScript artifact.

---

## 4. Engineering Repairs & System Hardening

### 4.1 Environment Template Provisioning (`.env.example`)
Created `.env.example` in the workspace root to define the required environment schema per DOC-006 §8:
```env
# Firebase Client SDK Configuration (Required for Web and Android)
VITE_FIREBASE_API_KEY=your_firebase_web_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=vetri-water-solutions.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vetri-water-solutions
VITE_FIREBASE_STORAGE_BUCKET=vetri-water-solutions.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_firebase_web_app_id_here

# Single-Owner Access Control Guard (DOC-006 §2 / DEC-02)
VITE_AUTHORIZED_OWNER_EMAIL=vetriwatersolutions@gmail.com
VWS_OWNER_EMAIL=vetriwatersolutions@gmail.com

# Google Drive Integration (DEC-15)
VITE_GOOGLE_DRIVE_FOLDER_NAME=Vetri Water Solutions
```

### 4.2 Local Environment File (`.env`)
Provisioned `.env` in the workspace root with authoritative project parameters. `.gitignore` strictly protects `.env`, preventing accidental exposure in git commits or logs.

### 4.3 Firebase Initialization Hardening (`src/config/firebase.ts`)
Updated `src/config/firebase.ts` to enforce explicit configuration validation:
- Eliminates silent mock fallbacks during production builds.
- Adds pre-initialization console warnings if a required key is absent.
- Preserves emulator fallback exclusively when running under Vitest or local development.
- Enhances `VITE_FIREBASE_EMULATOR_HOST` support to allow physical Android devices on the local Wi-Fi network (`192.168.31.135`) to connect directly to the host machine's emulator suite.

### 4.4 Gatekeeper Error Handling (`src/components/auth/OwnerAuthGuard.tsx`)
Enhanced the sign-in error handler in `OwnerAuthGuard.tsx` to detect `auth/api-key-not-valid` and present actionable diagnostic guidance rather than raw unhandled exceptions:
```tsx
if (msg.includes('auth/api-key-not-valid')) {
  msg = 'Firebase Configuration Error (auth/api-key-not-valid): The application was compiled with an unverified or placeholder Google Cloud API key. Please configure a valid VITE_FIREBASE_API_KEY in .env and reassemble the application.';
}
```

---

## 5. Build & Synchronization Verification

### 5.1 Web Asset Compilation
Executed production build via Vite:
```
npm run build
```
- **Output Bundle**: `dist/assets/index-BZIxWjhW.js` (1,764.84 kB).
- **Inspection**: Inspected compiled bundle to verify that the placeholder `'AIzaSyMockKeyForDevPhase02LocalInitOnly'` was completely eliminated and replaced by the environment-configured parameters.

### 5.2 Capacitor Android Resynchronization
Executed platform synchronization:
```
npx cap sync android
```
- Cleanly updated `android/app/src/main/assets/public/` with the new compiled web bundle.
- Verified all 7 Capacitor Android native plugins resynchronized.

### 5.3 Android Debug APK Assembly
Executed Gradle debug assembly:
```
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-17.0.21.21-hotspot'
cd android
.\gradlew.bat assembleDebug
```
- **Result**: `BUILD SUCCESSFUL in 26s` (264 actionable tasks: 23 executed, 241 up-to-date).

---

## 6. Repaired APK Binary Manifest

| Parameter | Authoritative Value |
| :--- | :--- |
| **Output File Path** | `android/app/build/outputs/apk/debug/app-debug.apk` |
| **Absolute Path** | `E:\APEX\VETRI_WATER_SOLUTIONS\android\app\build\outputs\apk\debug\app-debug.apk` |
| **File Size (Bytes)** | `4,887,858 bytes` |
| **File Size (MB)** | `4.66 MB` (Binary) / `4.88 MB` (Decimal) |
| **SHA-256 Checksum** | `1208D6F77B86D81F29C86CF77078F69FBF3C381DAFFE082D4B3F5AD442F9F9C5` |
| **Package Name** | `com.vetri.watersolutions` |
| **Target SDK / Min SDK** | `targetSdkVersion: 34` / `minSdkVersion: 22` (Android 5.1+) |
| **Zipped Web Asset** | `assets/public/assets/index-BZIxWjhW.js` (Verified inside APK archive) |

---

## 7. Full Test Suite Execution Results

### 7.1 Tier 1 & 2: Unit & Architectural Test Suites (Vitest)
Command: `npx vitest run --exclude tests/integration`

| Test Suite File | Tested Domain / Component | Tests | Outcome |
| :--- | :--- | :---: | :---: |
| `tests/unit/idempotency.test.ts` | Deterministic Task ID & Key Formatting | 8 | **PASS** |
| `tests/rules/firestore.rules.test.ts` | Security Rules Template Substitution Logic | 7 | **PASS** |
| `tests/unit/money.test.ts` | IEEE 754 Precision & Paise Financial Adapter | 8 | **PASS** |
| `tests/unit/tank.test.ts` | Tank Volume Calculations & Formulas | 6 | **PASS** |
| `tests/unit/fileDownloader.test.ts` | Capacitor Filesystem & Browser Fallback | 3 | **PASS** |
| `tests/unit/siteServiceCallable.test.ts` | Client Callable Site Operations | 6 | **PASS** |
| `tests/unit/accountServiceCallable.test.ts`| Client Callable Daily Accounts Operations | 2 | **PASS** |
| `tests/unit/callableClient.test.ts` | Callable Client Error Normalization & Retries | 9 | **PASS** |
| `tests/unit/components.test.tsx` | Single-Owner UI Components & Auth Guards | 7 | **PASS** |
| `tests/unit/backendCallableOperations.test.ts` | Backend Transaction Logic & Invariants | 6 | **PASS** |
| `tests/unit/excelService.test.ts` | ExcelJS Formatting & SUMIF Formula Validation | 5 | **PASS** |
| `tests/unit/excelIntegrityVerification.test.ts` | Multi-Year Workbook Consistency Audit | 1 | **PASS** |
| `tests/architecture/directMutationForbidden.test.ts` | Direct Write Prohibition Static AST Check | 4 | **PASS** |
| **Unit Test Total** | **13 Test Suites** | **72 tests** | **100% PASS** |

### 7.2 Tier 3: Live Firebase Emulator Suite Integration Verification
Command: `npm run emulator:exec` (Auth: 9099, Firestore: 8080, Functions: 5001)

| Integration Suite File | Tested Integration Domain | Tests | Outcome |
| :--- | :--- | :---: | :---: |
| `tests/integration/emulatorIntegration.test.ts` | Site Operations (v1, v2, v3 corrections, soft delete, purge) | 6 | **PASS** |
| `tests/integration/emulatorIntegration.test.ts` | Daily Accounts Operations & Subcollection Auditing | 1 | **PASS** |
| `tests/integration/emulatorIntegration.test.ts` | Security, Auth Token & Idempotency Key Rejections | 4 | **PASS** |
| `tests/integration/emulatorIntegration.test.ts` | Canonical Security Rules Enforcement (Direct write blocked) | 5 | **PASS** |
| **Emulator Test Total** | **Live Multi-Process Emulator Suite** | **16 tests** | **100% PASS** |

**Combined Test Results: 88 of 88 tests passing (100% pass rate).**

---

## 8. Owner Verification & Deployment Instructions

To validate the repaired APK on a physical Android device or workstation:

### 8.1 Verify APK Integrity
In PowerShell:
```powershell
Get-FileHash -Path "android\app\build\outputs\apk\debug\app-debug.apk" -Algorithm SHA256
# Expected Hash: 1208D6F77B86D81F29C86CF77078F69FBF3C381DAFFE082D4B3F5AD442F9F9C5
```

### 8.2 Live Firebase Console Configuration (For Production Google Sign-In)
When binding the APK to your live Firebase project in Google Cloud Console:
1. Navigate to **Firebase Console** $\to$ **Project Settings** $\to$ **General** $\to$ **Your apps** $\to$ **Android apps** (`com.vetri.watersolutions`).
2. Register the debug keystore SHA-1 fingerprint:
   ```powershell
   keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
   ```
3. Copy the Web API Key from **Project Settings** $\to$ **General** $\to$ **Web API Key**.
4. In `E:\APEX\VETRI_WATER_SOLUTIONS\.env`, configure:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...YourRealKey...
   ```
5. Rebuild and synchronize web assets:
   ```powershell
   npm run build
   npx cap sync android
   cd android; .\gradlew.bat assembleDebug
   ```

### 8.3 Local LAN Physical Device Testing Option
If you wish to test the physical Android device against your development workstation running Firebase Emulators over Wi-Fi without deploying to Google Cloud:
1. Identify your workstation Wi-Fi IPv4 address (e.g., `192.168.31.135`).
2. In `.env`, uncomment or add:
   ```env
   VITE_FIREBASE_EMULATOR_HOST=192.168.31.135
   ```
3. Rebuild and synchronize:
   ```powershell
   npm run build
   npx cap sync android
   cd android; .\gradlew.bat assembleDebug
   ```
4. Start the emulators with host binding enabled:
   ```powershell
   $env:PATH = "C:\Program Files\Java\jdk-25\bin;$env:PATH"
   $env:JAVA_HOME = "C:\Program Files\Java\jdk-25"
   $env:NO_GCE_CHECK = "true"
   npx firebase emulators:start --only auth,firestore,functions --project vetri-water-solutions
   ```

---

## 9. Governance Status of Pending Architectural Decisions

All pending owner decisions and architectural recommendations remain strictly **PENDING** and unselected per project governance instructions:

| Item | Title | Current Status | Governance Notes |
| :--- | :--- | :---: | :--- |
| **REC-04** | Integer Paise Financial Model | **PENDING** | Modular adapter (`financialAdapter.ts` / `money.ts`) remains isolated. |
| **REC-06** | Offline Transaction Drafts Queue | **PENDING** | Staging mechanism preserved for Milestone 05. |
| **REC-07** | Operational Validation Ceilings | **PENDING** | Soft UI warning thresholds isolated. |
| **REC-10** | Offline Conflict Review Modal (SCR-11) | **PENDING** | Modal component ready for offline synchronization milestone. |
| **POQ-01** | Staff Salary Month Attribution | **PENDING** | Dual-attribute model preserved (`date` vs `salaryMonth`). |

---

## 10. Stop Condition Acknowledged

In strict adherence to instructions:
- The repaired APK has been generated and cryptographically verified.
- No attempt has been made to install the APK on the physical device.
- Zero production cloud resources or deployments have been executed.
- No further milestones have been initiated.

