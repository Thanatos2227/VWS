# Vetri Water Solutions (VWS) — Phase 01B Owner Decisions Amendment Report
**Document ID:** VWS-DOC-014  
**Project Phase:** Phase 01B — Final Owner Decisions Amendment & Blueprint Lock  
**Status:** Authoritative Amendment — Complete & Locked  
**Author:** Senior Software Architect, Database Architect, Security Engineer & Business Analyst  
**Date:** November 2026 (Phase 01B Amendment)  

---

## 1. Executive Summary of the Amendment

This amendment formally records the **final resolution and architectural integration** of the two previously unresolved business and technical decisions in the **Vetri Water Solutions (VWS)** project.

Following the submission of the Phase 01B documentation suite, the business owner reviewed the open items listed in `VWS_OPEN_QUESTIONS.md` under **Tier 3: Unresolved Owner Decisions** and issued definitive, binding instructions:
1. **Complete Database JSON Backup Retention:** Retain all daily database JSON backups indefinitely in Google Drive without automated deletion or pruning.
2. **Android Google Drive Reauthorization:** Request reauthorization on demand when Google Drive access expires or is revoked, strictly decoupling Drive authorization from Cloud Firestore so that application usage and database persistence are never blocked.

With these decisions incorporated, **100% of all business, operational, and architectural decisions are now locked in Tier 1**. Zero unresolved owner questions remain. The entire documentation suite has been updated, audited for internal consistency, and synchronized.

---

## 2. Confirmed Decision 1: Complete Database JSON Backup Retention

### 2.1 Authoritative Owner Directive
> **Owner Decision:** *Retain all daily database JSON backups indefinitely in Google Drive.*

### 2.2 Architectural & Engineering Requirements
* **Zero Automatic Pruning:** The application sync manager will **never** automatically delete, truncate, or prune historical daily database backups from the `Database_Backups/` directory in Google Drive.
* **Archival Schema & Metadata Preservation:**
  * File naming convention strictly enforces chronological identification: `VWS_DB_Backup_YYYY-MM-DD_v{exportVersion}.json`.
  * Every backup archive must embed:
    * Monotonic `exportVersion` (e.g. `42`).
    * UTC ISO-8601 creation timestamp (e.g. `2026-11-06T16:30:00.000Z`).
    * Cryptographic `SHA-256` content checksum.
    * Database schema version (`schemaVersion: 1`).
    * Collection document counts (active, superseded, and soft-deleted counts).
* **Failure Safeguard (Zero False Positives):** Failed, interrupted, or incomplete uploads must **never** be logged as successful backups. If an upload aborts or does not return a verified HTTP 200/201 response with matching payload length, the backup registry marks the status as `FAILED` or `PENDING_RETRY`.
* **Long-Term Backward Compatibility:** By embedding `schemaVersion` and collection metadata into the backup envelope, future versions of the restoration utility can parse, validate, and migrate older backup structures seamlessly.
* **Google Drive Storage Growth Projections:**
  Google Drive storage is finite (Standard Google free tier: 15 GB shared across Google Drive, Gmail, and Google Photos) and is **not assumed to be infinite or cost-free**.
  * **Daily JSON Payload:** $50\text{ KB}$ (early baseline) to $2.0\text{ MB}$ (mature multi-year operation).
  * **Year 1 (365 daily backups):** $\approx 18.25\text{ MB} - 365\text{ MB}$ ($0.12\% - 2.43\%$ of free quota).
  * **Year 3 (1,095 daily backups):** $\approx 219\text{ MB} - 1.64\text{ GB}$ ($1.46\% - 10.95\%$ of free quota).
  * **Year 5 (1,825 daily backups):** $\approx 912.5\text{ MB} - 3.65\text{ GB}$ ($6.08\% - 24.33\%$ of free quota).
  * **Year 10 (3,650 daily backups):** $\approx 3.65\text{ GB} - 7.30\text{ GB}$ ($24.33\% - 48.67\%$ of free quota).
