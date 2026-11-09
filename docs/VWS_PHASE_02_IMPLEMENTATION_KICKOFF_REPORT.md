# Vetri Water Solutions (VWS) — Phase 02 Implementation Kickoff Report
**Document ID:** VWS-DOC-022  
**Project Phase:** Phase 02 — Implementation & Engineering Construction  
**Status:** Approved & Active Implementation Baseline  
**Author:** Lead Software Architect, Firebase Security Engineer, Core Full-Stack Engineer  
**Date:** November 2026 (Phase 02 Kickoff)  
**Authorization Reference:** Explicit Owner Authorization (Phase 01G Frozen & Locked)

---

## 1. Phase 02 Authorization Acknowledgement

The business owner of **Vetri Water Solutions** has formally and explicitly authorized the commencement of **Phase 02 (Implementation & Engineering Construction)**. 

### Operational Mandate:
1. **Frozen Architectural Baseline:** The comprehensive documentation suite produced during Phase 01 (`VWS-DOC-001` through `VWS-DOC-021`) constitutes the single authoritative, non-negotiable architectural baseline.
2. **Preservation of Material:** All existing documentation, schemas, security matrices, and historical phase reports are permanently preserved in `docs/` and must not be deleted or overwritten.
3. **Controlled, Test-Driven Execution:** Development proceeds in small, verifiable stages, executing relevant unit tests after each increment and verifying behavioral correctness before advancing.
4. **No Unauthorized Deployments:** Production infrastructure, real Google Cloud billing modifications, and live financial data connections remain strictly gated behind explicit owner authorization.

---

## 2. Pre-Implementation Audit & Environment Findings

A pre-implementation audit was conducted across the workspace `E:\APEX\VETRI_WATER_SOLUTIONS` prior to making any workspace modifications:

| Audit Parameter | Observed State | Architectural Compliance |
| :--- | :--- | :---: |
| **Workspace Directory** | `E:\APEX\VETRI_WATER_SOLUTIONS` | **PASS** — Target root directory verified |
| **Documentation Suite** | Exactly 21 markdown documents in `docs/` (`DOC-001` through `DOC-021`) | **PASS** — Complete master inventory verified |
| **Accidental Source Code** | Zero application source code files (`.ts`, `.tsx`, `.js`, `.jsx`, `.html`) | **PASS** — Pristine pre-code state confirmed |
| **Package Managers / Dependencies** | Zero `node_modules`, zero `package.json`, zero lockfiles | **PASS** — Clean slate confirmed |
| **Git Repository** | Not initialized (no `.git` directory) | **ACTION REQUIRED** — Initializing in Task 1.1 |
| **Node.js Runtime** | Node.js `v24.14.0` (Active on Windows Host) | **PASS** — Supported runtime (Functions target: Node.js 22 LTS) |
| **Package Manager Tooling** | `npm` `11.9.0` available | **PASS** — Standard npm toolchain available |
| **Version Control Tooling** | `git` `2.55.0.windows.2` available | **PASS** — Standard Git CLI available |

---

## 3. Approved Implementation Scope

In accordance with owner decisions `DEC-01` through `DEC-25`, the implementation scope comprises:

1. **Private Single-Owner Architecture (`DEC-01`, `DEC-02`):**
   * Single authorized user authentication via Google OAuth 2.0 restricted strictly to `vetriwatersolutions@gmail.com`.
   * Zero public, customer-facing, or staff-facing portals.
2. **Cross-Platform Responsive Client (`DEC-03`):**
   * Single codebase built with **React 18 + TypeScript + Vite**.
   * Responsive layout optimized for desktop web browsing and mobile field operations.
   * Packaged as an installable Android APK via **Capacitor 6.x**.
3. **Authoritative Cloud Database (`DEC-04`):**
   * **Cloud Firestore** in `asia-south1` (Mumbai) serves as the single source of truth for all business entities.
   * Direct client SDK write access strictly prohibited on business collections (`sites`, `accounts_daily`, `system_counters`, `system_locks`, `system_state`, `backups_metadata`, `committed_operations`).
