
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

export function toRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return paise / 100;
}

export function formatIndianRupees(amountInRupees: number): string {
  if (!Number.isFinite(amountInRupees)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInRupees);
}

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

  const billPaise = toPaise(billValue);
  const discountPaise = toPaise(discount);
  const finalPaise = billPaise - discountPaise;

  return {
    finalValue: toRupees(finalPaise),
    isValid: true,
  };
}

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

export function checkFinancialWarningCeilings(params: {
  billValue?: number;
  expenseAmount?: number;
  dailyTotal?: number;
}): string[] {
  const warnings: string[] = [];

  if (params.billValue !== undefined && params.billValue > 1_000_000) {
    warnings.push(`Notice: Bill value of ${formatIndianRupees(params.billValue)} exceeds ₹10,00,000. Please confirm if intentional.`);
  }

  if (params.expenseAmount !== undefined && params.expenseAmount > 500_000) {
    warnings.push(`Notice: Expense amount of ${formatIndianRupees(params.expenseAmount)} exceeds ₹5,00,000. Please confirm if intentional.`);
  }

  if (params.dailyTotal !== undefined && params.dailyTotal > 2_500_000) {
    warnings.push(`Notice: Daily accounts total of ${formatIndianRupees(params.dailyTotal)} exceeds ₹25,00,000. Please confirm if intentional.`);
  }

  return warnings;
}

