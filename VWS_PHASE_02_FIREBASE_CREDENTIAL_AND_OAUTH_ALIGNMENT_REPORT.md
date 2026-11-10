# VWS PHASE 02 — FIREBASE CREDENTIAL ALIGNMENT AND ANDROID OAUTH VERIFICATION REPORT

**Project:** Vetri Water Solutions  
**Authoritative Firebase Project:** `vws-s-8bef5`  
**Project Display Name:** `VWS's`  
**Authorized Owner Email:** `vetriwatersolution@gmail.com`  
**Android Package ID:** `com.vetri.watersolutions`  
**Date:** November 10, 2026  
**Status:** Verification Complete — Action Required for Refreshed `google-services.json` & Web App ID  

---

## 1. Executive Summary

This audit completes the local Firebase credential alignment and investigates the Android OAuth 2.0 configuration for project `vws-s-8bef5`.

Key achievements and verified findings:
1. **Local `.env` Credential Alignment:** Updated `.env` with the genuine Google Cloud API Key (`AIzaSyBMRC...`, length 39) and project number (`820277889521`) extracted from the official project `google-services.json`. The placeholder `VITE_FIREBASE_APP_ID` was cleared to prevent invalid Android App ID substitution while awaiting the authoritative Web App ID from the Firebase Console.
2. **Android Configuration Inspection:** The downloaded `D:\Downloads\google-services.json` was thoroughly inspected. It correctly points to project `vws-s-8bef5`, project number `820277889521`, package `com.vetri.watersolutions`, and Android App ID `1:820277889521:android:bc4fc83197a70d98885c50`.
3. **Critical STOP Analysis — Missing `client_type: 1`:** The downloaded `google-services.json` contains **only** `client_type: 3` (Web Client). The Android OAuth client ID (`client_type: 1`) corresponding to the debug SHA-1 is **MISSING**. As explained below, the file was downloaded before the debug SHA-1 fingerprint was registered in the Firebase Console. The owner must re-download the refreshed `google-services.json`.
4. **Capacitor Google Sign-In Evaluation:** Confirmed that `signInWithPopup` is strictly blocked inside Capacitor's Android WebView due to Google's `disallowed_useragent` OAuth policy (RFC 8252). Formulated a minimal compatible native Google Sign-In solution using native Google Play Services and `signInWithCredential` that seamlessly plugs into the existing Firebase Auth instance and owner-only authorization logic.
5. **Quality Verification:** Full test suite executed with zero regressions:
   - Web asset production build: `npm run build` succeeded in 10.36s.
   - Unit & architecture tests: 78/78 tests passed in 14.78s.
   - Live isolated Firebase Emulator tests: 18/18 integration tests passed in 39.08s against project `vws-s-8bef5`.
6. **Strict Restraint Enforced:** No cloud resources deployed, no APK rebuilt or installed, and `.env` remains gitignored.

---

## 2. Web SDK Configuration (.env Status)

The local `.env` file was updated using genuine configuration extracted from project `vws-s-8bef5`. 

### Variable Status Summary (Masked)

| Variable | Configured Value / Prefix | Length | Status |
| :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | `AIzaSyBMRC...` | 39 chars | Genuine Google Cloud API Key |
| `VITE_FIREBASE_PROJECT_ID` | `vws-s-8bef5` | 11 chars | Aligned with authoritative project |
| `VITE_FIREBASE_AUTH_DOMAIN` | `vws-s-8bef5.firebaseapp.com` | 27 chars | Aligned |
| `VITE_FIREBASE_STORAGE_BUCKET` | `vws-s-8bef5.firebasestorage.app` | 31 chars | Aligned |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `820277889521` | 12 chars | Aligned (Project Number) |
| `VITE_FIREBASE_APP_ID` | *(Empty / Awaiting Web App ID)* | 0 chars | Pending Web App ID from Console |
| `VITE_AUTHORIZED_OWNER_EMAIL` | `vetriwatersolution@gmail.com` | 28 chars | Authoritative Owner Email |
| `VWS_OWNER_EMAIL` | `vetriwatersolution@gmail.com` | 28 chars | Authoritative Owner Email |
| `VITE_GOOGLE_DRIVE_FOLDER_NAME` | `VETRI WATER SOLUTIONS` | 21 chars | Preserved |

