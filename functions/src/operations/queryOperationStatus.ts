
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminDb, assertAuthorizedOwner } from '../config.js';

export interface QueryOperationStatusPayload {
  idempotencyKey: string;
}

export interface OperationStatusResponse {
  status: 'COMMITTED' | 'NOT_COMMITTED' | 'UNKNOWN';
  fenceToken: number | null;
  committedServerDocId: string | null;
  committedVersion: number | null;
  serverCommittedAt: string | null;
  terminalReason: string | null;
}

export const queryOperationStatus = onCall({ region: 'asia-south1' }, async (request): Promise<OperationStatusResponse> => {
  assertAuthorizedOwner(request.auth);
  const data = request.data as QueryOperationStatusPayload;

  if (!data.idempotencyKey || typeof data.idempotencyKey !== 'string') {
    throw new HttpsError('invalid-argument', 'idempotencyKey string is required.');
  }

  if (!data.idempotencyKey.startsWith('OP_IDEMP_')) {
    throw new HttpsError(
      'invalid-argument',
      'idempotencyKey must follow canonical pattern: ^OP_IDEMP_[A-Za-z0-9_.-]+$'
    );
  }

  const opRef = adminDb.collection('committed_operations').doc(data.idempotencyKey);
  const opSnap = await opRef.get();

  if (!opSnap.exists) {
    return {
      status: 'UNKNOWN',
      fenceToken: null,
      committedServerDocId: null,
      committedVersion: null,
      serverCommittedAt: null,
      terminalReason: null
    };
  }

  const op = opSnap.data()!;

  if (op.status === 'COMMITTED') {
    return {
      status: 'COMMITTED',
      fenceToken: op.fenceToken || null,
      committedServerDocId: op.committedServerDocId || null,
      committedVersion: op.committedVersion || null,
      serverCommittedAt: op.serverCommittedAt ? op.serverCommittedAt.toDate().toISOString() : null,
      terminalReason: null
    };
  }

  if (op.status === 'ABORTED_TERMINAL') {
    return {
      status: 'NOT_COMMITTED',
      fenceToken: op.fenceToken || null,
      committedServerDocId: null,
      committedVersion: null,
      serverCommittedAt: null,
      terminalReason: op.terminalReason || 'Operation terminally aborted by server'
    };
  }

  return {
    status: 'UNKNOWN',
    fenceToken: op.fenceToken || null,
    committedServerDocId: null,
    committedVersion: null,
    serverCommittedAt: null,
    terminalReason: null
  };
});

