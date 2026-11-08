# Vetri Water Solutions (VWS) — Excel Export Specification
**Document ID:** VWS-DOC-007  
**Project Phase:** Phase 01G — Final Contradiction Resolution & Owner Decision Gate  
**Status:** Authoritative Blueprint — Reconciled, Validated & Path-Aligned  
**Author:** Senior Software Architect, Database Architect, Security Engineer, QA Architect & Business Analyst  
**Date:** November 2026 (Phase 01G Final Contradiction Resolution)  

---

## 1. Master Workbook Overview & Distinct Artifact Role (Correction B)

* **Workbook File Name:** `Vetri_Water_Solutions.xlsx`
* **File Format:** Office Open XML (.xlsx) — CSV format is strictly prohibited.
* **Generating Library:** `ExcelJS` (Node / Browser JavaScript Engine)
* **Distinct Artifact Classification (Artifact 3):**
  * The Master Excel Workbook is strictly a **human-readable business reporting and spreadsheet inspection artifact**.
  * **Not for Database Restoration:** It is **lossy** by design (excludes deleted tombstone documents, internal UUIDs, and detailed non-destructive version predecessor chains) and must **never** be relied upon for catastrophic database disaster recovery. Disaster recovery is provided exclusively by **Artifact 1 (Managed Firestore Exports to GCS)** and **Artifact 2 (Complete Database Daily JSON Dumps in Google Drive)**.
* **Design Mandate:** The exported workbook must faithfully reproduce the visual layout, typographic hierarchy, cell borders, number formatting, and formula structure of the business owner's historical spreadsheets while enforcing rigorous data integrity.

---

## 2. Calendar-Year Worksheet Organization

The workbook is partitioned strictly **by Calendar Year** (`January 1` to `December 31`). Each active calendar year generates a pair of worksheets:
1. `[YEAR] - Site Details` (e.g. `2026 - Site Details`)
2. `[YEAR] - Accounts` (e.g. `2026 - Accounts`)

*Rule:* Monthly worksheets are strictly prohibited. Historical annual worksheets must be preserved across calendar years.

```
+---------------------------------------------------------------------------------------------+
|                                Vetri_Water_Solutions.xlsx                                   |
+--------------------------+--------------------+---------------------+-----------------------+
|  ...  | 2025 - Accounts  | 2026 - Site Details| 2026 - Accounts     | 2027 - Site Details   |
+--------------------------+--------------------+---------------------+-----------------------+
```

---

## 3. Site Details Worksheet Specification (`[YEAR] - Site Details`)

### 3.1 Column Blueprint & Styling

| **Col** | **Header Label** | **Width** | **Data Alignment** | **Data Type & Format** | **Confirmed Field Rules & Mapping** |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **A** | **S.No** | 8 | Center | Integer (`0`) | Monotonic sequential entry index |
| **B** | **Date** | 13 | Center | Date (`DD-MM-YYYY`) | Service execution date (`workDate`) |
| **C** | **Customer Name** | 25 | Left | Text (Title Case) | Full customer name |
| **D** | **Location** | 22 | Left | Text | Site address or locality |
| **E** | **Contact Number** | 16 | Center | Text (`@`) | Flexible phone string (10-digit mobile, +91, landline) |
| **F** | **Google Location** | 24 | Center | Hyperlink | Clickable Maps URL or coordinates pin |
| **G** | **Total Tanks** | 12 | Center | Integer (`0`) | Count of tanks cleaned at this site |
| **H** | **Tank Type** | 16 | Center | Text | `OHT` or `UG` (Alt+Enter for multi-tank; PD-06) |
| **I** | **Measurement** | 18 | Center | Text | Dimensions in Feet: $L \times B \times H$ (ft) |
| **J** | **Capacity** | 15 | Right | Text / Number | Volume in Litres ($L$) |
| **K** | **Bill Value** | 15 | Right | Currency (`[$₹-en-IN] #,##,##0.00`) | Combined gross billing ($\frac{\text{Paise}}{100}$) |
| **L** | **Discount** | 14 | Right | Currency (`[$₹-en-IN] #,##,##0.00`) | Discount granted ($\frac{\text{Paise}}{100}$) |
| **M** | **Final Value** | 16 | Right | Currency (`[$₹-en-IN] #,##,##0.00`) | Dynamic formula: `=K{row}-L{row}` |
| **N** | **Bill Number** | 16 | Center | Text | Manually entered from physical bill book |
| **O** | **Payment Mode** | 14 | Center | Text | Strictly `Cash` or `Online` (Explicit mandatory choice) |
| **P** | **Record Status** | 12 | Center | Text (`@`) | **Technical Audit Flag (Task H Reconciled):** Stored as `'ACTIVE'`, `'SUPERSEDED'`, or `'DELETED'`. Configured with `hidden: true` in ExcelJS to preserve clean 15-column visual layout while powering dynamic `=SUMIF()` formulas. |