4. **Trusted Serverless Backend (`DEC-19`):**
   * **Google Cloud Functions (2nd Gen)** running on Node.js 22 LTS with the **Firebase Admin SDK**.
   * Executes atomic multi-document transactions with the 8 mandatory atomic commit invariants.
   * Dedicated service account (`vws-backup-worker@{project}.iam.gserviceaccount.com`).
5. **Non-Destructive Correction History (`DEC-20`–`DEC-24`):**
   * All edits append immutable version documents ($v1 \to v2 \to v3$).
   * Soft-deletion only (`isDeleted: true`) with a 30-day Recycle Bin.
   * Default view displays strictly `isLatestValidVersion == true` records.
6. **Dual Backup Streams & Excel Export (`DEC-15`–`DEC-17`, `DOC-007` §6.4):**
   * **Type 1 Excel Backup:** Formatted `.xlsx` workbook generated via `ExcelJS` containing 15 visible columns + hidden column P (`Record Status`), conditional gray fill/strikethrough styling (`#E2E8F0`), and dynamic `=SUMIF()` formulas containing pre-calculated `result` values.
   * **Type 2 Database JSON Snapshots:** Complete canonical UTF-8 JSON collections serialized daily with external `.sha256` checksum manifests and retained indefinitely in Google Drive.
7. **Offline Durability & Conflict Handling (`DEC-03`, `DEC-18`):**
   * Offline drafting staged in local storage (IndexedDB on Web, SQLite on Android) under `syncStatus: 'PENDING_COMMIT'`.
   * Monotonic base revision checks prevent silent overwrites; conflicts surface via SCR-11 review modal.

---

## 4. Pending-Decision Dependency Matrix

In strict adherence to project instructions, all pending recommendations and clarifications remain unapproved and must not be silently selected. The following matrix governs implementation behavior:

| Item ID | Pending Item Title | Implementation Dependency Analysis & Handling Strategy | Implementation Status |
| :--- | :--- | :--- | :---: |
| **REC-01** | Firebase Blaze Plan Upgrade | Required strictly for live Cloud deployment of Cloud Functions & Cloud Scheduler. **Local implementation and testing via Firebase Local Emulator Suite do NOT depend on Blaze.** Development proceeds unblocked. | **UNBLOCKED IN EMULATOR** (Deploy Gated) |
| **REC-02** | Google Cloud ₹500 Budget Alert | Pertains to Google Cloud Billing console configuration. Does not alter code structure. | **GATED TO CLOUD SETUP** |
| **REC-03** | Secret Manager Token Storage | Secret resource `vws-drive-backend-refresh-token`. Backend retrieval code encapsulates credential access via environment/Secret Manager adapter. | **UNBLOCKED IN CODE** (Cloud Provision Gated) |
| **REC-04** | Integer Paise Financial Model | **CRITICAL ARCHITECTURAL ITEM.**<br>• If approved: amounts stored as integer paise (`amountPaise: 15050`).<br>• If rejected: amounts stored as float rupees (`amount: 150.50`).<br>**Encapsulation Strategy:** Implement a modular financial adapter (`src/utils/money.ts`). UI forms input/display standard rupees (`150.50`) per DEC-07. Data layer uses an explicit serialization adapter so toggling integer paise vs float storage requires changing a single configuration flag without rewriting forms or calculations. | **ENCAPSULATED VIA ADAPTER** (Pending Owner Sign-Off) |
| **REC-05** | Master Pointer Staging in Backups/ | Export pipeline stages workbook in `Backups/` before updating `system_state/master_workbook_pointer`. | **STANDARD IMPLEMENTATION** |
| **REC-06** | Offline Transaction Drafts Queue | Local storage drafts use `syncStatus: 'PENDING_COMMIT'`. Fully unblocked. | **UNBLOCKED** |
| **REC-07** | Operational Validation Ceilings | Soft UI confirmation prompts when values exceed thresholds (Bill > ₹10L, Expense > ₹5L). Forms warn without hard-blocking valid jobs. | **UNBLOCKED** |
| **REC-08** | SI Storage & Drive Quota Alerts | Telemetry monitoring logic. Does not block core feature entry. | **UNBLOCKED** |
| **REC-09** | Canonical Task Queue (`system_tasks`) | Task queue interface and state machine (`PENDING`, `CLAIMED`, `RUNNING`, etc.). Fully unblocked. | **UNBLOCKED** |
| **REC-10** | Offline Conflict Review Modal (SCR-11) | UI modal presenting side-by-side local vs server diffs on concurrency collision. Fully unblocked. | **UNBLOCKED** |
| **REC-11** | Authenticated Drive Provisioning | HTTPS callable Cloud Function `provisionBackendDriveCredentials` exchanging auth code. Fully unblocked. | **UNBLOCKED** |
| **POQ-01** | Staff Salary Month Attribution | Salary disbursement date (cash date) vs work month attribution. Schema retains `date` (cash date, default) and optional `salaryMonth` (`2026-02`). Financial reports default to Cash Basis with optional work-month view. Neither data entry nor database schema is blocked. | **DUAL-ATTRIBUTE MODEL** (Awaiting Owner Input) |

