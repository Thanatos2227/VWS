# Vetri Water Solutions (VWS) — Business Rules & Logic Matrix
**Document ID:** VWS-DOC-003  
**Project Phase:** Phase 01G — Final Contradiction Resolution & Owner Decision Gate  
**Status:** Authoritative Blueprint — Reconciled, Validated & Path-Aligned  
**Author:** Senior Software Architect, Database Architect, Security Engineer, QA Architect & Business Analyst  
**Date:** November 2026 (Phase 01G Final Contradiction Resolution)  

---

## 1. Core Mathematical & Financial Precision Rules

### 1.1 Money Handling & Integer Paise Precision Strategy (BR-PREC-01 — Tasks F, G)
* **Governance Status (Option A — Awaiting Owner Decision under REC-04):** The proposed architectural specification represents all monetary amounts internally as **integer paise** ($1\text{ INR} = 100\text{ paise}$). This remains an **Architecture Recommendation awaiting owner approval**. Dependent implementation choices in code are blocked pending explicit owner sign-off. If approved by the owner, integer paise will be implemented. If rejected by the owner, an alternative architecture (such as string-based decimal representation `"1450.50"` or arbitrary-precision decimal libraries) must be engineered prior to implementation.
* **Avoidance of Floating-Point Errors:** Standard JavaScript IEEE 754 floating-point operations (e.g. `0.1 + 0.2 = 0.30000000000000004`) introduce rounding artifacts into financial ledgers. Under the integer paise proposal, converting currency inputs to integer paise upon entry and performing additions, subtractions, and aggregations using standard integer math eliminates floating-point rounding errors in internal logic.
* **Strict Financial Safety Rules (Correction H & Tasks F, K):**
  1. **JavaScript Safe Integer Guard:** All monetary amounts are checked against JavaScript `Number.MAX_SAFE_INTEGER` ($2^{53} - 1 = 9,007,199,254,740,991$ paise = ₹90,071,992,547,409.91 / ~₹90,071 crore). Any input or calculated total exceeding this ceiling is immediately rejected with a critical overflow error.
  2. **Indian Currency Presentation Formatting:** Monetary amounts in UI and reports are formatted according to standard Indian numbering format (`en-IN`): `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })` (e.g. `₹1,00,000.00`, `₹4,500.00`).
  3. **Strict String-to-Paise Parsing (No Float Math):** Currency input strings are parsed into integer paise without intermediate floating-point multiplication (avoiding `Math.round(parseFloat(input) * 100)`). The parser splits the string on the decimal point, validating integer rupees and 2-digit paise strings directly:
     $$\text{paise} = \text{parseInt}(\text{rupees}, 10) \times 100 + \text{parseInt}(\text{paiseString.padEnd}(2, \text{'0'}), 10)$$
  4. **Strict Non-Negative Bounds:** All bill values, discounts, and expense entries must be $\ge 0$. Negative numbers are strictly prohibited.
  5. **Discount Constraint:** $\text{discountPaise} \le \text{billValuePaise}$. If discount exceeds bill value, submission is blocked with: *"Discount cannot exceed Bill Value"*.
  6. **Practical Upper Bounds (Architecture Recommendations REC-07 / Task G):** To guard against inadvertent keying errors (e.g. accidental extra zeros), the architecture team recommends operational validation ceilings:
     * **Single Site Bill Value Ceiling:** $\le ₹10,00,000$ ($100,000,000$ paise).
     * **Single Expense Entry Ceiling:** $\le ₹5,00,000$ ($50,000,000$ paise).
     * **Daily Grand Total Expense Ceiling:** $\le ₹25,00,000$ ($250,000,000$ paise).
     * *Governance Status:* These ceilings are **Architecture Recommendations awaiting owner approval**. They are NOT owner-confirmed hard limits. If adopted, they prompt an informational confirmation dialog rather than a hard block.
* **Display & Excel Conversion:**
  * For UI presentation: $\text{Rupees} = \frac{\text{Paise}}{100}$, formatted as `₹ #,##,##0.00` via `en-IN` locale.
  * For Excel export: Outputted as numeric currency cells formatted with `[$₹-en-IN] #,##,##0.00`.
  * *Excel Numeric Precision Boundary:* Excel stores numeric cell values as 64-bit IEEE 754 floating-point numbers, limiting precision to 15 significant decimal digits. This is mathematically distinct from internal integer arithmetic. For VWS business volumes (values up to ₹25,00,000, i.e., 8–10 decimal digits), Excel represents figures accurately without losing precision, but Excel cells do not share identical precision mechanics with internal integer math.

---

### 1.2 Site Details Module Calculations (BR-CALC-SITE)

```
+---------------------------------------------------------------------------------------------------+
| RULE ID       | FORMULA & DEFINITION                                                             |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-S01   | Final Value (Paise) = Bill Value (Paise) - Discount (Paise)                       |
|               | Preconditions:                                                                    |
|               |  - Bill Value >= 0                                                                |
|               |  - Discount >= 0                                                                  |
|               |  - Discount <= Bill Value                                                         |
|               |  - If Discount > Bill Value, trigger immediate validation error.                  |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-S02   | Active Sites Count = Count of records where:                                      |
|               |   isDeleted == false AND isLatestValidVersion == true AND year == activeYear.      |
|               | Excludes soft-deleted records and superseded correction predecessors.             |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-S03   | Total Bill Value = SUM(Bill Value) across active latest valid records.            |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-S04   | Total Discounts = SUM(Discount) across active latest valid records.               |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-S05   | Total Final Billing Revenue = SUM(Final Value) across active latest valid records.|
|               | Integrity Check: Must strictly equal (Total Bill Value - Total Discounts).        |
|               | Anti-Duplication: Superseded original records and soft-deleted records are        |
|               | strictly excluded from totals.                                                    |
+---------------+-----------------------------------------------------------------------------------+
```