### 3.2 Multi-Tank Representation within a Single Customer Bill Row
When a customer site contains multiple water tanks (e.g. 1 OHT + 1 UG), the site occupies **exactly one primary row** in the worksheet. Tank details are rendered cleanly using **Structured Multi-Line Cells (Alt+Enter)** within columns H, I, and J, with vertical alignment set to `Middle`:
* **Column H (Tank Type):** `OHT` \n `UG`
* **Column I (Measurement):** `10x8x6 ft` \n `12x10x6 ft`
* **Column J (Capacity):** `5,000 L` \n `10,000 L`

This preserves single-row billing integrity for financial formulas while fully documenting all physical assets cleaned.

### 3.3 Representation of Correction, Soft-Deleted & Restored Records in Excel (Task H Reconciled)
When records undergo lifecycle state changes in Cloud Firestore, the Excel generation engine represents them deterministically:
1. **Correction Records (Authoritative Decision PD-05):**
   * The correction record is appended as a distinct row preserving chronological entry sequence.
   * **Audit Reference:** Column N (Bill Number) displays: `1042 [Correction of S.No 14]`.
   * **Superseded Original Row Styling:**
     * Background fill: Soft gray (`#E2E8F0`, ARGB: `FFE2E8F0`).
     * Financial values (Columns K, L, M): Strikethrough typography (`strikethrough: true`) and muted gray text color (`#718096`).
     * Column P (Record Status): Value set to `"SUPERSEDED"`.
2. **Soft-Deleted Records Treatment:**
   * In standard business operational exports, soft-deleted records (`isDeleted: true`) are omitted by default to keep annual sheets lean.
   * If an administrative audit workbook is generated, soft-deleted rows are included with Column P set to `"DELETED"`, full row red/gray strikethrough styling, and zero contribution to totals.
3. **Restored Records Treatment:**
   * Restoring a record from the Recycle Bin sets `isDeleted: false`.
   * The row is rendered with Column P set to `"ACTIVE"`, standard black typography, white/zebra background, and its original `sequenceNumber` in Column A.
4. **Column P Visibility & Architecture Role:**
   * Column P is configured in `ExcelJS` as `hidden: true`.
   * This ensures that when the owner prints or views the sheet, columns A through O render cleanly without visual clutter.
   * Concurrently, Excel's formula parser evaluates Column P to drive conditional summary calculations.

