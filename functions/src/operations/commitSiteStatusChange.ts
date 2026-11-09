/**
 * functions/src/operations/commitSiteStatusChange.ts
 * 
 * Authenticated Callable Function: commitSiteStatusChange.
 * Atomically changes site status for soft-deletion (30-day Recycle Bin) and restoration.
 * Enforces the 8 Atomic Commit Invariants defined in DOC-006 (§4) and Phase 01G.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, assertAuthorizedOwner } from '../config.js';
import { randomUUID } from 'crypto';

export interface CommitSiteStatusChangePayload {
  idempotencyKey: string;
  clientDeviceId: string;
  siteId: string;
  action: 'SOFT_DELETE' | 'RESTORE';
}

export const commitSiteStatusChange = onCall({ region: 'asia-south1' }, async (request) => {
  const callerEmail = assertAuthorizedOwner(request.auth);
  const data = request.data as CommitSiteStatusChangePayload;

  if (!data.idempotencyKey || !data.idempotencyKey.startsWith('OP_IDEMP_')) {
    throw new HttpsError(
      'invalid-argument',
      'idempotencyKey must follow canonical pattern: ^OP_IDEMP_[A-Za-z0-9_.-]+$'
    );
  }

  if (!data.siteId || typeof data.siteId !== 'string') {
    throw new HttpsError('invalid-argument', 'siteId is required.');
  }

  if (data.action !== 'SOFT_DELETE' && data.action !== 'RESTORE') {
    throw new HttpsError('invalid-argument', 'action must be either SOFT_DELETE or RESTORE.');
  }

  const opRef = adminDb.collection('committed_operations').doc(data.idempotencyKey);
  const siteRef = adminDb.collection('sites').doc(data.siteId);

  const workerId = `worker_${randomUUID()}`;
  const LEASE_DURATION_MS = 60 * 1000;

  // Phase 1: Claim or Inspect Operation Record
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
        throw new HttpsError('unavailable', 'Status change currently in progress by another worker.');
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
      action: data.action,
      serverCommittedAt: committed.serverCommittedAt
    };
  }

  // Phase 2: Atomic Status Mutation & Ledger Commit
  const commitResult = await adminDb.runTransaction(async (transaction) => {
    const backendNow = Timestamp.now();

    // Verify Invariants:
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

    // Inspect target site record
    const siteSnap = await transaction.get(siteRef);
    if (!siteSnap.exists) {
      throw new HttpsError('not-found', `Site record "${data.siteId}" does not exist.`);
    }

    if (data.action === 'SOFT_DELETE') {
      const purgeSeconds = backendNow.seconds + 30 * 24 * 60 * 60; // 30-day retention
      const expiresForPurgeAt = new Timestamp(purgeSeconds, backendNow.nanoseconds);

      transaction.update(siteRef, {
        isDeleted: true,
        deletedAt: backendNow,
        deletedBy: callerEmail,
        expiresForPurgeAt,
        updatedAt: backendNow
      });
    } else {
      // RESTORE
      transaction.update(siteRef, {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        expiresForPurgeAt: null,
        updatedAt: backendNow
      });
    }

    // Atomically transition operation record to COMMITTED
    transaction.update(opRef, {
      status: 'COMMITTED',
      committedServerDocId: data.siteId,
      committedVersion: null,
      serverCommittedAt: backendNow,
      updatedAt: backendNow
    });

    return {
      status: 'COMMITTED',
      siteId: data.siteId,
      action: data.action,
      serverCommittedAt: backendNow
    };
  });

  return commitResult;
});