---

## 5. Ordered Implementation Milestones

To maintain rigorous quality, implementation is structured into 10 sequential, verifiable milestones:

```
+---------------------------------------------------------------------------------------------------+
|                                 PHASE 02 IMPLEMENTATION ROADMAP                                   |
+---------------------------------------------------------------------------------------------------+
| Milestone 01: Project Workspace, Tooling & Environment Baseline (Git, Vite, React, TypeScript)    |
| Milestone 02: Declarative Security Rules, Build Script & Rules Emulator Unit Test Suite (VER-10)  |
| Milestone 03: Core Domain Models, Financial Adapter & Pure Business Calculation Engine            |
| Milestone 04: Serverless Backend Engine (Cloud Functions 2nd Gen, Admin SDK, Atomic Invariants)   |
| Milestone 05: Client Application Shell, Authentication & Owner Identity Guard (SCR-01, SCR-05)    |
| Milestone 06: Water Solutions Site Management & Non-Destructive Versioning (SCR-02, 03, 04, 08)   |
| Milestone 07: Daily Accounts, Cash Ledger & Expense Accounting (SCR-06, SCR-07, SCR-09)           |
| Milestone 08: Offline Durability Engine, Local Cache & Conflict Resolution Modal (SCR-10, SCR-11) |
| Milestone 09: ExcelJS Export Engine & Google Drive Dual Backup Stream (VER-05 Parity)             |
| Milestone 10: Capacitor Android Wrapper, Hardware Keystore Storage & Production APK Packaging    |
+---------------------------------------------------------------------------------------------------+
```

---

## 6. Testing and Security Validation Strategy

1. **Unit Testing (Vitest):**
   * 100% coverage on financial calculations (tank volume formula, bill totals, discount subtraction, cash reconciliation).
   * Edge-case testing for IEEE 754 precision, integer paise adapter boundaries, and zero-value handling.
   * Deterministic task ID and idempotency key derivation formatting tests.
2. **Security Rules Unit Testing (`VER-10`):**
   * Automated test suite executed against `@firebase/rules-unit-testing` and the Firebase Local Emulator.
   * Validates:
     - Owner read ALLOW on all collections.
     - Direct client write DENY on business records (`sites`, `accounts_daily`, `committed_operations`, `system_locks`, `system_state`, `backups_metadata`).
     - Allowed-field map key validation on `system_tasks/{taskId}`.
     - Complete default-deny for unauthenticated or non-owner callers.
3. **Transactional Concurrency Invariant Testing:**
   * Automated simulation of competing worker leases, stale fence tokens, and optimistic concurrency collisions on `committed_operations`.

---

## 7. Immediate First Implementation Task

* **Task 1.1:** Initialize the local Git repository, configure `.gitignore` (protecting environment secrets, build outputs, and IDE configs while preserving `docs/`), initialize the root `package.json` with React 18, TypeScript, Vite, Tailwind CSS, and testing libraries, set up `tsconfig.json`, and establish the base directory skeleton.

---

**PHASE 02 STATUS: AUTHORIZED & ACTIVATED. PROCEEDING TO TASK 1.1.**