### 3.4 Summary & Totals Row (Bottom of Worksheet)
Directly beneath the last customer record (Row $N$), a blank separator row is followed by the **TOTALS** row:
* **Cell A{N+2}:** Label: `"TOTALS"` (Bold, Center)
* **Cell G{N+2}:** Formula: `=SUMIF(P2:P{N}, "ACTIVE", G2:G{N})` (Total tanks cleaned for active sites)
* **Cell K{N+2}:** Formula: `=SUMIF(P2:P{N}, "ACTIVE", K2:K{N})` (Total active gross bill value)
* **Cell L{N+2}:** Formula: `=SUMIF(P2:P{N}, "ACTIVE", L2:L{N})` (Total active discounts given)
* **Cell M{N+2}:** Formula: `=SUMIF(P2:P{N}, "ACTIVE", M2:M{N})` (Total active net final revenue)
* **Cell N{N+2}:** Formula: `="Total Active Sites: " & COUNTIF(P2:P{N}, "ACTIVE")`
*(Formula Guarantee: Rows marked `"SUPERSEDED"` or `"DELETED"` in Column P are mathematically excluded by `=SUMIF()`, preventing duplicate financial summation).*

---

## 4. Accounts Worksheet Specification (`[YEAR] - Accounts`)

### 4.1 Side-by-Side Dual Ledger Architecture
The Accounts sheet implements the owner's signature layout: **Official Business Expenses on the left** and **Personal Expenses on the right**, anchored by daily date and grand total columns.

```
+-----------------------------------------------------------------------------------------------------------------------------+
| ROW 1: HEADER BANNER (VETRI WATER SOLUTIONS — ANNUAL ACCOUNTS & EXPENSES LEDGER - 2026)                                    |
+-------------------------------------------------------------+---+-------------------------------------------+---------------+
| ROW 2: [ OFFICIAL EXPENSES (LEFT SECTION) ]                 |   | [ PERSONAL EXPENSES (RIGHT SECTION) ]     | SUMMARY       |
+---+---------------------------------------------------------+---+-------------------------------------------+---------------+
|Col| Header Label                     | Width | Format       |Col| Header Label              | Width | Format|Col| Header    |
+---+----------------------------------+-------+--------------+---+---------------------------+-------+-------+---+-----------+
| A | Date                             | 13    | DD-MM-YYYY   | J | Transport                 | 14    | ₹ #,##0| P | Daily     |
| B | Refreshment                      | 14    | ₹ #,##0.00   | K | Refreshment               | 14    | ₹ #,##0|   | Grand     |
| C | Transport                        | 14    | ₹ #,##0.00   | L | Groceries / Veg / Milk    | 16    | ₹ #,##0|   | Total     |
| D | Spares / HO                      | 14    | ₹ #,##0.00   | M | Lunch / Dinner            | 14    | ₹ #,##0|   |           |
| E | Staff Attendance (Headcount)     | 12    | 0            | N | Other                     | 14    | ₹ #,##0|   | (₹ #,##0) |
| F | Staff Attendance Expense (Wages) | 15    | ₹ #,##0.00   | O | Daily Personal Total      | 16    | ₹ #,##0|   |           |
| G | Staff Salary (Monthly)           | 15    | ₹ #,##0.00   |   |                           |       |       |   |           |
| H | Daily Official Total             | 16    | ₹ #,##0.00   |   |                           |       |       |   |           |
| I | [ Spacer Column ]                | 4     | -            |   |                           |       |       |   |           |
+---+----------------------------------+-------+--------------+---+---------------------------+-------+-------+---+-----------+
```

### 4.2 Dynamic Daily Formulas
For each daily entry row $i$:
* **Daily Official Total (Col H):**
  `=SUM(B{i}:D{i}) + F{i} + G{i}`  
  *(Note: Col E is Staff Headcount and is excluded from currency addition. Col F is Staff Attendance Expense containing Wages + Tea/Bata. Col G is Staff Salary).*
* **Daily Personal Total (Col O):**
  `=SUM(J{i}:N{i})`
* **Daily Grand Total (Col P):**
  `=H{i} + O{i}`

