
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  normalizeCallableError, 
  generateOperationIdempotencyKey,
  getClientDeviceId,
  CallableApiError,
  callCommitSiteJob,
  callCommitDailyAccountsUpdate
} from '../../src/services/api/callableClient';
import * as functionsSdk from 'firebase/functions';

vi.mock('firebase/functions', async () => {
  const actual = await vi.importActual<typeof functionsSdk>('firebase/functions');
  return {
    ...actual,
    httpsCallable: vi.fn()
  };
});

describe('Callable Client API & Error Normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Idempotency Key Generation', () => {
    it('generates canonical keys adhering to ^OP_IDEMP_[A-Za-z0-9_.-]+$', () => {
      const key = generateOperationIdempotencyKey('SITE_CREATE', 'BILL-104/A');
      expect(key).toMatch(/^OP_IDEMP_[A-Za-z0-9_.-]+$/);
      expect(key).toContain('OP_IDEMP_SITE_CREATE_');
      expect(key).not.toContain('/');
    });

    it('generates unique keys for subsequent calls', () => {
      const key1 = generateOperationIdempotencyKey('ACCOUNTS', '2026-11-09');
      const key2 = generateOperationIdempotencyKey('ACCOUNTS', '2026-11-09');
      expect(key1).not.toBe(key2);
    });
  });

  describe('Device ID Storage', () => {
    it('returns a non-empty device identifier string', () => {
      const id = getClientDeviceId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('Error Normalization', () => {
    it('normalizes permission-denied into clear unauthorized owner message', () => {
      const rawError = {
        code: 'functions/permission-denied',
        message: 'Access restricted to authorized owner.'
      };

      const normalized = normalizeCallableError(rawError);
      expect(normalized).toBeInstanceOf(CallableApiError);
      expect(normalized.code).toBe('permission-denied');
      expect(normalized.message).toContain('Access Denied');
      expect(normalized.isNetworkFailure).toBe(false);
    });

    it('normalizes unauthenticated into authentication required message', () => {
      const rawError = {
        code: 'unauthenticated',
        message: 'User must sign in'
      };

      const normalized = normalizeCallableError(rawError);
      expect(normalized.code).toBe('unauthenticated');
      expect(normalized.message).toContain('Authentication Required');
      expect(normalized.isNetworkFailure).toBe(false);
    });

    it('handles network dropouts and flags isNetworkFailure without false success', () => {
      const rawError = {
        code: 'unavailable',
        message: 'Failed to fetch: Network unreachable'
      };
      const idempKey = 'OP_IDEMP_TEST_123';

      const normalized = normalizeCallableError(rawError, idempKey);
      expect(normalized.code).toBe('unavailable');
      expect(normalized.isNetworkFailure).toBe(true);
      expect(normalized.idempotencyKey).toBe(idempKey);
      expect(normalized.message).toContain('UNKNOWN');
      expect(normalized.message).toContain(idempKey);
    });

    it('normalizes generic fetch errors as network failures', () => {
      const rawError = new TypeError('Failed to fetch');
      const normalized = normalizeCallableError(rawError, 'OP_IDEMP_FETCH');
      expect(normalized.isNetworkFailure).toBe(true);
      expect(normalized.code).toBe('unavailable');
      expect(normalized.message).toContain('Network connectivity lost');
    });
  });

  describe('Callable Invocations with Mock Functions SDK', () => {
    it('returns committed data on successful commitSiteJob call', async () => {
      const mockResult = {
        data: {
          status: 'COMMITTED',
          siteId: 'site_123',
          sequenceNumber: 42,
          version: 1,
          serverCommittedAt: '2026-11-09T10:00:00.000Z'
        }
      };

      const mockCallable = vi.fn().mockResolvedValue(mockResult);
      vi.mocked(functionsSdk.httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        idempotencyKey: 'OP_IDEMP_SITE_CREATE_001',
        clientDeviceId: 'dev_1',
        workDate: '2026-11-09',
        customerName: 'Senthil Kumar',
        location: 'Coimbatore',
        contactNumber: '9876543210',
        billNumber: 'BILL-100',
        paymentMode: 'Cash' as const,
        billValuePaise: 350000,
        discountPaise: 0,
        finalValuePaise: 350000,
        tanks: [{ tankType: 'OHT' as const, length: 5, breadth: 4, height: 4, capacityLitres: 2265 }]
      };

      const result = await callCommitSiteJob(payload);
      expect(result.status).toBe('COMMITTED');
      expect(result.siteId).toBe('site_123');
      expect(result.sequenceNumber).toBe(42);
      expect(mockCallable).toHaveBeenCalledWith(payload);
    });

    it('propagates normalized network failure on network disconnect', async () => {
      const mockCallable = vi.fn().mockRejectedValue({
        code: 'unavailable',
        message: 'Failed to fetch'
      });
      vi.mocked(functionsSdk.httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        idempotencyKey: 'OP_IDEMP_ACCOUNTS_20261109',
        clientDeviceId: 'dev_1',
        entryDate: '2026-11-09',
        official: {
          refreshmentPaise: 5000,
          transportPaise: 10000,
          sparesHOPaise: 0,
          staffAttendanceCount: 2,
          staffAttendanceExpensePaise: 160000,
          staffSalaryPaise: 0
        },
        personal: {
          transportPaise: 0,
          refreshmentPaise: 2000,
          groceriesVegMilkPaise: 15000,
          lunchDinnerPaise: 20000,
          otherPaise: 0
        }
      };

      await expect(callCommitDailyAccountsUpdate(payload)).rejects.toThrow(CallableApiError);
      try {
        await callCommitDailyAccountsUpdate(payload);
      } catch (err: any) {
        expect(err.isNetworkFailure).toBe(true);
        expect(err.idempotencyKey).toBe('OP_IDEMP_ACCOUNTS_20261109');
      }
    });
  });
});