---

### 1.3 Accounts Module Calculations (BR-CALC-ACC)

```
+---------------------------------------------------------------------------------------------------+
| RULE ID       | FORMULA & DEFINITION                                                             |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-A01   | Daily Official Total = Refreshment + Transport + (Spares / HO) +                  |
|               |                        Staff Attendance Expense + Staff Salary                    |
|               | Authoritative Rules:                                                              |
|               |  - Staff Attendance Count (headcount) is an integer, NOT added into monetary sum. |
|               |  - Staff Attendance Expense = Daily Wages + Tea/Bata (one combined amount).       |
|               |  - The combined Staff Attendance Expense contributes exactly once to this sum.    |
|               |  - Staff Salary records monthly salary disbursements.                             |
|               |  - Anti-Duplication: Daily wages are NEVER counted again under Staff Salary.      |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-A02   | Daily Personal Total = Transport + Refreshment + (Groceries/Veg/Milk) +          |
|               |                        (Lunch/Dinner) + Other                                     |
|               | Authoritative Rules:                                                              |
|               |  - Maintained as one combined household/personal expense ledger.                  |
|               |  - Null or empty inputs evaluate strictly to 0 paise.                             |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-A03   | Daily Grand Total = Daily Official Total + Daily Personal Total                   |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-A04   | Category Annual Total = SUM(Category Daily Values) for all valid days in year.    |
|               | Calculated individually for all 5 official categories and all 5 personal cats.    |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-A05   | Annual Official Total = SUM(Daily Official Totals) for all valid days in year.    |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-A06   | Annual Personal Total = SUM(Daily Personal Totals) for all valid days in year.    |
+---------------+-----------------------------------------------------------------------------------+
| BR-CALC-A07   | Annual Grand Total = Annual Official Total + Annual Personal Total.               |
|               | Validation Check: Must equal SUM(Daily Grand Totals) across all active days.      |
|               | Calculated strictly from valid, non-deleted daily records for the calendar year.  |
+---------------+-----------------------------------------------------------------------------------+
```

---

## 2. Sequence Allocation & Preservation Rules

### 2.1 Monotonic Sequence Allocation (BR-SEQ-01)
* To preserve the owner's legacy chronological ledger sequence across distributed Web and Android clients:
  1. An atomic, distributed counter document (`system_counters/sites_seq`) is incremented within a Firestore transaction upon initial record creation.
  2. The assigned `sequenceNumber` (Integer: 1, 2, 3...) is immutable.
  3. Concurrent saves from web and Android execute within transaction isolation, preventing duplicate sequence numbers.
* **Correction Sequence Relationship:**
  * When a correction is created (v2, v3), it retains a pointer to the original entry sequence:
    * `sequenceNumber`: Preserves root sequence index (e.g. `14`).
    * `version`: Identifies version ($2, 3 \dots$).
  * The root sequence ordering is never disturbed.

---

## 3. Correction History & Deletion Lifecycle State Machine

### 3.1 Version Chain Structure (BR-HIST-01)
A site record transition follows an immutable linked chain:
$$\text{Original } v1 \longrightarrow \text{Correction } v2 \longrightarrow \text{Correction } v3$$
* `originalRecordId`: Points permanently to the root document ID ($v1$).
* `previousRecordId`: Points to the immediate predecessor document ID.
* `version`: Sequential integer ($1, 2, 3 \dots$).
* Exactly **one** version in a chain may have `isLatestValidVersion == true` at any given time.

### 3.2 Comprehensive State Transition Scenarios

| Scenario | Trigger / Event | System Actions & Database State Transitions | Impact on Financial Totals |
| :--- | :--- | :--- | :--- |
| **Scenario A: Latest version is deleted** | Owner deletes active version $v3$. | Set $v3.\text{isDeleted} = \text{true}$, $v3.\text{deletedAt} = \text{NOW}$, $v3.\text{expiresForPurgeAt} = \text{NOW} + 30\text{d}$. Predecessor versions ($v1, v2$) remain `SUPERSEDED` and are **not** re-activated. | Active totals immediately subtract $v3$. Predecessors do not contribute. Net revenue reflects site removal. |
| **Scenario B: Latest version is restored** | Owner restores $v3$ from Recycle Bin within 30 days. | Set $v3.\text{isDeleted} = \text{false}$, $v3.\text{deletedAt} = \text{null}$. Record remains $v3$ with `isLatestValidVersion == true`. | Active totals immediately re-include $v3$. Original sequence number preserved. |
| **Scenario C: Superseded version is deleted** | Owner attempts deletion of historical $v1$ or $v2$. | In normal UI, superseded records cannot be deleted independently. In administrative audit, soft-deleting an archived version flags $v1.\text{isDeleted} = \text{true}$ without affecting $v3$. | **Zero impact** on active financial totals, since superseded records were already excluded. |
| **Scenario D: Superseded version is restored** | Obsolete version $v1$ is inspected in Recycle Bin. | **Safety Safeguard:** Restoration of an obsolete version must **NEVER** overwrite or deactivate $v3$. It restores purely as an archived audit record (`isLatestValidVersion == false`, `status: "SUPERSEDED"`). | **Zero impact** on active financial totals. Prevents obsolete figures from corrupting current revenue. |
| **Scenario E: Multiple successive corrections** | Owner creates $v2$ from $v1$, then $v3$ from $v2$. | Atomic transaction: $v3$ created (`version: 3`, `previousRecordId: v2.id`, `isLatestValidVersion: true`). Predecessors $v1, v2$ set to `isLatestValidVersion: false`. | Only $v3$ participates in totals. No duplicate summation. |
| **Scenario F: Concurrent edit operations** | Web and Android attempt simultaneous edits on $v2$. | Firestore transaction verifies that `v2.isLatestValidVersion == true` before committing. First commit succeeds; second commit encounters transaction conflict, refreshes data, and prompts owner with latest state. | Race conditions prevented; version integrity strictly maintained. |

