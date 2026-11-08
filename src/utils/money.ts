/**
 * src/utils/money.ts
 * 
 * Financial calculation engine and currency formatting for Vetri Water Solutions.
 * Designed to strictly isolate floating-point IEEE 754 arithmetic and support
 * modular switching between integer paise and float rupees (governed by REC-04).
 */

/**
 * Converts a rupee amount (e.g., 150.50) to exact integer paise (15050).
 * Eliminates decimal rounding drift by rounding to the nearest whole integer.
 */
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise (e.g., 15050) back to rupees (150.50).
 */
export function toRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return paise / 100;
}

/**
 * Formats a monetary amount into standard Indian Rupee notation (e.g. ₹ 1,50,000.00).
 */
export function formatIndianRupees(amountInRupees: number): string {
  if (!Number.isFinite(amountInRupees)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInRupees);
}

/**
 * Computes net collected bill value after subtracting discount.
 * Enforces non-negative result invariant (discount cannot exceed gross bill value).
 * Formula: finalValue = billValue - discount
 */
export function calculateFinalValue(billValue: number, discount: number = 0): {
  finalValue: number;
  isValid: boolean;
  error?: string;
} {
  if (billValue < 0) {
    return { finalValue: 0, isValid: false, error: 'Bill value cannot be negative.' };
  }
  if (discount < 0) {
    return { finalValue: billValue, isValid: false, error: 'Discount cannot be negative.' };
  }
  if (discount > billValue) {
    return { finalValue: 0, isValid: false, error: 'Discount cannot exceed bill value.' };
  }

  // Exact math using integer paise conversion
  const billPaise = toPaise(billValue);
  const discountPaise = toPaise(discount);
  const finalPaise = billPaise - discountPaise;

  return {
    finalValue: toRupees(finalPaise),
    isValid: true,
  };
}

/**
 * Computes daily accounts balances:
 * totalOfficialExpenses, totalPersonalExpenses, totalExpenses, and netDailyBalance.
 */
export function calculateDailyAccountsTotals(params: {
  officialExpenses: number;
  personalExpenses: number;
  collections: number;
}): {
  totalOfficialExpenses: number;
  totalPersonalExpenses: number;
  totalExpenses: number;
  netDailyBalance: number;
} {
  const officialPaise = toPaise(params.officialExpenses);
  const personalPaise = toPaise(params.personalExpenses);
  const collectionsPaise = toPaise(params.collections);

  const totalExpensesPaise = officialPaise + personalPaise;
  const netBalancePaise = collectionsPaise - totalExpensesPaise;

  return {
    totalOfficialExpenses: toRupees(officialPaise),
    totalPersonalExpenses: toRupees(personalPaise),
    totalExpenses: toRupees(totalExpensesPaise),
    netDailyBalance: toRupees(netBalancePaise),
  };
}

/**
 * Operational Keystroke Validation Warning Ceilings (REC-07)
 * Returns soft warnings if values exceed standard thresholds without hard-blocking.
 */
export function checkFinancialWarningCeilings(params: {
  billValue?: number;
  expenseAmount?: number;
  dailyTotal?: number;
}): string[] {
  const warnings: string[] = [];

  // ₹10,00,000 single bill ceiling
  if (params.billValue !== undefined && params.billValue > 1_000_000) {
    warnings.push(`Notice: Bill value of ${formatIndianRupees(params.billValue)} exceeds ₹10,00,000. Please confirm if intentional.`);
  }

  // ₹5,00,000 single expense entry ceiling
  if (params.expenseAmount !== undefined && params.expenseAmount > 500_000) {
    warnings.push(`Notice: Expense amount of ${formatIndianRupees(params.expenseAmount)} exceeds ₹5,00,000. Please confirm if intentional.`);
  }

  // ₹25,00,000 daily accounts total ceiling
  if (params.dailyTotal !== undefined && params.dailyTotal > 2_500_000) {
    warnings.push(`Notice: Daily accounts total of ${formatIndianRupees(params.dailyTotal)} exceeds ₹25,00,000. Please confirm if intentional.`);
  }

  return warnings;
}
