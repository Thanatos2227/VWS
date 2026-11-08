/**
 * src/services/accountService.ts
 * 
 * Daily Accounts & Expense Management Service.
 * Implements Official vs Personal ledger split, attendance combined wages+tea+bata,
 * staff salary modes, auto-calculated totals, and immutable audit logging.
 * Complies with DOC-002 (§2.4), DOC-005 (§3.2), and DEC-01 through DEC-25.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DailyAccountsRecord, AuditLogEntry, ExpenseItem } from '../types/database';
import { toPaise } from '../utils/money';

const ACCOUNTS_COLLECTION = 'accounts_daily';

export interface OfficialExpenseFormData {
  refreshment: number;
  transport: number;
  sparesHO: number;
  staffAttendanceCount: number;
  staffAttendanceExpense: number; // Combined Wages + Tea + Refreshments + Bata
  staffSalary: number;
  salaryEntries?: ExpenseItem[];
  notes?: string;
}

export interface PersonalExpenseFormData {
  transport: number;
  refreshment: number;
  groceriesVegMilk: number;
  lunchDinner: number;
  other: number;
  notes?: string;
}

/**
 * Saves or updates a daily account record for a given date (YYYY-MM-DD).
 * Atomically recalculates category totals and appends an audit log if modified.
 */
export async function saveDailyAccounts(
  entryDate: string,
  official: OfficialExpenseFormData,
  personal: PersonalExpenseFormData,
  editorEmail: string,
  auditReason?: string
): Promise<DailyAccountsRecord> {
  const calendarYear = parseInt(entryDate.slice(0, 4), 10) || new Date().getFullYear();
  const now = Timestamp.now();
  const docRef = doc(db, ACCOUNTS_COLLECTION, entryDate);

  const officialPaise = {
    refreshmentPaise: toPaise(official.refreshment),
    transportPaise: toPaise(official.transport),
    sparesHOPaise: toPaise(official.sparesHO),
    staffAttendanceCount: Math.max(0, Math.floor(official.staffAttendanceCount || 0)),
    staffAttendanceExpensePaise: toPaise(official.staffAttendanceExpense),
    staffSalaryPaise: toPaise(official.staffSalary),
    salaryEntries: official.salaryEntries || [],
    notes: official.notes?.trim() || undefined
  };

  const personalPaise = {
    transportPaise: toPaise(personal.transport),
    refreshmentPaise: toPaise(personal.refreshment),
    groceriesVegMilkPaise: toPaise(personal.groceriesVegMilk),
    lunchDinnerPaise: toPaise(personal.lunchDinner),
    otherPaise: toPaise(personal.other),
    notes: personal.notes?.trim() || undefined
  };

  const totalOfficialPaise = 
    officialPaise.refreshmentPaise + 
    officialPaise.transportPaise + 
    officialPaise.sparesHOPaise + 
    officialPaise.staffAttendanceExpensePaise + 
    officialPaise.staffSalaryPaise;

  const totalPersonalPaise = 
    personalPaise.transportPaise + 
    personalPaise.refreshmentPaise + 
    personalPaise.groceriesVegMilkPaise + 
    personalPaise.lunchDinnerPaise + 
    personalPaise.otherPaise;

  const dailyGrandTotalPaise = totalOfficialPaise + totalPersonalPaise;

  let updatedRecord: DailyAccountsRecord;

  await runTransaction(db, async (transaction) => {
    const existingSnap = await transaction.get(docRef);
    let revisionsCount = 0;
    let createdAt: Timestamp = now;

    if (existingSnap.exists()) {
      const existing = existingSnap.data() as DailyAccountsRecord;
      revisionsCount = (existing.revisionsCount || 0) + 1;
      createdAt = (existing.createdAt as Timestamp) || now;

      // Append revision audit log
      const auditLogRef = doc(collection(db, ACCOUNTS_COLLECTION, entryDate, 'audit_log'));
      const auditEntry: AuditLogEntry = {
        revisionId: auditLogRef.id,
        timestamp: now,
        modifiedBy: editorEmail,
        previousTotals: {
          officialPaise: existing.official.totalOfficialPaise,
          personalPaise: existing.personal.totalPersonalPaise,
          grandTotalPaise: existing.dailyGrandTotalPaise
        },
        newTotals: {
          officialPaise: totalOfficialPaise,
          personalPaise: totalPersonalPaise,
          grandTotalPaise: dailyGrandTotalPaise
        },
        reason: auditReason?.trim() || 'Daily expense updated'
      };
      transaction.set(auditLogRef, auditEntry);
    }

    updatedRecord = {
      entryDate,
      calendarYear,
      official: {
        ...officialPaise,
        totalOfficialPaise
      },
      personal: {
        ...personalPaise,
        totalPersonalPaise
      },
      dailyGrandTotalPaise,
      revisionsCount,
      isDeleted: false,
      createdAt,
      updatedAt: now
    };

    transaction.set(docRef, updatedRecord);
  });

  return updatedRecord!;
}

/**
 * Subscribes in real-time to all daily account records for a given calendar year.
 */
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

/**
 * Fetches the daily account record for a specific date.
 */
export async function getDailyAccountForDate(entryDate: string): Promise<DailyAccountsRecord | null> {
  const docRef = doc(db, ACCOUNTS_COLLECTION, entryDate);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as DailyAccountsRecord;
}

/**
 * Fetches the audit log history for a specific daily account date.
 */
export async function getDailyAccountAuditLog(entryDate: string): Promise<AuditLogEntry[]> {
  const q = query(
    collection(db, ACCOUNTS_COLLECTION, entryDate, 'audit_log'),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as AuditLogEntry);
}
