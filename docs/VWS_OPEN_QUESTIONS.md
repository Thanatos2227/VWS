# Vetri Water Solutions (VWS) — Open Questions & Canonical Decision Register
**Document ID:** VWS-DOC-010  
**Project Phase:** Phase 01G — Final Contradiction Resolution & Owner Decision Gate  
**Status:** Authoritative Blueprint — Four-Tier Canonical Decision, Recommendation, Verification & Clarification Register  
**Author:** Senior Software Architect, Database Architect, Security Engineer, QA Architect & Business Analyst  
**Date:** November 2026 (Phase 01G Final Contradiction Resolution)  

---

## 1. Resolution Status Overview & Governance Model (Tasks A–J)

Following direct business owner decisions across Phase 01A, Phase 01B, Phase 01C, Phase 01D, Phase 01E, Phase 01F, and the Phase 01G remediation audit, technical governance for **Vetri Water Solutions** is formalized into four distinct, unambiguous tiers:

1. **Tier 1: Owner-Confirmed Decisions (DEC-01 through DEC-25):** Authoritative business requirements confirmed directly by the business owner. These cannot be changed without explicit written owner approval. (Note: DEC-19 explicitly depends on Tier 2 engineering prerequisites REC-01 and REC-03).
2. **Tier 2: Architecture Recommendations (REC-01 through REC-11):** Technical engineering design decisions (e.g. Firebase Blaze upgrade, Secret Manager token security, canonical task queue, offline transaction draft idempotency, operational financial ceilings) submitted for individual owner evaluation and formal sign-off prior to Phase 02 implementation.
3. **Tier 3: Implementation-Time Verifications (VER-01 through VER-10):** Technical verification items that cannot be finalized in documentation alone and must be verified empirically during Phase 02 runtime construction.
4. **Tier 4: Pending Owner Clarification (POQ-01):** Business clarification regarding financial report aggregation for staff salary disbursements versus work periods.

```
+-------------------------------------------------------------------------------------------------------------+
|                                    FOUR-TIER GOVERNANCE MATRIX (PHASE 01G)                                  |
+------------------------------------+------------------------------------+-----------------------------------+
| TIER 1: OWNER-CONFIRMED DECISIONS  | TIER 2: ARCHITECTURE RECS          | TIER 3: RUNTIME VERIFICATIONS     |
+------------------------------------+------------------------------------+-----------------------------------+
| 25 / 25 Authoritative Decisions    | 11 Engineering Recommendations      | 10 Empirical Verification Items   |
| Confirmed, Locked & Immutable      | Awaiting Individual Owner Decision | Scheduled for Phase 02 Execution  |
+------------------------------------+------------------------------------+-----------------------------------+
| TIER 4: PENDING OWNER CLARIFICATION: 1 Non-Blocking Business Question (POQ-01: Salary Month Attribution)    |
+-------------------------------------------------------------------------------------------------------------+
```

---

## 2. Tier 1: Canonical Owner-Confirmed Decisions (DEC-01 through DEC-25)

The following twenty-five decisions represent authoritative business requirements confirmed by the owner:

