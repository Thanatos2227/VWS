
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
    billValuePaise: 450000,
    discountPaise: 50000,
    finalValuePaise: 400000,
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
    discountPaise: 20000,
    finalValuePaise: 430000,
    correctionReason: 'Corrected agreed discount'
  };

  const mockDailyAccount: DailyAccountsRecord = {
    entryDate: '2026-03-15',
    year: 2026,
    calendarYear: 2026,
    official: {
      refreshmentPaise: 15000,
      transportPaise: 30000,
      sparesHOPaise: 25000,
      staffAttendanceCount: 3,
      staffAttendanceExpensePaise: 180000,
      staffSalaryPaise: 0,
      totalOfficialPaise: 250000
    },
    personal: {
      transportPaise: 10000,
      refreshmentPaise: 5000,
      groceriesVegMilkPaise: 45000,
      lunchDinnerPaise: 30000,
      otherPaise: 10000,
      totalPersonalPaise: 100000
    },
    dailyGrandTotalPaise: 350000,
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
    const row = sheet.getRow(3);

    expect(row.getCell(8).value).toBe('OHT\nUG');
    expect(row.getCell(9).value).toBe('10x8x6 ft\n12x10x6 ft');
    expect(row.getCell(10).value).toContain('13,592 L\n20,388 L');
  });

  it('applies soft gray fill (#E2E8F0) and strikethrough font on superseded site rows (PD-05)', async () => {
    const workbook = await buildMasterWorkbook({
      calendarYears: [2026],
      sitesByYear: { 2026: [mockSiteV1, mockSiteV2] },
      accountsByYear: { 2026: [] }
    });

    const sheet = workbook.getWorksheet('2026 - Site Details')!;
    const rowV1 = sheet.getRow(3);
    const rowV2 = sheet.getRow(4);

    const billCellV1 = rowV1.getCell(11);
    expect(billCellV1.font?.strike).toBe(true);

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
    const summaryRow = sitesSheet.getRow(5);
    const finalTotalCell = summaryRow.getCell(13);

    const cellValue = finalTotalCell.value as { formula: string; result: number };
    expect(cellValue).toBeDefined();
    expect(typeof cellValue.formula).toBe('string');
    expect(cellValue.formula).toContain('SUMIF');
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

    expect(headerRow1.getCell('A').value).toContain('OFFICIAL EXPENSES');
    expect(headerRow1.getCell('J').value).toContain('PERSONAL EXPENSES');
    expect(headerRow1.getCell('P').value).toBe('GRAND TOTAL');

    const dataRow = sheet.getRow(3);
    expect(dataRow.getCell(1).value).toBe('2026-03-15');
    expect(dataRow.getCell(6).value).toBe(1800);
    expect(dataRow.getCell(9).value).toBe('');

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

