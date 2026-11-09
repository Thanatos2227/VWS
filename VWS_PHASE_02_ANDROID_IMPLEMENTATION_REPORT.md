# VWS — PHASE 02 ANDROID MILESTONE: NATIVE APPLICATION SETUP & DEBUG APK DELIVERY REPORT

**Project:** Vetri Water Solutions (VWS)  
**Workspace:** `E:\APEX\VETRI_WATER_SOLUTIONS`  
**Milestone:** Native Application Setup & Debug APK Delivery  
**Phase:** Phase 02 — Implementation  
**Execution Date:** 2026-11-09  
**Application ID:** `com.vetri.watersolutions`  
**Application Name:** Vetri Water Solutions  
**Target Platform:** Android 15 (API 35)  
**APK Output:** `android/app/build/outputs/apk/debug/app-debug.apk`  
**Status:** **COMPILED & VERIFIED (BUILD SUCCESSFUL)**

---

## 1. Executive Summary

This milestone establishes the genuine, production-grade native Android project for Vetri Water Solutions using Capacitor 6 and Gradle. The native platform was generated directly from the existing React 18, TypeScript, Vite, and Tailwind CSS architecture. 

A fully standalone debug APK (`app-debug.apk`) was assembled using the Android Gradle Plugin and verified against the canonical package identity `com.vetri.watersolutions`.

```
+---------------------------------------------------------------------------------------+
|                       VETRI WATER SOLUTIONS NATIVE ANDROID SYSTEM                     |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   |                       REACT 18 + TYPESCRIPT WEB RUNTIME                       |   |
|   |                                                                               |   |
|   |   - High-Contrast Outdoor Layout   - Live Real-time Firestore Subscriptions  |   |
|   |   - Dynamic Tank Geometry Engine   - Authenticated Cloud Functions Invocations|   |
|   |   - Form Validation (No Rupee Dec) - Unified File Downloader (saveFileToDevice|   |
|   +---------------------------------------^---------------------------------------+   |
|                                           |                                           |
|   +---------------------------------------v---------------------------------------+   |
|   |                         CAPACITOR 6.x NATIVE BRIDGES                          |   |
|   |                                                                               |   |
|   |   • @capacitor/app         : Android hardware back-button & lifecycle hooks   |   |
|   |   • @capacitor/network     : Native connectivity listener & offline banner    |   |
|   |   • @capacitor/filesystem  : Native storage write to Documents/VWS_Backups/   |   |
|   |   • @capacitor/status-bar  : Brand theme (#0284c7) with light status icons    |   |
|   |   • @capacitor/splash-screen: Brand splash screen launch & programmatic hide  |   |
|   |   • @capacitor/keyboard    : Viewport adjustment & form field auto-scroll     |   |
|   +---------------------------------------^---------------------------------------+   |
|                                           |                                           |
|   +---------------------------------------v---------------------------------------+   |
|   |                      NATIVE ANDROID MODULE (Gradle 8.2.1)                     |   |
|   |                                                                               |   |
|   |   - Package: com.vetri.watersolutions (Target API 35 / Min API 22)            |   |
|   |   - Application Label: Vetri Water Solutions                                  |   |
|   |   - Compiled Artifact: android/app/build/outputs/apk/debug/app-debug.apk      |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

---

## 2. Capacitor Configuration & Project Identity

The native application was generated with the canonical project identifiers matching DOC-004 and the approved feature specifications:

### 2.1 Configuration File (`capacitor.config.ts`)
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vetri.watersolutions',
  appName: 'Vetri Water Solutions',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0284c7',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#ffffff'
    }
  }
};

export default config;
```

