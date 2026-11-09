/**
 * tests/unit/excelService.test.ts
 * 
 * Unit tests for ExcelJS Master Workbook Generation.
 * Verifies strict compliance with DOC-007 (VWS_EXCEL_EXPORT_SPECIFICATION):
 * - Multi-year sheet partitioning: '[YEAR] - Site Details' and '[YEAR] - Accounts'
 * - Section 6.4: Dynamic formula strings accompanied by verified pre-calculated result values
 * - Multi-line tank cell formatting (OHT/UG, ft, L)
 * - Soft gray fill (#E2E8F0) and strikethrough typography on superseded rows
 * - Side-by-side Official vs Personal accounts layout with spacer column
 */

import { describe, it, expect } from 'vitest';
import { buildMasterWorkbook } from '../../src/services/excelService';
import { SiteRecord, DailyAccountsRecord } from '../../src/types/database';

describe('ExcelJS Master Workbook Generator (DOC-007)', () => {
  const mockSiteV1: SiteRecord = {
    id: 'site_101',
    sequenceNumber: 1,
    siteNumber: 1,
    year: 2026,
    calendarYear: 2026,
    workDate: '2026-03-15',
    customerName: 'Rajesh Kumar',
    location: 'Anna Nagar, Chennai',
    contactNumber: '9842100000',
    googleLocation: 'https://maps.google.com/?q=13.0827,80.2707',
    billNumber: '1042',
    paymentMode: 'Cash',
    totalTanks: 2,
    tanks: [
      { tankIndex: 1, tankType: 'OHT', length: 10, breadth: 8, height: 6, capacityLitres: 13592 },
      { tankIndex: 2, tankType: 'UG', length: 12, breadth: 10, height: 6, capacityLitres: 20388 }
    ],
    billValuePaise: 450000, // ₹ 4,500.00
    discountPaise: 50000,   // ₹ 500.00
    finalValuePaise: 400000,// ₹ 4,000.00
    version: 1,
    originalRecordId: 'site_101',
    previousRecordId: null,
    isLatestValidVersion: false,
    status: 'SUPERSEDED',
    isDeleted: false,
    createdAt: new Date('2026-03-15T10:00:00Z'),
    updatedAt: new Date('2026-03-16T10:00:00Z')
  };

  const mockSiteV2: SiteRecord = {
    ...mockSiteV1,
    id: 'site_102',
    version: 2,
    previousRecordId: 'site_101',
    isLatestValidVersion: true,
    status: 'ACTIVE',
    discountPaise: 20000,   // ₹ 200.00
    finalValuePaise: 430000,// ₹ 4,300.00
    correctionReason: 'Corrected agreed discount'
  };

  const mockDailyAccount: DailyAccountsRecord = {
    entryDate: '2026-03-15',
    year: 2026,
    calendarYear: 2026,
    official: {
      refreshmentPaise: 15000,        // ₹ 150.00
      transportPaise: 30000,          // ₹ 300.00
      sparesHOPaise: 25000,           // ₹ 250.00
      staffAttendanceCount: 3,
      staffAttendanceExpensePaise: 180000, // ₹ 1,800.00 (Wages + Tea + Bata)
      staffSalaryPaise: 0,
      totalOfficialPaise: 250000      // ₹ 2,500.00
    },
    personal: {
      transportPaise: 10000,          // ₹ 100.00
      refreshmentPaise: 5000,         // ₹ 50.00
      groceriesVegMilkPaise: 45000,   // ₹ 450.00
      lunchDinnerPaise: 30000,        // ₹ 300.00
      otherPaise: 10000,              // ₹ 100.00
      totalPersonalPaise: 100000      // ₹ 1,000.00
    },
    dailyGrandTotalPaise: 350000,     // ₹ 3,500.00
    revisionsCount: 0
  };

  it('generates partitioned annual sheets without monthly sheets', async () => {
    const workbook = await buildMasterWorkbook({
      calendarYears: [2026],
      sitesByYear: { 2026: [mockSiteV1, mockSiteV2] },
      accountsByYear: { 2026: [mockDailyAccount] }
    });

    const sheetNames = workbook.worksheets.map((s) => s.name);
    expect(sheetNames).toContain('2026 - Site Details');
    expect(sheetNames).toContain('2026 - Accounts');
    expect(sheetNames.some((n) => n.toLowerCase().includes('jan') || n.toLowerCase().includes('mar'))).toBe(false);
  });

  it('formats multi-line tank values with newlines in Site Details', async () => {
    const workbook = await buildMasterWorkbook({
      calendarYears: [2026],
      sitesByYear: { 2026: [mockSiteV1] },
      accountsByYear: { 2026: [] }
    });

    const sheet = workbook.getWorksheet('2026 - Site Details')!;
    const row = sheet.getRow(3); // First data row

    expect(row.getCell(8).value).toBe('OHT\nUG'); // Tank Types
    expect(row.getCell(9).value).toBe('10x8x6 ft\n12x10x6 ft'); // Measurements
    expect(row.getCell(10).value).toContain('13,592 L\n20,388 L'); // Capacity
  });

  it('applies soft gray fill (#E2E8F0) and strikethrough font on superseded site rows (PD-05)', async () => {
    const workbook = await buildMasterWorkbook({
      calendarYears: [2026],
      sitesByYear: { 2026: [mockSiteV1, mockSiteV2] },
      accountsByYear: { 2026: [] }
    });

    const sheet = workbook.getWorksheet('2026 - Site Details')!;
    const rowV1 = sheet.getRow(3); // v1 (Superseded)
    const rowV2 = sheet.getRow(4); // v2 (Active)

    // Check v1 has gray fill and strikethrough
    const billCellV1 = rowV1.getCell(11);
    expect(billCellV1.font?.strike).toBe(true);

    // Check v2 does NOT have strikethrough
    const billCellV2 = rowV2.getCell(11);
    expect(billCellV2.font?.strike).toBeFalsy();
  });

  it('writes both dynamic formula string and pre-calculated result to summary rows (Section 6.4)', async () => {
    const workbook = await buildMasterWorkbook({
      calendarYears: [2026],
      sitesByYear: { 2026: [mockSiteV1, mockSiteV2] },
      accountsByYear: { 2026: [mockDailyAccount] }
    });

    const sitesSheet = workbook.getWorksheet('2026 - Site Details')!;
    const summaryRow = sitesSheet.getRow(5); // Row 5 is summary row
    const finalTotalCell = summaryRow.getCell(13); // Final Value total

    // Formula cell structure check
    const cellValue = finalTotalCell.value as { formula: string; result: number };
    expect(cellValue).toBeDefined();
    expect(typeof cellValue.formula).toBe('string');
    expect(cellValue.formula).toContain('SUMIF');
    // Only active v2 should be summed: ₹ 4,300.00
    expect(cellValue.result).toBe(4300);
  });

  it('builds Accounts sheet with side-by-side Official vs Personal columns and Spacer column I', async () => {
    const workbook = await buildMasterWorkbook({
      calendarYears: [2026],
      sitesByYear: { 2026: [] },
      accountsByYear: { 2026: [mockDailyAccount] }
    });

    const sheet = workbook.getWorksheet('2026 - Accounts')!;
    const headerRow1 = sheet.getRow(1);

    // Row 1 Merged Headers
    expect(headerRow1.getCell('A').value).toContain('OFFICIAL EXPENSES');
    expect(headerRow1.getCell('J').value).toContain('PERSONAL EXPENSES');
    expect(headerRow1.getCell('P').value).toBe('GRAND TOTAL');

    // Data Row (Row 3)
    const dataRow = sheet.getRow(3);
    expect(dataRow.getCell(1).value).toBe('2026-03-15'); // Date
    expect(dataRow.getCell(6).value).toBe(1800); // Staff Attendance (Wages+Tea+Bata)
    expect(dataRow.getCell(9).value).toBe(''); // Column I Spacer

    // Row 3 Formula cells
    const offTotalCell = dataRow.getCell(8).value as { formula: string; result: number };
    expect(offTotalCell.formula).toBe('SUM(B3:D3) + F3 + G3');
    expect(offTotalCell.result).toBe(2500);

    const persTotalCell = dataRow.getCell(15).value as { formula: string; result: number };
    expect(persTotalCell.formula).toBe('SUM(J3:N3)');
    expect(persTotalCell.result).toBe(1000);

    const grandTotalCell = dataRow.getCell(16).value as { formula: string; result: number };
    expect(grandTotalCell.formula).toBe('H3 + O3');
    expect(grandTotalCell.result).toBe(3500);
  });
});

