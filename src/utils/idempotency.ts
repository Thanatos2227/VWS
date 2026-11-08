/**
 * src/utils/idempotency.ts
 * 
 * Authoritative Deterministic Task & Operation Idempotency Key Derivations.
 * Derived strictly from VWS_DATABASE_SCHEMA.md (DOC-005 §3.6 & §3.8) and DOC-020.
 */

/**
 * System Task Key Regex: strictly ^IDEMP_[A-Za-z0-9_.-]+$
 * Bound 1-to-1 to taskId via idempotencyKey === "IDEMP_" + taskId.substring(5)
 */
export const SYSTEM_TASK_IDEMP_REGEX = /^IDEMP_[A-Za-z0-9_.-]+$/;
export const SYSTEM_TASK_ID_REGEX = /^TASK_[A-Za-z0-9_.-]+$/;

/**
 * Business Operation Key Regex: strictly ^OP_IDEMP_[A-Za-z0-9_.-]+$
 */
export const BUSINESS_OP_IDEMP_REGEX = /^OP_IDEMP_[A-Za-z0-9_.-]+$/;

// ==========================================
// System-Task Queue Deterministic Generators
// ==========================================

export function generateDailyBackupTaskId(dateStr: string): string {
  return `TASK_SCHEDULED_DAILY_BACKUP_${dateStr}`;
}

export function generateDailyBackupIdempKey(dateStr: string): string {
  return `IDEMP_SCHEDULED_DAILY_BACKUP_${dateStr}`;
}

export function generateDatabaseJsonDumpTaskId(dateStr: string): string {
  return `TASK_DATABASE_JSON_DUMP_${dateStr}`;
}

export function generateDatabaseJsonDumpIdempKey(dateStr: string): string {
  return `IDEMP_DATABASE_JSON_DUMP_${dateStr}`;
}

export function generateManualExportTaskId(deviceId: string, calendarYear: number, payloadSha256: string): string {
  return `TASK_CLIENT_MANUAL_EXPORT_${deviceId}_${calendarYear}_${payloadSha256}`;
}

export function generateManualExportIdempKey(deviceId: string, calendarYear: number, payloadSha256: string): string {
  return `IDEMP_CLIENT_MANUAL_EXPORT_${deviceId}_${calendarYear}_${payloadSha256}`;
}

export function generateResumableUploadTaskId(sourceTaskId: string, chunkIndex: number): string {
  return `TASK_DRIVE_RESUMABLE_UPLOAD_${sourceTaskId}_${chunkIndex}`;
}

export function generateResumableUploadIdempKey(sourceTaskId: string, chunkIndex: number): string {
  return `IDEMP_DRIVE_RESUMABLE_UPLOAD_${sourceTaskId}_${chunkIndex}`;
}

export function generateMetadataAuditTaskId(dateStr: string): string {
  return `TASK_METADATA_AUDIT_${dateStr}`;
}

export function generateMetadataAuditIdempKey(dateStr: string): string {
  return `IDEMP_METADATA_AUDIT_${dateStr}`;
}

/**
 * Validates that a system-task idempotency key strictly mirrors the taskId
 * by substituting the leading "TASK_" prefix with "IDEMP_".
 */
export function validateSystemTaskIdempPair(taskId: string, idempotencyKey: string): boolean {
  if (!SYSTEM_TASK_ID_REGEX.test(taskId)) return false;
  if (!SYSTEM_TASK_IDEMP_REGEX.test(idempotencyKey)) return false;
  return idempotencyKey === `IDEMP_${taskId.substring(5)}`;
}

// ==========================================
// Business-Operation Ledger Deterministic Generators
// ==========================================

export interface OperationIdempParams {
  deviceId: string;
  targetDocId: string;
  baseServerRevision: number | null;
  revisionNumber: number;
  payloadHash: string;
}

/**
 * Derives a deterministic idempotency key for client transactional mutations.
 * Formula: OP_IDEMP_{deviceId}_{targetDocId}_{baseServerRevision}_{revisionNumber}_{payloadHash}
 */
export function generateOperationIdempKey(params: OperationIdempParams): string {
  const baseRevStr = params.baseServerRevision === null ? 'null' : String(params.baseServerRevision);
  return `OP_IDEMP_${params.deviceId}_${params.targetDocId}_${baseRevStr}_${params.revisionNumber}_${params.payloadHash}`;
}

/**
 * Validates syntax of a business-operation idempotency key.
 */
export function validateOperationIdempKeySyntax(key: string): boolean {
  return BUSINESS_OP_IDEMP_REGEX.test(key);
}
