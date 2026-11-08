# Vetri Water Solutions (VWS) — Phase 01F Owner Approval Register
**Document ID:** VWS-DOC-019  
**Project Phase:** Phase 01F — Final Architecture Remediation & Cross-Document Integrity Audit  
**Status:** Authoritative Approval Register — Ready for Owner Review & Formal Sign-Off  
**Author:** Senior Software Architect, Database Architect, Security Engineer, QA Architect & Business Analyst  
**Date:** November 2026 (Phase 01F Final Architecture Remediation)  

---

## 1. Executive Introduction & Sign-Off Instructions

**Dear Business Owner,**

The technical and functional architectural blueprint for your application, **Vetri Water Solutions (VWS)**, is complete, cross-verified, and frozen across eighteen comprehensive specification documents in `docs/`.

To ensure total transparency, financial safety, and alignment with your business vision, this document organizes all architectural elements into four unambiguous categories:
1. **Tier 1: Your Confirmed Business Decisions (DEC-01 through DEC-25):** The 25 decisions you have already confirmed. They are locked and will not be altered.
2. **Tier 2: Technical Recommendations Awaiting Your Sign-Off (REC-01 through REC-11):** Engineering solutions developed to guarantee security, 99.9% reliability, zero-loss offline field operation, and cost control.
3. **Tier 3: Implementation-Time Verifications (VER-01 through VER-08):** Specific tests that will be executed during code development (Phase 02) to verify device compatibility and performance.
4. **Tier 4: Business Clarification Request (POQ-01):** One minor question regarding how you wish to view staff salary expenses in annual reports.

> [!IMPORTANT]
> **HOW TO APPROVE:**
> Please review the tables below. You can approve the recommendations as proposed or note any adjustments. Once signed off, Phase 02 (application development) may formally begin. Until your written sign-off is provided, all development remains completely stopped.

---

## 2. Tier 1: Previously Confirmed Owner Decisions (DEC-01 through DEC-25)

The following twenty-five decisions represent your confirmed business requirements. All are locked into the system blueprint:

| Decision ID | Business Domain | Your Confirmed Requirement | Status |
| :--- | :--- | :--- | :---: |
| **DEC-01** | Application Scope | **Private Owner-Only Management Application.** Dedicated solely to Vetri Water Solutions. No customer or staff portals. | **LOCKED** |
| **DEC-02** | Authentication | **Google Sign-In Only.** Restricted strictly to your authorized Gmail address across login, app routing, and database rules. | **LOCKED** |
| **DEC-03** | Platforms Supported | **Dual-Platform Access.** Responsive Web Application (desktop/laptop/phone) + Installable Android Application (APK). | **LOCKED** |
| **DEC-04** | Master Data Authority | **Cloud Firestore is Single Source of Truth.** Database holds master data. Excel workbooks and JSON backups are export copies. | **LOCKED** |
| **DEC-05** | Year Partitioning | **Calendar Year (Jan 1 to Dec 31).** No split financial years. Data partitioned into annual Excel sheets and database queries. | **LOCKED** |
| **DEC-06** | Multiple Tanks Billing | **One Combined Bill.** Multiple tanks cleaned at the same customer site are billed together under one combined bill amount. | **LOCKED** |
| **DEC-07** | Payment Terms | **Immediate Payment; Cash or Online.** Mandatory explicit selection at time of entry (no default to cash). No pending credit ledgers. | **LOCKED** |
| **DEC-08** | Tank Measurement Format | Tank dimensions recorded in **Feet** ($L \times B \times H$ ft); water capacity recorded in **Litres (L)**. | **LOCKED** |
| **DEC-09** | Physical Bill Number | Entered manually from your **physical paper bill book**. The app will never auto-generate or alter your bill book numbers. | **LOCKED** |
| **DEC-10** | Location Capture | **Dual Mode:** Paste Google Maps URL manually or capture optional GPS location with one click. GPS is strictly optional. | **LOCKED** |
| **DEC-11** | Personal Expense Ledger | Logged as **one combined household/personal expense stream** across the 5 confirmed categories. | **LOCKED** |
| **DEC-12** | Record Deletion | **Soft Deletion (`isDeleted: true`).** Deleted items move to a **30-day Recycle Bin** with one-click restoration before permanent purge. | **LOCKED** |
| **DEC-13** | Staff Attendance | **Worker Count + One Combined Expense Amount.** Formula: $\text{Daily Wages} + \text{Tea} + \text{Refreshments} + \text{Bata}$. | **LOCKED** |
| **DEC-14** | Staff Salary | Reserved for monthly salary disbursements. Supports **both individual staff and combined monthly entries**. Daily wages excluded. | **LOCKED** |
| **DEC-15** | Dual Backup Streams | **Stream 1: Formatted Excel Workbook** in Google Drive + **Stream 2: Complete Daily Database JSON Snapshots**. | **LOCKED** |
| **DEC-16** | JSON Backup Retention | **Indefinite Daily Retention.** Retain all daily database JSON backups in Google Drive indefinitely without automatic deletion. | **LOCKED** |
| **DEC-17** | Cryptographic Verification | **SHA-256 Checksum computed over raw backup bytes** and saved in external manifest file to guarantee 100% data integrity. | **LOCKED** |
| **DEC-18** | Drive Reauthorization | **On-Demand Reauthorization.** When Drive access expires, prompt for reauthorization. Never block saving database records or using the app. | **LOCKED** |
| **DEC-19** | Autonomous Backup Time | **Daily at 23:00 IST.** Cloud Scheduler runs backups 365 days a year even if your phone or computer is turned off. | **LOCKED** |
| **DEC-20** | Correction Reason (PD-01) | **Optional.** You may enter a reason when correcting a record, but leaving it blank will never prevent saving. | **LOCKED** |
| **DEC-21** | Correction Timeline (PD-02) | **Chronological Version History.** Displays visual timeline ($v1 \to v2 \to v3$) showing what was changed, when, and by whom. | **LOCKED** |
| **DEC-22** | Default View (PD-03) | **Latest Active Records Only.** The main screen displays only active, current records. Outdated previous versions are hidden. | **LOCKED** |
| **DEC-23** | History Access (PD-04) | **Clickable Version Badge.** Click on any version badge (e.g. `v2 (Corrected)`) to view full past edit history in a pop-up window. | **LOCKED** |
| **DEC-24** | Excel Row Styling (PD-05) | **Gray Fill with Strikethrough.** In Excel, corrected older rows are grayed out with strikethrough; formulas sum active rows only. | **LOCKED** |
| **DEC-25** | Tank Selection UI (PD-06) | **Strict OHT / UG Selection.** The initial form presents quick-select buttons for `OHT` and `UG` with zero clutter. | **LOCKED** |

