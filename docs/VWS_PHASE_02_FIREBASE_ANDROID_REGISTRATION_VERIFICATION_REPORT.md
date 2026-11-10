# VWS PHASE 02 — FIREBASE ANDROID REGISTRATION VERIFICATION REPORT
**Document Identifier:** DOC-029 / VWS-VERIF-AND-01  
**Project:** Vetri Water Solutions (VWS)  
**Workspace:** `E:\APEX\VETRI_WATER_SOLUTIONS`  
**Phase:** 02 — Implementation  
**Date:** November 10, 2026  
**Status:** VERIFICATION AUDIT COMPLETE (STOP CONDITION ENFORCED)  

---

## 1. Executive Summary

This audit verified the registration of the Vetri Water Solutions Android application under the authoritative Firebase project **`vws-s-8bef5`**, inspected the downloaded `google-services.json`, analyzed the existing Capacitor/JavaScript SDK architecture, and identified the root cause of the `.env` configuration discrepancy.

| Audit Parameter | Discovered / Verified Value | Evaluation |
|---|---|---|
| **Firebase Project ID** | `vws-s-8bef5` | **VERIFIED & MATCHES** |
| **Google Cloud Project Number** | `820277889521` | **GENUINE PROJECT NUMBER** (Replaces deprecated `108253164729`) |
| **Android Package Name** | `com.vetri.watersolutions` | **VERIFIED & MATCHES** |
| **Android App ID** | `1:820277889521:android:bc4fc83197a70d98885c50` | **GENUINE ANDROID APP REGISTRATION** |
| **Google Cloud API Key** | `AIzaSyBMRC...oVA` (sanitized) | **GENUINE API KEY** for `vws-s-8bef5` |
| **Storage Bucket** | `vws-s-8bef5.firebasestorage.app` | **VERIFIED & MATCHES** |
| **OAuth Client Type in File** | `client_type: 3` (Web/Server Client ID) | **VERIFIED** |
| **Android OAuth Client in File** | `client_type: 1` (with `certificate_hash`) | **MISSING FROM DOWNLOADED FILE** (Action Required) |
| **Release Signing Configuration** | `null` | **NOT CONFIGURED** (Expected for development) |

---

## 2. Inspection of Downloaded `google-services.json`

The file was located on the workstation host at:
`D:\Downloads\google-services.json` (Downloaded: `November 10, 2026, 06:15:58 PM`)