* **Storage Quota Monitoring & Safeguards:**
  * System queries Google Drive API `about.get(fields="storageQuota")` during backup operations.
  * If usage exceeds $80\%$, display an informational dashboard note.
  * If usage exceeds $90\%$, display a high-priority warning banner.
  * If upload fails with `403 storageQuotaExceeded`, notify the owner with storage remediation guidance while keeping local and Cloud Firestore databases 100% operational.

---

## 3. Confirmed Decision 2: Android Google Drive Reauthorization

### 3.1 Authoritative Owner Directive
> **Owner Decision:** *Request reauthorization when Google Drive access expires or is revoked.*

### 3.2 Architectural & Engineering Requirements
* **Detection & Informational Alert:**
  * The system actively traps HTTP 401/403 responses indicating expired tokens (`invalid_grant`) or revoked application access (`authError`).
  * The application enters state `NEEDS_REAUTHORIZATION` and displays a persistent, non-intrusive notification banner: *"Google Drive backup authorization expired. Tap here to reauthorize."*
* **On-Demand User Reauthorization:**
  * The owner can tap the banner at their convenience to trigger Google Sign-In with the `drive.file` OAuth scope.
* **Decoupled Architecture Rule (Zero Application Blocking):**
  * Google Drive authorization status is **strictly decoupled** from core application usage and Cloud Firestore database operations.
  * An expired or revoked Drive access token must **NEVER** block normal application access, form entry, offline cache writes, or Firestore cloud database commits.
* **Local Queue & Auto-Resume:**
  * While awaiting reauthorization, database modifications proceed normally and pending export jobs are stored in local client indexed storage (`pending_drive_sync_queue`).
  * Immediately upon successful reauthorization, the background sync manager resumes and streams all queued backups to Google Drive.
* **Architectural Boundary Guard:**
  * In strict compliance with the owner's decision, the system does **not** introduce a mandatory persistent backend-managed authorization server or insecure long-lived refresh tokens stored on Android devices solely to avoid user reauthorization.
  * Security is enforced via official Google Identity Services and least-privilege permissions (`https://www.googleapis.com/auth/drive.file`).

---

## 4. Document Classification & Requirements Traceability Update

Both decisions have been formally transitioned from:
> **Tier 3 — Unresolved Owner Decisions**  
> to  
> **Tier 1 — Authoritative Owner-Confirmed Requirements (LOCKED)**

### 4.1 Four-Tier Classification Status

```
+-------------------------------------------------------------------------------------------------------------+
|                                    FOUR-TIER REQUIREMENTS STATUS (PHASE 01B AMENDMENT)                      |
+-------------------------------------------------------------------------------------------------------------+
| TIER 1: AUTHORITATIVE OWNER-CONFIRMED REQUIREMENTS (LOCKED)                                                 |
|  - 14 Confirmed Requirements: Google Sign-In Auth, Calendar-Year, Single Combined Bill, OHT/UG Only,        |
|    Feet/Litres Units, Manual Bill Number, Immediate Cash/Online, Maps URL/Optional GPS, Staff Attendance     |
|    Single Combined Expense (Wages+Tea+Bata), Monthly Salary (Ind/Combined; No Daily Wages), Personal Ledger,|
|    Soft-Delete & 30-Day Recycle Bin, Indefinite Daily JSON Backup Retention, Decoupled Reauthorization.    |
+-------------------------------------------------------------------------------------------------------------+
| TIER 2: ARCHITECT-RECOMMENDED DEFAULTS (AWAITING UI/PROTOTYPE CONFIRMATION)                                 |
|  - 5 Proposed Defaults: Optional Correction Reason, Chronological History Modal, Latest Valid List Default, |
|    Excel Strikethrough Row Styling, Extensible Schema Enum.                                                 |
+-------------------------------------------------------------------------------------------------------------+
| TIER 3: UNRESOLVED OWNER DECISIONS                                                                          |
|  - ZERO UNRESOLVED DECISIONS. All owner business and technical decisions are 100% resolved and locked!      |
+-------------------------------------------------------------------------------------------------------------+
| TIER 4: TECHNICAL DECISIONS REQUIRING IMPLEMENTATION-TIME VERIFICATION                                      |
|  - Resumable Chunk Tuning (256 vs 512 KiB) & Geolocation Timeout (8s) during Phase 03 device testing.       |
+-------------------------------------------------------------------------------------------------------------+
```