### 3.3 Correction Form & Presentation Rules (Authoritative Decisions PD-01 to PD-04)
* **BR-CORR-01 (Correction Reason Optional — PD-01):**
  * When submitting a correction ($v2, v3$), the form field `correctionReason` is strictly **optional**.
  * If left empty, the system sets `correctionReason: null`.
  * The application must **never** block, validate against, or prevent record submission due to a missing or blank correction reason.
* **BR-CORR-02 (Chronological Version Timeline — PD-02 & PD-04):**
  * The Version History Modal renders a vertical chronological timeline ($v1 \to v2 \to v3$).
  * Each node displays: version number, creation/modification timestamp, modifying user email, correction reason (if provided), and field-level diffs highlighting exact values changed.
* **BR-CORR-03 (Latest Valid Version Default View — PD-03):**
  * The primary Site Details ledger table queries and renders strictly records where `isDeleted == false AND isLatestValidVersion == true`.
  * Superseded versions ($v1, v2$) are hidden from the default view to prevent clutter, accessible only via clicking the version chip (e.g. `v3 (Corrected)`).

---

## 4. Daily Accounts Record Lifecycle

The Accounts ledger maintains a consolidated document per calendar day keyed deterministically by `entryDate` (`YYYY-MM-DD`).

### 4.1 Lifecycle Operations (BR-ACC-LIFE)
1. **Initial Creation:**
   * When an expense is first entered for a date (e.g. `2026-11-06`), the system creates document `accounts_daily/2026-11-06`.
   * Unentered categories initialize to 0 paise.
2. **Subsequent Expense Entries on Same Day:**
   * When subsequent expenses are logged on that date, a Firestore transaction reads the existing daily document, updates category amounts, recalculates `Daily Official Total`, `Daily Personal Total`, and `Daily Grand Total`, and writes back atomically.
   * Historical entries are never silently overwritten without transactional read-modify-write safety.
3. **Soft Deletion & Restoration:**
   * Deleting a daily ledger marks `accounts_daily/{date}` as `isDeleted: true` with a 30-day recovery window.
   * While deleted, the day's expenses are excluded from annual rollups. Restoration re-includes the day's totals.
4. **Concurrent Multi-Device Edits:**
   * If the owner enters transport expenses on mobile while updating grocery expenses on laptop for the same day, Firestore's atomic transaction merges both updates based on field-level operations without data loss.

### 4.2 Category Edit Semantics & Non-Destructive Audit History (BR-ACC-EDIT — Correction F & Task J)
1. **Default Edit Semantics (Replacement):**
   * Editing an existing expense category in the form **replaces** its current value by default.
   * *Example:* If Official Transport is currently ₹200 (20,000 paise) and the user edits the input field to ₹350, saving the form sets `transportPaise = 35000` (replacing ₹200 with ₹350).
2. **Deliberate Incremental Add Action ("+ Add Expense"):**
   * When the owner wishes to record an additional expense without manually calculating the sum, they click the deliberate **"+ Add Expense"** action next to any category.
   * The UI presents an incremental addition dialog: $\text{newAmount} = \text{previousAmount} + \text{additionalAmount}$.
3. **Atomic Execution of Parent Update & Revision Audit Log (Task J):**
   * Updating the parent document `accounts_daily/{entryDate}` and appending the immutable audit entry in subcollection `accounts_daily/{entryDate}/audit_log/{revisionId}` **must be executed within a single atomic Cloud Firestore transaction** (`runTransaction()`).
   * This guarantees that an expense amount cannot update without creating an audit log, and an audit log cannot be created without updating the parent ledger.
   * The audit entry records: `timestamp`, `editedBy`, `categoryKey`, `categoryLabel`, `previousAmountPaise`, `newAmountPaise`, `deltaAmountPaise`, `editMode` (`'REPLACE'` | `'INCREMENT'`), and optional `reason` (PD-01, PD-02, PD-04).
   * Incrementing `revisionsCount` on the parent document provides immediate UI visibility into edit frequency.

---

## 5. Site & Tank Specifications Rules