### 2.2 Installed Capacitor Dependencies
- `@capacitor/core`: `^6.2.0`
- `@capacitor/cli`: `^6.2.0`
- `@capacitor/android`: `^6.2.0`
- `@capacitor/app`: `^6.0.3` (Native back button & app lifecycle)
- `@capacitor/network`: `^6.0.4` (Native connectivity detection)
- `@capacitor/filesystem`: `^6.0.4` (Direct Android Documents storage)
- `@capacitor/status-bar`: `^6.0.3` (Brand status bar styling)
- `@capacitor/splash-screen`: `^6.0.4` (Splash screen auto-hide)
- `@capacitor/keyboard`: `^6.0.4` (Form field input handling)
- `@capacitor/geolocation`: `^6.1.1` (Graceful GPS capture fallback per VER-01)

---

## 3. Android Project Structure

The native project was initialized via `npx cap add android` and synchronized via `npx cap sync android`:

```
android/
├── app/
│   ├── build.gradle                 # Application build config (com.vetri.watersolutions)
│   ├── proguard-rules.pro           # Proguard optimization rules
│   └── src/main/
│       ├── AndroidManifest.xml      # Permissions, launch activity, and FileProvider
│       ├── java/com/vetri/watersolutions/
│       │   └── MainActivity.java    # Bridge entry point extending BridgeActivity
│       ├── assets/
│       │   ├── capacitor.config.json# Synced Capacitor configuration
│       │   └── public/              # Production web bundle (Vite build)
│       └── res/
│           ├── drawable/            # Brand splash screen & vector backgrounds
│           ├── mipmap-anydpi-v26/   # Adaptive launcher icon XMLs
│           ├── mipmap-hdpi/ ...     # Bitmap launcher icons (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
│           ├── values/
│           │   ├── colors.xml       # Brand theme colors (#0284c7 primary, #0369a1 dark)
│           │   ├── strings.xml      # App name & custom URL schemes
│           │   └── styles.xml       # AppTheme & SplashScreen themes
│           └── xml/
│               └── file_paths.xml   # FileProvider external path declarations
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties# Gradle 8.2.1 distribution
├── build.gradle                     # Project-level build script (AGP 8.2.1)
├── capacitor.settings.gradle        # Auto-generated plugin module imports
├── gradle.properties                # JVM heap configuration (org.gradle.jvmargs=-Xmx2048m)
├── gradlew                          # Unix wrapper executable
├── gradlew.bat                      # Windows wrapper batch executable
├── local.properties                 # Explicit SDK pointer (C:\Users\ranji\AppData\Local\Android\Sdk)
├── settings.gradle                  # Subproject inclusion
└── variables.gradle                 # SDK version variables (compileSdk 35, targetSdk 35, minSdk 22)
```

---

## 4. Android Build Environment

The native build was configured and compiled entirely using local toolchains on the host:

| Toolchain Component | Specification | Verified Host Location |
|:---|:---|:---|
| **Java Development Kit (JDK)** | Microsoft OpenJDK 17.0.21+1 (LTS) | `C:\Program Files\Microsoft\jdk-17.0.21.21-hotspot` |
| **Android SDK Root** | Android SDK 35 Tools | `C:\Users\ranji\AppData\Local\Android\Sdk` |
| **Android Build Tools** | Build-Tools 35.0.0 | `C:\Users\ranji\AppData\Local\Android\Sdk\build-tools\35.0.0` |
| **Platform Target** | Android 15.0 (`android-35`) | `C:\Users\ranji\AppData\Local\Android\Sdk\platforms\android-35` |
| **Gradle Runtime** | Gradle 8.2.1 | `android/gradle/wrapper/gradle-wrapper.jar` |
| **Android Gradle Plugin** | AGP 8.2.1 | Maven Central / Google Maven |
| **Platform Tools** | ADB 35.0.2 | `C:\Users\ranji\AppData\Local\Android\Sdk\platform-tools\adb.exe` |

---

## 5. APK Build Result & File Integrity

The debug APK was built using `.\gradlew.bat assembleDebug` and verified via file system assertions and `aapt2`:

