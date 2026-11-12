
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DailyAccountsRecord, AuditLogEntry, ExpenseItem } from '../types/database';
import { toPaise } from '../utils/money';
import { 
  callCommitDailyAccountsUpdate, 
  generateOperationIdempotencyKey, 
  getClientDeviceId 
} from './api/callableClient';
import { 
  adaptAccountsFormToPayload,
  OfficialExpenseFormInput,
  PersonalExpenseFormInput
} from './adapters/financialAdapter';

const ACCOUNTS_COLLECTION = 'accounts_daily';

export type OfficialExpenseFormData = OfficialExpenseFormInput;
export type PersonalExpenseFormData = PersonalExpenseFormInput;

export async function saveDailyAccounts(
  entryDate: string,
  official: OfficialExpenseFormData,
  personal: PersonalExpenseFormData,
  _editorEmail: string,
  auditReason?: string
): Promise<DailyAccountsRecord> {
  const clientDeviceId = getClientDeviceId();
  const idempotencyKey = generateOperationIdempotencyKey('ACCOUNTS', entryDate.replace(/-/g, ''));

  const payload = adaptAccountsFormToPayload(
    entryDate,
    official,
    personal,
    idempotencyKey,
    clientDeviceId,
    auditReason
  );

  const commitResult = await callCommitDailyAccountsUpdate(payload);

  const calendarYear = parseInt(entryDate.slice(0, 4), 10) || new Date().getFullYear();
  const now = Timestamp.now();

  const officialPaise = {
    refreshmentPaise: toPaise(official.refreshment),
    transportPaise: toPaise(official.transport),
    sparesHOPaise: toPaise(official.sparesHO),
    staffAttendanceCount: Math.max(0, Math.floor(official.staffAttendanceCount || 0)),
    staffAttendanceExpensePaise: toPaise(official.staffAttendanceExpense),
    staffSalaryPaise: toPaise(official.staffSalary),
    salaryEntries: (official.salaryEntries as ExpenseItem[] | undefined) || [],
    notes: official.notes?.trim() || undefined,
    totalOfficialPaise: commitResult.totals.totalOfficialPaise
  };

  const personalPaise = {
    transportPaise: toPaise(personal.transport),
    refreshmentPaise: toPaise(personal.refreshment),
    groceriesVegMilkPaise: toPaise(personal.groceriesVegMilk),
    lunchDinnerPaise: toPaise(personal.lunchDinner),
    otherPaise: toPaise(personal.other),
    notes: personal.notes?.trim() || undefined,
    totalPersonalPaise: commitResult.totals.totalPersonalPaise
  };

  const updatedRecord: DailyAccountsRecord = {
    entryDate,
    calendarYear,
    official: officialPaise,
    personal: personalPaise,
    dailyGrandTotalPaise: commitResult.totals.dailyGrandTotalPaise,
    revisionsCount: commitResult.revisionsCount,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };

  return updatedRecord;
}

export function subscribeDailyAccountsForYear(
  calendarYear: number,
  callback: (records: DailyAccountsRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, ACCOUNTS_COLLECTION),
    where('calendarYear', '==', calendarYear),
    where('isDeleted', '==', false),
    orderBy('entryDate', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => d.data() as DailyAccountsRecord);
      callback(records);
    },
    (err) => {
      console.error('[AccountService] Year subscription error:', err);
      if (onError) onError(err);
    }
  );
}

export async function getDailyAccountForDate(entryDate: string): Promise<DailyAccountsRecord | null> {
  const docRef = doc(db, ACCOUNTS_COLLECTION, entryDate);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as DailyAccountsRecord;
}

export async function getDailyAccountAuditLog(entryDate: string): Promise<AuditLogEntry[]> {
  const q = query(
    collection(db, ACCOUNTS_COLLECTION, entryDate, 'audit_log'),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as AuditLogEntry);
}
