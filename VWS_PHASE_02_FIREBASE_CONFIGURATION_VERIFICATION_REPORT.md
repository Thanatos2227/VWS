# Vetri Water Solutions (VWS) — Firebase Configuration Verification Report
**Document ID:** VWS-DOC-026  
**Project Phase:** Phase 02 — Implementation & Engineering Construction  
**Task:** Pre-Installation Firebase Configuration & Owner Identity Verification  
**Status:** Verification Complete — Critical Blockers Identified  
**Date:** November 2026  
**Intended Owner Account Under Review:** `vetriwatersolution@gmail.com`  

---

## 1. Verification Summary Table

| # | Verification Parameter | Evaluation Method | Result | Details / Observations |
| :- | :--- | :--- | :---: | :--- |
| **1** | **Firebase Project Identity** | Static inspection of `firebase.json`, `src/config/firebase.ts`, `.env`, `capacitor.config.ts` | **PASS** | Project ID is consistently configured as `vetri-water-solutions`, Auth Domain `vetri-water-solutions.firebaseapp.com`, Region `asia-south1`, Package `com.vetri.watersolutions`. |
| **2** | **Local `.env` Web App Configuration** | File inspection of `.env` | **FAIL** | Local `.env` contains project IDs, but credentials (`API_KEY`, `APP_ID`, `MESSAGING_SENDER_ID`) remain placeholder structures rather than credentials issued by Firebase Console. |
| **3** | **API Key Authenticity & Project Binding** | Live HTTPS verification against `identitytoolkit.googleapis.com` | **FAIL** | Key returns HTTP 400 `INVALID_ARGUMENT: API_KEY_INVALID` ("API key not valid. Please pass a valid API key."). Key is not registered in Google Cloud. |
| **4** | **Firebase Authentication Status** | Live Google Identity Platform probe vs local emulator verification | **FAIL / UNCONFIRMED** | **Pass** on Local Emulator (Port 9099 active). **Fail / Unconfirmed** on live Google Cloud: calls are blocked at the Google API gateway due to invalid API key. |
| **5** | **Owner Email Authorization** (`vetriwatersolution@gmail.com`) | Policy inspection of `app.ts`, `AuthContext.tsx`, `config.ts`, `firestore.rules` | **FAIL (CRITICAL BLOCKER)** | Intended account `vetriwatersolution@gmail.com` is **NOT authorized**. Existing policy hardcodes `vetriwatersolutions@gmail.com` (plural). Will trigger hard unauthorized rejection across UI, Rules, and Backend. |
| **6** | **Compiled Bundle Sanitization** | Static AST and string inspection of `dist/assets/index-BZIxWjhW.js` | **FAIL** | Old mock key `AIzaSyMockKeyForDevPhase02LocalInitOnly` was purged, but current bundle embeds the unverified placeholder key from `.env`. |
| **7** | **APK Asset Packaging** | Zip archive inspection of `app-debug.apk` | **PASS** | `android/app/build/outputs/apk/debug/app-debug.apk` correctly packages the latest `dist` assets (`index-BZIxWjhW.js`, 1.76 MB). |
| **8** | **Credential Exposure Governance** | Log & report audit | **PASS** | Zero live secrets, private keys, or credentials exposed. |

---

## 2. Detailed Findings & Remaining Blockers

### Blocker 1: Owner Email Identity Mismatch (Critical Authorization Blocker)
- **Intended Account**: `vetriwatersolution@gmail.com` (singular: *solution*)
- **Configured Policy**: `vetriwatersolutions@gmail.com` (plural: *solutions*)
- **Impact Across System**:
  1. **UI Client Gatekeeper** ([`src/context/AuthContext.tsx`](file:///E:/APEX/VETRI_WATER_SOLUTIONS/src/context/AuthContext.tsx#L40-L55)):
     `userEmail === AUTHORIZED_OWNER_EMAIL.toLowerCase()` evaluates to `false`. The application terminates session immediately and displays the "Unauthorized Access" screen.
  2. **Firestore Security Rules** ([`firestore.rules`](file:///E:/APEX/VETRI_WATER_SOLUTIONS/firestore.rules#L20-L24)):
     `request.auth.token.email == "vetriwatersolutions@gmail.com"` evaluates to `false`. All client read operations to `sites`, `accounts_daily`, and metadata are rejected with `PERMISSION_DENIED`.
  3. **Backend Cloud Functions** ([`functions/src/config.ts`](file:///E:/APEX/VETRI_WATER_SOLUTIONS/functions/src/config.ts#L34-L38)):
     `callerEmail !== AUTHORIZED_OWNER_EMAIL.toLowerCase()` evaluates to `true`. Every callable mutation (`commitSiteJob`, `commitSiteCorrection`, `commitDailyAccountsUpdate`) throws `HttpsError('permission-denied')`.
  4. **Pre-Deploy Verification Hook** ([`scripts/build-rules.mjs`](file:///E:/APEX/VETRI_WATER_SOLUTIONS/scripts/build-rules.mjs#L46)):
     Requires `VWS_OWNER_EMAIL === 'vetriwatersolutions@gmail.com'`.

### Blocker 2: Invalid / Unregistered Google Cloud API Key (Runtime Network Blocker)
- Live probe against `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri`:
  ```json
  {
    "error": {
      "code": 400,
      "message": "API key not valid. Please pass a valid API key.",
      "status": "INVALID_ARGUMENT",
      "details": [{ "reason": "API_KEY_INVALID", "domain": "googleapis.com" }]
    }
  }
  ```
- Because the key currently in `.env` is a synthetic placeholder, physical Android devices connecting to live Google endpoints will immediately fail on the login screen with `Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)`.

### Blocker 3: Live Cloud Authentication Status Unconfirmed
- Project `vetri-water-solutions.firebaseapp.com` returns `Site Not Found`.
- Live Firebase Authentication cannot be verified until a genuine API key and live Firebase project setup is provided.

---

## 3. Required Owner Actions Prior to Physical Installation

1. **Provide Authoritative Decision on Owner Email**:
   Confirm whether the authoritative business owner email is:
   - Option A: `vetriwatersolutions@gmail.com` (current baseline throughout DOC-001–DOC-025 and code)
   - Option B: `vetriwatersolution@gmail.com` (singular, specified in latest prompt)
   *Note: If Option B is intended, an explicit instruction is required to update `src/constants/app.ts`, `functions/src/config.ts`, `firestore.rules`, `firestore.rules.template`, `scripts/build-rules.mjs`, and `.env`.*
2. **Retrieve Live Firebase Web App Credentials**:
   In **Firebase Console** $\to$ **Project Settings** $\to$ **General** $\to$ **Your apps** for project `vetri-water-solutions`:
   - Copy the authentic **Web API Key** (`AIzaSy...`).
   - Copy the authentic **App ID** (`1:...:web:...`).
   - Copy the **Messaging Sender ID**.
   - Place these in `E:\APEX\VETRI_WATER_SOLUTIONS\.env`.
3. **Rebuild Web Assets & Reassemble APK**:
   Once `.env` is updated with genuine values, execute:
   ```powershell
   npm run build
   npx cap sync android
   cd android; .\gradlew.bat assembleDebug
   ```

---

## 4. Architectural Invariants Preserved
- No changes made to Firebase project identity.
- No changes made to owner authorization policy or Firestore security rules.
- No changes made to business logic.
- Zero production cloud resources or deployments executed.
- Stop condition honored: APK has NOT been installed.