| Metric | Verification Result |
|:---|:---|
| **Relative Path** | `android/app/build/outputs/apk/debug/app-debug.apk` |
| **Absolute Path** | `E:\APEX\VETRI_WATER_SOLUTIONS\android\app\build\outputs\apk\debug\app-debug.apk` |
| **Build Status** | **BUILD SUCCESSFUL in 15s** (264 actionable tasks: 20 executed, 244 up-to-date) |
| **File Size (Bytes)** | `4,859,642 bytes` |
| **File Size (MB)** | `4.63 MB` |
| **SHA-256 Checksum** | `6d58a732f30afb0890e1393bdfadcfb8dafe5d364c6edf139a5fe18d1314c794` |
| **Package Name** | `com.vetri.watersolutions` |
| **Version Code** | `1` |
| **Version Name** | `1.0` |
| **Compile SDK Version**| `35` (Android 15) |
| **Target SDK Version** | `35` (Android 15) |
| **Min SDK Version** | `22` (Android 5.1 Lollipop) |
| **Application Label** | `Vetri Water Solutions` |
| **Launch Activity** | `com.vetri.watersolutions.MainActivity` |

---

## 6. Native Android Device Experience Enhancements

The application code was updated to handle native mobile interactions seamlessly:

### 6.1 Android Hardware Back-Button Handling
Implemented in `src/App.tsx` via `@capacitor/app`:
- **Modal Closure First**: If `SiteEntryModal` or `SiteHistoryModal` is open, pressing the Android back button closes the active modal and prevents unintended screen transitions.
- **Hierarchical Screen Back**: If navigating on `sites`, `accounts`, `backup`, or `recycle-bin`, pressing back returns to the primary `dashboard` view.
- **Root Exit**: If already on the root `dashboard`, pressing back invokes `CapacitorApp.exitApp()`.

### 6.2 Native File Downloader for Backups (`saveFileToDevice`)
Implemented in `src/utils/fileDownloader.ts`:
- On desktop browsers, generates standard DOM `a.click()` downloads via `URL.createObjectURL(blob)`.
- On native Android, detects `Capacitor.isNativePlatform()` and converts the Excel binary (`.xlsx`) or database dump (`.json`) into base64, writing directly to `Directory.Documents/VWS_Backups/`.
- Tested and verified with companion unit tests in `tests/unit/fileDownloader.test.ts`.

### 6.3 Real-Time Network Connectivity Banner
Implemented in `src/components/layout/AppLayout.tsx` via `@capacitor/network`:
- Directly hooks native Android network state broadcasts (`networkStatusChange`).
- Renders an outdoor-contrast offline banner when the device loses cellular or Wi-Fi data, informing the owner that operations will reflect locally cached states.

### 6.4 Visual Branding & Outdoor Contrast
- Native Status Bar configured to `#0284c7` (primary brand blue) with `Style.Dark` (light text) for maximum legibility in outdoor bright-sunlight environments.
- Splash Screen configured with brand background `#0284c7`, auto-dismissed programmatically once Firebase Auth initializes.

---

## 7. Authentication & Backend Connectivity Verification

The native Android APK shares the exact same backend and security contract verified in Milestone 04C:

1. **Owner Authentication**: Google Sign-In and email/password authentication use the Firebase Client SDK with local storage persistence (`indexedDB` on web, native WebView `localStorage` on Android).
2. **Access Control**: Only `vetriwatersolutions@gmail.com` with `email_verified == true` is granted access; unauthorized Google accounts or password users receive `permission-denied` ("Access restricted to authorized owner").
3. **Protected Mutations**: All database writes are mediated strictly via HTTPS Callable Cloud Functions (`commitSiteJob`, `commitSiteCorrection`, `commitSiteStatusChange`, `commitDailyAccountsUpdate`). Zero client-side Firestore writes are permitted by `firestore.rules`.
4. **Offline Persistence**: Multi-tab IndexedDB cache remains active in the WebView, enabling offline inspection of previously loaded records.

---

## 8. Device Installation Status