| Decision ID | Domain | Authoritative Resolution | Status |
| :--- | :--- | :--- | :---: |
| **DEC-01** | Application & Access Model | **Private Single-Owner Business Management Application.** Built specifically for Vetri Water Solutions. No customer-facing or staff-facing portals. | **OWNER-CONFIRMED** |
| **DEC-02** | Authentication & Whitelist | **Google OAuth 2.0 Sign-In Only.** Restricted strictly to the authorized business owner email at client router, Firebase Auth, and Cloud Firestore Security Rules. | **OWNER-CONFIRMED** |
| **DEC-03** | Cross-Platform Scope | **Web SPA & Installable Android APK.** Single React 18 + TypeScript + Vite codebase packaged for web and wrapped via Capacitor 6.x for Android. | **OWNER-CONFIRMED** |
| **DEC-04** | Master Data Authority | **Cloud Firestore is Single Source of Truth.** NoSQL cloud database is authoritative. Excel spreadsheets and JSON dumps are generated backup artifacts. | **OWNER-CONFIRMED** |
| **DEC-05** | Annual Partitioning | **Calendar Year (Jan 1 to Dec 31).** No financial-year periods. Sheets: `[YEAR] - Site Details` and `[YEAR] - Accounts`. | **OWNER-CONFIRMED** |
| **DEC-06** | Multiple Tanks Billing | **One Combined Bill.** Multiple tanks cleaned at one site visit share one Bill Number, Bill Value, Discount, Final Value, and Payment Mode. | **OWNER-CONFIRMED** |
| **DEC-07** | Payment Terms & Validation | **Immediate Payment; Cash or Online.** Mandatory explicit choice; no silent default to Cash. No pending/partial credit ledgers. | **OWNER-CONFIRMED** |
| **DEC-08** | Tank Measurement Format | Dimensions measured strictly in **Feet** ($L \times B \times H$ ft); capacity strictly in **Litres (L)**. | **OWNER-CONFIRMED** |
| **DEC-09** | Physical Bill Number Entry | Manually entered from the owner's **physical paper bill book**. System must **never** auto-generate or overwrite bill numbers. | **OWNER-CONFIRMED** |
| **DEC-10** | Google Location Capture | **Dual Capture:** Manually pasted Maps URL or optional device GPS coordinates. GPS permission is strictly optional with graceful fallback. | **OWNER-CONFIRMED** |
| **DEC-11** | Personal Expense Ledger | Maintained as **one combined household/personal expense ledger** across the 5 confirmed categories. | **OWNER-CONFIRMED** |
| **DEC-12** | Record Deletion Lifecycle | **Soft-Deletion Only (`isDeleted: true`).** Includes a **30-day Recycle Bin** with one-click restoration and zero impact on historical versions. | **OWNER-CONFIRMED** |
| **DEC-13** | Staff Attendance Accounting | **Worker Headcount + One Combined Expense Amount.** Formula: $\text{Daily Wages} + \text{Tea} + \text{Refreshments} + \text{Bata}$. No separate wage/bata fields. | **OWNER-CONFIRMED** |
| **DEC-14** | Staff Salary Accounting | Reserved for monthly salary disbursements. Supports **both** individual staff entries and combined monthly entries. Daily wages never counted under Salary. | **OWNER-CONFIRMED** |
| **DEC-15** | Dual Backup Streams | **Type 1 Excel Business Backup** (Drive Root & `Backups/`) and **Type 2 Complete Database JSON Snapshots** (`Database_Backups/`). | **OWNER-CONFIRMED** |
| **DEC-16** | Database JSON Retention | **Indefinite Daily Retention.** Retain all daily database JSON backups indefinitely in Google Drive without automatic deletion or pruning. | **OWNER-CONFIRMED** |
| **DEC-17** | Non-Circular Checksum | Cryptographic **SHA-256 computed over raw canonical UTF-8 bytes**; stored in external companion `.json.sha256` manifest, Firestore, and Drive metadata. | **OWNER-CONFIRMED** |
| **DEC-18** | Drive Reauthorization | **On-Demand Decoupled Reauthorization.** Request reauthorization when Drive access expires/is revoked. Never block Cloud Firestore saves or app usage. | **OWNER-CONFIRMED** |
| **DEC-19** | Autonomous Backup Scheduling | **Cloud Scheduler + Cloud Functions (2nd Gen) on Firebase Blaze.** Daily execution at 23:00 IST with idempotency key, retries, and companion client sync. *(Note: Execution depends on Tier 2 engineering prerequisites REC-01 Blaze Plan and REC-03 Secret Manager).* | **OWNER-CONFIRMED** |
| **DEC-20** | Correction Reason (PD-01) | **Optional.** Leaving the correction reason empty must never prevent or block saving a correction. | **OWNER-CONFIRMED** |
| **DEC-21** | Correction History (PD-02) | **Chronological Version Timeline.** Displays $v1 \to v2 \to v3$ with version numbers, timestamps, modifying user, and field diffs. | **OWNER-CONFIRMED** |
| **DEC-22** | Default Site List (PD-03) | **Latest Valid Version Default View.** Primary ledger displays strictly `isLatestValidVersion == true` records. Superseded predecessors are hidden. | **OWNER-CONFIRMED** |
| **DEC-23** | History Modal Access (PD-04)| **Dedicated Modal Access.** Historical versions accessible via clicking version badge (e.g. `v3 (Corrected)`). | **OWNER-CONFIRMED** |
| **DEC-24** | Excel Superseded Rows (PD-05)| **Separate Rows with Gray Fill & Strikethrough.** Both original and correction rows appear; superseded rows styled with `#E2E8F0` and strikethrough; formulas sum active only. | **OWNER-CONFIRMED** |
| **DEC-25** | Tank UI Selection (PD-06 / Task D)| **Strict OHT / UG Selection in Initial UI with Extensible Schema.** The initial release form presents strictly `OHT` and `UG` with zero custom text inputs (PD-06). Underlying schema retains technical extensibility. | **OWNER-CONFIRMED** |

