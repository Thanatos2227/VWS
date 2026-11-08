# Vetri Water Solutions (VWS) — Phase 01G Owner Decision Gate
**Document ID:** VWS-DOC-021  
**Project Phase:** Phase 01G — Final Contradiction Resolution & Owner Decision Gate  
**Status:** Authoritative Decision Gate — Awaiting Owner Decisions  
**Author:** Senior Software Architect, Firebase Security Engineer, Database Architect, Financial Systems Engineer, Google Drive Integration Engineer, and Independent QA Auditor  
**Date:** November 2026 (Phase 01G Final Contradiction Resolution)  

---

## 1. Owner Decision Gate Notice & Operating Instructions

**Dear Business Owner,**

The complete technical and functional blueprint for your business management system, **Vetri Water Solutions (VWS)**, has undergone a comprehensive independent integrity review. All internal contradictions have been resolved, and the specifications across all twenty-one documents in `docs/` are synchronized.

### Critical Operating Boundary:
> [!IMPORTANT]
> **NO PHASE 02 AUTHORIZATION IS GRANTED BY THIS DOCUMENT.**
> 
> This document is strictly an **Owner Decision Gate**. It presents each engineering recommendation individually for your review. No application code will be written, no dependencies will be installed, and no cloud resources will be deployed until you have reviewed these items and provided separate, explicit written authorization to begin Phase 02 implementation.

---

## 2. Status of Previously Confirmed Owner Decisions (DEC-01 through DEC-25)

The twenty-five business decisions you previously confirmed are **LOCKED and FULLY PROTECTED**. They form the unshakeable foundation of the architecture:

| Decision ID | Domain | Your Confirmed Requirement | Status |
| :--- | :--- | :--- | :---: |
| **DEC-01** | Application Scope | Private Single-Owner Business Management Application. No customer or staff portals. | **LOCKED** |
| **DEC-02** | Authentication | Google Sign-In Only, restricted strictly to your authorized Gmail address. | **LOCKED** |
| **DEC-03** | Platforms | Dual-Platform: Web Application (Responsive SPA) + Installable Android APK. | **LOCKED** |
| **DEC-04** | Master Data Authority | Cloud Firestore is the Single Source of Truth. Excel and JSON are backup artifacts. | **LOCKED** |
| **DEC-05** | Year Partitioning | Calendar Year (Jan 1 to Dec 31). Annual Excel sheets and database partitions. | **LOCKED** |
| **DEC-06** | Multiple Tanks | One Combined Bill for multiple tanks cleaned at a single customer site visit. | **LOCKED** |
| **DEC-07** | Payment Terms | Immediate Payment; Cash or Online (mandatory selection; no defaulting to cash). | **LOCKED** |
| **DEC-08** | Tank Measurements | Dimensions in Feet ($L \times B \times H$ ft); water capacity in Litres (L). | **LOCKED** |
| **DEC-09** | Bill Numbers | Entered manually from your physical paper bill book. The system never auto-generates them. | **LOCKED** |
| **DEC-10** | Location Capture | Dual Mode: Manually pasted Google Maps URL or optional one-tap GPS coordinates. | **LOCKED** |
| **DEC-11** | Personal Expenses | Combined household/personal expense ledger across the 5 confirmed categories. | **LOCKED** |
| **DEC-12** | Record Deletion | Soft-Deletion Only (`isDeleted: true`) with a 30-day Recycle Bin and one-click restore. | **LOCKED** |
| **DEC-13** | Staff Attendance | Worker Count + One Combined Attendance Expense ($\text{Wages} + \text{Tea} + \text{Refreshments} + \text{Bata}$). | **LOCKED** |
| **DEC-14** | Staff Salary | Monthly salary disbursements (individual staff entries or combined monthly lump-sum). | **LOCKED** |
| **DEC-15** | Dual Backups | Stream 1: Excel Workbook in Drive root + Stream 2: Complete Daily Database JSON dumps. | **LOCKED** |
| **DEC-16** | JSON Retention | Indefinite Daily Retention of all daily database JSON backups in Google Drive (zero pruning). | **LOCKED** |
| **DEC-17** | Cryptographic Checksum| SHA-256 computed over raw backup bytes, stored in external companion `.sha256` manifest. | **LOCKED** |
| **DEC-18** | Drive Reauthorization | On-Demand Reauthorization prompt. Expired Drive access never blocks saving to database. | **LOCKED** |
| **DEC-19** | Scheduled Backup Time | Daily autonomous execution at 23:00 IST (17:30 UTC), 365 days a year. | **LOCKED** |
| **DEC-20** | Correction Reason | Optional explanation (PD-01). Leaving reason blank never blocks saving a correction. | **LOCKED** |
| **DEC-21** | Correction Timeline | Chronological version history ($v1 \to v2 \to v3$) showing what changed, when, and by whom (PD-02). | **LOCKED** |
| **DEC-22** | Default View | Latest Active Records Only (PD-03). Superseded predecessor records are hidden by default. | **LOCKED** |
| **DEC-23** | History Access | Dedicated modal pop-up accessible by clicking on the version badge (PD-04). | **LOCKED** |
| **DEC-24** | Excel Row Styling | Superseded rows formatted with soft gray fill (`#E2E8F0`) and strikethrough (PD-05). | **LOCKED** |
| **DEC-25** | Tank Selection UI | Strict OHT / UG selection in initial forms with zero free-text clutter (PD-06). | **LOCKED** |