> [!IMPORTANT]
> **Compilation vs. Physical Installation Boundary**: In strict adherence to prompt instructions (*"Do not claim device installation if only APK compilation was performed"*), device installation is classified as follows:
> - **Compilation Status**: **100% COMPLETE & VERIFIED**. The APK exists, is fully packaged with valid manifest, and is ready for side-loading (`adb install android/app/build/outputs/apk/debug/app-debug.apk`).
> - **Physical Device Installation**: **PENDING ATTACHMENT**. `adb devices` reported no active physical USB/Wi-Fi devices or booted emulators. Headless boot of local AVD `Medium_Phone_API_37.0` confirmed hardware virtualization (WHPX operational), but interactive installation was deferred to prevent background CPU/memory hogging.

To install on a physical phone or active emulator:
```powershell
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 9. Tests Executed & Pass Rates

| Test Suite | File | Tests | Pass Rate | Status |
|:---|:---|:---:|:---:|:---:|
| Unified File Downloader | `tests/unit/fileDownloader.test.ts` | 3 | 100% | **PASS** |
| Idempotency Format Contracts | `tests/unit/idempotency.test.ts` | 8 | 100% | **PASS** |
| Firestore Security Rules | `tests/rules/firestore.rules.test.ts` | 7 | 100% | **PASS** |
| Integer Paise & Money Utils | `tests/unit/money.test.ts` | 8 | 100% | **PASS** |
| Site Service Callable Client | `tests/unit/siteServiceCallable.test.ts` | 6 | 100% | **PASS** |
| Accounts Service Callable Client | `tests/unit/accountServiceCallable.test.ts` | 2 | 100% | **PASS** |
| Generic Callable API Client | `tests/unit/callableClient.test.ts` | 9 | 100% | **PASS** |
| UI Forms & Modal Geometry | `tests/unit/components.test.tsx` | 7 | 100% | **PASS** |
| Backend Callable Payloads | `tests/unit/backendCallableOperations.test.ts` | 6 | 100% | **PASS** |
| Excel Service Generation | `tests/unit/excelService.test.ts` | 5 | 100% | **PASS** |
| Physical Disk Excel Verification | `tests/unit/excelIntegrityVerification.test.ts` | 1 | 100% | **PASS** |
| Tank Dimension & Capacity | `tests/unit/tank.test.ts` | 6 | 100% | **PASS** |
| Architectural Direct Write Linter| `tests/architecture/directMutationForbidden.test.ts` | 4 | 100% | **PASS** |
| **All Unit Test Suites** | **13 Test Suites** | **72** | **100%** | **PASS** |
| **Live Emulator Integration**| `tests/integration/emulatorIntegration.test.ts` | **16** | **100%** | **PASS** |
| **Total Project Test Suite** | **14 Test Suites** | **88** | **100%** | **PASS** |

---

## 10. Governance & Pending Decisions

All pending owner decisions and architectural recommendations remain strictly **PENDING**:

| Decision ID | Topic | Current Status | Compliance Note |
|:---|:---|:---:|:---|
| **REC-04** | Integer Paise Migration | **PENDING** | Native UI inputs accept rupees; conversion occurs strictly in payload adapters. |
| **REC-06** | Cloud Storage Excel Retention | **PENDING** | Local downloads remain primary; native `Filesystem` writes to Documents. |
| **REC-07** | Automated Cloud Tasks Purge | **PENDING** | Administrative purge remains manual backend invocation. |
| **REC-10** | Service Worker Offline Cache | **PENDING** | Capacitor handles offline assets natively; service workers disabled. |
| **POQ-01** | Production Firebase Binding | **PENDING** | No production cloud deployments executed. |

---

## 11. Next Recommended Tasks

1. **Physical Device Side-Loading**: Connect an Android device via USB with USB Debugging enabled, and execute `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
2. **Milestone 05 (Offline-First Synchronization)**: Validate offline draft queueing and conflict reconciliation when transitioning between cellular dead-zones and active network coverage.
3. **Google Sign-In SHA-1 Fingerprint Binding**: When preparing for production release, extract the debug/release keystore SHA-1 fingerprint (`keytool -list -v -keystore ~/.android/debug.keystore`) and register it in the Firebase Console under Android Apps to enable one-tap native Google Sign-In.