### 5.1 Tank Terminology, Extensibility & Measurements (BR-TANK-01 — Task D & Confirmed Decision PD-06)
* **Authoritative Tank Types in UI (PD-06 / Task D):**
  * Under confirmed owner decision PD-06, the initial application user interface exposes **strictly two tank type options**:
    1. `OHT` (Overhead Tank)
    2. `UG` (Underground Tank)
  * The form presents a clean two-option selector (radio toggle or pill buttons: `[ OHT ]` `[ UG ]`).
  * **Zero Free-Text / Custom Input in Initial UI:** In strict accordance with PD-06, the user interface does **not** expose "Other", "Custom", or free-text tank type inputs in the initial release.
* **Underlying Schema Extensibility:**
  * While the initial UI strictly constrains selection to `OHT` and `UG`, the underlying TypeScript definitions and database schema maintain technical extensibility:
    `export type PredefinedTankType = 'OHT' | 'UG';`
    `export type TankType = PredefinedTankType | (string & {});`
  * This ensures future business expansion (e.g. adding specialized commercial tank types) will require zero database migrations or structural refactoring.
* **Measurement Units & Format:**
  * Dimensions are strictly measured in **Feet** (ft).
  * Format: Structured 3-dimensional fields: $\text{Length} \times \text{Breadth} \times \text{Height}$ in feet ($L \times B \times H$).
* **Capacity Unit:** Strictly measured in **Litres (L)**.
* **Tank Count Consistency:** Total tank count must strictly equal `length(tanks)`.

### 5.2 Combined Billing Rule (BR-TANK-02)
* All tanks serviced during one customer site visit are covered under **one combined bill**.
* Exactly one Bill Value, one Discount, one Final Value, one Bill Number, and one Payment Mode apply to the site visit.
* Tanks do not carry individual itemized bills.

### 5.3 Physical Bill Number Entry (BR-BILL-01)
* The Bill Number must be manually entered by the owner from their physical bill book.
* The application must **not** auto-generate or overwrite the Bill Number.

### 5.4 Payment Mode Mandatory Selection (BR-PAY-01 — Corrected Rule)
* Customers pay immediately upon job completion.
* Permitted Payment Modes: Strictly `Cash` or `Online`.
* **Integrity Guard:** The system must **never** silently default a missing, empty, or unselected payment mode to Cash. The owner must explicitly choose `Cash` or `Online` before the record can be saved.
* Pending payments, partial payments, credit ledgers, and outstanding balances are **not** supported in the initial release.

### 5.5 Contact Number Validation (BR-CNT-01 — Corrected Rule)
* Contact number validation must be flexible to accommodate valid business numbers in India:
  * 10-digit mobile numbers (e.g. `9876543210`).
  * Mobile numbers with country code prefix (e.g. `+91 9876543210`, `09876543210`).
  * Landline numbers with standard STD area codes (e.g. `044-26154321`).
* The system must **not** unnecessarily reject valid business contact records with rigid 10-digit-only regex masks.

---

## 6. Accounts & Staff Attendance / Salary Rules

### 6.1 Staff Attendance Accounting (BR-STAF-01 — Authoritative Decision)
* The owner records two distinct attributes daily:
  1. `offStaffAttendanceCount`: Daily worker headcount present (Integer $\ge 0$).
  2. `offStaffAttendanceExpense`: Combined attendance-related monetary expense.
* **Authoritative Wage Inclusion Formula:**
  $$\text{Staff Attendance Expense} = \text{Daily Staff Wages} + \text{Tea} + \text{Refreshments} + \text{Bata}$$
* The system must **not** provide separate wage and Bata expense fields; entering one combined amount is the authoritative business requirement.
* The combined amount contributes exactly once to the Daily Official Total.

### 6.2 Staff Salary Accounting & Single Source of Truth (BR-STAF-02 — Authoritative Decision)
* `offStaffSalary` is reserved strictly for monthly fixed salary disbursements.
* It supports:
  * Individual staff salary entries (e.g. Staff Name + Amount).
  * Combined monthly salary entries (lump-sum monthly payment).
* **Single Source of Truth Rule:**
  * To prevent duplicate salary totals or schema divergence, `salaryEntries` is the primary array.
  * If a combined lump-sum is recorded, it is represented as a single entry in `salaryEntries` with `type: 'COMBINED_LUMP_SUM'`.
  * `offStaffSalary` is always mathematically derived as:
    $$\text{offStaffSalary} = \sum_{\text{entry}} \text{salaryEntries.amount}$$
* **Strict Anti-Duplication Guard:** Daily worker wages are already included in Staff Attendance Expense. Daily wages must **never** be counted again under Staff Salary.
* **Salary Period Attribution & Late Payment Accounting (Task G / POQ-01):**
  * Monthly salary payments are often disbursed after the calendar month closes (e.g. March salary paid on April 5th).
  * **Financial Ledger Principle:** The financial disbursement contributes strictly to the Daily Official Total of the **actual payment date** (`accounts_daily/2026-04-05`), ensuring cash-outflow accuracy.
  * **Accounting Month Attribution:** To maintain clear reporting of which work month was paid, `SalaryEntry` includes an optional attribute `salaryMonth?: string` (formatted as `"YYYY-MM"`, e.g. `"2026-03"`).
  * *Pending Owner Question (POQ-01):* Whether the owner requires annual tax summaries to group salaries by disbursement date or by target work month is documented in the Owner Approval Register for confirmation. Default implementation reports by disbursement date while displaying `salaryMonth` in notes and Excel export columns.

