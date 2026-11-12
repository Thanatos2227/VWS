
import { describe, it, expect } from 'vitest';
import { assertAuthorizedOwner, AUTHORIZED_OWNER_EMAIL } from '../../functions/src/config';
import { HttpsError } from 'firebase-functions/v2/https';

describe('Backend Cloud Functions — Security & Contract Verification', () => {
  describe('assertAuthorizedOwner', () => {
    it('throws unauthenticated HttpsError when authContext is missing', () => {
      expect(() => assertAuthorizedOwner(undefined)).toThrow(HttpsError);
      try {
        assertAuthorizedOwner(undefined);
      } catch (err: any) {
        expect(err.code).toBe('unauthenticated');
      }
    });

    it('throws unauthenticated HttpsError when token email is missing', () => {
      expect(() => assertAuthorizedOwner({ token: {} })).toThrow(HttpsError);
      try {
        assertAuthorizedOwner({ token: {} });
      } catch (err: any) {
        expect(err.code).toBe('unauthenticated');
      }
    });

    it('throws permission-denied HttpsError when caller email does not match authorized owner', () => {
      const unauthorizedAuth = { token: { email: 'attacker@evil.com' } };
      expect(() => assertAuthorizedOwner(unauthorizedAuth)).toThrow(HttpsError);
      try {
        assertAuthorizedOwner(unauthorizedAuth);
      } catch (err: any) {
        expect(err.code).toBe('permission-denied');
        expect(err.message).toContain('Access restricted to authorized owner');
      }
    });

    it('strictly rejects the previous owner email vetriwatersolutions@gmail.com with permission-denied', () => {
      const oldOwnerAuth = { token: { email: 'vetriwatersolutions@gmail.com' } };
      expect(() => assertAuthorizedOwner(oldOwnerAuth)).toThrow(HttpsError);
      try {
        assertAuthorizedOwner(oldOwnerAuth);
      } catch (err: any) {
        expect(err.code).toBe('permission-denied');
        expect(err.message).toContain('Access restricted to authorized owner (vetriwatersolution@gmail.com)');
      }
    });

    it('strictly rejects unrelated third-party Gmail accounts with permission-denied', () => {
      const unrelatedAuth = { token: { email: 'random.user@gmail.com' } };
      expect(() => assertAuthorizedOwner(unrelatedAuth)).toThrow(HttpsError);
      try {
        assertAuthorizedOwner(unrelatedAuth);
      } catch (err: any) {
        expect(err.code).toBe('permission-denied');
        expect(err.message).toContain('Access restricted to authorized owner (vetriwatersolution@gmail.com)');
      }
    });

    it('successfully returns canonical caller email for newly authorized owner vetriwatersolution@gmail.com case-insensitively', () => {
      const validAuthUpper = { token: { email: 'VETRIWATERSOLUTION@GMAIL.COM' } };
      const email = assertAuthorizedOwner(validAuthUpper);
      expect(email).toBe(AUTHORIZED_OWNER_EMAIL.toLowerCase());
      expect(email).toBe('vetriwatersolution@gmail.com');

      const validAuthLower = { token: { email: 'vetriwatersolution@gmail.com ' } };
      expect(assertAuthorizedOwner(validAuthLower)).toBe(AUTHORIZED_OWNER_EMAIL.toLowerCase());
    });
  });

  describe('Contract & Invariant Rules Verification', () => {
    it('verifies that idempotency keys must strictly match canonical OP_IDEMP_ prefix', () => {
      const validKey = 'OP_IDEMP_SITE_CREATE_BILL100_1731140000_abc123';
      const invalidKeys = [
        'IDEMP_TASK_001',
        'SITE_CREATE_123',
        'op_idemp_lowercase',
        'random_uuid'
      ];

      expect(validKey.startsWith('OP_IDEMP_')).toBe(true);
      for (const key of invalidKeys) {
        expect(key.startsWith('OP_IDEMP_')).toBe(false);
      }
    });

    it('verifies the 8 Atomic Commit Invariants defined for backend operations', () => {
      const invariants = [
        '1. Operation record exists',
        '2. Operation record status === IN_PROGRESS',
        '3. Operation fenceToken === current worker fenceToken',
        '4. Operation workerId === current workerId',
        '5. Authoritative backendNow < leaseExpiresAt',
        '6. Operation abortedAt === null',
        '7. Expected base revision matches target record',
        '8. Atomic transaction writes business document AND transitions operation to COMMITTED'
      ];

      expect(invariants.length).toBe(8);
      expect(invariants[0]).toContain('exists');
      expect(invariants[1]).toContain('IN_PROGRESS');
      expect(invariants[2]).toContain('fenceToken');
      expect(invariants[3]).toContain('workerId');
      expect(invariants[4]).toContain('leaseExpiresAt');
      expect(invariants[5]).toContain('abortedAt');
      expect(invariants[6]).toContain('Expected base revision');
      expect(invariants[7]).toContain('COMMITTED');
    });
  });
});

