/**
 * src/services/api/callableClient.ts
 * 
 * Typed Callable Cloud Functions Client.
 * Routes all protected mutations through authenticated 2nd Gen Firebase Cloud Functions.
 * Enforces canonical idempotency keys, normalizes callable errors, handles network failures safely,
 * and eliminates direct client Firestore writes.
 * 
 * Conforms to DOC-006 (§4, §5) and Phase 01G final reconciliation specifications.
 */

import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '../../config/firebase';

// ==========================================
// TYPED REQUEST & RESPONSE INTERFACES
// ==========================================

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

export interface CommitSiteJobResponse {
  status: 'COMMITTED';
  siteId: string;
  sequenceNumber: number | null;
  version: number;
  serverCommittedAt: { seconds: number; nanoseconds: number } | string;
}

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

export interface CommitSiteCorrectionResponse {
  status: 'COMMITTED';
  siteId: string;
  version: number;
  serverCommittedAt: { seconds: number; nanoseconds: number } | string;
}

export interface CommitSiteStatusChangePayload {
  idempotencyKey: string;
  clientDeviceId: string;
  siteId: string;
  action: 'SOFT_DELETE' | 'RESTORE';
}

export interface CommitSiteStatusChangeResponse {
  status: 'COMMITTED';
  siteId: string;
  action: 'SOFT_DELETE' | 'RESTORE';
  serverCommittedAt: { seconds: number; nanoseconds: number } | string;
}

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

export interface CommitDailyAccountsResponse {
  status: 'COMMITTED';
  entryDate: string;
  totals: {
    totalOfficialPaise: number;
    totalPersonalPaise: number;
    dailyGrandTotalPaise: number;
  };
  revisionsCount: number;
  serverCommittedAt: { seconds: number; nanoseconds: number } | string;
}

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

export interface PurgeExpiredSitesResponse {
  purgedCount: number;
  purgedSiteIds: string[];
  executedAt: string;
}

// ==========================================
// ERROR NORMALIZATION & TYPES
// ==========================================

export class CallableApiError extends Error {
  public readonly code: string;
  public readonly details: unknown;
  public readonly isNetworkFailure: boolean;
  public readonly idempotencyKey?: string;

  constructor(
    message: string,
    code: string = 'internal',
    details: unknown = undefined,
    isNetworkFailure: boolean = false,
    idempotencyKey?: string
  ) {
    super(message);
    this.name = 'CallableApiError';
    this.code = code;
    this.details = details;
    this.isNetworkFailure = isNetworkFailure;
    this.idempotencyKey = idempotencyKey;
    Object.setPrototypeOf(this, CallableApiError.prototype);
  }
}

/**
 * Normalizes unknown errors thrown by Firebase Functions SDK or network layers.
 */
export function normalizeCallableError(err: unknown, idempotencyKey?: string): CallableApiError {
  if (err instanceof CallableApiError) {
    return err;
  }

  const raw = err as { code?: string; message?: string; details?: unknown };
  const rawCode = typeof raw?.code === 'string' ? raw.code : '';
  const rawMessage = typeof raw?.message === 'string' ? raw.message : 'Unknown error during callable invocation.';

  // Check for network dropouts / unavailable
  const isNetwork = 
    rawCode === 'unavailable' ||
    rawCode === 'deadline-exceeded' ||
    rawMessage.toLowerCase().includes('failed to fetch') ||
    rawMessage.toLowerCase().includes('network') ||
    rawMessage.toLowerCase().includes('offline');

  // Strip prefix "functions/" if present (e.g. functions/permission-denied -> permission-denied)
  const cleanCode = rawCode.startsWith('functions/') ? rawCode.replace('functions/', '') : (rawCode || (isNetwork ? 'unavailable' : 'internal'));

  let userFriendlyMsg = rawMessage;
  if (cleanCode === 'permission-denied') {
    userFriendlyMsg = 'Access Denied: Caller is not the authorized Vetri Water Solutions owner.';
  } else if (cleanCode === 'unauthenticated') {
    userFriendlyMsg = 'Authentication Required: Please sign in with your authorized Google account.';
  } else if (isNetwork) {
    userFriendlyMsg = `Network connectivity lost. Operation status is UNKNOWN (Idempotency Key: ${idempotencyKey || 'none'}). Do not duplicate manual submission.`;
  }

  return new CallableApiError(userFriendlyMsg, cleanCode, raw?.details, isNetwork, idempotencyKey);
}

