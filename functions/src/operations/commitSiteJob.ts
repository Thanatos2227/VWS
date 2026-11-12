
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, assertAuthorizedOwner } from '../config.js';
import { randomUUID } from 'crypto';

export interface CommitSiteJobPayload {
  idempotencyKey: string;
  clientDeviceId: string;
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
}

export const commitSiteJob = onCall({ region: 'asia-south1' }, async (request) => {
  const callerEmail = assertAuthorizedOwner(request.auth);
  const data = request.data as CommitSiteJobPayload;

  if (!data.idempotencyKey || !data.idempotencyKey.startsWith('OP_IDEMP_')) {
    throw new HttpsError(
      'invalid-argument',
      'idempotencyKey must follow canonical pattern: ^OP_IDEMP_[A-Za-z0-9_.-]+$'
    );
  }

  if (!data.workDate || !data.customerName || !data.billNumber || !data.paymentMode || !data.tanks?.length) {
    throw new HttpsError('invalid-argument', 'Missing mandatory site job fields.');
  }

  const opRef = adminDb.collection('committed_operations').doc(data.idempotencyKey);
  const seqCounterRef = adminDb.collection('system_counters').doc('sites_seq');

  const workerId = `worker_${randomUUID()}`;
  const LEASE_DURATION_MS = 60 * 1000;

  let currentFenceToken = 1;
  await adminDb.runTransaction(async (transaction) => {
    const backendNow = Timestamp.now();
    const opSnap = await transaction.get(opRef);

    if (opSnap.exists) {
      const opData = opSnap.data()!;
      if (opData.status === 'COMMITTED') {
        return;
      }
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
      sequenceNumber: committed.committedSequenceNumber || null,
      version: committed.committedVersion,
      serverCommittedAt: committed.serverCommittedAt
    };
  }

  const siteId = `site_${randomUUID()}`;
  const siteRef = adminDb.collection('sites').doc(siteId);

  let allocatedSequence = 1;
  const commitResult = await adminDb.runTransaction(async (transaction) => {
    const backendNow = Timestamp.now();

    const opSnap = await transaction.get(opRef);
    if (!opSnap.exists) {
      throw new HttpsError('internal', 'Operation record disappeared.');
    }
    const op = opSnap.data()!;

    if (op.status !== 'IN_PROGRESS') {
      throw new HttpsError('failed-precondition', `Commit failed: status is ${op.status}`);
    }
    if (op.fenceToken !== currentFenceToken) {
      throw new HttpsError('aborted', 'Commit rejected: fencing token mismatch (superseded by takeover).');
    }
    if (op.workerId !== workerId) {
      throw new HttpsError('aborted', 'Commit rejected: worker ownership mismatch.');
    }
    if (backendNow.toMillis() >= op.leaseExpiresAt.toMillis()) {
      throw new HttpsError('deadline-exceeded', 'Commit rejected: worker lease expired.');
    }
    if (op.abortedAt !== null) {
      throw new HttpsError('failed-precondition', 'Commit rejected: operation marked aborted.');
    }
    const siteSnap = await transaction.get(siteRef);
    if (siteSnap.exists) {
      throw new HttpsError('already-exists', 'Target site record already exists.');
    }

    const seqSnap = await transaction.get(seqCounterRef);
    if (seqSnap.exists) {
      allocatedSequence = (seqSnap.data()!.currentSeq || 0) + 1;
      transaction.update(seqCounterRef, { currentSeq: allocatedSequence, updatedAt: backendNow });
    } else {
      allocatedSequence = 1;
      transaction.set(seqCounterRef, { id: 'sites_seq', currentSeq: 1, updatedAt: backendNow });
    }

    const calendarYear = parseInt(data.workDate.slice(0, 4), 10) || new Date().getFullYear();
    const newSiteDoc = {
      id: siteId,
      sequenceNumber: allocatedSequence,
      siteNumber: allocatedSequence,
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
      version: 1,
      originalRecordId: siteId,
      previousRecordId: null,
      status: 'ACTIVE',
      isLatestValidVersion: true,
      correctedAt: null,
      correctionReason: null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      expiresForPurgeAt: null,
      createdAt: backendNow,
      updatedAt: backendNow,
      createdBy: callerEmail
    };

    transaction.set(siteRef, newSiteDoc);

    transaction.update(opRef, {
      status: 'COMMITTED',
      committedServerDocId: siteId,
      committedSequenceNumber: allocatedSequence,
      committedVersion: 1,
      serverCommittedAt: backendNow,
      updatedAt: backendNow
    });

    return {
      status: 'COMMITTED',
      siteId,
      sequenceNumber: allocatedSequence,
      version: 1,
      serverCommittedAt: backendNow
    };
  });

  return commitResult;
});