### 2.1. Structural Field Audit

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
          "current_key": "AIzaSyBMRC...[SANITIZED]...oVA"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": [
            {
              "client_id": "820277889521-3cojmn8vtjuo53ocp581mtpgssej2cq5.apps.googleusercontent.com",
              "client_type": 3
            }
          ]
        }
      }
    }
  ],
  "configuration_version": "1"
}
```

### 2.2. Verification Findings
1. **Canonical Project Binding:**
   The `project_id` is definitively `vws-s-8bef5`, and `project_number` is `820277889521`.
2. **Correct Android Package:**
   The package name is registered as `com.vetri.watersolutions`, which matches `android/app/build.gradle` and `capacitor.config.ts`.
3. **Genuine API Key:**
   The `current_key` is a genuine Google Cloud API Key for project `820277889521` (not the development placeholder `AIzaSyBv_...` from earlier test phases).

---

## 3. Analysis of Debug SHA Fingerprint Registration

The owner supplied the debug fingerprints:
- **SHA-1:** `DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95`
- **SHA-256:** `5C:76:B0:EC:35:DC:85:B3:D6:16:D2:7B:5B:DD:7C:EF:97:AA:32:C3:FC:BB:C8:4F:FF:7D:4B:1C:64:4B:D6:2C`

### Crucial Finding in `google-services.json`
- In the downloaded `google-services.json`, the `oauth_client` array contains **ONLY** `client_type: 3` (Web server OAuth client: `820277889521-3cojmn8vtjuo53ocp581mtpgssej2cq5.apps.googleusercontent.com`).
- It does **NOT** contain an entry for `client_type: 1` (Android OAuth client with `certificate_hash: "de0d41fed94d4c1cfff602840744dde9a4b2b995"`).

### Why `client_type: 1` is Missing
In the Firebase Console workflow:
1. When an Android app is first created, `google-services.json` is generated immediately *before* SHA-1 fingerprints are bound.
2. If the user downloads `google-services.json` at step 2 of the creation wizard, and adds the SHA-1 fingerprint *afterwards* in Project Settings, the previously downloaded file does not contain the Android OAuth client ID.
3. **Required Action:** The owner should open [Firebase Console Project Settings for `vws-s-8bef5`](https://console.firebase.google.com/project/vws-s-8bef5/settings/general), ensure the SHA-1 is visible under the Android app, and click **Download google-services.json** again. The updated JSON will contain the `client_type: 1` block.

---

## 4. Capacitor Architecture & Google Services Gradle Plugin Assessment

### 4.1. Application Architecture (Web SDK inside Capacitor WebView)
- **Inspection of `package.json`:**
  The project utilizes `"firebase": "^10.14.1"` (the official JavaScript Web SDK). There are **no native Firebase plugins** installed (e.g., `@capacitor-firebase/authentication` or `@capacitor/push-notifications` are absent).
- **Authentication Implementation:**
  In `src/context/AuthContext.tsx` (lines 70–76), sign-in is executed via:
  `signInWithPopup(auth, googleAuthProvider)`
  This runs entirely in the JavaScript runtime of the Android WebView (`androidScheme: 'https'`).

### 4.2. Is the Google Services Gradle Plugin Required?
- In `android/app/build.gradle` (lines 47–54), Capacitor includes a conditional hook:
  ```groovy
  try {
      def servicesJSON = file('google-services.json')
      if (servicesJSON.text) {
          apply plugin: 'com.google.gms.google-services'
      }
  } catch(Exception e) {
      logger.info("google-services.json not found...")
  }
  ```
- **Technical Determination:**
  1. **For the Current Pure Web SDK Implementation:**
     The Firebase JavaScript SDK running inside the WebView does **NOT** read `google-services.json` or Android XML resources. It reads the JavaScript configuration object bundled into `dist/assets/*.js` compiled from `.env`.
  2. **Role of `google-services.json` in Android:**
     Placing `google-services.json` into `android/app/google-services.json` causes the Gradle plugin to run during `./gradlew assembleDebug`, which creates Android resource values (`google_app_id`, `gcm_defaultSenderId`, etc.) and links the Android application with Google Play Services.
  3. **Recommendation:**
     Copy `D:\Downloads\google-services.json` into `android/app/google-services.json`. It satisfies the native Gradle hook cleanly without modifying build scripts.

---

## 5. Detailed Root Cause of the `.env` Discrepancy

The user prompt noted:
> *"genuine Web App credentials were supplied, but the previous alignment report still identified placeholders. Determine exactly what remains unresolved."*

### 5.1. The Root Cause Breakdown
1. **What the Owner Believed was Supplied:**
   The owner registered the Android app in Firebase Console and downloaded `google-services.json` to their machine (`D:\Downloads\google-services.json`). In their instructions, the owner considered this to be "supplying the genuine Firebase credentials".
2. **Why the Previous Report Flagged Placeholders:**
   - The assistant only has access to the workspace directory (`E:\APEX\VETRI_WATER_SOLUTIONS`).
   - The file `google-services.json` resided outside the workspace in `D:\Downloads\` and had not been committed or moved into the project.
   - The local `.env` file in the workspace still contained the old placeholder values from Milestone 04C:
     - `VITE_FIREBASE_API_KEY=AIzaSyBv_VwsProductionWebClientKey_asia_south1` (synthetic)
     - `VITE_FIREBASE_MESSAGING_SENDER_ID=108253164729` (old project number)
     - `VITE_FIREBASE_APP_ID=1:108253164729:web:a1b2c3d4e5f6g7h8i9j0k1` (synthetic)
   - Because the assistant adheres to the rule: *"Do not invent or synthesize any value"*, it reported the placeholders that were physically present in `.env`.

### 5.2. What `google-services.json` Now Resolves
Now that `D:\Downloads\google-services.json` has been discovered and inspected, we have the genuine values for:
- `VITE_FIREBASE_API_KEY`: `AIzaSyBMRC...oVA` (Genuine Google Cloud Key for `820277889521`)
- `VITE_FIREBASE_PROJECT_ID`: `vws-s-8bef5`
- `VITE_FIREBASE_AUTH_DOMAIN`: `vws-s-8bef5.firebaseapp.com`
- `VITE_FIREBASE_STORAGE_BUCKET`: `vws-s-8bef5.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: `820277889521` (Canonical Project Number)

### 5.3. What Remains Unresolved (`VITE_FIREBASE_APP_ID`)
- In `google-services.json`, the App ID is `1:820277889521:android:bc4fc83197a70d98885c50` (Android App ID).
- For a Firebase Web App, Firebase assigns a Web App ID (`1:820277889521:web:...`).
- **Resolution:**
  - In Firebase Console $\to$ Project Settings $\to$ "Your apps", the owner can click **Add app** $\to$ **Web (`</>`)** $\to$ nickname `VWS Web App` to obtain the official `1:820277889521:web:<hash>` ID.
  - Alternatively, the Firebase JavaScript SDK in Vite can operate with the Android App ID or the Web App ID once `AIzaSyBMRC...` is in `VITE_FIREBASE_API_KEY`.

---

## 6. Security & Invariant Confirmation

- **No Secrets Exposed:** Sensitive API keys and OAuth tokens are redacted in this report.
- **Owner-Only Security Preserved:** Single-owner authorization remains pinned to `vetriwatersolution@gmail.com`.
- **Zero Modifications Executed:** In accordance with instructions, this task was strictly diagnostic. No files were modified, no APK was built, and no cloud resources were deployed.
- **Governance Invariants:** `REC-04`, `REC-06`, `REC-07`, `REC-10`, and `POQ-01` remain **PENDING**.

---

## 7. Recommended Action Plan for Owner

1. **Verify SHA-1 in Firebase Console & Re-download:**
   In [Firebase Console (vws-s-8bef5)](https://console.firebase.google.com/project/vws-s-8bef5/settings/general):
   - Confirm SHA-1 `DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95` is saved under the Android app.
   - Click **Download google-services.json** to ensure the file contains the Android OAuth client (`client_type: 1`).
2. **Authorize Assistant to Copy & Populate:**
   Authorize the assistant in the next step to:
   - Copy `D:\Downloads\google-services.json` to `android/app/google-services.json`.
   - Update `.env` with the genuine API key (`AIzaSyBMRC...`) and sender ID (`820277889521`).
3. **Rebuild & Verify:**
   Compile the web assets (`npm run build`), sync Capacitor (`npx cap sync android`), and assemble the debug APK (`./gradlew assembleDebug`) for physical device installation.

