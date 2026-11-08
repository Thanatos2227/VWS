/**
 * src/services/excelService.ts
 * 
 * Client-Side Excel Workbook Generation Service using ExcelJS.
 * Implements strict compliance with DOC-007 (VWS_EXCEL_EXPORT_SPECIFICATION).
 * Generates partitioned annual sheets: '[YEAR] - Site Details' and '[YEAR] - Accounts'.
 * Implements Section 6.4: populates both dynamic Excel formulas and verified pre-calculated
 * results so all viewers observe accurate financial totals immediately upon opening.
 */

import ExcelJS from 'exceljs';
import { SiteRecord, DailyAccountsRecord } from '../types/database';
import { toRupees } from '../utils/money';

export interface ExcelExportData {
  calendarYears: number[];
  sitesByYear: Record<number, SiteRecord[]>;
  accountsByYear: Record<number, DailyAccountsRecord[]>;
}

/**
 * Builds the complete multi-year authoritative Excel workbook in-memory.
 */
export async function buildMasterWorkbook(data: ExcelExportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Vetri Water Solutions';
  workbook.lastModifiedBy = 'Vetri Water Solutions Owner Portal';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sortedYears = [...data.calendarYears].sort((a, b) => b - a);

  for (const year of sortedYears) {
    const sites = data.sitesByYear[year] || [];
    const accounts = data.accountsByYear[year] || [];

    // 1. Create [YEAR] - Site Details Sheet
    buildSiteDetailsSheet(workbook, year, sites);

    // 2. Create [YEAR] - Accounts Sheet
    buildAccountsSheet(workbook, year, accounts);
  }

  return workbook;
}

/**
 * Builds a single [YEAR] - Site Details worksheet.
 */
function buildSiteDetailsSheet(
  workbook: ExcelJS.Workbook,
  year: number,
  sites: SiteRecord[]
): void {
  const sheetName = `${year} - Site Details`;
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  // Sheet Title Header
  sheet.mergeCells('A1:P1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `VETRI WATER SOLUTIONS — CUSTOMER SITES & BILLING LEDGER (${year})`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 30;

  // Column Headers (Row 2)
  const headers = [
    'S.No', 'Date', 'Customer Name', 'Location', 'Contact Number',
    'Google Maps Location', 'Total Tanks', 'Tank Types', 'Measurements (L*B*H ft)',
    'Capacities (L)', 'Bill Value (₹)', 'Discount (₹)', 'Final Value (₹)',
    'Bill No.', 'Payment Mode', 'Record Status'
  ];
  const headerRow = sheet.getRow(2);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Sort sites: chronological order by workDate asc, version asc
  const sortedSites = [...sites].sort((a, b) => {
    const dComp = a.workDate.localeCompare(b.workDate);
    if (dComp !== 0) return dComp;
    return a.version - b.version;
  });

  let currentRow = 3;
  let activeBillSum = 0;
  let activeDiscountSum = 0;
  let activeFinalSum = 0;

  for (let i = 0; i < sortedSites.length; i++) {
    const s = sortedSites[i];
    const isSuperseded = s.status === 'SUPERSEDED' || !s.isLatestValidVersion;
    const isDeleted = s.isDeleted;

    const tankTypesStr = s.tanks.map((t) => t.tankType).join('\n');
    const dimsStr = s.tanks.map((t) => `${t.length}x${t.breadth}x${t.height} ft`).join('\n');
    const capStr = s.tanks.map((t) => `${t.capacityLitres.toLocaleString('en-IN')} L`).join('\n');

    const billRupees = toRupees(s.billValuePaise);
    const discountRupees = toRupees(s.discountPaise);
    const finalRupees = toRupees(s.finalValuePaise);

    if (!isSuperseded && !isDeleted) {
      activeBillSum += billRupees;
      activeDiscountSum += discountRupees;
      activeFinalSum += finalRupees;
    }

    let statusDisplay = `v${s.version}`;
    if (isDeleted) {
      statusDisplay += ' (Deleted)';
    } else if (isSuperseded) {
      statusDisplay += ' (Superseded)';
    } else if (s.version > 1) {
      statusDisplay += ' (Corrected)';
    } else {
      statusDisplay += ' (Active)';
    }

    const mapsUrlStr = typeof s.googleLocation === 'string'
      ? s.googleLocation
      : s.googleLocation?.mapsUrl || '-';

    const row = sheet.getRow(currentRow);
    row.values = [
      s.siteNumber || i + 1,
      s.workDate,
      s.customerName,
      s.location,
      s.contactNumber,
      mapsUrlStr,
      s.totalTanks,
      tankTypesStr,
      dimsStr,
      capStr,
      billRupees,
      discountRupees,
      finalRupees,
      s.billNumber,
      s.paymentMode,
      statusDisplay
    ];

    // Format financial cells
    [11, 12, 13].forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      cell.numFmt = '₹ #,##0.00';
    });

    row.alignment = { vertical: 'middle', wrapText: true };
    row.height = Math.max(22, s.tanks.length * 18);

    // Apply soft gray fill and strikethrough for superseded or deleted rows (PD-05)
    if (isSuperseded || isDeleted) {
      row.eachCell((cell, colNum) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        if ([11, 12, 13].includes(colNum)) {
          cell.font = { strike: true, color: { argb: 'FF64748B' } };
        } else {
          cell.font = { color: { argb: 'FF64748B' } };
        }
      });
    }

    currentRow++;
  }

  // Summary Row with Formulas & Pre-Calculated Results (Section 6.4)
  if (sortedSites.length > 0) {
    const summaryRow = sheet.getRow(currentRow);
    summaryRow.values = [
      'TOTAL', '', '', '', '', '', '', '', '', '',
      { formula: `SUMIF(P3:P${currentRow - 1}, "*Active*", K3:K${currentRow - 1}) + SUMIF(P3:P${currentRow - 1}, "*Corrected*", K3:K${currentRow - 1})`, result: activeBillSum },
      { formula: `SUMIF(P3:P${currentRow - 1}, "*Active*", L3:L${currentRow - 1}) + SUMIF(P3:P${currentRow - 1}, "*Corrected*", L3:L${currentRow - 1})`, result: activeDiscountSum },
      { formula: `SUMIF(P3:P${currentRow - 1}, "*Active*", M3:M${currentRow - 1}) + SUMIF(P3:P${currentRow - 1}, "*Corrected*", M3:M${currentRow - 1})`, result: activeFinalSum },
      '', '', ''
    ];

    summaryRow.font = { name: 'Calibri', size: 11, bold: true };
    summaryRow.height = 24;
    [11, 12, 13].forEach((colIdx) => {
      const cell = summaryRow.getCell(colIdx);
      cell.numFmt = '₹ #,##0.00';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    });
  }

  // Column Widths
  sheet.columns = [
    { width: 8 },  // S.No
    { width: 12 }, // Date
    { width: 22 }, // Customer Name
    { width: 20 }, // Location
    { width: 16 }, // Contact
    { width: 24 }, // Google Maps
    { width: 10 }, // Tanks
    { width: 12 }, // Tank Type
    { width: 20 }, // Dimensions
    { width: 16 }, // Capacity
    { width: 16 }, // Bill
    { width: 14 }, // Discount
    { width: 16 }, // Final
    { width: 14 }, // Bill No
    { width: 14 }, // Payment Mode
    { width: 18 }  // Status
  ];
}