---

## 3. Tier 2: Architecture Recommendations (REC-01 through REC-11 — Task I Cleanup)

These technical solutions have been engineered by the software architecture team to fulfill the owner's confirmed requirements securely, reliably, and cost-effectively. Each item is an **independent recommendation** awaiting explicit owner decision:

```
+-------------------------------------------------------------------------------------------------------------------------------------------------------------+
|                                                      ARCHITECTURE RECOMMENDATIONS REGISTER (PHASE 01G)                                                      |
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| Rec ID | Technical Domain           | Exact Proposal                     | Why It Is Needed            | Financial & Operational    | Risks & Dependencies  |
|        | & Status                   |                                    |                             | Implications               |                       |
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-01 | Firebase Blaze Plan        | Upgrade Firebase project from      | Enables Cloud Functions v2, | Free tier covers compute.  | Dep: Credit card link.|
|        | AWAITING OWNER DECISION    | Spark (Free) to Blaze (Pay-As-Go). | Cloud Scheduler, Secret Mgr.| Micro-charges for storage. | Risk: Billing spikes if|
|        |                            |                                    | Needed for 23:00 backups.   | Unblocks DEC-19 execution. | REC-02 unconfigured.  |
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-02 | Google Cloud Budget Alert  | Set monthly spending alert of      | Prevents unexpected billing | Notification alert only    | Dep: GCP Billing Acct.|
|        | AWAITING OWNER DECISION    | ₹500/month with 50/80/100% triggers| surges or runaway costs.    | (does NOT halt services).  | Risk: Overages if     |
|        |                            |                                    |                             | Transparent cost oversight.| alert email unread.   |
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-03 | Backend Secret Manager     | Store Drive refresh token in KMS-  | Consumer @gmail.com accounts| $0.06/version/month.       | Dep: Blaze Plan.      |
|        | AWAITING OWNER DECISION    | encrypted Google Secret Manager.   | lack domain delegation.     | Keeps token off phone.     | Risk: WAITING_REAUTH  |
|        |                            |                                    | Unattended 23:00 backups.   | Auto backups run 365 days. | if password changed.  |
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-04 | Integer Paise Precision    | Store all monetary amounts as      | Eliminates IEEE 754 decimal | Zero external library cost.| Dep: Blocked pending  |
|        | AWAITING OWNER DECISION    | integer paise ($1 = 100 paise).    | floating-point round errors.| Exact internal precision.  | owner approval.       |
|        |                            |                                    | UI converts to rupees.      | Max safe limit: ₹90,071 Cr.| Risk: Redesign if no. |
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-05 | Master Pointer Staging     | Stage workbooks in Backups/ first; | Prevents Drive file corrupt | Zero additional cloud cost.| Dep: Google Drive API.|
|        | AWAITING OWNER DECISION    | commit pointer; copy to root.      | if network drops mid-stream.| Staged file is authoritative| Risk: ROOT_COPY_FAILED|
|        |                            |                                    |                             | Root copy is convenience.  | status if copy blips. |
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-06 | Offline Transaction Drafts | Stage offline edits in IndexedDB   | Firestore transactions fail | Enables field entry in     | Dep: Browser/OS store.|
|        | AWAITING OWNER DECISION    | with PENDING_COMMIT status.        | when device is offline.     | dead-zones without crash.  | Risk: Local draft loss|
|        |                            | Commit on reconnect.               |                             | Atomic commit on reconnect.| if cache wiped pre-sync|
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-07 | Financial Warning Ceilings | Validation warning if bill > ₹10L, | Catches accidental typos    | Pure client validation.    | Dep: None.            |
|        | AWAITING OWNER DECISION    | expense > ₹5L, daily > ₹25L.       | (extra zeros) on field form.| Warning prompt, not hard   | Risk: Annoyance if    |
|        |                            |                                    |                             | block; owner can confirm.  | commercial job valid. |
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-08 | SI Units & Quota Alerts    | Monitor Drive 15 GB quota with     | Prevents surprise quota     | Transparent forecast.      | Dep: Drive API.       |
|        | AWAITING OWNER DECISION    | alerts at 80% (12GB) and 90%(13.5G)| exhaustion without pruning. | Months of advance notice.  | Risk: Upload stop if  |
|        |                            |                                    |                             | Honest multi-year math.    | 100% full (no DB block|
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-09 | Canonical Task Queue       | Unify queue in system_tasks/{id}   | Resolves path fragmentation.| Eliminates ad-hoc queues.  | Dep: Cloud Firestore. |
|        | AWAITING OWNER DECISION    | with standard 7-state machine.     | Guarantees idempotency.     | Multi-device recovery.     | Risk: Task stuck if   |
|        |                            |                                    |                             | Decouples prep from upload.| worker unhandled err. |
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-10 | Offline Conflict Protocol  | Client Operation UUIDs + SCR-11    | Prevents silent data loss   | Zero data loss on collision| Dep: IndexedDB/SQLite.|
|        | AWAITING OWNER DECISION    | conflict review side-by-side modal.| when multi-device edits drop| Owner explicitly resolves  | Risk: Manual review   |
|        |                            |                                    |                             | conflicting offline inputs.| needed on collision.  |
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
| REC-11 | Server-Side Drive Provision| Cloud Function exchanges auth code | Prevents raw refresh tokens | Zero client storage leak.  | Dep: REC-01 & REC-03. |
|        | AWAITING OWNER DECISION    | and writes directly to Secret Mgr. | from touching client memory.| Complies with zero-trust.  | Risk: Re-auth needed  |
|        |                            |                                    |                             | Web/Android unified flow.  | if Google app revoked.|
+--------+----------------------------+------------------------------------+-----------------------------+----------------------------+-----------------------+
```