### 4.2 Updated Traceability Matrix

| Requirement / Decision | Tier | Enforcing Documents & Section References |
| :--- | :---: | :--- |
| **Complete Database JSON Indefinite Retention** | **Tier 1 (LOCKED)** | `VWS_MASTER_REQUIREMENTS.md` (FR-DRV-03, FR-DRV-04)<br>`VWS_FEATURE_SPECIFICATION.md` (Sec 2.6)<br>`VWS_BUSINESS_RULES.md` (Sec 11.1, 11.2)<br>`VWS_SYSTEM_ARCHITECTURE.md` (Sec 4.2)<br>`VWS_DATABASE_SCHEMA.md` (Sec 3.4)<br>`VWS_BACKUP_STRATEGY.md` (Sec 3, 9)<br>`VWS_TECH_STACK_EVALUATION.md` (Sec 2.8)<br>`VWS_OPEN_QUESTIONS.md` (Sec 2 DEC-13, Sec 4) |
| **Decoupled Google Drive Reauthorization Flow** | **Tier 1 (LOCKED)** | `VWS_MASTER_REQUIREMENTS.md` (FR-AUTH-07, FR-DRV-02)<br>`VWS_FEATURE_SPECIFICATION.md` (Sec 2.1, 2.6)<br>`VWS_BUSINESS_RULES.md` (Sec 11.3)<br>`VWS_SYSTEM_ARCHITECTURE.md` (Sec 2.1)<br>`VWS_SECURITY_ARCHITECTURE.md` (Sec 4.2)<br>`VWS_BACKUP_STRATEGY.md` (Sec 10)<br>`VWS_TECH_STACK_EVALUATION.md` (Sec 2.5)<br>`VWS_OPEN_QUESTIONS.md` (Sec 2 DEC-14, Sec 4) |

---

## 5. Review & Synchronization of Existing Documents

Every existing blueprint document in `docs/` has been updated and audited:

1. **`VWS_MASTER_REQUIREMENTS.md` (VWS-DOC-001):**
   - Added functional requirements `FR-AUTH-07`, `FR-DRV-03`, and `FR-DRV-04`.
   - Formally documented indefinite daily JSON backup retention and decoupled Drive reauthorization without blocking Firestore.
2. **`VWS_FEATURE_SPECIFICATION.md` (VWS-DOC-002):**
   - Updated Section 2.1 & 2.6 with the reauthorization notification flow and persistent informational banner.
   - Formalized indefinite JSON dump retention and updated screen state error tables.
3. **`VWS_BUSINESS_RULES.md` (VWS-DOC-003):**
   - Added Section 11 (`BR-DRV-01` to `BR-DRV-04`) detailing indefinite daily backup retention, storage growth rules, quota monitoring (80%/90%), and decoupled reauthorization.
4. **`VWS_SYSTEM_ARCHITECTURE.md` (VWS-DOC-004):**
   - Updated Section 2.1 & 4.2 with the complete reauthorization sequence, local indexed sync queue, and long-term storage growth management.
5. **`VWS_DATABASE_SCHEMA.md` (VWS-DOC-005):**
   - Updated `BackupMetadataRecord` with `sha256Checksum`, `schemaVersion`, `driveFileName`, and `retentionPolicy: 'INDEFINITE'`.
   - Defined `PendingDriveSyncItem` schema for local offline queueing.
6. **`VWS_SECURITY_ARCHITECTURE.md` (VWS-DOC-006):**
   - Updated Section 1.1 threat matrix and Section 4.2 token lifecycle to document decoupled reauthorization, zero persistent backend servers, and cryptographic upload verification.
7. **`VWS_EXCEL_EXPORT_SPECIFICATION.md` (VWS-DOC-007):**
   - Added Section 7 documenting the dual-stream backup relationship, indefinite JSON retention, and decoupled local export download when Drive auth is pending.