---

## 3. Individual Architecture Recommendations Register (REC-01 through REC-11)

Please review each technical proposal below and select your decision. Each item is independent:

```
+-------------------------------------------------------------------------------------------------------------+
| REC-01: FIREBASE BLAZE PLAN UPGRADE (PAY-AS-YOU-GO)                                                         |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     Upgrade the Firebase project from Spark (Free) to Blaze (Pay-As-You-Go).                     |
| Why Needed:   Google requires Blaze to deploy Cloud Functions (2nd Gen), Cloud Scheduler, and Secret       |
|               Manager. Without Blaze, automated 23:00 daily cloud backups (DEC-19) cannot execute.           |
| Cost Reality: Compute invocations and data egress fall well within Google's monthly free tier allowances.   |
|               Minor micro-charges may occur for Secret Manager ($0.06/month) and build container storage.   |
| Risk:         Requires a billing credit card. Mitigated by REC-02 (Budget Alert).                           |
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------+
| REC-02: GOOGLE CLOUD MONTHLY BUDGET ALERT OF ₹500/MONTH                                                     |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     Configure a Google Cloud Budget Alert of ₹500/month with notifications at 50%, 80%, and 100%.|
| Why Needed:   Provides transparent, automated oversight to detect any unexpected cloud billing surges.      |
| Important:    A budget alert sends warning emails; it is NOT a hard spending cap that halts cloud services. |
| Cost Reality: Free feature of Google Cloud Console.                                                         |
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------+
| REC-03: GOOGLE CLOUD SECRET MANAGER TOKEN STORAGE                                                           |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     Store the owner's Google Drive OAuth refresh token securely in Google Cloud Secret Manager.   |
| Why Needed:   Consumer @gmail.com accounts cannot use service account delegation. Storing the token in      |
|               Secret Manager allows 23:00 backups to run unattended without storing secrets on your phone.  |
| Cost Reality: Secret Manager version storage costs approximately ₹5 ($0.06) per month.                     |
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------+
| REC-04: INTEGER PAISE INTERNAL FINANCIAL REPRESENTATION                                                     |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     Store all currency amounts internally as integer paise (₹1 = 100 paise) and convert to rupees |
|               only for on-screen display and Excel generation.                                              |
| Why Needed:   Eliminates computer floating-point decimal rounding errors (e.g. ₹0.10 + ₹0.20 = ₹0.300000004)|
|               in financial calculations. Safe integer limits support calculations up to ₹90,071 crore.      |
| Note:         If rejected, an alternative string/decimal architecture must be designed before coding.       |
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------+
| REC-05: AUTHORITATIVE MASTER POINTER STAGING FOR EXCEL WORKBOOKS                                            |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     Upload Excel workbooks first to a versioned file in `Backups/`, commit the master pointer in  |
|               Firestore, and copy to the root `Vetri_Water_Solutions.xlsx` as a convenience file.           |
| Why Needed:   Prevents catastrophic file corruption if mobile network drops in the middle of uploading the  |
|               live master Excel spreadsheet.                                                                |
| Cost Reality: Zero additional cloud cost. Uses existing Google Drive storage.                               |
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------+
| REC-06: OFFLINE TRANSACTION DRAFT QUEUE                                                                     |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     When offline in field dead-zones, stage new site entries and edits locally in client storage  |
|               (IndexedDB on Web, SQLite on Android) as drafts (`syncStatus: 'PENDING_COMMIT'`) and execute  |
|               server transactions upon reconnecting.                                                        |
| Why Needed:   Firestore multi-document transactions (sequence numbers, version swaps) fail offline. Draft   |
|               staging cleanly separates uncommitted local drafts from authoritative Cloud Firestore records.|
|               Records are stored in Cloud Firestore strictly upon successful server-side commit.            |
| Note:         If network drops mid-commit (uncertain commit), the app queries the server to reconcile state  |
|               before allowing new edits, preventing duplicate records. Local durability is subject to cache.|
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------+
| REC-07: OPERATIONAL KEYSTROKE WARNING CEILINGS                                                              |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     Display an informational confirmation prompt if Bill Value > ₹10,00,000, Expense > ₹5,00,000,  |
|               or Daily Grand Total > ₹25,00,000.                                                            |
| Why Needed:   Catches accidental typing errors (such as typing an extra zero). These are helpful warnings,   |
|               not restrictions; you can confirm and proceed if a commercial job is genuinely higher.        |
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------+
| REC-08: DECIMAL SI STORAGE PROJECTIONS & DRIVE QUOTA ALERTS                                                 |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     Monitor Google Drive shared 15 GB quota via API and alert at 80% (12 GB) and 90% (13.5 GB).   |
| Why Needed:   Ensures months of advance notice before storage runs out, supporting indefinite backup        |
|               retention without requiring automatic pruning or deletion.                                    |
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------+
| REC-09: CANONICAL TASK QUEUE SCHEMA (`system_tasks/{taskId}`)                                               |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     Unify all background exports, uploads, and backups under `system_tasks/{taskId}` using strictly|
|               deterministic task IDs (e.g. `TASK_SCHEDULED_DAILY_BACKUP_{YYYY-MM-DD}` or                     |
|               `TASK_CLIENT_MANUAL_EXPORT_{deviceId}_{calendarYear}_{payloadSha256}`) with a 7-state          |
|               lifecycle: PENDING -> CLAIMED -> RUNNING -> SUCCEEDED / RETRY_WAIT /                          |
|               FAILED_PERMANENT / WAITING_REAUTH.                                                            |
| Why Needed:   Eliminates fragmented queues, guarantees atomic duplicate prevention via Firestore unique     |
|               document IDs, provides at-least-once task delivery with idempotent deduplication, and enables  |
|               automatic exponential retries preserving original task identity. Retries retain stable         |
|               identity, while intentional new exports advance client export sequences to remain distinct.    |
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------+
| REC-10: OFFLINE CONFLICT REVIEW MODAL (SCR-11)                                                              |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     If the same business day is edited on phone and laptop while disconnected, or if an uncertain  |
|               commit encounters a newer server version (stale base), display both versions side-by-side upon |
|               reconnection with visual differences highlighted.                                             |
| Why Needed:   Prevents silent overwrites during concurrent multi-device operations or uncertain network      |
|               commits by presenting conflicting versions side-by-side for transparent, owner-directed        |
|               resolution.                                                                                   |
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------------------------------------------+
| REC-11: SERVER-SIDE DRIVE PROVISIONING CEREMONY                                                             |
+-------------------------------------------------------------------------------------------------------------+
| Proposal:     Connect Google Drive via an authenticated Cloud Function (`provisionBackendDriveCredentials`) |
|               that exchanges authorization codes and writes directly to Google Cloud Secret Manager.        |
| Why Needed:   Prevents permanent access tokens from ever touching your phone's browser cache or local       |
|               storage, adhering to zero-trust security standards.                                           |
|                                                                                                             |
| [ ] Approve        [ ] Reject        [ ] Request Changes        [ ] Awaiting Decision                       |
+-------------------------------------------------------------------------------------------------------------+
```