---

## 4. Tier 3: Implementation-Time Verifications (VER-01 through VER-10)

These technical specifics cannot be completely validated in documentation and must be empirically verified during Phase 02 implementation:

| Verification ID | Technical Area | Empirical Test Condition | Verification Method in Phase 02 |
| :--- | :--- | :--- | :--- |
| **VER-01** | Capacitor 6.x Geolocation on Android 14/15 | Test `@capacitor/geolocation` on physical Android 14+ test devices with precise vs approximate location permissions. | Verify graceful fallback when location is denied; ensure GPS coordinates save accurately when granted. |
| **VER-02** | Cloud Functions 2nd Gen on Node.js 22 LTS | Measure cold start latency, memory consumption, and runtime compatibility of `vws-daily-backup-worker` on Node.js 22 (LTS) when compiling 10,000-row Excel workbooks via `ExcelJS`. | Profile function RAM usage; verify 512 MB memory allocation prevents Out-Of-Memory (OOM) crashes on Node.js 22. |
| **VER-03** | Android Keystore Hardware Backing | Inspect `EncryptedSharedPreferences` on various Android devices (low-end to high-end hardware). | Verify AES-256-GCM encryption falls back securely to StrongBox / hardware TEE where available. |
| **VER-04** | Google Drive Resumable Upload Chunking | Simulate cellular network disconnections (airplane mode toggle) during a 2 MB JSON backup upload. | Verify HTTP 308 Resume Incomplete protocol resumes upload without re-transmitting previous chunks. |
| **VER-05** | ExcelJS Font, Border & Formula Result Parity in Viewers | Open generated `Vetri_Water_Solutions.xlsx` in Microsoft Excel 2016+, Microsoft 365, and Google Sheets Web Viewer. | Verify soft gray fill (`#E2E8F0`), strikethrough fonts, `=SUMIF()` formulas, and multi-line cells render identically across all viewers. Confirm formula cells adhere to the authoritative Excel Export Specification (`VWS-DOC-007` §6.4), providing pre-calculated `result` values or undergoing verified recalculation so calculated totals display reliably on load without requiring user manual edits. |
| **VER-06** | IndexedDB Storage Quotas on Mobile Chrome | Measure local cache persistence under Android Chrome aggressive background cache eviction policies. | Confirm `navigator.storage.persist()` succeeds to prevent operating system cache clearing of pending offline drafts. |
| **VER-07** | Secret Manager Token Exchange Latency | Measure end-to-end token retrieval and access token refresh latency inside Cloud Functions cold-start executions. | Verify token exchange completes within < 1,500ms and does not trip Cloud Function execution timeout limits. |
| **VER-08** | Offline Draft Reconciliation & Collision Testing | Simulate simultaneous offline edits on Android app and Web SPA to the same business day, followed by concurrent reconnection. | Verify second device cleanly triggers `SYNC_CONFLICT: STALE_BASE_VERSION` and renders `SCR-11` review modal without data loss. |
| **VER-09** | Cloud Firestore PITR & Restoration Drill | Configure Point-In-Time Recovery in test GCP project and execute an end-to-end 12-stage restoration from Google Drive JSON backup. | Verify full database rebuild, sequence counter reconciliation, and version chain integrity traversal before production launch. |
| **VER-10** | Cloud Firestore Security Rules Emulator Suite | Execute automated 15-test unit suite (`tests/security/firestore-rules.spec.ts`) against the Firebase Local Emulator Suite using `@firebase/rules-unit-testing`. | Verify 100% assertions pass for owner read allow, direct client write deny on business/system records, default-deny on `committed_operations`, and strict map-key validation on `system_tasks` before deployment. |

