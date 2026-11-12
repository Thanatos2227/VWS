
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, assertAuthorizedOwner } from '../config.js';
import { randomUUID } from 'crypto';

export interface CommitDailyAccountsPayload {
  idempotencyKey: string;
  clientDeviceId: string;
  entryDate: string;
  official: {
    refreshmentPaise: number;
    transportPaise: number;
    sparesHOPaise: number;
    staffAttendanceCount: number;
    staffAttendanceExpensePaise: number;
    staffSalaryPaise: number;
    salaryEntries?: Array<{
      id: string;
      staffName: string;
      amountPaise: number;
      notes?: string;
    }>;
    notes?: string;
  };
  personal: {
    transportPaise: number;
    refreshmentPaise: number;
    groceriesVegMilkPaise: number;
    lunchDinnerPaise: number;
    otherPaise: number;
    notes?: string;
  };
  auditReason?: string;
}

export const commitDailyAccountsUpdate = onCall({ region: 'asia-south1' }, async (request) => {
  const callerEmail = assertAuthorizedOwner(request.auth);
  const data = request.data as CommitDailyAccountsPayload;

  if (!data.idempotencyKey || !data.idempotencyKey.startsWith('OP_IDEMP_')) {
    throw new HttpsError(
      'invalid-argument',
      'idempotencyKey must follow canonical pattern: ^OP_IDEMP_[A-Za-z0-9_.-]+$'
    );
  }

  if (!data.entryDate) {
    throw new HttpsError('invalid-argument', 'entryDate is required.');
  }

  const opRef = adminDb.collection('committed_operations').doc(data.idempotencyKey);
  const accDocRef = adminDb.collection('accounts_daily').doc(data.entryDate);

  const workerId = `worker_${randomUUID()}`;
  const LEASE_DURATION_MS = 60 * 1000;

  let currentFenceToken = 1;
  await adminDb.runTransaction(async (transaction) => {
    const backendNow = Timestamp.now();
    const opSnap = await transaction.get(opRef);

    if (opSnap.exists) {
      const opData = opSnap.data()!;
      if (opData.status === 'COMMITTED') return;
      if (opData.status === 'ABORTED_TERMINAL') {
        throw new HttpsError('failed-precondition', `Operation was terminally aborted: ${opData.terminalReason}`);
      }

      const leaseExpiresAtMs = opData.leaseExpiresAt.toMillis();
      if (backendNow.toMillis() < leaseExpiresAtMs) {
        throw new HttpsError('unavailable', 'Operation currently in progress by another worker.');
      }

      currentFenceToken = (opData.fenceToken || 1) + 1;
      transaction.update(opRef, {
        workerId,
        fenceToken: currentFenceToken,
        leaseExpiresAt: new Timestamp(
          Math.floor((backendNow.toMillis() + LEASE_DURATION_MS) / 1000),
          (backendNow.toMillis() + LEASE_DURATION_MS) % 1000 * 1000000
        ),
        status: 'IN_PROGRESS',
        updatedAt: backendNow
      });
    } else {
      transaction.set(opRef, {
        idempotencyKey: data.idempotencyKey,
        operationId: `op_${randomUUID()}`,
        status: 'IN_PROGRESS',
        fenceToken: currentFenceToken,
        leaseExpiresAt: new Timestamp(
          Math.floor((backendNow.toMillis() + LEASE_DURATION_MS) / 1000),
          (backendNow.toMillis() + LEASE_DURATION_MS) % 1000 * 1000000
        ),
        workerId,
        targetCollection: 'accounts_daily',
        committedServerDocId: null,
        committedVersion: null,
        serverCommittedAt: null,
        terminalReason: null,
        abortedAt: null,
        clientDeviceId: data.clientDeviceId || 'unknown',
        createdAt: backendNow,
        updatedAt: backendNow
      });
    }
  });

  const checkSnap = await opRef.get();
  if (checkSnap.exists && checkSnap.data()!.status === 'COMMITTED') {
    const committed = checkSnap.data()!;
    return {
      status: 'COMMITTED',
      entryDate: data.entryDate,
      serverCommittedAt: committed.serverCommittedAt
    };
  }

  const totalOfficialPaise =
    (data.official.refreshmentPaise || 0) +
    (data.official.transportPaise || 0) +
    (data.official.sparesHOPaise || 0) +
    (data.official.staffAttendanceExpensePaise || 0) +
    (data.official.staffSalaryPaise || 0);

  const totalPersonalPaise =
    (data.personal.transportPaise || 0) +
    (data.personal.refreshmentPaise || 0) +
    (data.personal.groceriesVegMilkPaise || 0) +
    (data.personal.lunchDinnerPaise || 0) +
    (data.personal.otherPaise || 0);

  const dailyGrandTotalPaise = totalOfficialPaise + totalPersonalPaise;

  const commitResult = await adminDb.runTransaction(async (transaction) => {
    const backendNow = Timestamp.now();

    const opSnap = await transaction.get(opRef);
    if (!opSnap.exists) throw new HttpsError('internal', 'Operation record disappeared.');
    const op = opSnap.data()!;

    if (op.status !== 'IN_PROGRESS') {
      throw new HttpsError('failed-precondition', `Commit failed: status is ${op.status}`);
    }
    if (op.fenceToken !== currentFenceToken) {
      throw new HttpsError('aborted', 'Commit rejected: fencing token mismatch.');
    }
    if (op.workerId !== workerId) {
      throw new HttpsError('aborted', 'Commit rejected: worker ownership mismatch.');
    }
    if (backendNow.toMillis() >= op.leaseExpiresAt.toMillis()) {
      throw new HttpsError('deadline-exceeded', 'Commit rejected: worker lease expired.');
    }
    if (op.abortedAt !== null) {
      throw new HttpsError('failed-precondition', 'Commit rejected: operation aborted.');
    }

    const existingSnap = await transaction.get(accDocRef);
    let revisionsCount = 0;
    let createdAt = backendNow;

    if (existingSnap.exists) {
      const existing = existingSnap.data()!;
      revisionsCount = (existing.revisionsCount || 0) + 1;
      createdAt = existing.createdAt || backendNow;

      const auditLogRef = accDocRef.collection('audit_log').doc();
      transaction.set(auditLogRef, {
        revisionId: auditLogRef.id,
        timestamp: backendNow,
        modifiedBy: callerEmail,
        previousTotals: {
          officialPaise: existing.official?.totalOfficialPaise || 0,
          personalPaise: existing.personal?.totalPersonalPaise || 0,
          grandTotalPaise: existing.dailyGrandTotalPaise || 0
        },
        newTotals: {
          officialPaise: totalOfficialPaise,
          personalPaise: totalPersonalPaise,
          grandTotalPaise: dailyGrandTotalPaise
        },
        reason: data.auditReason?.trim() || 'Daily accounts updated via backend'
      });
    }

    const calendarYear = parseInt(data.entryDate.slice(0, 4), 10) || new Date().getFullYear();
    const updatedAccount = {
      entryDate: data.entryDate,
      calendarYear,
      year: calendarYear,
      official: {
        ...data.official,
        totalOfficialPaise
      },
      personal: {
        ...data.personal,
        totalPersonalPaise
      },
      dailyGrandTotalPaise,
      revisionsCount,
      isDeleted: false,
      createdAt,
      updatedAt: backendNow,
      createdBy: callerEmail
    };

    transaction.set(accDocRef, updatedAccount);

    transaction.update(opRef, {
      status: 'COMMITTED',
      committedServerDocId: data.entryDate,
      committedVersion: revisionsCount,
      serverCommittedAt: backendNow,
      updatedAt: backendNow
    });

    return {
      status: 'COMMITTED',
      entryDate: data.entryDate,
      totals: {
        totalOfficialPaise,
        totalPersonalPaise,
        dailyGrandTotalPaise
      },
      revisionsCount,
      serverCommittedAt: backendNow
    };
  });

  return commitResult;
});

