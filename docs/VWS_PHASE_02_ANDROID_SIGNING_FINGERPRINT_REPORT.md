# VWS PHASE 02 — ANDROID FIREBASE SIGN-IN FINGERPRINT AUDIT REPORT
**Document Identifier:** DOC-027 / VWS-AUDIT-FP-02  
**Project:** Vetri Water Solutions (VWS)  
**Workspace:** `E:\APEX\VETRI_WATER_SOLUTIONS`  
**Phase:** 02 — Implementation  
**Date:** November 10, 2026  
**Status:** AUDIT COMPLETE — AWAITING FIREBASE CONSOLE FINGERPRINT REGISTRATION  

---

## 1. Executive Summary & Purpose

To enable Google Authentication on physical Android devices under the newly authorized Firebase project **`vws-s-8bef5`**, Firebase requires the signing certificate fingerprints (SHA-1 and SHA-256) of the Android application package (`com.vetri.watersolutions`).

This audit inspected the Android Gradle build configuration, executed `.\gradlew.bat signingReport`, verified the signing certificate using `keytool`, and extracted the exact cryptographic fingerprints.

### Key Audit Findings

| Category | Finding | Status / Description |
|---|---|---|
| **Android Package Name** | `com.vetri.watersolutions` | Governed by `capacitor.config.ts` and `android/app/build.gradle`. |
| **Debug Signing Configuration** | **CONFIGURED & ACTIVE** | Uses standard local Android debug keystore (`~/.android/debug.keystore`). |
| **Release Signing Configuration** | **NOT CONFIGURED (`null`)** | No release keystore, alias, or signing credentials exist in Gradle configuration. |
| **Debug SHA-1 Fingerprint** | `DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95` | **Must be added to Firebase Console.** |
| **Debug SHA-256 Fingerprint** | `5C:76:B0:EC:35:DC:85:B3:D6:16:D2:7B:5B:DD:7C:EF:97:AA:32:C3:FC:BB:C8:4F:FF:7D:4B:1C:64:4B:D6:2C` | **Must be added to Firebase Console.** |

---

## 2. Detailed Variant Signing Analysis

### 2.1. Debug Variant (`debug` & `debugAndroidTest`)
The `debug` build variant signs the debug APK installed on physical devices during development and testing (`android/app/build/outputs/apk/debug/app-debug.apk`).

- **Variant Name:** `debug`
- **Application ID:** `com.vetri.watersolutions`
- **Signing Config:** `debug`
- **Keystore Path:** `C:\Users\ranji\.android\debug.keystore`
- **Key Alias:** `AndroidDebugKey` (or `androiddebugkey`)
- **Certificate Owner:** `C=US, O=Android, CN=Android Debug`
- **Certificate Issuer:** `C=US, O=Android, CN=Android Debug`
- **Serial Number:** `1`
- **Key Type & Algorithm:** 2048-bit RSA, `SHA256withRSA`
- **Validity Period:** October 28, 2026 to October 20, 2056
- **Cryptographic Fingerprints:**
  - **MD5:** `5A:EB:5E:2C:33:B4:32:3F:76:2A:D5:E1:E7:EA:04:17`
  - **SHA-1:** `DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95`
  - **SHA-256:** `5C:76:B0:EC:35:DC:85:B3:D6:16:D2:7B:5B:DD:7C:EF:97:AA:32:C3:FC:BB:C8:4F:FF:7D:4B:1C:64:4B:D6:2C`

---

### 2.2. Release Variant (`release`)
The `release` build variant represents the production Google Play / production distribution build.

- **Variant Name:** `release`
- **Application ID:** `com.vetri.watersolutions`
- **Signing Config:** `null`
- **Keystore Store:** `null`
- **Key Alias:** `null`
- **Release Fingerprints:** **NONE (DOES NOT EXIST)**
- **Audit Assessment:**
  - In `android/app/build.gradle`, the `release` block defines `minifyEnabled false` and proguard files, but does NOT specify a `signingConfig`.
  - No release keystore file (`.jks` or `.keystore`) has been created or committed to the repository.
  - Any attempt to run `./gradlew assembleRelease` will produce an unsigned APK (`app-release-unsigned.apk`).
  - **Action Required for Future Production Release:** A dedicated production release keystore must be generated using `keytool`, stored securely outside the repository (or via CI/CD secrets), and its SHA-1 / SHA-256 fingerprints registered in Firebase Console prior to Google Play release.

---

## 3. Gradle `signingReport` Execution Output

The execution of `.\gradlew.bat signingReport` from the `android` directory produced the following raw diagnostic block:

