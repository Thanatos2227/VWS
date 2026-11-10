# VWS PHASE 02 — GENUINE FIREBASE WEB APP CREDENTIAL CONFIGURATION REPORT

**Project:** Vetri Water Solutions (VWS)  
**Workspace:** `E:\APEX\VETRI_WATER_SOLUTIONS`  
**Phase:** 02 — Implementation  
**Baseline Commit:** `4c3ff73`  
**Date:** November 10, 2026  
**Status:** BLOCKED — WAITING FOR OWNER FIREBASE CREDENTIALS (STOP CONDITION ENFORCED)  

---

## 1. Executive Summary & Action Status

In accordance with strict Phase 02 security governance and user instructions:
- **No credentials were synthesized, guessed, invented, or substituted.**
- **No production deployment was executed.**
- **No APK rebuild was initiated.**
- **STOP condition is strictly enforced**: The implementation is paused awaiting genuine Firebase Web App configuration from the business owner / Vetri team.

| Check | Expected Value | Current Status | Notes |
|---|---|---|---|
| **Authoritative Owner Identity** | `vetriwatersolution@gmail.com` | **ENFORCED** | Maintained across frontend, backend functions, security rules, and tests (`4c3ff73`). |
| **Firebase Project ID** | `vetri-water-solutions` | **CONFIRMED** | Canonical Google Cloud & Firebase project identifier. |
| **Project Number / Sender ID** | `108253164729` | **CONFIRMED** | Canonical Google Cloud project number. |
| **Firebase Web API Key** | Genuine Google Cloud API Key | **PLACEHOLDER (BLOCKING)** | Currently set to synthetic string `AIzaSyBv_VwsProductionWebClientKey_asia_south1`. |
| **Firebase Web App ID** | Genuine Firebase Web App ID | **PLACEHOLDER (BLOCKING)** | Currently set to synthetic string `1:108253164729:web:a1b2c3d4e5f6g7h8i9j0k1`. |
| **Overall Readiness** | Complete genuine Web App config | **BLOCKED** | Awaiting owner input from Firebase Console. |

---

## 2. Environment & Codebase Inspection

An inspection of `.env`, `.env.example`, and `src/config/firebase.ts` was performed.

### 2.1. Current `.env` Parameter Audit

```properties
# Current values in .env (values sanitized for security audit)
VITE_FIREBASE_API_KEY=AIzaSyBv_VwsProductionWebClientKey_asia_south1      # [PLACEHOLDER]
VITE_FIREBASE_AUTH_DOMAIN=vetri-water-solutions.firebaseapp.com          # [GENUINE PROJECT SUBDOMAIN]
VITE_FIREBASE_PROJECT_ID=vetri-water-solutions                           # [GENUINE PROJECT ID]
VITE_FIREBASE_STORAGE_BUCKET=vetri-water-solutions.appspot.com           # [GENUINE DEFAULT BUCKET]
VITE_FIREBASE_MESSAGING_SENDER_ID=108253164729                           # [GENUINE PROJECT NUMBER]
VITE_FIREBASE_APP_ID=1:108253164729:web:a1b2c3d4e5f6g7h8i9j0k1           # [PLACEHOLDER APP HASH]
VITE_AUTHORIZED_OWNER_EMAIL=vetriwatersolution@gmail.com                 # [GENUINE AUTHORITATIVE OWNER]
VWS_OWNER_EMAIL=vetriwatersolution@gmail.com                             # [GENUINE AUTHORITATIVE OWNER]
VITE_GOOGLE_DRIVE_FOLDER_NAME=Vetri Water Solutions                      # [GENUINE FOLDER NAME (DEC-15)]
```

### 2.2. Identification of Placeholders vs. Genuine Parameters
1. **`VITE_FIREBASE_API_KEY` (PLACEHOLDER):**
   - Value: `AIzaSyBv_VwsProductionWebClientKey_asia_south1`
   - Defect: While it begins with the standard Google Cloud prefix `AIzaSy`, the remaining characters are synthetic descriptive text. When the installed Android APK initializes Google Identity Toolkit against live Google servers (`identitytoolkit.googleapis.com`), Google rejects the key with HTTP 400: `auth/api-key-not-valid`.
2. **`VITE_FIREBASE_APP_ID` (PLACEHOLDER):**
   - Value: `1:108253164729:web:a1b2c3d4e5f6g7h8i9j0k1`
   - Defect: The project number prefix (`1:108253164729:web:`) is authentic, but the suffix `a1b2c3d4e5f6g7h8i9j0k1` is an arbitrary hexadecimal placeholder. A real registered Firebase Web App has an authentic hash generated upon app registration.
3. **`VITE_FIREBASE_AUTH_DOMAIN` / `PROJECT_ID` / `STORAGE_BUCKET` / `MESSAGING_SENDER_ID` (VALID):**
   - Correctly represent the Google Cloud project `vetri-water-solutions` (Project Number: `108253164729`).

---

## 3. Physical Device Error Analysis