> [!IMPORTANT]
> The Web App ID (`1:820277889521:web:...`) is generated exclusively when registering the Web App in the Firebase Console. Following the directive *"Use the Web App ID, not the Android App ID. Do not invent or substitute credentials"*, `VITE_FIREBASE_APP_ID` was left blank rather than substituting the Android App ID.

---

## 3. Android Configuration Inspection (`google-services.json`)

The downloaded file at `D:\Downloads\google-services.json` (timestamp: `2026-11-10 06:15:58 PM`) was inspected with the following verified structure:

```json
{
  "project_info": {
    "project_number": "820277889521",
    "project_id": "vws-s-8bef5",
    "storage_bucket": "vws-s-8bef5.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:820277889521:android:bc4fc83197a70d98885c50",
        "android_client_info": {
          "package_name": "com.vetri.watersolutions"
        }
      },
      "oauth_client": [
        {
          "client_id": "820277889521-3cojmn8vtjuo53ocp581mtpgssej2cq5.apps.googleusercontent.com",
          "client_type": 3
        }
      ],
      "api_key": [
        {
          "current_key": "AIzaSyBMRC...[39 chars]"
        }
      ],
      "services": {
        "appinvite_service": { "other_platform_oauth_client": [] }
      }
    }
  ],
  "configuration_version": "1"
}
```

### Parameter Verification Table

| Parameter | Value in `google-services.json` | Expected Value | Status |
| :--- | :--- | :--- | :--- |
| **Project ID** | `vws-s-8bef5` | `vws-s-8bef5` | **MATCH** |
| **Project Number** | `820277889521` | `820277889521` | **MATCH** |
| **Storage Bucket** | `vws-s-8bef5.firebasestorage.app` | `vws-s-8bef5.firebasestorage.app` | **MATCH** |
| **Android Package Name** | `com.vetri.watersolutions` | `com.vetri.watersolutions` | **MATCH** |
| **Android App ID** | `1:820277889521:android:bc4fc83197a70d98885c50` | `1:820277889521:android:...` | **MATCH** |
| **API Key** | Genuine 39-character key | Genuine API key | **MATCH** |
| **OAuth Client `client_type: 3`** | `820277889521-3cojmn8vtjuo53ocp581mtpgssej2cq5...` | Web Client ID | **PRESENT** |
| **OAuth Client `client_type: 1`** | *(None)* | Android Client ID with SHA-1 | **MISSING** |

---

## 4. OAuth Client Status & Root Cause of Missing `client_type: 1`

### What is `client_type: 1`?
In Google Services architecture:
- `client_type: 3`: Represents an OAuth 2.0 Web Client. It is automatically provisioned for the project backend.
- `client_type: 1`: Represents an OAuth 2.0 Android Client. It binds the Android package name (`com.vetri.watersolutions`) to the specific certificate fingerprint (SHA-1). It contains:
  ```json
  {
    "client_id": "820277889521-xxxxxxxx.apps.googleusercontent.com",
    "client_type": 1,
    "android_info": {
      "package_name": "com.vetri.watersolutions",
      "certificate_hash": "de0d41fed94d4c1cfff602840744dde9a4b2b995"
    }
  }
  ```

### Why is `client_type: 1` Missing in the Downloaded File?
1. The file was downloaded at `06:15:58 PM` right when the Android App was initially registered in the Firebase Console.
2. At the time of initial app creation, no SHA-1 fingerprint had been attached yet.
3. When the debug SHA-1 (`DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95`) was added to the Firebase Console, Google Cloud automatically provisioned the Android OAuth 2.0 client in the cloud backend.
4. **Crucial:** Firebase does **NOT** push updates to files already downloaded to a developer's computer. The local file on disk remains in its original `06:15:58 PM` state.
5. If this file were copied to `android/app/google-services.json` as-is, the Google Services Gradle plugin would not register the Android OAuth client, causing native Google Sign-In and Play Integrity tokens to fail on device.