---

## 3. Tier 2: Architecture Recommendations Awaiting Owner Sign-Off (REC-01 through REC-11)

These technical solutions have been engineered to fulfill your requirements with maximum security, reliability, and cost-efficiency:

| Rec ID | Topic | Engineering Proposal | Why This Protects You / Cost Impact | Owner Action |
| :--- | :--- | :--- | :--- | :---: |
| **REC-01** | Firebase Blaze Plan | Upgrade Firebase from Spark (Free) to Blaze (Pay-As-You-Go). | Required for automated daily 23:00 backups and secure secret storage. Expected usage is well within Google's free monthly allowance. | **[ ] Approve** |
| **REC-02** | Google Cloud Budget Alert | Set a strict monthly spending alert of **₹500/month** in Google Cloud Console with alerts at 50%, 80%, and 100%. | Guarantees complete cost predictability and immediately warns of any unexpected charges. | **[ ] Approve** |
| **REC-03** | Secure Drive Password Storage | Store your Google Drive connection token inside **Google Cloud Secret Manager** with encryption. | Keeps your Drive connection permanently safe from phone theft or hacking while allowing 23:00 backups to run autonomously. | **[ ] Approve** |
| **REC-04** | Integer Paise Math | Store all money amounts internally as integer paise ($₹1 = 100\text{ paise}$) and convert to rupees on screen and Excel. | Eliminates computer decimal rounding errors (e.g. ₹0.10 + ₹0.20 becoming ₹0.300000004), guaranteeing 100% financial accuracy. | **[ ] Approve** |
| **REC-05** | Master Workbook Staging | Save Excel files to `Backups/` folder first, verify they are intact, then update the master file at Google Drive root. | Prevents file corruption if mobile internet disconnects in the middle of uploading your master Excel spreadsheet. | **[ ] Approve** |
| **REC-06** | Offline Data Staging | When internet is unavailable in the field, save records locally as drafts and synchronize automatically upon reconnection. | You can enter customer jobs and expenses anywhere, even in underground basements or rural areas with no mobile network. | **[ ] Approve** |
| **REC-07** | Keystroke Warning Limits | Display a confirmation prompt if Bill Value exceeds ₹10,00,000, Expense exceeds ₹5,00,000, or Daily Total exceeds ₹25,00,000. | Catches accidental typos (such as typing an extra zero). These are helpful warnings, not restrictions, and can be adjusted anytime. | **[ ] Approve** |
| **REC-08** | Storage Space Warnings | Check Google Drive space before uploads and display an alert if your Drive reaches 80% (12 GB) or 90% (13.5 GB) full. | Ensures you have months of advance notice before your 15 GB Google Drive runs out of space, without deleting historical backups. | **[ ] Approve** |
| **REC-09** | Unified Task Queue | Process all background uploads and backups through a central task queue (`system_tasks/{taskId}`) with automatic retries. | If mobile network drops mid-upload, the app automatically retries without duplicating records or losing your work. | **[ ] Approve** |
| **REC-10** | Sync Conflict Modal (SCR-11) | If the same business day is edited on phone and laptop while disconnected, show both versions side-by-side on reconnect. | Guarantees zero accidental data loss or silent overwriting if two devices are used offline simultaneously. | **[ ] Approve** |
| **REC-11** | Server-Side Drive Link | Connect Google Drive via a secure cloud function rather than storing permanent credentials on your phone. | Prevents access tokens from ever being exposed on your mobile device or web browser cache. | **[ ] Approve** |

