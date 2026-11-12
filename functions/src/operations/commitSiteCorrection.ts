
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, assertAuthorizedOwner } from '../config.js';
import { randomUUID } from 'crypto';

export interface CommitSiteCorrectionPayload {
  idempotencyKey: string;
  clientDeviceId: string;
  previousRecordId: string;
  expectedPreviousVersion: number;
  workDate: string;
  customerName: string;
  location: string;
  contactNumber: string;
  googleLocation?: string;
  billNumber: string;
  paymentMode: 'Cash' | 'Online';
  billValuePaise: number;
  discountPaise: number;
  finalValuePaise: number;
  tanks: Array<{
    tankType: 'OHT' | 'UG';
    length: number;
    breadth: number;
    height: number;
    capacityLitres: number;
  }>;
  correctionReason?: string;
}

export const commitSiteCorrection = onCall({ region: 'asia-south1' }, async (request) => {
  const callerEmail = assertAuthorizedOwner(request.auth);
  const data = request.data as CommitSiteCorrectionPayload;

  if (!data.idempotencyKey || !data.idempotencyKey.startsWith('OP_IDEMP_')) {
    throw new HttpsError(
      'invalid-argument',
      'idempotencyKey must follow canonical pattern: ^OP_IDEMP_[A-Za-z0-9_.-]+$'
    );
  }

  if (!data.previousRecordId || !data.expectedPreviousVersion) {
    throw new HttpsError('invalid-argument', 'Missing previousRecordId or expectedPreviousVersion.');
  }

  const opRef = adminDb.collection('committed_operations').doc(data.idempotencyKey);
  const prevDocRef = adminDb.collection('sites').doc(data.previousRecordId);

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
        throw new HttpsError('unavailable', 'Correction currently in progress by another worker.');
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
        targetCollection: 'sites',
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
      siteId: committed.committedServerDocId,
      version: committed.committedVersion,
      serverCommittedAt: committed.serverCommittedAt
    };
  }

  const correctionId = `site_${randomUUID()}`;
  const correctionDocRef = adminDb.collection('sites').doc(correctionId);

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

    const prevSnap = await transaction.get(prevDocRef);
    if (!prevSnap.exists) {
      throw new HttpsError('not-found', 'Predecessor site record does not exist.');
    }
    const prevData = prevSnap.data()!;
    if (prevData.version !== data.expectedPreviousVersion) {
      throw new HttpsError(
        'aborted',
        `Stale base version: expected v${data.expectedPreviousVersion}, observed v${prevData.version}.`
      );
    }
    if (!prevData.isLatestValidVersion) {
      throw new HttpsError(
        'aborted',
        'Predecessor version is already superseded by another correction.'
      );
    }

    const nextVersion = prevData.version + 1;
    const originalRecordId = prevData.originalRecordId || prevData.id;
    const calendarYear = parseInt(data.workDate.slice(0, 4), 10) || prevData.year;

    transaction.update(prevDocRef, {
      isLatestValidVersion: false,
      status: 'SUPERSEDED',
      updatedAt: backendNow
    });

    const newDoc = {
      id: correctionId,
      sequenceNumber: prevData.sequenceNumber,
      siteNumber: prevData.siteNumber || prevData.sequenceNumber,
      year: calendarYear,
      calendarYear,
      workDate: data.workDate,
      customerName: data.customerName.trim(),
      location: data.location.trim(),
      contactNumber: data.contactNumber.trim(),
      googleLocation: data.googleLocation || null,
      billNumber: data.billNumber.trim(),
      paymentMode: data.paymentMode,
      totalTanks: data.tanks.length,
      tanks: data.tanks.map((t, idx) => ({
        tankIndex: idx + 1,
        tankType: t.tankType,
        length: t.length,
        breadth: t.breadth,
        height: t.height,
        capacityLitres: t.capacityLitres
      })),
      billValuePaise: data.billValuePaise,
      discountPaise: data.discountPaise,
      finalValuePaise: data.finalValuePaise,
      version: nextVersion,
      originalRecordId,
      previousRecordId: prevData.id,
      status: 'ACTIVE',
      isLatestValidVersion: true,
      correctedAt: backendNow,
      correctionReason: data.correctionReason?.trim() || null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      expiresForPurgeAt: null,
      createdAt: prevData.createdAt,
      updatedAt: backendNow,
      createdBy: callerEmail
    };

    transaction.set(correctionDocRef, newDoc);

    transaction.update(opRef, {
      status: 'COMMITTED',
      committedServerDocId: correctionId,
      committedVersion: nextVersion,
      serverCommittedAt: backendNow,
      updatedAt: backendNow
    });

    return {
      status: 'COMMITTED',
      siteId: correctionId,
      version: nextVersion,
      serverCommittedAt: backendNow
    };
  });

  return commitResult;
});