### Owner Action Required to Resolve:
1. Open [Firebase Console](https://console.firebase.google.com/) -> Project `vws-s-8bef5` (`VWS's`).
2. Go to **Project Settings** (gear icon) -> **General** tab.
3. Scroll down to **Your apps** -> select **`com.vetri.watersolutions`** (Android App).
4. Verify that the SHA-1 fingerprint (`DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95`) is listed under *SHA certificate fingerprints*.
5. Click the blue **"Download google-services.json"** button.
6. Replace the file in `D:\Downloads\google-services.json` (or place in `android/app/google-services.json`).

---

## 5. Capacitor Google Sign-In Evaluation

### Current Implementation in `src/context/AuthContext.tsx`
The current authentication logic utilizes the Firebase JavaScript Web SDK:
```typescript
import { signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../config/firebase';

const login = async () => {
  setIsLoading(true);
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    // checks result.user.email === VWS_OWNER_EMAIL
  } catch (error) { ... }
};
```

### Feasibility in Native Android WebView
- **Google OAuth Policy Restriction:** Under RFC 8252 (OAuth 2.0 for Native Apps) and Google's published Identity OAuth policy, Google strictly blocks OAuth 2.0 authorization requests from embedded WebViews (returning `disallowed_useragent` / Error 403).
- **Capacitor Android Behavior:** On Android, Capacitor runs inside an `android.webkit.WebView`. When `signInWithPopup` is invoked, it either opens an internal WebView window that Google immediately blocks, or it fails silently due to window popup restrictions.
- **`signInWithRedirect` Limitations:** `signInWithRedirect` is notoriously unreliable in hybrid mobile apps because returning to `capacitor://localhost` or `http://localhost` drops auth session cookies and cross-origin state.

### Proposed Minimal Compatible Native Solution
To achieve reliable Google Sign-In on physical Android devices without disrupting existing web or test environments:

1. **Architecture Overview:**
   Use a native Google Sign-In plugin (`@codetrix-studio/capacitor-google-auth` or `@capacitor-firebase/authentication`) to trigger the Android native Google Play Services account picker sheet. The native sheet safely authenticates outside the WebView and returns a Google `idToken`.
2. **Seamless Firebase Handshake:**
   Pass the native `idToken` to Firebase Auth using `signInWithCredential`:
   ```typescript
   import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
   import { Capacitor } from '@capacitor/core';
   import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

   const login = async () => {
     setIsLoading(true);
     try {
       let userCredential;
       if (Capacitor.isNativePlatform()) {
         // 1. Native Android Google Sign-In
         const googleUser = await GoogleAuth.signIn();
         const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
         userCredential = await signInWithCredential(auth, credential);
       } else {
         // 2. Web browser fallback (preserves existing web/emulator flow)
         userCredential = await signInWithPopup(auth, googleAuthProvider);
       }

       const email = userCredential.user?.email?.toLowerCase();
       if (email !== VWS_OWNER_EMAIL) {
         await fbSignOut(auth);
         throw new Error(`Unauthorized: Account ${email} is not authorized.`);
       }
     } catch (error) { ... }
   };
   ```
3. **Preservation of Security Architecture:**
   - The returned `userCredential.user` is a canonical Firebase `User` object.
   - All owner-only email checks (`user.email === VWS_OWNER_EMAIL`), user state hooks (`onAuthStateChanged`), Firestore security rules, and Cloud Function callable verifications remain **100% identical and untouched**.
   - In adherence to user instructions, `signInWithPopup` was **not** silently replaced in this task; this design is documented for execution in the next implementation task once credentials are in place.

---

## 6. Local `.env` Discrepancy Explanation

### Why Did the Previous `.env` Contain Placeholder Values?
A natural point of confusion occurs when switching between web development and native mobile development:
1. **Host Downloads vs Workspace Files:** The owner downloaded `google-services.json` from the Firebase Console to `D:\Downloads\`. However, downloading a file to the host downloads folder does not automatically update `.env` inside the `E:\APEX\VETRI_WATER_SOLUTIONS` workspace.
2. **Different Target Audiences for Configurations:**
   - **`google-services.json`** is an Android-specific configuration file designed for the Android Gradle build system. It is never automatically read by Vite or web JavaScript code.
   - **`.env`** is a local environment variable file parsed exclusively by Vite during the web bundle compilation (`tsc -b && vite build`).
3. **Android App ID vs Web App ID:**
   - The owner observed `mobilesdk_app_id: "1:820277889521:android:bc4fc83197a70d98885c50"` inside `google-services.json` and wondered why `.env` did not use it.
   - The Firebase Web SDK requires a **Web App ID** (formatted `1:820277889521:web:<hex>`), which is created when registering the Web App ("VWS Web App") in the Firebase Console.
   - Injecting an Android App ID into the Web SDK configuration is invalid and can cause downstream authentication and token validation failures.

---

## 7. Quality & Test Verification

All builds and tests were executed against the updated workspace:

### 1. Web Production Build (`npm run build`)
- **Status:** **PASSED** (10.36s)
- **Output:** 1,632 modules transformed. Generated production bundles:
  - `dist/index.html` (0.59 kB)
  - `dist/assets/index-CBATd3qo.css` (31.54 kB)
  - `dist/assets/index-B3dsNGZ9.js` (1,764.77 kB)
- TypeScript checks (`tsc -b`): Zero errors.

### 2. Unit and Architectural Test Suite
- **Command:** `npx vitest run --exclude "tests/integration/**"`
- **Status:** **PASSED** (14.78s)
- **Results:** 13 test files passed, 78 tests passed, 0 failures.
  - Firestore security rule tests: 10/10 passed.
  - Idempotency & ledger integrity tests: 8/8 passed.
  - Money computation tests: 8/8 passed.
  - Direct mutation forbidden architecture tests: 4/4 passed.
  - Callable client & backend callable operation tests: 17/17 passed.
  - Excel service & export verification tests: 6/6 passed.
  - Component & form validation tests: 8/8 passed.

### 3. Isolated Live Firebase Emulator Test Suite
- **Command:** `npm run emulator:exec` (executing `vitest run tests/integration/emulatorIntegration.test.ts`)
- **Configuration:** Executed against project `vws-s-8bef5` with Auth, Firestore, and Functions emulators running on Java 25.
- **Status:** **PASSED** (39.08s)
- **Results:** 18 live integration tests passed, 0 failures.
  - Site operations (create, v1 -> v2 -> v3 linked corrections, soft delete, restore): Passed.
  - 30-day retention purge verification (`purgeExpiredSites`): Passed.
  - Daily accounts update & immutable audit ledger logging: Passed.
  - Async operation status queries (`queryOperationStatus`): Passed.
  - Canonical Firestore security rules live denial of direct client writes to `/sites`, `/accounts_daily`, and `/system_counters`: Passed.

---

## 8. Remaining Blockers Before Android Google Sign-In Can Work

| # | Blocker | Responsible Party | Resolution Action |
| :--- | :--- | :--- | :--- |
| **B-1** | Re-download refreshed `google-services.json` containing `client_type: 1` | Owner / Firebase Console | In Firebase Console, go to Project Settings -> General -> Android app `com.vetri.watersolutions`. Confirm debug SHA-1 is registered, then download `google-services.json` and provide it. |
| **B-2** | Supply genuine Web App ID (`VITE_FIREBASE_APP_ID`) | Owner / Firebase Console | In Firebase Console, go to Project Settings -> General -> Web apps -> select `VWS Web App`. Copy the `appId` (`1:820277889521:web:...`) into `.env`. |
| **B-3** | Implement native Google Sign-In in `AuthContext.tsx` | Developer / Antigravity | Once B-1 and B-2 are supplied, configure native Google Sign-In plugin and wire `signInWithCredential` fallback for native Android. |

---

## 9. Security & Architecture Confirmations

- **Data Loss Prevention:** No production data, cloud resources, or Firestore rules were modified or deleted.
- **Owner Identity Preservation:** The authorized owner identity remains strictly locked to `vetriwatersolution@gmail.com`.
- **Secret Hygiene:** `.env` remains gitignored and was not staged or committed. No raw API keys or private tokens are displayed in this report.
- **Pending Recommendations Maintained:** `REC-04` (Deployment of Firestore indexes), `REC-06` (Cloud Functions deployment), `REC-07` (Cloud Scheduler job creation), `REC-10` (Cloud KMS / Secret Manager backup secret), and `POQ-01` (GCP IAM owner role audit) remain strictly **PENDING** until production deployment is explicitly authorized.