// ==========================================
// DETERMINISTIC IDEMPOTENCY UTILITY
// ==========================================

/**
 * Generates canonical business-operation idempotency keys conforming to DOC-005 §3.8 / DOC-020:
 * Pattern: ^OP_IDEMP_[A-Za-z0-9_.-]+$
 */
export function generateOperationIdempotencyKey(operationPrefix: string, naturalKey: string): string {
  const sanitizedNaturalKey = naturalKey.replace(/[^A-Za-z0-9_.-]/g, '_');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `OP_IDEMP_${operationPrefix.toUpperCase()}_${sanitizedNaturalKey}_${timestamp}_${randomSuffix}`;
}

/**
 * Gets or initializes a persistent client device identifier stored in browser localStorage.
 */
export function getClientDeviceId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'node_client_env';
  }
  const DEVICE_KEY = 'vws_client_device_id';
  let deviceId = window.localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    window.localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

// ==========================================
// CALLABLE FUNCTION INVOCATION WRAPPERS
// ==========================================

/**
 * Invokes commitSiteJob Cloud Function.
 */
export async function callCommitSiteJob(
  payload: CommitSiteJobPayload
): Promise<CommitSiteJobResponse> {
  try {
    const callable = httpsCallable<CommitSiteJobPayload, CommitSiteJobResponse>(
      functions,
      'commitSiteJob'
    );
    const result: HttpsCallableResult<CommitSiteJobResponse> = await callable(payload);
    return result.data;
  } catch (err) {
    throw normalizeCallableError(err, payload.idempotencyKey);
  }
}

/**
 * Invokes commitSiteCorrection Cloud Function.
 */
export async function callCommitSiteCorrection(
  payload: CommitSiteCorrectionPayload
): Promise<CommitSiteCorrectionResponse> {
  try {
    const callable = httpsCallable<CommitSiteCorrectionPayload, CommitSiteCorrectionResponse>(
      functions,
      'commitSiteCorrection'
    );
    const result: HttpsCallableResult<CommitSiteCorrectionResponse> = await callable(payload);
    return result.data;
  } catch (err) {
    throw normalizeCallableError(err, payload.idempotencyKey);
  }
}

/**
 * Invokes commitSiteStatusChange Cloud Function (soft-delete & restore).
 */
export async function callCommitSiteStatusChange(
  payload: CommitSiteStatusChangePayload
): Promise<CommitSiteStatusChangeResponse> {
  try {
    const callable = httpsCallable<CommitSiteStatusChangePayload, CommitSiteStatusChangeResponse>(
      functions,
      'commitSiteStatusChange'
    );
    const result: HttpsCallableResult<CommitSiteStatusChangeResponse> = await callable(payload);
    return result.data;
  } catch (err) {
    throw normalizeCallableError(err, payload.idempotencyKey);
  }
}

/**
 * Invokes commitDailyAccountsUpdate Cloud Function.
 */
export async function callCommitDailyAccountsUpdate(
  payload: CommitDailyAccountsPayload
): Promise<CommitDailyAccountsResponse> {
  try {
    const callable = httpsCallable<CommitDailyAccountsPayload, CommitDailyAccountsResponse>(
      functions,
      'commitDailyAccountsUpdate'
    );
    const result: HttpsCallableResult<CommitDailyAccountsResponse> = await callable(payload);
    return result.data;
  } catch (err) {
    throw normalizeCallableError(err, payload.idempotencyKey);
  }
}

/**
 * Invokes queryOperationStatus Cloud Function.
 */
export async function callQueryOperationStatus(
  payload: QueryOperationStatusPayload
): Promise<OperationStatusResponse> {
  try {
    const callable = httpsCallable<QueryOperationStatusPayload, OperationStatusResponse>(
      functions,
      'queryOperationStatus'
    );
    const result: HttpsCallableResult<OperationStatusResponse> = await callable(payload);
    return result.data;
  } catch (err) {
    throw normalizeCallableError(err, payload.idempotencyKey);
  }
}

/**
 * Invokes purgeExpiredSites Cloud Function (permanent purge of expired recycle bin records).
 */
export async function callPurgeExpiredSites(): Promise<PurgeExpiredSitesResponse> {
  try {
    const callable = httpsCallable<Record<string, never>, PurgeExpiredSitesResponse>(
      functions,
      'purgeExpiredSites'
    );
    const result: HttpsCallableResult<PurgeExpiredSitesResponse> = await callable({});
    return result.data;
  } catch (err) {
    throw normalizeCallableError(err);
  }
}