---

## 4. Pending Business Clarification (POQ-01)

Please review this reporting preference regarding staff salary disbursements:

```
+-------------------------------------------------------------------------------------------------------------+
| QUESTION POQ-01: STAFF SALARY REPORTING ATTRIBUTION                                                         |
+-------------------------------------------------------------------------------------------------------------+
| When you disburse monthly staff salary in a later month (for example: paying February salary on March 5th): |
|                                                                                                             |
| In your annual financial summaries and monthly expense reports, how do you prefer to view this expense?     |
|                                                                                                             |
| [ ] Option A (Cash Flow Basis — Recommended):                                                               |
|     Count the expense on the date cash was actually paid (March 5th) for exact cash-flow balance. The app    |
|     stores the work period (February) and allows you to filter reports by work month whenever needed.       |
|                                                                                                             |
| [ ] Option B (Work Month Basis):                                                                            |
|     Count the expense strictly in February (the month work was performed), regardless of payment date.      |
|                                                                                                             |
| [ ] Awaiting Decision / Need Further Discussion                                                             |
+-------------------------------------------------------------------------------------------------------------+
```

---

## 5. Owner Decision Submission Block

Please record your decisions below:

```
+-------------------------------------------------------------------------------------------------------------+
|                                         OWNER DECISION RECORD                                               |
+-------------------------------------------------------------------------------------------------------------+
|                                                                                                             |
| Owner Name:             __________________________________________________                                  |
|                                                                                                             |
| Owner Signature:         __________________________________________________                                  |
|                                                                                                             |
| Date of Decision:       __________________________________________________                                  |
|                                                                                                             |
| Selected Options:                                                                                           |
|   REC-01 (Blaze Plan):    [ Approve / Reject / Request Changes / Awaiting ]                                 |
|   REC-02 (Budget Alert):  [ Approve / Reject / Request Changes / Awaiting ]                                 |
|   REC-03 (Secret Mgr):    [ Approve / Reject / Request Changes / Awaiting ]                                 |
|   REC-04 (Integer Paise): [ Approve / Reject / Request Changes / Awaiting ]                                 |
|   REC-05 (Pointer Stage): [ Approve / Reject / Request Changes / Awaiting ]                                 |
|   REC-06 (Offline Draft): [ Approve / Reject / Request Changes / Awaiting ]                                 |
|   REC-07 (Ceiling Warn):  [ Approve / Reject / Request Changes / Awaiting ]                                 |
|   REC-08 (Quota Alerts):  [ Approve / Reject / Request Changes / Awaiting ]                                 |
|   REC-09 (Task Queue):    [ Approve / Reject / Request Changes / Awaiting ]                                 |
|   REC-10 (Conflict Modal):[ Approve / Reject / Request Changes / Awaiting ]                                 |
|   REC-11 (Server Prov):   [ Approve / Reject / Request Changes / Awaiting ]                                 |
|                                                                                                             |
|   POQ-01 (Salary Attr):   [ Option A (Cash Date) / Option B (Work Month) / Awaiting ]                       |
|                                                                                                             |
| Note: A separate, formal Phase 02 Implementation Authorization will be issued once decisions are logged.    |
+-------------------------------------------------------------------------------------------------------------+
```