### 4.1 Implementation Requirement: ExcelJS Formula Evaluation & Calculated Values
* **ExcelJS Engine Limitation:** The `ExcelJS` library creates OpenXML spreadsheet files but **does not possess an internal formula calculation engine**. Assigning `{ formula: '...' }` writes only the formula definition string into the XML; it does not compute, evaluate, or populate the calculated cell value.
* **Reliable Calculated Values Guarantee:** Spreadsheets opened in Google Sheets Web Viewer, mobile document viewers, or headless preview tools that do not automatically trigger full formula recalculation on file open can display blank, `#VALUE!`, or zero values if the cached formula result is absent. To ensure 100% reliable calculated outputs across all viewers:
  1. **Pre-Calculated Result Injection:** When writing summary formula cells (e.g. dynamic `=SUMIF()` formulas in site details and daily account totals), the export generator must assign both the formula definition and the authoritative pre-calculated value derived directly from verified Firestore records:
     ```typescript
     cell.value = {
       formula: 'SUMIF(P2:P100, "ACTIVE", K2:K100)',
       result: precalculatedActiveTotal // Computed directly from verified ledger data
     };
     ```
  2. **Verified Spreadsheet-Engine Recalculation:** Alternatively, during workbook compilation, the generator must execute a verified formula calculation pass (e.g. via a headless spreadsheet evaluation engine) to populate all cached cell results prior to Google Drive upload or client file save.
* **Preservation of Owner Layout & Financial Rules:** This implementation requirement is strictly an export engine calculation safeguard. It **must not alter** the owner's 15-column visual layout, hidden technical audit column P (`Record Status`), conditional gray fill/strikethrough styling (`#E2E8F0`), or confirmed financial summation rules.

---

## 5. Tier 4: Pending Owner Clarification (POQ-01)

The following non-blocking business clarification is recorded for owner guidance prior to Phase 02 financial reporting implementation:

| Question ID | Domain | Detailed Question for Owner | Architectural Recommendation & Impact | Status |
| :--- | :--- | :--- | :--- | :---: |
| **POQ-01** | Staff Salary Period Attribution | When staff salary is disbursed in a subsequent month (e.g., February salary paid on March 5), should the annual and monthly financial summary reports attribute this expense to **March** (cash disbursement date) or **February** (work period earned)? | **Recommendation:** The core financial ledger strictly reflects the cash transaction date (March 5) for cash flow accuracy, while retaining the optional `salaryMonth: "2026-02"` attribute in the record. The reporting UI will offer both "Cash Basis" (default) and "Accrual / Work Period Basis" views. This is non-blocking for schema design. | **AWAITING OWNER INPUT** |

---

## 6. Summary & Sign-Off Readiness

With the completion of the Phase 01G contradiction resolution:
1. **Authoritative Alignment:** All 25 owner decisions are confirmed, locked, and fully protected across all 10 architectural documents.
2. **Clear Technical Prerequisites:** Engineering dependencies (Firebase Blaze upgrade, Secret Manager token storage) are explicitly documented and cataloged under Tier 2 recommendations.
3. **Formal Phase 01G Decision Gate Ready:** The complete documentation suite is 100% internally consistent, cross-verified, and ready for owner review via the **Phase 01G Owner Decision Gate** before Phase 02 implementation.