---

## 7. Google Location Rules (BR-LOC-01)

1. **Dual-Mode Location Capture:**
   * Mode A: Manually pasting a Google Maps share URL.
   * Mode B: Capturing device GPS coordinates (Latitude and Longitude) on compatible mobile/web hardware.
2. **Permission Optionality & Graceful Degradation:**
   * GPS device location permission is **strictly optional**.
   * If the owner denies location permission, or if GPS is unavailable, the application must display a non-blocking notification and allow immediate manual URL pasting or saving without GPS coordinates.
   * The application stores `latitude`, `longitude`, and `mapsUrl` when available.

---

## 8. Soft Deletion, Recycle Bin & 30-Day Recovery Rules (BR-DEL-01)

1. **Soft Deletion Protocol:**
   * Hard physical deletion (`DELETE`) is completely disabled in standard operation.
   * Triggering deletion sets `isDeleted: true`, `deletedAt: Timestamp`, `deletedBy: userEmail`, and `expiresForPurgeAt: Timestamp + 30 Days`.
2. **Recycle Bin & 30-Day Retention Period:**
   * Soft-deleted records are accessible in a dedicated **Recycle Bin** interface.
   * Records can be restored at any time within **30 days** of deletion.
   * Restoring a record clears `isDeleted` and returns the record to active status with its original sequence number and historical audit trail intact.
3. **Exclusion from Active Calculations:**
   * Soft-deleted records are strictly excluded from all dashboard metrics, active tables, financial summaries, and standard annual Excel exports.
4. **Permanent Purge Safeguard:**
   * Permanent physical deletion is eligible only after the 30-day retention window has expired, and only after verifying that a current Google Drive backup archive exists.

---

## 9. Calendar Year Boundary Rules & Excel Representation (BR-DATE-01 — Locked PD-05)

* Annual organization is strictly by **Calendar Year** (`1 January` to `31 December`).
* Financial year periods (e.g. April to March) are **not** used.
* All records belonging to a calendar year must appear in that year's worksheets:
  * `[YEAR] - Site Details` (e.g. `2026 - Site Details`)
  * `[YEAR] - Accounts` (e.g. `2026 - Accounts`)
* Historical annual worksheets must be preserved across years. Original record-entry sequence must be preserved.
* **BR-XLS-03 (Excel Superseded Record Presentation — Authoritative Decision PD-05):**
  * Original and corrected records must appear as separate identifiable rows in `[YEAR] - Site Details`.
  * Superseded predecessor rows receive soft gray background styling (`#E2E8F0`) and strikethrough text on financial values.
  * Summary formulas at the bottom must strictly sum active records only (`isLatestValidVersion == true` and `isDeleted == false`) using `=SUMIF()` to prevent duplicate totals.

---

## 10. Business Rules Validation Matrix

| Field / Action | Validation Rule | Severity | Action on Failure |
| :--- | :--- | :--- | :--- |
| `workDate` | Valid date string (`YYYY-MM-DD`); non-empty | Error | Block Save; highlight date field |
| `customerName` | String length $\ge 2$ characters | Error | Block Save; display error message |
| `contactNumber` | Valid phone format (10-digit mobile, +91, landline with STD) | Error | Block Save; prompt valid phone format |
| `billNumber` | Non-empty string from physical bill book | Error | Block Save; prompt physical bill number |
| `paymentMode` | Explicit selection: `Cash` or `Online` required | Error | **Block Save; mandate explicit choice** |
| `tanks` array | Length $\ge 1$; dimensions in feet, capacity in Litres | Error | Block Save; highlight tank inputs |
| `tankType` | Must be strictly `OHT` or `UG` in UI (extensible schema) | Error | Reject invalid tank type in UI |
| `billValue` | Numeric $\ge 0$ (handled in integer paise) | Error | Block Save; highlight bill value |
| `discount` | Numeric $\ge 0$ and $\le \text{billValue}$ | Error | Block Save; "Discount cannot exceed Bill Value" |
| `finalValue` | Derived strictly as `billValue - discount` | Critical | Auto-enforced by integer paise subtraction |
| Location GPS | Optional device capture | Info | Graceful fallback to manual URL pasting |
| Record Edit | Creates new correction version; transaction-safe transition | Audit | Enforce non-destructive correction record |
| Correction Reason | Optional field (PD-01) | Info | Blank allowed; never blocks edit submission |
| History View | Chronological version timeline modal (PD-02, PD-04) | Audit | Read-only inspection of past versions |
| Site List Display| Show latest valid version by default (PD-03) | Filter | Hide superseded predecessors from main view |
| Soft Delete | Sets `isDeleted: true`, 30-day recovery window | Audit | Moves record to Recycle Bin; updates totals |
| Staff Attendance | Single combined expense (wages + tea/bata) | Rule | Enforce single combined input |
| Staff Salary | Source of truth derived from `salaryEntries` | Rule | Enforce single salary total calculation |
| Drive Backup Retention | Indefinite daily retention of all JSON dumps | Rule | Retain all daily JSON dumps; zero auto-prune |
| Backup Checksum | Non-circular SHA-256 over raw canonical UTF-8 bytes | Rule | Hash raw bytes; store in companion manifest |
| Drive Concurrency | Cloud Firestore Serialized Lease Coordinator | Rule | Lease locks (`system_locks`); reject stale jobs |
| Drive Auth Lifecycle | Reauthorization prompt; never block DB operations | Rule | Prompt on expiry; queue sync; preserve Firestore |
| Pending Sync Queue | Durable Firestore queue (`system_tasks`) | Rule | Durable across app reinstall & device switch |

