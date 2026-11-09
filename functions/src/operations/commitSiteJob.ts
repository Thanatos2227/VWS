/**
 * functions/src/operations/commitSiteJob.ts
 * 
 * Authenticated Callable Function: commitSiteJob.
 * Executes atomic site creation, sequence number allocation (+1), and idempotent commit.
 * Enforces the 8 Atomic Commit Invariants defined in DOC-006 (§4) and Phase 01G.
 */

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

  // Validate idempotency key format (DOC-005 §3.8 / DOC-020)
  if (!data.idempotencyKey || !data.idempotencyKey.startsWith('OP_IDEMP_')) {
    throw new HttpsError(
      'invalid-argument',
      'idempotencyKey must follow canonical pattern: ^OP_IDEMP_[A-Za-z0-9_.-]+$'
    );
  }

  // Validate required fields
  if (!data.workDate || !data.customerName || !data.billNumber || !data.paymentMode || !data.tanks?.length) {
    throw new HttpsError('invalid-argument', 'Missing mandatory site job fields.');
  }

  const opRef = adminDb.collection('committed_operations').doc(data.idempotencyKey);
  const seqCounterRef = adminDb.collection('system_counters').doc('sites_seq');

  const workerId = `worker_${randomUUID()}`;
  const LEASE_DURATION_MS = 60 * 1000; // 60-second lease

  // Phase 1: Claim or Inspect Operation Record
  let currentFenceToken = 1;
  await adminDb.runTransaction(async (transaction) => {
    const backendNow = Timestamp.now();
    const opSnap = await transaction.get(opRef);

    if (opSnap.exists) {
      const opData = opSnap.data()!;
      // If already committed, return early idempotently
      if (opData.status === 'COMMITTED') {
        return;
      }
      if (opData.status === 'ABORTED_TERMINAL') {
        throw new HttpsError('failed-precondition', `Operation was terminally aborted: ${opData.terminalReason}`);
      }

      // Check lease expiry for takeover contention
      const leaseExpiresAtMs = opData.leaseExpiresAt.toMillis();
      if (backendNow.toMillis() < leaseExpiresAtMs) {
        // Active lease held by another worker
        throw new HttpsError('unavailable', 'Operation currently in progress by another worker.');
      }

      // Expired lease takeover: increment fenceToken, claim lease under current workerId
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
      // First-time claim
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

  // Check if it was already committed before Phase 2
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

  // Phase 2: Atomic Business Mutation & COMMITTED Ledger Transition
  const siteId = `site_${randomUUID()}`;
  const siteRef = adminDb.collection('sites').doc(siteId);

  let allocatedSequence = 1;
  const commitResult = await adminDb.runTransaction(async (transaction) => {
    // Invariant requirement: backendNow must be recalculated inside every execution of the transaction callback
    const backendNow = Timestamp.now();

    // 1. Read operation record
    const opSnap = await transaction.get(opRef);
    if (!opSnap.exists) {
      throw new HttpsError('internal', 'Operation record disappeared.');
    }
    const op = opSnap.data()!;

    // Verify 8 Commit Invariants:
    // Invariant 1: Record exists (verified above)
    // Invariant 2: status === 'IN_PROGRESS'
    if (op.status !== 'IN_PROGRESS') {
      throw new HttpsError('failed-precondition', `Commit failed: status is ${op.status}`);
    }
    // Invariant 3: fenceToken === currentFenceToken
    if (op.fenceToken !== currentFenceToken) {
      throw new HttpsError('aborted', 'Commit rejected: fencing token mismatch (superseded by takeover).');
    }
    // Invariant 4: workerId === currentWorkerId
    if (op.workerId !== workerId) {
      throw new HttpsError('aborted', 'Commit rejected: worker ownership mismatch.');
    }
    // Invariant 5: lease has not expired using authoritative server time
    if (backendNow.toMillis() >= op.leaseExpiresAt.toMillis()) {
      throw new HttpsError('deadline-exceeded', 'Commit rejected: worker lease expired.');
    }
    // Invariant 6: operation not terminally aborted
    if (op.abortedAt !== null) {
      throw new HttpsError('failed-precondition', 'Commit rejected: operation marked aborted.');
    }
    // Invariants 7 & 8: Target business record checks (new record, does not exist yet)
    const siteSnap = await transaction.get(siteRef);
    if (siteSnap.exists) {
      throw new HttpsError('already-exists', 'Target site record already exists.');
    }

    // Allocate Monotonic Sequence Number
    const seqSnap = await transaction.get(seqCounterRef);
    if (seqSnap.exists) {
      allocatedSequence = (seqSnap.data()!.currentSeq || 0) + 1;
      transaction.update(seqCounterRef, { currentSeq: allocatedSequence, updatedAt: backendNow });
    } else {
      allocatedSequence = 1;
      transaction.set(seqCounterRef, { id: 'sites_seq', currentSeq: 1, updatedAt: backendNow });
    }

    // Commit Business Record
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

    // Atomically Transition committed_operations to COMMITTED
    transaction.update(opRef, {
      status: 'COMMITTED',
      committedServerDocId: siteId,
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

