
import { toPaise, calculateFinalValue } from '../../utils/money';
import { calculateTankCapacityLitres } from '../../utils/tank';
import { 
  CommitSiteJobPayload, 
  CommitSiteCorrectionPayload, 
  CommitDailyAccountsPayload 
} from '../api/callableClient';

export interface SiteFormInput {
  workDate: string;
  customerName: string;
  location: string;
  contactNumber: string;
  googleLocation?: string;
  billNumber: string;
  paymentMode: 'Cash' | 'Online';
  billValue: number;
  discount: number;
  tanks: Array<{
    tankType: 'OHT' | 'UG';
    length: number;
    breadth: number;
    height: number;
  }>;
  correctionReason?: string;
}

export interface OfficialExpenseFormInput {
  refreshment: number;
  transport: number;
  sparesHO: number;
  staffAttendanceCount: number;
  staffAttendanceExpense: number;
  staffSalary: number;
  salaryEntries?: Array<{
    id: string;
    staffName: string;
    amountPaise: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface PersonalExpenseFormInput {
  transport: number;
  refreshment: number;
  groceriesVegMilk: number;
  lunchDinner: number;
  other: number;
  notes?: string;
}

export function adaptSiteFormToJobPayload(
  data: SiteFormInput,
  idempotencyKey: string,
  clientDeviceId: string
): CommitSiteJobPayload {
  const billValuePaise = toPaise(data.billValue);
  const discountPaise = toPaise(data.discount || 0);
  const finalValuePaise = calculateFinalValue(billValuePaise, discountPaise).finalValue;

  return {
    idempotencyKey,
    clientDeviceId,
    workDate: data.workDate,
    customerName: data.customerName.trim(),
    location: data.location.trim(),
    contactNumber: data.contactNumber.trim(),
    googleLocation: data.googleLocation?.trim() || undefined,
    billNumber: data.billNumber.trim(),
    paymentMode: data.paymentMode,
    billValuePaise,
    discountPaise,
    finalValuePaise,
    tanks: data.tanks.map((t) => ({
      tankType: t.tankType,
      length: t.length,
      breadth: t.breadth,
      height: t.height,
      capacityLitres: calculateTankCapacityLitres({ length: t.length, breadth: t.breadth, height: t.height })
    }))
  };
}

export function adaptSiteFormToCorrectionPayload(
  previousRecordId: string,
  expectedPreviousVersion: number,
  data: SiteFormInput,
  idempotencyKey: string,
  clientDeviceId: string
): CommitSiteCorrectionPayload {
  const jobPayload = adaptSiteFormToJobPayload(data, idempotencyKey, clientDeviceId);

  return {
    ...jobPayload,
    previousRecordId,
    expectedPreviousVersion,
    correctionReason: data.correctionReason?.trim() || undefined
  };
}

export function adaptAccountsFormToPayload(
  entryDate: string,
  official: OfficialExpenseFormInput,
  personal: PersonalExpenseFormInput,
  idempotencyKey: string,
  clientDeviceId: string,
  auditReason?: string
): CommitDailyAccountsPayload {
  return {
    idempotencyKey,
    clientDeviceId,
    entryDate,
    official: {
      refreshmentPaise: toPaise(official.refreshment),
      transportPaise: toPaise(official.transport),
      sparesHOPaise: toPaise(official.sparesHO),
      staffAttendanceCount: Math.max(0, Math.floor(official.staffAttendanceCount || 0)),
      staffAttendanceExpensePaise: toPaise(official.staffAttendanceExpense),
      staffSalaryPaise: toPaise(official.staffSalary),
      salaryEntries: official.salaryEntries,
      notes: official.notes?.trim() || undefined
    },
    personal: {
      transportPaise: toPaise(personal.transport),
      refreshmentPaise: toPaise(personal.refreshment),
      groceriesVegMilkPaise: toPaise(personal.groceriesVegMilk),
      lunchDinnerPaise: toPaise(personal.lunchDinner),
      otherPaise: toPaise(personal.other),
      notes: personal.notes?.trim() || undefined
    },
    auditReason: auditReason?.trim() || undefined
  };
}