---

## 11. Google Drive Integration & Indefinite JSON Backup Retention Rules

### 11.1 Indefinite Daily Database JSON Backup Retention (BR-DRV-01 — Authoritative Decision)
* **Authoritative Policy:** Retain all daily database JSON backups indefinitely in the owner's Google Drive (`VWS_Backups/Daily_Dumps/`).
* **Zero Automatic Pruning:** The application must **not** automatically delete, truncate, or prune historical daily database backups.
* **Integrity & Metadata Preservation:**
  * Every backup archive must preserve:
    * Monotonic `exportVersion` (integer: $1, 2, 3 \dots$).
    * UTC ISO-8601 creation timestamp.
    * Cryptographic `SHA-256` content checksum.
    * Database schema version and collection record counts.
    * Deterministic filename format: `VWS_DB_Backup_YYYY-MM-DD_v{exportVersion}.json`.
* **Chronological Retrieval:** Backups must remain chronologically identifiable and retrievable via structured folder hierarchies and database backup metadata records.
* **Failure Safeguard:** Incomplete, interrupted, or failed uploads must **never** be marked as successful backups. If an upload fails, status remains `FAILED` with retry scheduling, preserving the integrity of the backup registry.

### 11.2 Google Drive Storage Growth & Quota Rules (BR-DRV-02 — Operational Rules / Correction J)
* **Standard SI Decimal Units Storage Projections ($1\text{ KB} = 1,000\text{ B}$, $1\text{ MB} = 10^6\text{ B}$, $1\text{ GB} = 10^9\text{ B}$):**
  * Assuming daily canonical JSON payloads ranging between $50\text{ KB}$ and $2.0\text{ MB}$:
    * **1 Year (365 daily backups):** $18.25\text{ MB} - 730\text{ MB}$ ($0.12\% - 4.87\%$ of 15 GB).
    * **3 Years (1,095 daily backups):** $54.75\text{ MB} - 2.19\text{ GB}$ ($0.37\% - 14.60\%$ of 15 GB).
    * **5 Years (1,825 daily backups):** $91.25\text{ MB} - 3.65\text{ GB}$ ($0.61\% - 24.33\%$ of 15 GB).
    * **10 Years (3,650 daily backups):** $182.5\text{ MB} - 7.30\text{ GB}$ ($1.22\% - 48.67\%$ of 15 GB).
* **Drive Quota Reality & Monitoring:**
  * Google Drive storage is finite (Standard Google free tier: $15\text{ GB}$ shared across Gmail, Google Drive, and Google Photos).
  * Storage is **not** assumed to be infinite or cost-free.
  * System queries Google Drive `about.get(fields="storageQuota")` prior to uploads:
    * If total Drive storage usage exceeds $80\%$ ($\ge 12.0\text{ GB}$), display an informational storage notice.
    * If total Drive storage usage exceeds $90\%$ ($\ge 13.5\text{ GB}$), display a persistent high-priority warning banner.
    * If upload fails due to `HTTP 403 storageQuotaExceeded`, alert the owner immediately with storage remediation guidance without disrupting local/cloud database operations.

### 11.3 Android & Web Google Drive Reauthorization & Error Disambiguation (BR-DRV-03 — Correction K)
* **Authoritative Policy:** When Google Drive authorization expires, is revoked, or becomes invalid, the application must prompt the owner to reauthorize on demand.
* **Precise Error Disambiguation:**
  * **OAuth Token Endpoint Errors:** Errors from `https://oauth2.googleapis.com/token` (such as `invalid_grant`, `invalid_request`, `unauthorized_client`) represent expired refresh credentials requiring user sign-in reauthorization.
  * **Drive REST API Errors:** HTTP status codes from `https://www.googleapis.com/drive/v3/files` (such as `401 Unauthorized` for expired short-lived access tokens, or `403 Forbidden` for permissions or quota) trigger automatic background token refresh or specific quota alerts.
* **Decoupled Architecture Rule (Zero Application Blocking):**
  * Google Drive authorization status must be **strictly decoupled** from core application usage and Cloud Firestore operations.
  * An expired or revoked Drive access token must **NEVER** block normal application access, form entry, local cache writes, or Firestore cloud database saves.
  * When Drive token expiration is detected, the application transitions Drive sync status to `WAITING_REAUTH`.
  * A clear, non-intrusive notification banner is displayed: *"Google Drive backup authorization expired. Tap here to reauthorize."*
  * The owner can tap the banner to trigger OAuth 2.0 reauthorization via Google Sign-In.
* **Queue & Resume:**
  * While awaiting reauthorization, database modifications continue normally and pending export jobs are recorded in Cloud Firestore canonical task queue (`system_tasks/{taskId}`) and staged locally.
  * Immediately upon successful reauthorization, the background sync manager resumes and dispatches all queued backups and exports to Google Drive.