8. **`VWS_BACKUP_STRATEGY.md` (VWS-DOC-008):**
   - Updated comparison table, upload verification steps, and appended Section 9 (indefinite retention & 10-year storage growth tables) and Section 10 (reauthorization sequence diagram).
9. **`VWS_TECH_STACK_EVALUATION.md` (VWS-DOC-009):**
   - Updated Section 2.5 and added Section 2.8 covering the architectural trade-offs of client-side OAuth re-consent vs backend servers, and indefinite JSON retention vs Drive storage quotas.
10. **`VWS_OPEN_QUESTIONS.md` (VWS-DOC-010):**
    - Updated breakdown table, added `DEC-13` and `DEC-14`, and updated Section 4 to show **Zero Unresolved Owner Decisions Remaining in Tier 3**.
11. **`VWS_PHASE_01_REPORT.md` (VWS-DOC-011):**
    - Synchronized dual backup description with confirmed indefinite retention and reauthorization decoupling, and updated deliverables inventory.
12. **`VWS_PHASE_01B_FINAL_REVIEW_REPORT.md` (VWS-DOC-013):**
    - Updated Master Traceability Matrix (items 18 and 19), Four-Tier Classification (Tier 3 now empty, Tier 1 has 14 items), and deliverables inventory.

---

## 6. Complete Documentation Suite Inventory

The project documentation repository contains 14 synchronized, cross-audited markdown documents:

```
e:\APEX\VETRI_WATER_SOLUTIONS\
└── docs\
    ├── VWS_MASTER_REQUIREMENTS.md                   (Document ID: VWS-DOC-001) [Updated]
    ├── VWS_FEATURE_SPECIFICATION.md                 (Document ID: VWS-DOC-002) [Updated]
    ├── VWS_BUSINESS_RULES.md                        (Document ID: VWS-DOC-003) [Updated]
    ├── VWS_SYSTEM_ARCHITECTURE.md                   (Document ID: VWS-DOC-004) [Updated]
    ├── VWS_DATABASE_SCHEMA.md                       (Document ID: VWS-DOC-005) [Updated]
    ├── VWS_SECURITY_ARCHITECTURE.md                 (Document ID: VWS-DOC-006) [Updated]
    ├── VWS_EXCEL_EXPORT_SPECIFICATION.md            (Document ID: VWS-DOC-007) [Updated]
    ├── VWS_BACKUP_STRATEGY.md                       (Document ID: VWS-DOC-008) [Updated]
    ├── VWS_TECH_STACK_EVALUATION.md                 (Document ID: VWS-DOC-009) [Updated]
    ├── VWS_OPEN_QUESTIONS.md                        (Document ID: VWS-DOC-010) [Updated]
    ├── VWS_PHASE_01_REPORT.md                       (Document ID: VWS-DOC-011) [Updated]
    ├── VWS_PHASE_01A_CORRECTION_REPORT.md           (Document ID: VWS-DOC-012) [Archived]
    ├── VWS_PHASE_01B_FINAL_REVIEW_REPORT.md         (Document ID: VWS-DOC-013) [Updated]
    └── VWS_PHASE_01B_OWNER_DECISIONS_AMENDMENT_REPORT.md (Document ID: VWS-DOC-014) [This Report]
```

---

## 7. Explicit Non-Implementation Declaration & Stop Condition

> ### FORMAL ARCHITECTURAL DECLARATION:
> It is hereby certified that in strict compliance with the Phase 01 / Phase 01A / Phase 01B directives:
> 1. **ZERO application source code has been written.**
> 2. **NO frameworks, libraries, or dependencies (npm, pip, gradle, etc.) have been installed.**
> 3. **NO React, Vite, Capacitor, Android, or Firebase projects have been initialized.**
> 4. **NO UI prototypes or temporary application mocks have been created.**
> 5. **NO live backup restoration has been tested or executed against production systems.**
> 6. **Phase 02 has NOT been started.**
>
> **STOP CONDITION REACHED:** Work is stopped. The complete, consistent, and owner-aligned Phase 01 blueprint is finished and awaiting explicit written sign-off from the business owner before Phase 02 (UI/UX Design & Prototyping) begins.