---

## 4. Tier 3: Implementation-Time Verifications (VER-01 through VER-08)

During Phase 02 construction, the development team will empirically test and verify the following technical items:

| Verification ID | Technical Area | Empirical Test Procedure |
| :--- | :--- | :--- |
| **VER-01** | Android GPS Permissions | Verify GPS location capture on physical Android 14+ devices and confirm app works normally if GPS is refused. |
| **VER-02** | Backup Server Speed & Memory | Test automated backup performance with simulated 10,000-row Excel workbooks to ensure zero crashes. |
| **VER-03** | Android Hardware Encryption | Verify Android Keystore hardware security (StrongBox / TEE) encrypts local app preferences. |
| **VER-04** | Resumable Drive Uploads | Test uploading backups while turning airplane mode on and off to verify uploads resume seamlessly from where they stopped. |
| **VER-05** | Excel Compatibility Across Viewers | Open generated workbooks in Microsoft Excel 2016+, Microsoft 365, and Google Sheets to confirm fonts, colors, and formulas match. |
| **VER-06** | Offline Cache Longevity | Verify phone browser and Android app preserve offline drafts across app restarts and battery-saver modes. |
| **VER-07** | Secret Manager Response Time | Measure secure token retrieval time during 23:00 backup starts to ensure backups begin within 1.5 seconds. |
| **VER-08** | Multi-Device Conflict Testing | Simulate editing the same day on both phone and laptop offline, verifying the conflict review screen (SCR-11) appears correctly. |

---

## 5. Tier 4: Business Clarification Request (POQ-01)

Please indicate your preference for this non-blocking reporting item:

```
+-------------------------------------------------------------------------------------------------------------+
| QUESTION POQ-01: STAFF SALARY REPORTING ATTRIBUTION                                                         |
+-------------------------------------------------------------------------------------------------------------+
| When you pay monthly staff salary in a later month (for example: paying February salary on March 5th):      |
|                                                                                                             |
| In your annual financial summary and monthly expense reports, how do you prefer to view this expense?      |
|                                                                                                             |
| Option A (Recommended — Cash Flow Basis):                                                                   |
| Count the expense in MARCH (the actual date the cash was paid out). The app still remembers it was for     |
| February and lets you switch between "Cash Date" and "Work Month" views whenever you wish.                  |
|                                                                                                             |
| Option B (Work Month Basis Only):                                                                           |
| Count the expense strictly in FEBRUARY (the month the work was performed), regardless of payment date.      |
|                                                                                                             |
| [ ] Option A: Cash Flow Basis (Actual payout date, with optional work month filter) — RECOMMENDED           |
| [ ] Option B: Work Month Basis (Attribute strictly to earned work month)                                    |
+-------------------------------------------------------------------------------------------------------------+
```

---

## 6. Formal Owner Sign-Off & Phase 02 Authorization Block

Please review and confirm your authorization to commence Phase 02 (Application Implementation):

```
+-------------------------------------------------------------------------------------------------------------+
|                                    FORMAL OWNER SIGN-OFF & AUTHORIZATION                                    |
+-------------------------------------------------------------------------------------------------------------+
|                                                                                                             |
| [X] I have reviewed the Vetri Water Solutions Phase 01F Architecture Blueprint.                             |
|                                                                                                             |
| [ ] I APPROVE all 11 Architecture Recommendations (REC-01 through REC-11) as proposed.                     |
|                                                                                                             |
| [ ] I have selected my preference for POQ-01 (Staff Salary Attribution): Option [ A / B ].                  |
|                                                                                                             |
| [ ] I AUTHORIZE the engineering team to begin Phase 02: Application Development (React, Capacitor, Firebase)|
|                                                                                                             |
|                                                                                                             |
| Business Owner Name:  __________________________________________________                                    |
|                                                                                                             |
| Owner Signature:      __________________________________________________                                    |
|                                                                                                             |
| Date of Approval:     __________________________________________________                                    |
|                                                                                                             |
+-------------------------------------------------------------------------------------------------------------+
```

