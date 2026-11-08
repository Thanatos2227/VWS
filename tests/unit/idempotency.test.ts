/**
 * tests/unit/idempotency.test.ts
 * 
 * Unit tests for deterministic task IDs and idempotency key derivations.
 * Verifies exact compliance with DOC-005 §3.6 and §3.8.
 */

import { describe, it, expect } from 'vitest';
import {
  generateDailyBackupTaskId,
  generateDailyBackupIdempKey,
  generateDatabaseJsonDumpTaskId,
  generateDatabaseJsonDumpIdempKey,
  generateManualExportTaskId,
  generateManualExportIdempKey,
  generateResumableUploadTaskId,
  generateResumableUploadIdempKey,
  generateMetadataAuditTaskId,
  generateMetadataAuditIdempKey,
  validateSystemTaskIdempPair,
  generateOperationIdempKey,
  validateOperationIdempKeySyntax,
  SYSTEM_TASK_IDEMP_REGEX,
  BUSINESS_OP_IDEMP_REGEX,
} from '../../src/utils/idempotency';

describe('Deterministic System-Task Identifiers (DOC-005 §3.6)', () => {
  it('generates matching scheduled daily backup task ID and idempotency key', () => {
    const taskId = generateDailyBackupTaskId('2026-03-15');
    const idempKey = generateDailyBackupIdempKey('2026-03-15');

    expect(taskId).toBe('TASK_SCHEDULED_DAILY_BACKUP_2026-03-15');
    expect(idempKey).toBe('IDEMP_SCHEDULED_DAILY_BACKUP_2026-03-15');
    expect(SYSTEM_TASK_IDEMP_REGEX.test(idempKey)).toBe(true);
    expect(validateSystemTaskIdempPair(taskId, idempKey)).toBe(true);
  });

  it('generates matching database json dump task ID and idempotency key', () => {
    const taskId = generateDatabaseJsonDumpTaskId('2026-03-15');
    const idempKey = generateDatabaseJsonDumpIdempKey('2026-03-15');

    expect(taskId).toBe('TASK_DATABASE_JSON_DUMP_2026-03-15');
    expect(idempKey).toBe('IDEMP_DATABASE_JSON_DUMP_2026-03-15');
    expect(validateSystemTaskIdempPair(taskId, idempKey)).toBe(true);
  });

  it('generates matching client manual export task ID with full 64-char SHA-256 hash', () => {
    const sha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const taskId = generateManualExportTaskId('devA', 2026, sha256);
    const idempKey = generateManualExportIdempKey('devA', 2026, sha256);

    expect(taskId).toBe(`TASK_CLIENT_MANUAL_EXPORT_devA_2026_${sha256}`);
    expect(idempKey).toBe(`IDEMP_CLIENT_MANUAL_EXPORT_devA_2026_${sha256}`);
    expect(validateSystemTaskIdempPair(taskId, idempKey)).toBe(true);
  });

  it('generates matching resumable upload and metadata audit pairs', () => {
    const chunkTaskId = generateResumableUploadTaskId('source123', 0);
    const chunkIdempKey = generateResumableUploadIdempKey('source123', 0);
    expect(validateSystemTaskIdempPair(chunkTaskId, chunkIdempKey)).toBe(true);

    const auditTaskId = generateMetadataAuditTaskId('2026-03-15');
    const auditIdempKey = generateMetadataAuditIdempKey('2026-03-15');
    expect(validateSystemTaskIdempPair(auditTaskId, auditIdempKey)).toBe(true);
  });

  it('rejects mismatched or invalid task ID and idempotency key pairs', () => {
    // Redundant IDEMP_TASK_ prefix is invalid
    expect(validateSystemTaskIdempPair('TASK_DAILY', 'IDEMP_TASK_DAILY')).toBe(false);
    // Mismatched task details
    expect(validateSystemTaskIdempPair('TASK_BACKUP_2026', 'IDEMP_BACKUP_2027')).toBe(false);
    // Business prefix OP_IDEMP_ is invalid for system tasks
    expect(validateSystemTaskIdempPair('TASK_BACKUP_2026', 'OP_IDEMP_BACKUP_2026')).toBe(false);
  });
});

describe('Deterministic Business-Operation Keys (DOC-005 §3.8)', () => {
  it('generates canonical OP_IDEMP_ key with null baseServerRevision on creation', () => {
    const key = generateOperationIdempKey({
      deviceId: 'devA',
      targetDocId: 'site_uuid_1001',
      baseServerRevision: null,
      revisionNumber: 1,
      payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });

    expect(key).toBe('OP_IDEMP_devA_site_uuid_1001_null_1_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(BUSINESS_OP_IDEMP_REGEX.test(key)).toBe(true);
    expect(validateOperationIdempKeySyntax(key)).toBe(true);
  });

  it('generates canonical OP_IDEMP_ key with integer baseServerRevision on correction edit', () => {
    const key = generateOperationIdempKey({
      deviceId: 'devB',
      targetDocId: 'site_uuid_1001',
      baseServerRevision: 1,
      revisionNumber: 2,
      payloadHash: 'abc123hash',
    });

    expect(key).toBe('OP_IDEMP_devB_site_uuid_1001_1_2_abc123hash');
    expect(validateOperationIdempKeySyntax(key)).toBe(true);
  });

  it('rejects malformed business-operation keys', () => {
    expect(validateOperationIdempKeySyntax('IDEMP_SCHEDULED_DAILY_BACKUP')).toBe(false);
    expect(validateOperationIdempKeySyntax('RANDOM_UUID_KEY')).toBe(false);
  });
});