/**
 * Builds a single [YEAR] - Accounts worksheet.
 */
function buildAccountsSheet(
  workbook: ExcelJS.Workbook,
  year: number,
  accounts: DailyAccountsRecord[]
): void {
  const sheetName = `${year} - Accounts`;
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  // Top Merged Category Headers (Row 1)
  sheet.mergeCells('A1:H1');
  const offHeader = sheet.getCell('A1');
  offHeader.value = `OFFICIAL EXPENSES (${year})`;
  offHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  offHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
  offHeader.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.getCell('I1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

  sheet.mergeCells('J1:O1');
  const persHeader = sheet.getCell('J1');
  persHeader.value = `PERSONAL EXPENSES (${year})`;
  persHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  persHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
  persHeader.alignment = { vertical: 'middle', horizontal: 'center' };

  const grandHeader = sheet.getCell('P1');
  grandHeader.value = 'GRAND TOTAL';
  grandHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  grandHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  grandHeader.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.getRow(1).height = 28;

  // Subheaders (Row 2)
  const subHeaders = [
    'Date', 'Refreshment (₹)', 'Transport (₹)', 'Spares/HO (₹)', 'Staff Count',
    'Attendance (Wages+Tea+Bata) (₹)', 'Staff Salary (₹)', 'Total Official (₹)',
    '', // Spacer
    'Transport (₹)', 'Refreshment (₹)', 'Groceries/Veg/Milk (₹)',
    'Lunch/Dinner (₹)', 'Other (₹)', 'Total Personal (₹)',
    'Daily Grand Total (₹)'
  ];

  const subRow = sheet.getRow(2);
  subRow.values = subHeaders;
  subRow.height = 24;
  subRow.font = { name: 'Calibri', size: 10, bold: true };
  subRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  subRow.eachCell((cell, colNum) => {
    if (colNum <= 8) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    } else if (colNum >= 10 && colNum <= 15) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } };
    } else if (colNum === 16) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    }
  });

  // Sort chronologically by entryDate asc
  const sortedAccounts = [...accounts].sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  let currentRow = 3;
  let totalOfficialYear = 0;
  let totalPersonalYear = 0;
  let grandTotalYear = 0;

  for (const acc of sortedAccounts) {
    const offRef = toRupees(acc.official.refreshmentPaise);
    const offTrans = toRupees(acc.official.transportPaise);
    const offSpares = toRupees(acc.official.sparesHOPaise);
    const staffAtt = toRupees(acc.official.staffAttendanceExpensePaise);
    const staffSal = toRupees(acc.official.staffSalaryPaise);
    const offTotal = toRupees(acc.official.totalOfficialPaise);

    const persTrans = toRupees(acc.personal.transportPaise);
    const persRef = toRupees(acc.personal.refreshmentPaise);
    const persGroc = toRupees(acc.personal.groceriesVegMilkPaise);
    const persLunch = toRupees(acc.personal.lunchDinnerPaise);
    const persOther = toRupees(acc.personal.otherPaise);
    const persTotal = toRupees(acc.personal.totalPersonalPaise);

    const dailyGrand = toRupees(acc.dailyGrandTotalPaise);

    totalOfficialYear += offTotal;
    totalPersonalYear += persTotal;
    grandTotalYear += dailyGrand;

    const row = sheet.getRow(currentRow);
    row.values = [
      acc.entryDate,
      offRef, offTrans, offSpares, acc.official.staffAttendanceCount, staffAtt, staffSal,
      { formula: `SUM(B${currentRow}:D${currentRow}) + F${currentRow} + G${currentRow}`, result: offTotal },
      '',
      persTrans, persRef, persGroc, persLunch, persOther,
      { formula: `SUM(J${currentRow}:N${currentRow})`, result: persTotal },
      { formula: `H${currentRow} + O${currentRow}`, result: dailyGrand }
    ];

    // Format currencies
    [2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16].forEach((colIdx) => {
      row.getCell(colIdx).numFmt = '₹ #,##0.00';
    });

    row.height = 20;
    row.alignment = { vertical: 'middle' };
    currentRow++;
  }

  // Annual Totals Row with Formulas & Pre-Calculated Results (Section 6.4)
  if (sortedAccounts.length > 0) {
    const totalRow = sheet.getRow(currentRow);
    totalRow.values = [
      'TOTAL',
      { formula: `SUM(B3:B${currentRow - 1})`, result: 0 },
      { formula: `SUM(C3:C${currentRow - 1})`, result: 0 },
      { formula: `SUM(D3:D${currentRow - 1})`, result: 0 },
      { formula: `SUM(E3:E${currentRow - 1})`, result: 0 },
      { formula: `SUM(F3:F${currentRow - 1})`, result: 0 },
      { formula: `SUM(G3:G${currentRow - 1})`, result: 0 },
      { formula: `SUM(H3:H${currentRow - 1})`, result: totalOfficialYear },
      '',
      { formula: `SUM(J3:J${currentRow - 1})`, result: 0 },
      { formula: `SUM(K3:K${currentRow - 1})`, result: 0 },
      { formula: `SUM(L3:L${currentRow - 1})`, result: 0 },
      { formula: `SUM(M3:M${currentRow - 1})`, result: 0 },
      { formula: `SUM(N3:N${currentRow - 1})`, result: 0 },
      { formula: `SUM(O3:O${currentRow - 1})`, result: totalPersonalYear },
      { formula: `SUM(P3:P${currentRow - 1})`, result: grandTotalYear }
    ];

    totalRow.font = { name: 'Calibri', size: 10, bold: true };
    totalRow.height = 24;
    [2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16].forEach((colIdx) => {
      const cell = totalRow.getCell(colIdx);
      cell.numFmt = '₹ #,##0.00';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    });
  }

  // Column Widths
  sheet.columns = [
    { width: 12 }, // Date
    { width: 14 }, // Off Ref
    { width: 14 }, // Off Trans
    { width: 14 }, // Off Spares
    { width: 12 }, // Staff Count
    { width: 18 }, // Staff Att
    { width: 14 }, // Staff Sal
    { width: 16 }, // Off Total
    { width: 4 },  // Spacer
    { width: 14 }, // Pers Trans
    { width: 14 }, // Pers Ref
    { width: 18 }, // Pers Groc
    { width: 14 }, // Pers Lunch
    { width: 14 }, // Pers Other
    { width: 16 }, // Pers Total
    { width: 18 }  // Grand Total
  ];
}

/**
 * Downloads the master workbook as an Excel (.xlsx) file in the user's browser.
 */
export async function downloadExcelWorkbook(data: ExcelExportData): Promise<void> {
  const workbook = await buildMasterWorkbook(data);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Vetri_Water_Solutions.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
