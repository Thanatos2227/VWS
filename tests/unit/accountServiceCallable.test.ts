/**
 * tests/unit/accountServiceCallable.test.ts
 * 
 * Unit tests verifying that accountService.ts routes daily accounts mutations through
 * callableClient.ts rather than direct Firestore writes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveDailyAccounts } from '../../src/services/accountService';
import * as callableClient from '../../src/services/api/callableClient';

vi.mock('../../src/services/api/callableClient', async () => {
  const actual = await vi.importActual<typeof callableClient>('../../src/services/api/callableClient');
  return {
    ...actual,
    callCommitDailyAccountsUpdate: vi.fn()
  };
});

describe('Account Service — Callable Cloud Functions Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const officialData = {
    refreshment: 120, // ₹120
    transport: 250,   // ₹250
    sparesHO: 500,    // ₹500
    staffAttendanceCount: 3,
    staffAttendanceExpense: 2400, // ₹2,400 (Wages + Tea + Bata combined)
    staffSalary: 5000, // ₹5,000
    salaryEntries: [
      { id: 'sal_1', staffName: 'Murugan', amountPaise: 300000 },
      { id: 'sal_2', staffName: 'Karthi', amountPaise: 200000 }
    ],
    notes: 'Site work spares purchased'
  };

  const personalData = {
    transport: 100, // ₹100
    refreshment: 50, // ₹50
    groceriesVegMilk: 450, // ₹450
    lunchDinner: 300, // ₹300
    other: 0,
    notes: 'Household groceries'
  };

  it('routes saveDailyAccounts through callCommitDailyAccountsUpdate with adapted paise', async () => {
    const expectedOfficialPaise = (120 + 250 + 500 + 2400 + 5000) * 100; // 827,000 paise
    const expectedPersonalPaise = (100 + 50 + 450 + 300) * 100;          // 90,000 paise
    const expectedGrandTotalPaise = expectedOfficialPaise + expectedPersonalPaise; // 917,000 paise

    vi.mocked(callableClient.callCommitDailyAccountsUpdate).mockResolvedValue({
      status: 'COMMITTED',
      entryDate: '2026-11-09',
      totals: {
        totalOfficialPaise: expectedOfficialPaise,
        totalPersonalPaise: expectedPersonalPaise,
        dailyGrandTotalPaise: expectedGrandTotalPaise
      },
      revisionsCount: 1,
      serverCommittedAt: '2026-11-09T14:00:00.000Z'
    });

    const result = await saveDailyAccounts(
      '2026-11-09',
      officialData,
      personalData,
      'vetriwatersolution@gmail.com',
      'Daily update'
    );

    expect(callableClient.callCommitDailyAccountsUpdate).toHaveBeenCalledTimes(1);
    const passedPayload = vi.mocked(callableClient.callCommitDailyAccountsUpdate).mock.calls[0][0];

    expect(passedPayload.idempotencyKey).toMatch(/^OP_IDEMP_ACCOUNTS_20261109_/);
    expect(passedPayload.entryDate).toBe('2026-11-09');
    expect(passedPayload.official.refreshmentPaise).toBe(12000);
    expect(passedPayload.official.staffSalaryPaise).toBe(500000);
    expect(passedPayload.official.salaryEntries?.length).toBe(2);
    expect(passedPayload.personal.groceriesVegMilkPaise).toBe(45000);

    expect(result.entryDate).toBe('2026-11-09');
    expect(result.official.totalOfficialPaise).toBe(expectedOfficialPaise);
    expect(result.personal.totalPersonalPaise).toBe(expectedPersonalPaise);
    expect(result.dailyGrandTotalPaise).toBe(expectedGrandTotalPaise);
    expect(result.revisionsCount).toBe(1);
  });

  it('propagates errors when callable invocation fails without returning false commit', async () => {
    vi.mocked(callableClient.callCommitDailyAccountsUpdate).mockRejectedValue(
      new callableClient.CallableApiError('Failed to fetch', 'unavailable', undefined, true)
    );

    await expect(saveDailyAccounts(
      '2026-11-09',
      officialData,
      personalData,
      'vetriwatersolution@gmail.com'
    )).rejects.toThrow('Failed to fetch');
  });
});