* **Security & Architectural Boundary (Task B):**
  * On client devices, access tokens are managed via short-lived credentials.
  * For the autonomous scheduled backend worker (Cloud Functions), the user's refresh token is stored in **Google Cloud Secret Manager** (`projects/{project}/secrets/vws-drive-backend-refresh-token`), accessible strictly via IAM role `roles/secretmanager.secretAccessor` granted solely to the Cloud Function service account (`vws-backup-worker@{project}.iam.gserviceaccount.com`).
  * Apply standard OAuth 2.0 least-privilege scope (`https://www.googleapis.com/auth/drive.file`), restricting app access solely to files created by Vetri Water Solutions.

### 11.4 Non-Circular Cryptographic Checksum Rules (BR-DRV-04 — Technical Correction)
* **Zero Self-Referential Checksums:** The JSON dump file (`VWS_DB_Backup_YYYY-MM-DD_v{exportVersion}.json`) must **not** contain an internal checksum field of itself.
* **Canonical Hashing:** Cryptographic SHA-256 is computed strictly over the raw binary bytes of the canonically serialized UTF-8 JSON stream.
* **External Manifest Storage:** The computed hash is stored in:
  1. A companion text manifest: `Database_Backups/VWS_DB_Backup_YYYY-MM-DD_v{exportVersion}.json.sha256`.
  2. Cloud Firestore document: `backups_metadata/{id}.sha256Checksum`.
  3. Google Drive file custom property: `appProperties.sha256Checksum`.
* **Restoration Integrity Gate:** Before restoring, the restoration tool computes SHA-256 over downloaded bytes; any mismatch halts restore with a `CryptographicIntegrityError`.

### 11.5 Serialized Synchronization Coordinator Rules (BR-DRV-05 — Technical Correction)
* **Authoritative Firestore Coordinator:** Multi-client export concurrency is governed by `system_locks/drive_export_coordinator`.
* **Distributed Lease Lock:** Clients acquire an atomic 3-minute lease before compiling and uploading exports.
* **Stale Job Rejection:** If a client's lease expires during upload and another device claims it, the stale upload is rejected and never allowed to replace the master workbook.

### 11.6 Canonical System Task Queue Rules (BR-DRV-06 — Task C Canonical Queue)
* **Persistent Obligation Tracking:** All pending backup sync jobs and exports are recorded in Cloud Firestore under the canonical root collection path: `system_tasks/{taskId}`.
* **Device Independence & Recovery:** If local app cache is cleared, the app is reinstalled, or the owner switches devices, pending tasks are reconstructed from Firestore authoritative collections. Outstanding backup obligations are never lost.

---

## 12. Offline Draft Synchronization, Conflict Resolution & Safety Protocol (BR-OFF-01 — Task E)

### 12.1 Transaction Failure in Offline Mode & Design Boundaries
1. **Transaction Failure Reality:** Cloud Firestore multi-document transactions require live two-way network communication with the Firebase backend to verify read locks and execute atomic commits. Calling `runTransaction()` while offline throws an immediate connectivity exception.
2. **Operations Requiring Transactions:**
   * **Monotonic Sequence Allocation:** Incrementing `system_counters/sites_seq` requires a server transaction to guarantee zero duplicate sequence numbers.
   * **Correction Version Swapping:** Setting predecessor $v_{n-1}$ to `isLatestValidVersion: false` while activating $v_n$ requires transactional atomicity.
   * **Distributed Lease Acquisition:** Locking `system_locks/drive_export_coordinator` requires live server lease timestamps.
   * **Daily Accounts Atomic Audit:** Updating the parent `accounts_daily` and appending to `audit_log/{revisionId}` requires an atomic transaction.

### 12.2 Canonical Offline Operation Draft Protocol (Task C)
When offline, all operations requiring transactions are staged locally in client storage (IndexedDB / SQLite) as immutable drafts conforming to `OfflineOperationDraft`:
* Tagged with a client-generated UUIDv4 (`operationId`), deterministic `idempotencyKey` (`OP_IDEMP_{deviceId}_{targetDocId}_{baseServerRevision}_{payloadHash}`), `deviceId`, `baseServerRevision`, `createdAt`, and `lastModifiedLocally`.
* Form input is validated locally using the exact schema rules before being accepted into the draft queue.
* The UI displays an amber status pill: *"Saved Locally - Pending Cloud Commit"* (`syncStatus: 'PENDING_COMMIT'`).
* The system **never falsely claims** that an uncommitted local draft is already saved to Cloud Firestore.
* *Durability & Storage Limitations:* Offline drafts stored in browser IndexedDB (Web) or SQLite (Android) improve resilience during network dropouts. However, the system cannot promise zero data loss if local unsynchronized storage is lost through device damage, OS storage eviction under disk pressure, or manual browser/app cache clearing prior to synchronization.

### 12.3 Comprehensive Conflict Scenarios & Deterministic System Behaviors (Task C Scenarios A–L)