```text
> Task :app:signingReport
Variant: debug
Config: debug
Store: C:\Users\ranji\.android\debug.keystore
Alias: AndroidDebugKey
MD5: 5A:EB:5E:2C:33:B4:32:3F:76:2A:D5:E1:E7:EA:04:17
SHA1: DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95
SHA-256: 5C:76:B0:EC:35:DC:85:B3:D6:16:D2:7B:5B:DD:7C:EF:97:AA:32:C3:FC:BB:C8:4F:FF:7D:4B:1C:64:4B:D6:2C
Valid until: Friday, 20 October, 2056
----------
Variant: release
Config: null
Store: null
Alias: null
----------
Variant: debugAndroidTest
Config: debug
Store: C:\Users\ranji\.android\debug.keystore
Alias: AndroidDebugKey
MD5: 5A:EB:5E:2C:33:B4:32:3F:76:2A:D5:E1:E7:EA:04:17
SHA1: DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95
SHA-256: 5C:76:B0:EC:35:DC:85:B3:D6:16:D2:7B:5B:DD:7C:EF:97:AA:32:C3:FC:BB:C8:4F:FF:7D:4B:1C:64:4B:D6:2C
Valid until: Friday, 20 October, 2056
----------
```

---

## 4. Why SHA-1 Registration is Mandatory for Firebase Google Sign-In

1. **Google Identity OAuth Security Model:**
   When an Android application requests Google Sign-In, Google Play Services intercepts the request and verifies that the calling Android package name (`com.vetri.watersolutions`) and the cryptographic SHA-1 fingerprint of the signing certificate match an authorized Android Client ID registered under the Google Cloud / Firebase project.
2. **Consequence of Missing Fingerprint:**
   If the SHA-1 fingerprint is missing from the Firebase Console:
   - Google Identity endpoints will reject the authentication handshake.
   - The native Google Sign-In prompt will fail with `10: Developer Error` or `12500` (API exception).
3. **By adding the debug SHA-1 fingerprint to `vws-s-8bef5`**, Google automatically creates the corresponding Android OAuth 2.0 client credential, allowing the physical Android APK to complete Google Sign-In seamlessly.

---

## 5. Step-by-Step Instructions for the Owner

To bind the debug fingerprints to the official Firebase project `vws-s-8bef5`:

### Step 1: Open Firebase Console
Navigate to Project Settings for `vws-s-8bef5`:
[https://console.firebase.google.com/project/vws-s-8bef5/settings/general](https://console.firebase.google.com/project/vws-s-8bef5/settings/general)

### Step 2: Locate or Register the Android App
1. Scroll down to the **"Your apps"** section.
2. If the Android app (`com.vetri.watersolutions`) is **already registered**:
   - Select it from the app list.
3. If the Android app is **not yet registered**:
   - Click **Add app** $\rightarrow$ select the **Android icon** (`Android`).
   - **Android package name:** `com.vetri.watersolutions`
   - **App nickname:** `Vetri Water Solutions Android`
   - In the **Debug signing certificate SHA-1** field, paste:
     ```text
     DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95
     ```
   - Click **Register app**.

### Step 3: Add Fingerprints (If App is Already Registered)
Under the Android app card (`com.vetri.watersolutions`):
1. Find the **"SHA certificate fingerprints"** table.
2. Click **Add fingerprint**.
3. Paste the **SHA-1** fingerprint:
   ```text
   DE:0D:41:FE:D9:4D:4C:1C:FF:F6:02:84:07:44:DD:E9:A4:B2:B9:95
   ```
4. Click **Save**.
5. Click **Add fingerprint** again and paste the **SHA-256** fingerprint:
   ```text
   5C:76:B0:EC:35:DC:85:B3:D6:16:D2:7B:5B:DD:7C:EF:97:AA:32:C3:FC:BB:C8:4F:FF:7D:4B:1C:64:4B:D6:2C
   ```
6. Click **Save**.

### Step 4: Download Updated `google-services.json`
- Download the generated `google-services.json` file.
- It will be placed into `android/app/google-services.json` during the next synchronization phase.

---

## 6. Security & Invariant Confirmation

- **No Private Keys Exposed:** Only public cryptographic certificate fingerprints are reported. No keystore passwords or private key material are disclosed.
- **No Configurations Altered:** Zero files in `android/`, `src/`, or root were modified during this audit.
- **No Build or Deployment Executed:** APK assembly and cloud deployment remain stopped awaiting owner completion of console setup.
- **Authoritative Identity Preserved:** `vetriwatersolution@gmail.com` remains the sole authorized owner.
- **Pending Governance:** Items `REC-04`, `REC-06`, `REC-07`, `REC-10`, and `POQ-01` remain **PENDING**.