### 4.3 Annual Summary & Totals Row (Bottom of Worksheet)
At the bottom of the active year entries (Row $N+2$):
* **Row Title:** `"ANNUAL GRAND TOTALS"`
* **Col B to D:** `=SUM(B3:B{N})` to `=SUM(D3:D{N})` (Official category totals)
* **Col E:** `=SUM(E3:E{N})` (Total annual staff mandays)
* **Col F & G:** `=SUM(F3:F{N})` and `=SUM(G3:G{N})` (Staff expense totals)
* **Col H (Annual Official Total):** `=SUM(H3:H{N})`
* **Col J to N:** `=SUM(J3:J{N})` to `=SUM(N3:N{N})` (Personal category totals)
* **Col O (Annual Personal Total):** `=SUM(O3:O{N})`
* **Col P (Overall Annual Grand Total):** `=H{N+2} + O{N+2}`

---

## 5. Visual Styling Palette & Typography Matrix

```
+-----------------------------------------------------------------------------------+
| ELEMENT                | BACKGROUND FILL    | TEXT COLOR       | BORDER STYLE     |
+------------------------+--------------------+------------------+------------------+
| Main Title Banner      | Navy Blue (#1B365D)| White (Bold, 14pt)| Medium Outline   |
| Official Section Header| Dark Slate (#2B4C7E)| White (Bold, 11pt)| Thin White Div   |
| Personal Section Header| Olive/Teal (#2E6B56)| White (Bold, 11pt)| Thin White Div   |
| Daily Grand Total Hdr  | Dark Bronze(#7C4A03)| White (Bold, 11pt)| Thin Outline     |
| Standard Data Cells    | None / White       | Off-Black (#1A1A)| Thin Gray (#D3D3)|
| Alternate Zebra Rows   | Soft Tint (#F8FAFC)| Off-Black (#1A1A)| Thin Gray (#D3D3)|
| Superseded Row (Audit) | Light Gray (#E2E8F0)| Gray Strikethrough| Thin Gray Dotted |
| Totals / Summary Row   | Light Gold (#FEF3C7)| Dark Navy (Bold) | Top Thin, Bottom |
|                        |                    |                  | Double (#1B365D) |
+-----------------------------------------------------------------------------------+
```

---

## 6. Formula Verification, Integrity Checks & Precision Analysis (Task K)

During the in-memory generation of `Vetri_Water_Solutions.xlsx`, the system executes automated sanity checks before writing bytes:
1. **Formula Syntax Validation:** Ensures all cell coordinates correspond to valid, non-negative row indices.
2. **Double-Entry Balance Verification:**
   * Verifies that $\sum \text{Final Values} \equiv \sum \text{Bill Values} - \sum \text{Discounts}$.
   * Verifies that $\text{Annual Grand Total} \equiv \text{Annual Official Total} + \text{Annual Personal Total}$.
3. **Number Precision & IEEE 754 Analysis (Task K):**
   * Microsoft Excel stores all numbers internally using IEEE 754 64-bit double-precision floating-point format, which provides **15 decimal digits of precision**.
   * In VWS, the operational financial ceilings (Architecture Recommendations) are:
     * Single Bill Value $\le ₹10,00,000$ ($100,000,000$ paise $\to 8$ digits).
     * Single Expense Entry $\le ₹5,00,000$ ($50,000,000$ paise $\to 8$ digits).
     * Daily Grand Total $\le ₹25,00,000$ ($250,000,000$ paise $\to 9$ digits).
     * Annual Business Turnover $\le ₹1,00,00,000$ ($1,000,000,000$ paise $\to 10$ digits).
   * Because 10 decimal digits is far below Excel's 15-digit threshold ($10^{15}$ paise = ₹10,000 crores), IEEE 754 floating-point truncation is avoided for VWS operational scales. Currency cells are formatted to standard 2 decimal places (`[$₹-en-IN] #,##,##0.00`). *Note:* Excel numeric cells operate on floating-point mechanics and are mathematically distinct from internal integer arithmetic.
