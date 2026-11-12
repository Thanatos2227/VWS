
import { describe, it, expect, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { createHash } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { buildMasterWorkbook } from '../../src/services/excelService';
import { SiteRecord, DailyAccountsRecord } from '../../src/types/database';

const syntheticSites: SiteRecord[] = [
  {
    id: 'syn_site_1',
    sequenceNumber: 1,
    siteNumber: 1,
    year: 2026,
    calendarYear: 2026,
    workDate: '2026-03-01',
    customerName: 'Synthetic Customer Alpha',
    location: 'Sector 4, Test City',
    contactNumber: '9876543210',
    googleLocation: 'https://maps.google.com/?q=12.9716,77.5946',
    billNumber: 'SYN-001',
    paymentMode: 'Cash',
    totalTanks: 2,
    tanks: [
      { tankIndex: 1, tankType: 'OHT', length: 10, breadth: 8, height: 6, capacityLitres: 13592 },
      { tankIndex: 2, tankType: 'UG', length: 12, breadth: 10, height: 6, capacityLitres: 20388 }
    ],
    billValuePaise: 500000,
    discountPaise: 50000,
    finalValuePaise: 450000,
    version: 1,
    originalRecordId: 'syn_site_1',
    previousRecordId: null,
    isLatestValidVersion: false,
    status: 'SUPERSEDED',
    isDeleted: false,
    createdAt: new Date('2026-03-01T10:00:00Z'),
    updatedAt: new Date('2026-03-02T10:00:00Z')
  },
  {
    id: 'syn_site_1_v2',
    sequenceNumber: 1,
    siteNumber: 1,
    year: 2026,
    calendarYear: 2026,
    workDate: '2026-03-01',
    customerName: 'Synthetic Customer Alpha',
    location: 'Sector 4, Test City',
    contactNumber: '9876543210',
    googleLocation: 'https://maps.google.com/?q=12.9716,77.5946',
    billNumber: 'SYN-001',
    paymentMode: 'Cash',
    totalTanks: 2,
    tanks: [
      { tankIndex: 1, tankType: 'OHT', length: 10, breadth: 8, height: 6, capacityLitres: 13592 },
      { tankIndex: 2, tankType: 'UG', length: 12, breadth: 10, height: 6, capacityLitres: 20388 }
    ],
    billValuePaise: 480000,
    discountPaise: 30000,
    finalValuePaise: 450000,
    version: 2,
    originalRecordId: 'syn_site_1',
    previousRecordId: 'syn_site_1',
    isLatestValidVersion: true,
    status: 'ACTIVE',
    isDeleted: false,
    createdAt: new Date('2026-03-01T10:00:00Z'),
    updatedAt: new Date('2026-03-02T11:00:00Z'),
    correctionReason: 'Corrected gross bill'
  },
  {
    id: 'syn_site_2',
    sequenceNumber: 2,
    siteNumber: 2,
    year: 2026,
    calendarYear: 2026,
    workDate: '2026-03-05',
    customerName: 'Synthetic Customer Beta',
    location: 'Sector 9, Test City',
    contactNumber: '9123456780',
    googleLocation: null,
    billNumber: 'SYN-002',
    paymentMode: 'Online',
    totalTanks: 1,
    tanks: [
      { tankIndex: 1, tankType: 'OHT', length: 8, breadth: 6, height: 5, capacityLitres: 6796 }
    ],
    billValuePaise: 250000,
    discountPaise: 0,
    finalValuePaise: 250000,
    version: 1,
    originalRecordId: 'syn_site_2',
    previousRecordId: null,
    isLatestValidVersion: true,
    status: 'ACTIVE',
    isDeleted: false,
    createdAt: new Date('2026-03-05T14:00:00Z'),
    updatedAt: new Date('2026-03-05T14:00:00Z')
  }
];

const syntheticAccounts: DailyAccountsRecord[] = [
  {
    entryDate: '2026-03-01',
    year: 2026,
    calendarYear: 2026,
    official: {
      refreshmentPaise: 15000,
      transportPaise: 35000,
      sparesHOPaise: 20000,
      staffAttendanceCount: 2,
      staffAttendanceExpensePaise: 140000,
      staffSalaryPaise: 0,
      totalOfficialPaise: 210000
    },
    personal: {
      transportPaise: 10000,
      refreshmentPaise: 5000,
      groceriesVegMilkPaise: 50000,
      lunchDinnerPaise: 25000,
      otherPaise: 10000,
      totalPersonalPaise: 100000
    },
    dailyGrandTotalPaise: 310000,
    revisionsCount: 0
  }
];

describe('Empirical Workbook Verification on Physical Disk File (VER-05 / DOC-007)', () => {
  const testFilePath = resolve(__dirname, '../../synthetic_test_workbook.xlsx');

  afterAll(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  it('generates, saves to disk, re-reads, and verifies structure and pre-calculated values', async () => {
    const workbook = await buildMasterWorkbook({
      calendarYears: [2026],
      sitesByYear: { 2026: syntheticSites },
      accountsByYear: { 2026: syntheticAccounts }
    });

    await workbook.xlsx.writeFile(testFilePath);
    expect(existsSync(testFilePath)).toBe(true);

    const reloadedWorkbook = new ExcelJS.Workbook();
    await reloadedWorkbook.xlsx.readFile(testFilePath);

    const sheetNames = reloadedWorkbook.worksheets.map(s => s.name);
    expect(sheetNames).toContain('2026 - Site Details');
    expect(sheetNames).toContain('2026 - Accounts');
    expect(sheetNames.some(n => n.toLowerCase().includes('mar') || n.toLowerCase().includes('jan'))).toBe(false);

    const siteSheet = reloadedWorkbook.getWorksheet('2026 - Site Details')!;
    expect(siteSheet.getCell('A1').value).toContain('VETRI WATER SOLUTIONS');

    const row3 = siteSheet.getRow(3);
    expect(String(row3.getCell(16).value)).toContain('Superseded');
    expect(row3.getCell(11).font?.strike).toBe(true);

    const row4 = siteSheet.getRow(4);
    expect(String(row4.getCell(16).value)).toContain('Corrected');
    expect(row4.getCell(11).font?.strike).toBeFalsy();

    const summaryRow = siteSheet.getRow(6);
    const finalSummaryVal = summaryRow.getCell(13).value as { formula: string; result: number };
    expect(finalSummaryVal.formula).toContain('SUMIF');
    expect(finalSummaryVal.result).toBe(7000);

    const accSheet = reloadedWorkbook.getWorksheet('2026 - Accounts')!;
    expect(accSheet.getCell('A1').value).toContain('OFFICIAL EXPENSES');
    expect(accSheet.getCell('J1').value).toContain('PERSONAL EXPENSES');
    expect(accSheet.getCell('P1').value).toBe('GRAND TOTAL');
    expect(accSheet.getRow(2).getCell(9).value).toBe('');

    const accRow3 = accSheet.getRow(3);
    const offTotalCell = accRow3.getCell(8).value as { formula: string; result: number };
    const persTotalCell = accRow3.getCell(15).value as { formula: string; result: number };
    const grandTotalCell = accRow3.getCell(16).value as { formula: string; result: number };

    expect(offTotalCell.result).toBe(2100);
    expect(persTotalCell.result).toBe(1000);
    expect(grandTotalCell.result).toBe(3100);

    const jsonDumpString = JSON.stringify({ sites: syntheticSites, accounts: syntheticAccounts }, null, 2);
    const jsonHash = createHash('sha256').update(Buffer.from(jsonDumpString, 'utf-8')).digest('hex');
    expect(jsonHash).toHaveLength(64);
  });
});

