/**
 * tests/unit/money.test.ts
 * 
 * Unit tests for financial math, paise conversions, and currency formatting.
 * Validates compliance with DEC-07, REC-04 (Integer Paise Adapter), and REC-07 (Validation Ceilings).
 */

import { describe, it, expect } from 'vitest';
import { 
  toPaise, 
  toRupees, 
  formatIndianRupees, 
  calculateFinalValue, 
  calculateDailyAccountsTotals, 
  checkFinancialWarningCeilings 
} from '../../src/utils/money';

describe('Financial Math & Currency Adapter (DEC-07 & REC-04)', () => {
  it('converts rupees to paise without floating-point rounding errors', () => {
    expect(toPaise(150.50)).toBe(15050);
    expect(toPaise(19.99)).toBe(1999);
    expect(toPaise(0.01)).toBe(1);
    expect(toPaise(0)).toBe(0);
    // Classical IEEE 754 float edge case: 0.1 + 0.2 = 0.30000000000000004
    expect(toPaise(0.1 + 0.2)).toBe(30);
  });

  it('converts paise to rupees accurately', () => {
    expect(toRupees(15050)).toBe(150.50);
    expect(toRupees(1999)).toBe(19.99);
    expect(toRupees(1)).toBe(0.01);
  });

  it('formats amounts in Indian numbering format', () => {
    const formatted = formatIndianRupees(150000);
    // en-IN format should contain 1,50,000
    expect(formatted).toContain('1,50,000');
  });

  it('calculates final value correctly with discount (finalValue = billValue - discount)', () => {
    const res = calculateFinalValue(5000, 500);
    expect(res.isValid).toBe(true);
    expect(res.finalValue).toBe(4500);

    const zeroDiscount = calculateFinalValue(3500, 0);
    expect(zeroDiscount.isValid).toBe(true);
    expect(zeroDiscount.finalValue).toBe(3500);
  });

  it('rejects invalid discount exceeding bill value', () => {
    const res = calculateFinalValue(2000, 2500);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('Discount cannot exceed bill value.');
  });

  it('rejects negative bill values or discounts', () => {
    const negBill = calculateFinalValue(-1000, 100);
    expect(negBill.isValid).toBe(false);

    const negDisc = calculateFinalValue(1000, -50);
    expect(negDisc.isValid).toBe(false);
  });

  it('computes daily accounts totals and net balance accurately', () => {
    const totals = calculateDailyAccountsTotals({
      officialExpenses: 1200.50,
      personalExpenses: 800.50,
      collections: 5000.00,
    });

    expect(totals.totalOfficialExpenses).toBe(1200.50);
    expect(totals.totalPersonalExpenses).toBe(800.50);
    expect(totals.totalExpenses).toBe(2001.00);
    expect(totals.netDailyBalance).toBe(2999.00);
  });

  it('surfaces soft warnings when exceeding operational ceilings (REC-07)', () => {
    const normal = checkFinancialWarningCeilings({
      billValue: 50000,
      expenseAmount: 15000,
      dailyTotal: 100000,
    });
    expect(normal).toHaveLength(0);

    const excessive = checkFinancialWarningCeilings({
      billValue: 1_200_000,      // > 10L
      expenseAmount: 600_000,    // > 5L
      dailyTotal: 3_000_000,     // > 25L
    });
    expect(excessive).toHaveLength(3);
    expect(excessive[0]).toContain('exceeds ₹10,00,000');
    expect(excessive[1]).toContain('exceeds ₹5,00,000');
    expect(excessive[2]).toContain('exceeds ₹25,00,000');
  });
});