4. **ExcelJS Formula Calculation & Pre-Calculated Results Requirement (VER-05 Implementation Standard):**
   * **Engine Limitation:** The `ExcelJS` library creates OpenXML spreadsheet files but **does not possess an internal formula calculation engine**. Assigning `{ formula: '...' }` writes only the formula definition string into the XML; it does not compute, evaluate, or populate the calculated cell value.
   * **Reliable Value Guarantee:** Spreadsheets opened in Google Sheets Web Viewer, mobile document viewers, or headless preview tools that do not automatically trigger full formula recalculation on file open can display empty, `#VALUE!`, or zero values if the cached formula result is absent.
   * **Authoritative Implementation Standard:**
     1. **Pre-Calculated Result Assignment:** Every formula cell (e.g. `=SUMIF(...)`, totals, balances) must provide both the formula definition and the authoritative pre-calculated value derived directly from verified Firestore records:
        ```typescript
        cell.value = {
          formula: 'SUMIF(P2:P100, "ACTIVE", K2:K100)',
          result: precalculatedActiveTotal // Computed directly from verified ledger data
        };
        ```
     2. **Verified Engine Recalculation:** Alternatively, during workbook compilation, the generator must execute a verified formula calculation pass (e.g. via a headless spreadsheet evaluation engine) to populate all cached cell results prior to file save or Google Drive upload.
   * **Preservation of Owner Layout & Financial Rules:** This implementation requirement is strictly an export engine calculation safeguard; it **must not alter** the owner's 15-column visual layout, hidden technical audit column P (`Record Status`), conditional gray fill/strikethrough styling (`#E2E8F0`), or confirmed financial summation rules.

---

## 7. Google Drive Synchronization, Immutable Staging & Atomic Pointer Architecture (Correction C & Task E)

### 7.1 Master Excel Publication Pipeline & Publication Status Transitions
* **Immutable Version Staging:** Direct in-place writes to `Vetri_Water_Solutions.xlsx` at Google Drive root are strictly prohibited. The compiled workbook is uploaded first as an immutable versioned file under `Backups/`:
  `Backups/VWS_Workbook_YYYY-MM-DD_rev{rev}.xlsx`
* **Atomic Master Pointer Commitment:** Once uploaded, the worker updates the authoritative pointer in Cloud Firestore (`system_state/master_workbook_pointer`) in a transaction, committing `currentDriveFileId`, `currentExportVersion`, `checksumSha256`, and setting `publicationStatus: 'POINTER_COMMITTED'`.
* **Authoritative Master vs Convenience Root Copy (Task E):**
  * The versioned file in `Backups/` referenced by `currentDriveFileId` is the single authoritative master workbook.
  * The file at root (`Vetri_Water_Solutions.xlsx`) is a convenience copy for quick human viewing.
  * The worker attempts to copy or update the root file, setting `publicationStatus: 'PUBLISHED_TO_ROOT'`.
  * If the root copy operation fails, `publicationStatus` transitions to `ROOT_COPY_FAILED`. The staged version in `Backups/` remains completely safe, intact, and 100% authoritative.
* **Server-Side Stale Upload Rejection:** If an upload completes but its version is $\le \text{currentExportVersion}$ recorded in `system_state/master_workbook_pointer`, the upload is declared STALE and discarded without touching the master workbook.
* **Indefinite Daily JSON Backups:** Complete database collections are serialized as `Database_Backups/VWS_DB_Backup_YYYY-MM-DD_v{exportVersion}.json` with companion `.sha256` manifest files, and retained indefinitely in Google Drive without auto-pruning (Tier 1 Confirmed Owner Decision).

### 7.2 Drive Reauthorization Decoupling & Durable Cloud Queue (Correction K)
* If Google Drive authorization expires (`invalid_grant`) or returns HTTP 401/403, Excel export generation and Cloud Firestore operations **continue without interruption**.
* The generated workbook can be downloaded directly to device storage immediately.
* Google Drive upload obligations are stored in Cloud Firestore canonical task queue (`system_tasks/{taskId}`), and an informational banner prompts the owner: *"Google Drive backup authorization expired. Tap here to reauthorize."*
* Once reauthorized, the background sync manager executes pending uploads automatically via the resumable upload protocol.

