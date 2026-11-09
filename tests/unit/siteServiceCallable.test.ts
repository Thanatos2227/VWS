/**
 * tests/unit/siteServiceCallable.test.ts
 * 
 * Unit tests verifying that siteService.ts routes all mutations through
 * callableClient.ts rather than direct Firestore writes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createSiteEntry, 
  createSiteCorrection, 
  softDeleteSite, 
  restoreSite 
} from '../../src/services/siteService';
import * as callableClient from '../../src/services/api/callableClient';
import { SiteRecord } from '../../src/types/database';

vi.mock('../../src/services/api/callableClient', async () => {
  const actual = await vi.importActual<typeof callableClient>('../../src/services/api/callableClient');
  return {
    ...actual,
    callCommitSiteJob: vi.fn(),
    callCommitSiteCorrection: vi.fn(),
    callCommitSiteStatusChange: vi.fn()
  };
});

describe('Site Service — Callable Cloud Functions Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validSiteForm = {
    workDate: '2026-11-09',
    customerName: 'Kavitha Textiles',
    location: 'Tiruppur',
    contactNumber: '9443322110',
    googleLocation: 'https://maps.google.com/?q=11.1085,77.3411',
    billNumber: 'BILL-501',
    paymentMode: 'Online' as const,
    billValue: 4500, // ₹4,500
    discount: 500,  // ₹500
    tanks: [
      {
        tankType: 'UG' as const,
        length: 8,
        breadth: 6,
        height: 5
      }
    ]
  };

  describe('createSiteEntry', () => {
    it('validates mandatory fields prior to callable invocation', async () => {
      await expect(createSiteEntry({ ...validSiteForm, workDate: '' }, 'owner@vws.com'))
        .rejects.toThrow('Work date is required.');
      await expect(createSiteEntry({ ...validSiteForm, customerName: ' ' }, 'owner@vws.com'))
        .rejects.toThrow('Customer name is required.');
      await expect(createSiteEntry({ ...validSiteForm, billNumber: '' }, 'owner@vws.com'))
        .rejects.toThrow('Physical bill number is required.');
      await expect(createSiteEntry({ ...validSiteForm, tanks: [] }, 'owner@vws.com'))
        .rejects.toThrow('At least one tank entry is required.');
      expect(callableClient.callCommitSiteJob).not.toHaveBeenCalled();
    });

    it('successfully calls callCommitSiteJob with adapted paise values and returns SiteRecord', async () => {
      vi.mocked(callableClient.callCommitSiteJob).mockResolvedValue({
        status: 'COMMITTED',
        siteId: 'site_server_abc123',
        sequenceNumber: 15,
        version: 1,
        serverCommittedAt: '2026-11-09T10:00:00.000Z'
      });

      const result = await createSiteEntry(validSiteForm, 'vetriwatersolutions@gmail.com');

      expect(callableClient.callCommitSiteJob).toHaveBeenCalledTimes(1);
      const passedPayload = vi.mocked(callableClient.callCommitSiteJob).mock.calls[0][0];

      expect(passedPayload.idempotencyKey).toMatch(/^OP_IDEMP_SITE_CREATE_BILL-501_/);
      expect(passedPayload.customerName).toBe('Kavitha Textiles');
      expect(passedPayload.billValuePaise).toBe(450000); // 4500 * 100
      expect(passedPayload.discountPaise).toBe(50000);   // 500 * 100
      expect(passedPayload.finalValuePaise).toBe(400000); // 4000 * 100
      expect(passedPayload.tanks[0].capacityLitres).toBe(6796); // 8*6*5*28.3168 rounded

      expect(result.id).toBe('site_server_abc123');
      expect(result.sequenceNumber).toBe(15);
      expect(result.version).toBe(1);
      expect(result.isLatestValidVersion).toBe(true);
      expect(result.status).toBe('ACTIVE');
    });

    it('propagates callable errors without returning false commit record', async () => {
      vi.mocked(callableClient.callCommitSiteJob).mockRejectedValue(
        new callableClient.CallableApiError('Access Denied', 'permission-denied')
      );

      await expect(createSiteEntry(validSiteForm, 'unauthorized@gmail.com'))
        .rejects.toThrow('Access Denied');
    });
  });

  describe('createSiteCorrection', () => {
    it('successfully routes correction through callCommitSiteCorrection', async () => {
      const previousRecord: SiteRecord = {
        id: 'site_orig_1',
        sequenceNumber: 10,
        siteNumber: 10,
        year: 2026,
        calendarYear: 2026,
        workDate: '2026-11-08',
        customerName: 'Kavitha Textiles',
        location: 'Tiruppur',
        contactNumber: '9443322110',
        billNumber: 'BILL-501',
        paymentMode: 'Cash',
        totalTanks: 1,
        tanks: [{ tankIndex: 1, tankType: 'UG', length: 8, breadth: 6, height: 5, capacityLitres: 6796 }],
        billValuePaise: 400000,
        discountPaise: 0,
        finalValuePaise: 400000,
        version: 1,
        originalRecordId: 'site_orig_1',
        previousRecordId: null,
        isLatestValidVersion: true,
        status: 'ACTIVE',
        correctedAt: null,
        correctionReason: null,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        expiresForPurgeAt: null,
        createdAt: { seconds: 1731140000, nanoseconds: 0 } as any,
        updatedAt: { seconds: 1731140000, nanoseconds: 0 } as any,
        createdBy: 'vetriwatersolutions@gmail.com'
      };

      vi.mocked(callableClient.callCommitSiteCorrection).mockResolvedValue({
        status: 'COMMITTED',
        siteId: 'site_corr_v2',
        version: 2,
        serverCommittedAt: '2026-11-09T11:00:00.000Z'
      });

      const updatedForm = {
        ...validSiteForm,
        correctionReason: 'Added discount of ₹500'
      };

      const result = await createSiteCorrection(previousRecord, updatedForm, 'vetriwatersolutions@gmail.com');

      expect(callableClient.callCommitSiteCorrection).toHaveBeenCalledTimes(1);
      const passedPayload = vi.mocked(callableClient.callCommitSiteCorrection).mock.calls[0][0];

      expect(passedPayload.previousRecordId).toBe('site_orig_1');
      expect(passedPayload.expectedPreviousVersion).toBe(1);
      expect(passedPayload.correctionReason).toBe('Added discount of ₹500');
      expect(passedPayload.finalValuePaise).toBe(400000);

      expect(result.id).toBe('site_corr_v2');
      expect(result.version).toBe(2);
      expect(result.sequenceNumber).toBe(10); // Sequence number preserved across versions
      expect(result.originalRecordId).toBe('site_orig_1');
    });
  });

  describe('softDeleteSite & restoreSite', () => {
    it('routes soft-delete through callCommitSiteStatusChange with action SOFT_DELETE', async () => {
      vi.mocked(callableClient.callCommitSiteStatusChange).mockResolvedValue({
        status: 'COMMITTED',
        siteId: 'site_del_1',
        action: 'SOFT_DELETE',
        serverCommittedAt: '2026-11-09T12:00:00.000Z'
      });

      await softDeleteSite('site_del_1', 'vetriwatersolutions@gmail.com');

      expect(callableClient.callCommitSiteStatusChange).toHaveBeenCalledTimes(1);
      const payload = vi.mocked(callableClient.callCommitSiteStatusChange).mock.calls[0][0];
      expect(payload.siteId).toBe('site_del_1');
      expect(payload.action).toBe('SOFT_DELETE');
      expect(payload.idempotencyKey).toMatch(/^OP_IDEMP_SITE_SOFTDEL_site_del_1_/);
    });

    it('routes restore through callCommitSiteStatusChange with action RESTORE', async () => {
      vi.mocked(callableClient.callCommitSiteStatusChange).mockResolvedValue({
        status: 'COMMITTED',
        siteId: 'site_del_1',
        action: 'RESTORE',
        serverCommittedAt: '2026-11-09T12:05:00.000Z'
      });

      await restoreSite('site_del_1');

      expect(callableClient.callCommitSiteStatusChange).toHaveBeenCalledTimes(1);
      const payload = vi.mocked(callableClient.callCommitSiteStatusChange).mock.calls[0][0];
      expect(payload.siteId).toBe('site_del_1');
      expect(payload.action).toBe('RESTORE');
      expect(payload.idempotencyKey).toMatch(/^OP_IDEMP_SITE_RESTORE_site_del_1_/);
    });
  });
});