### Why the error occurred on physical Android device:
1. **Local Firebase Emulator Suite (Offline Verification):**
   In local development and emulator testing (Milestone 04C), the emulator mock services running on `127.0.0.1:9099` (Auth) and `127.0.0.1:8080` (Firestore) deliberately accept any non-empty API key string. This is why 100% of emulator integration tests passed.
2. **Physical Device Runtime (Native Android via Capacitor):**
   When the compiled APK is installed on a physical phone without local emulator redirection, `src/config/firebase.ts` connects directly to Google Cloud's live authentication infrastructure. The Firebase JavaScript SDK sends an initial handshake payload to:
   `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=AIzaSyBv_...`
   Google Cloud endpoints strictly validate the `key` parameter against the Google Cloud API Keys registry for project `vetri-water-solutions`. Because the placeholder key does not exist in Google Cloud API gateway, Google returns:
   ```json
   {
     "error": {
       "code": 400,
       "message": "API_KEY_INVALID",
       "errors": [{ "message": "API_KEY_INVALID", "domain": "global", "reason": "badRequest" }]
     }
   }
   ```
   The Firebase Auth client SDK translates this directly into the blocking UI alert observed by the owner:
   `Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)`

---

## 4. Instructions for the Owner / Vetri Team

To resolve this issue permanently, the project owner needs to provide the genuine Web App credentials from the Firebase Console.

### Step 1: Open the Firebase Console
Navigate to:
[https://console.firebase.google.com/project/vetri-water-solutions/settings/general](https://console.firebase.google.com/project/vetri-water-solutions/settings/general)

### Step 2: Retrieve or Create the Web App (`</>`) Configuration
1. Scroll down to the **"Your apps"** section.
2. If a **Web app** (`</>`) is already listed:
   - Select it and locate the **"SDK setup and configuration"** panel.
   - Choose the **Config** radio button.
   - You will see a snippet structured like this:
     ```javascript
     const firebaseConfig = {
       apiKey: "AIzaSy...",
       authDomain: "vetri-water-solutions.firebaseapp.com",
       projectId: "vetri-water-solutions",
       storageBucket: "vetri-water-solutions.appspot.com",
       messagingSenderId: "108253164729",
       appId: "1:108253164729:web:..."
     };
     ```
3. If no Web app is listed:
   - Click **Add app** $\rightarrow$ select the **Web platform** (`</>`).
   - App nickname: `VWS Web App`.
   - Do **NOT** check "Firebase Hosting".
   - Click **Register app**, then copy the `apiKey` and `appId`.

### Step 3: Verify Firebase Authentication Configuration
Navigate to:
[https://console.firebase.google.com/project/vetri-water-solutions/authentication](https://console.firebase.google.com/project/vetri-water-solutions/authentication)
1. In the **Sign-in method** tab, ensure **Google** is enabled.
2. In the **Settings** $\rightarrow$ **Authorized domains** tab, ensure `vetri-water-solutions.firebaseapp.com` is listed.

### Step 4: Supply Credentials to Assistant
Provide the genuine `apiKey` and `appId` values to the assistant (or paste the `firebaseConfig` object).

---

## 5. Post-Delivery Verification Protocol (To Be Executed Upon Credential Receipt)

Once the owner supplies the genuine credentials, the assistant will automatically execute the following 5-stage verification protocol:

1. **Local Format Validation:**
   - Confirm `apiKey` is a 39-character base64-style string starting with `AIzaSy`.
   - Confirm `appId` matches format `1:108253164729:web:[a-f0-9]{20,}`.
   - Populate local `.env` (gitignored).
2. **Sanitized Non-Secret Verification:**
   - Verify that Google Cloud API gateway accepts the key for project `vetri-water-solutions` without printing or leaking the key.
3. **Production Web Asset Compilation:**
   - Execute `npm run build` (`tsc -b && vite build`) to compile static assets into `dist/`.
   - Verify that `dist/assets/*.js` contains the genuine configuration and zero placeholder strings.
4. **Capacitor Android Synchronization:**
   - Execute `npx cap sync android` to copy freshly compiled `dist/` web assets into `android/app/src/main/assets/public/`.
5. **Native Android APK Rebuild:**
   - Execute `cd android && ./gradlew assembleDebug` (using Java 17).
   - Produce a refreshed, verified debug APK at `android/app/build/outputs/apk/debug/app-debug.apk`.
   - Deliver the APK for physical device side-loading.

---

## 6. Confirmation of Governance & Invariants

- **Authoritative Owner Identity:** `vetriwatersolution@gmail.com` is strictly preserved.
- **Rules & Logic Unchanged:** Zero changes made to `firestore.rules`, `functions/src/config.ts`, or business components.
- **Pending Decisions:** `REC-04`, `REC-06`, `REC-07`, `REC-10`, and `POQ-01` remain strictly **PENDING**.
- **STOP Condition:** **ENFORCED.** Pausing execution awaiting genuine Firebase credentials.