| Scenario | Event Description | Deterministic System Action & Conflict Resolution Behavior | Financial Integrity Guarantee |
| :--- | :--- | :--- | :--- |
| **Scenario A: Offline creation of a new site** | Owner enters a new customer site while disconnected in the field. | Staged as local draft with temporary client ID (`temp_site_...`). Upon reconnect, atomic server transaction on `system_counters/sites_seq` assigns next monotonic sequence number and commits record. | Zero sequence gaps; record created cleanly without collisions. |
| **Scenario B: Multiple offline site creations on one device** | Owner creates 3 customer site jobs sequentially while offline on one device. | Drafts queued in local storage in strict chronological order. Upon reconnect, processed sequentially in a single atomic batch; monotonic sequence numbers $N, N+1, N+2$ assigned in exact local creation order. | Relative entry ordering strictly preserved; zero duplicate sequence numbers. |
| **Scenario C: Duplicate upload of the same offline operation** | Network blips after server commit but before client receives acknowledgement; client retries. | Client retransmits draft with identical `operationId` and `idempotencyKey`. Server checks idempotency log; detects already-committed operation; returns success without re-executing. | Zero duplicate billing entries; strict idempotency. |
| **Scenario D: Offline edit colliding with newer online correction** | Device A edits record $v_2$ offline. Meanwhile, owner edited $v_2$ on Device B online, creating $v_3$. | On reconnect, transaction compares `baseServerRevision` (2) against server version (3). Base is stale; commit halted; draft flagged `SYNC_CONFLICT: STALE_BASE_VERSION`. | **Zero silent overwrites.** Owner prompted via Conflict Review Modal (SCR-11) to choose action. |
| **Scenario E: Two devices correcting same original site record** | Both mobile and laptop submit corrections to record $v_2$ while disconnected. | First device to reconnect commits transaction creating $v_3$ and deactivating $v_2$. Second device's transaction fails because $v_2.\text{isLatestValidVersion} == \text{false}$. Second draft flagged as conflict. | Predecessor cannot be superseded twice; version tree remains strictly linear. |
| **Scenario F: Two devices editing different categories in Accounts daily record** | Phone updates Transport while laptop updates Spares for the same calendar date. | Server transaction executes field-level merge: updates both Transport and Spares in `accounts_daily/{dateId}`, recalculates grand total, and appends two discrete audit log subcollection records. | Zero overwritten expenses; audit trail records both independent changes. |
| **Scenario G: Two devices editing the same Accounts category** | Phone replaces Transport with ₹400 while laptop replaces Transport with ₹500 for same date. | Transaction compares `baseServerRevision`. Second device detects stale revision; commit halted; flagged `SYNC_CONFLICT: CONCURRENT_COLLISION`. Displays SCR-11 modal for owner decision. | Zero silent financial overwrites; owner explicitly chooses correct amount. |
| **Scenario H: Network interruption during transaction commit** | Cellular connection drops during HTTP commit payload transmission. | If transaction never reached Firestore, nothing committed; client draft remains `PENDING_COMMIT` and retries on reconnect. If transaction committed but ack lost, client retries with same `idempotencyKey` and receives commit confirmation. | Exactly-once execution semantics; no orphaned half-records. |
| **Scenario I: Application termination during synchronization** | Android OS terminates app process or battery dies mid-synchronization. | On next app launch, synchronization manager scans local storage for drafts with `syncStatus: 'PENDING_COMMIT'`. Resumes sync pipeline from first uncommitted draft. | Zero skipped drafts; resume pipeline safely continues. |
| **Scenario J: Local storage loss before synchronization** | Phone suffers catastrophic hardware failure or water damage before reconnecting. | Unsynchronized local drafts on device are lost. Master Cloud Firestore state remains uncorrupted. | Cloud database integrity uncompromised; owner re-enters missing jobs on new device. |
| **Scenario K: Permanent validation failure** | Draft contains corrupted or out-of-bounds data rejected by Firestore security rules. | Server rejects commit with `400 Bad Request`. Draft status set to `FAILED_VALIDATION`. Displayed in Drafts Review Tray with error explanation. | Invalid data never enters Firestore; owner can correct invalid fields. |
| **Scenario L: App reinstall and recovery of pending operations** | Owner uninstalls app or clears app storage while unsynced drafts exist. | Operating system wipes private app storage. Unsynced drafts cannot be recovered from the cloud. Cloud Firestore records remain intact. | UI displays persistent warning if unsynced drafts exist to prevent accidental uninstall. |

### 12.4 Mandatory Operational Safety Principles (Task E)
1. **No Duplicate Financial Records:** Client retry attempts must never generate multiple site bills or duplicate expense rows.
2. **No Silent Overwrites:** Newer server records are never silently overwritten by older offline drafts.
3. **No Duplicate Sequence Allocation:** Monotonic sequence numbers are allocated strictly by server-side atomic transactions upon reconnection.
4. **No Duplicate Audit Records:** Subcollection audit entries are committed atomically with parent updates. Retried idempotent operations verify existing revision IDs before creating audit documents.
5. **No Automatic Acceptance of Stale Corrections:** Offline corrections based on superseded parent versions must always halt and prompt explicit owner review.
6. **Owner Conflict Resolution Workflow:** Conflicting drafts are presented in a dedicated **"Sync Conflict Review"** screen displaying:
   * Current Cloud Version values vs. Offline Draft values.
   * Visual field diff highlighting exact conflicting numbers.
   * Three explicit owner actions:
     - `[ Apply as New Correction Version ]`: Increments version to $v_{n+1}$ and commits offline changes.
     - `[ Discard Offline Draft ]`: Reverts to current cloud version.
     - `[ Edit Values ]`: Opens edit form to adjust numbers before committing.


