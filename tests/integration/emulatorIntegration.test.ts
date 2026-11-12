
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../src/config/firebase';
import { adminDb, adminAuth, AUTHORIZED_OWNER_EMAIL } from '../../functions/src/config';
import { 
  createSiteEntry, 
  createSiteCorrection, 
  softDeleteSite, 
  restoreSite, 
  purgeExpiredSitesList 
} from '../../src/services/siteService';
import { saveDailyAccounts } from '../../src/services/accountService';
import { 
  callCommitSiteJob, 
  callCommitSiteCorrection, 
  callQueryOperationStatus, 
  CallableApiError,
  generateOperationIdempotencyKey,
  getClientDeviceId 
} from '../../src/services/api/callableClient';
import { Timestamp } from 'firebase-admin/firestore';

const OWNER_PASSWORD = 'OwnerPassword123!';
const ATTACKER_EMAIL = 'attacker@evil.com';
const ATTACKER_PASSWORD = 'AttackerPassword123!';
const PREVIOUS_OWNER_EMAIL = 'vetriwatersolutions@gmail.com';
const PREVIOUS_OWNER_PASSWORD = 'OldOwnerPassword123!';

async function setupAuthEmulatorUsers() {
  try {
    const user = await adminAuth.getUserByEmail(AUTHORIZED_OWNER_EMAIL);
    await adminAuth.updateUser(user.uid, {
      emailVerified: true,
      password: OWNER_PASSWORD
    });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      await adminAuth.createUser({
        email: AUTHORIZED_OWNER_EMAIL,
        password: OWNER_PASSWORD,
        emailVerified: true
      });
    }
  }

  try {
    const attacker = await adminAuth.getUserByEmail(ATTACKER_EMAIL);
    await adminAuth.updateUser(attacker.uid, {
      emailVerified: true,
      password: ATTACKER_PASSWORD
    });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      await adminAuth.createUser({
        email: ATTACKER_EMAIL,
        password: ATTACKER_PASSWORD,
        emailVerified: true
      });
    }
  }

  try {
    const oldOwner = await adminAuth.getUserByEmail(PREVIOUS_OWNER_EMAIL);
    await adminAuth.updateUser(oldOwner.uid, {
      emailVerified: true,
      password: PREVIOUS_OWNER_PASSWORD
    });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      await adminAuth.createUser({
        email: PREVIOUS_OWNER_EMAIL,
        password: PREVIOUS_OWNER_PASSWORD,
        emailVerified: true
      });
    }
  }
}

describe('Live Firebase Emulator Suite Integration Tests (Milestone 04C)', () => {
  beforeAll(async () => {
    await setupAuthEmulatorUsers();
  }, 60000);

  afterAll(async () => {
    await signOut(auth);
  });

  beforeEach(async () => {
    await signInWithEmailAndPassword(auth, AUTHORIZED_OWNER_EMAIL, OWNER_PASSWORD);
    await auth.currentUser?.getIdToken(true);
  });

  describe('Site Operations Live Verification', () => {
    const validSiteForm = {
      workDate: '2026-11-09',
      customerName: 'Kavitha Silks & Mills',
      location: 'Avinashi Road, Tiruppur',
      contactNumber: '9842112233',
      googleLocation: 'https://maps.google.com/?q=11.1085,77.3411',
      billNumber: `BILL-${Date.now().toString().slice(-4)}`,
      paymentMode: 'Online' as const,
      billValue: 5000,
      discount: 500,
      tanks: [
        { tankType: 'OHT' as const, length: 6, breadth: 4, height: 4 },
        { tankType: 'UG' as const, length: 10, breadth: 8, height: 6 }
      ]
    };

    it('successfully commits a new site entry (v1) via commitSiteJob Cloud Function', async () => {
      const createdRecord = await createSiteEntry(validSiteForm, AUTHORIZED_OWNER_EMAIL);

      expect(createdRecord).toBeDefined();
      expect(createdRecord.id).toMatch(/^site_/);
      expect(createdRecord.version).toBe(1);
      expect(createdRecord.status).toBe('ACTIVE');
      expect(createdRecord.isLatestValidVersion).toBe(true);
      expect(createdRecord.sequenceNumber).toBeGreaterThan(0);
      expect(createdRecord.finalValuePaise).toBe(450000);

      const siteDocSnap = await adminDb.collection('sites').doc(createdRecord.id).get();
      expect(siteDocSnap.exists).toBe(true);
      const serverSite = siteDocSnap.data()!;
      expect(serverSite.customerName).toBe('Kavitha Silks & Mills');
      expect(serverSite.billNumber).toBe(validSiteForm.billNumber);
      expect(serverSite.version).toBe(1);
      expect(serverSite.isLatestValidVersion).toBe(true);
      expect(serverSite.isDeleted).toBe(false);

      const opQuery = await adminDb.collection('committed_operations')
        .where('committedServerDocId', '==', createdRecord.id)
        .limit(1)
        .get();
      expect(opQuery.empty).toBe(false);
      const opData = opQuery.docs[0].data();
      expect(opData.status).toBe('COMMITTED');
      expect(opData.committedVersion).toBe(1);
    }, 60000);

    it('successfully commits linked corrections (v1 -> v2 -> v3) and updates predecessor status', async () => {
      const v1 = await createSiteEntry({
        ...validSiteForm,
        billNumber: `BILL-CHAIN-${Date.now().toString().slice(-4)}`
      }, AUTHORIZED_OWNER_EMAIL);

      const v2Form = {
        ...validSiteForm,
        billNumber: v1.billNumber,
        discount: 1000,
        correctionReason: 'Owner granted ₹500 additional discount'
      };
      const v2 = await createSiteCorrection(v1, v2Form, AUTHORIZED_OWNER_EMAIL);

      expect(v2.version).toBe(2);
      expect(v2.previousRecordId).toBe(v1.id);
      expect(v2.originalRecordId).toBe(v1.id);
      expect(v2.sequenceNumber).toBe(v1.sequenceNumber);
      expect(v2.finalValuePaise).toBe(400000);

      const v1Snap = await adminDb.collection('sites').doc(v1.id).get();
      expect(v1Snap.data()!.status).toBe('SUPERSEDED');
      expect(v1Snap.data()!.isLatestValidVersion).toBe(false);

      const v2Snap = await adminDb.collection('sites').doc(v2.id).get();
      expect(v2Snap.data()!.status).toBe('ACTIVE');
      expect(v2Snap.data()!.isLatestValidVersion).toBe(true);

      const v3Form = {
        ...v2Form,
        customerName: 'Kavitha Silks & Garments Pvt Ltd',
        correctionReason: 'Updated official legal customer name'
      };
      const v3 = await createSiteCorrection(v2, v3Form, AUTHORIZED_OWNER_EMAIL);

      expect(v3.version).toBe(3);
      expect(v3.previousRecordId).toBe(v2.id);
      expect(v3.originalRecordId).toBe(v1.id);

      const v2UpdatedSnap = await adminDb.collection('sites').doc(v2.id).get();
      expect(v2UpdatedSnap.data()!.status).toBe('SUPERSEDED');
      expect(v2UpdatedSnap.data()!.isLatestValidVersion).toBe(false);

      const v3Snap = await adminDb.collection('sites').doc(v3.id).get();
      expect(v3Snap.data()!.status).toBe('ACTIVE');
      expect(v3Snap.data()!.isLatestValidVersion).toBe(true);
      expect(v3Snap.data()!.customerName).toBe('Kavitha Silks & Garments Pvt Ltd');
    }, 60000);

    it('performs soft deletion and restoration via commitSiteStatusChange Cloud Function', async () => {
      const site = await createSiteEntry({
        ...validSiteForm,
        billNumber: `BILL-DEL-${Date.now().toString().slice(-4)}`
      }, AUTHORIZED_OWNER_EMAIL);

      await softDeleteSite(site.id, AUTHORIZED_OWNER_EMAIL);

      const delSnap = await adminDb.collection('sites').doc(site.id).get();
      expect(delSnap.data()!.isDeleted).toBe(true);
      expect(delSnap.data()!.deletedBy).toBe(AUTHORIZED_OWNER_EMAIL);
      expect(delSnap.data()!.expiresForPurgeAt).toBeDefined();

      await restoreSite(site.id);

      const restSnap = await adminDb.collection('sites').doc(site.id).get();
      expect(restSnap.data()!.isDeleted).toBe(false);
      expect(restSnap.data()!.deletedBy).toBeNull();
      expect(restSnap.data()!.expiresForPurgeAt).toBeNull();
    }, 60000);

    it('replays duplicate requests idempotently without allocating new sequences or duplicating records', async () => {
      const idempKey = generateOperationIdempotencyKey('SITE_CREATE', `DUP_BILL_${Date.now()}`);
      const clientDeviceId = getClientDeviceId();

      const payload = {
        idempotencyKey: idempKey,
        clientDeviceId,
        workDate: '2026-11-09',
        customerName: 'Duplicate Test Client',
        location: 'Coimbatore',
        contactNumber: '9988776655',
        billNumber: `DUP-BILL-${Date.now().toString().slice(-4)}`,
        paymentMode: 'Cash' as const,
        billValuePaise: 300000,
        discountPaise: 0,
        finalValuePaise: 300000,
        tanks: [{ tankType: 'OHT' as const, length: 5, breadth: 4, height: 4, capacityLitres: 2265 }]
      };

      const res1 = await callCommitSiteJob(payload);
      expect(res1.status).toBe('COMMITTED');

      const res2 = await callCommitSiteJob(payload);
      expect(res2.status).toBe('COMMITTED');
      expect(res2.siteId).toBe(res1.siteId);
      expect(res2.sequenceNumber).toBe(res1.sequenceNumber);

      const countSnap = await adminDb.collection('sites')
        .where('billNumber', '==', payload.billNumber)
        .get();
      expect(countSnap.docs.length).toBe(1);
    }, 60000);

    it('rejects correction attempts referencing stale or non-existent predecessor versions', async () => {
      const payload = {
        idempotencyKey: generateOperationIdempotencyKey('SITE_CORRECT', 'NON_EXISTENT'),
        clientDeviceId: getClientDeviceId(),
        previousRecordId: 'site_does_not_exist_99999',
        expectedPreviousVersion: 1,
        workDate: '2026-11-09',
        customerName: 'Ghost Client',
        location: 'Unknown',
        contactNumber: '0000000000',
        billNumber: 'GHOST-01',
        paymentMode: 'Cash' as const,
        billValuePaise: 100000,
        discountPaise: 0,
        finalValuePaise: 100000,
        tanks: [{ tankType: 'OHT' as const, length: 5, breadth: 4, height: 4, capacityLitres: 2265 }]
      };

      await expect(callCommitSiteCorrection(payload)).rejects.toThrow();
    }, 60000);

    it('purges records past 30-day retention window while preserving active and recent soft-deleted records', async () => {
      const activeSite = await createSiteEntry({
        ...validSiteForm,
        billNumber: `BILL-ACTIVE-${Date.now().toString().slice(-4)}`
      }, AUTHORIZED_OWNER_EMAIL);

      const expiredSiteId = `site_expired_${Date.now()}`;
      const pastTime = new Timestamp(Math.floor(Date.now() / 1000) - 3600, 0);
      await adminDb.collection('sites').doc(expiredSiteId).set({
        id: expiredSiteId,
        customerName: 'Expired Record Company',
        isDeleted: true,
        deletedAt: pastTime,
        expiresForPurgeAt: pastTime,
        createdAt: pastTime
      });

      const purgeResult = await purgeExpiredSitesList();
      expect(purgeResult.purgedCount).toBeGreaterThanOrEqual(1);
      expect(purgeResult.purgedSiteIds).toContain(expiredSiteId);

      const expiredSnap = await adminDb.collection('sites').doc(expiredSiteId).get();
      expect(expiredSnap.exists).toBe(false);

      const activeSnap = await adminDb.collection('sites').doc(activeSite.id).get();
      expect(activeSnap.exists).toBe(true);
    }, 60000);
  });

  describe('Daily Accounts Operations Live Verification', () => {
    const testDate = '2026-11-09';
    const officialForm = {
      refreshment: 150,
      transport: 300,
      sparesHO: 800,
      staffAttendanceCount: 4,
      staffAttendanceExpense: 3200,
      staffSalary: 6000,
      salaryEntries: [
        { id: 'sal_01', staffName: 'Murugan R', amountPaise: 350000 },
        { id: 'sal_02', staffName: 'Karthi S', amountPaise: 250000 }
      ],
      notes: 'Water pump seal replacement and transport'
    };

    const personalForm = {
      transport: 120,
      refreshment: 60,
      groceriesVegMilk: 550,
      lunchDinner: 380,
      other: 0,
      notes: 'Personal groceries'
    };

    it('commits daily accounts update and creates immutable audit log entry in subcollection', async () => {
      const record = await saveDailyAccounts(
        testDate,
        officialForm,
        personalForm,
        AUTHORIZED_OWNER_EMAIL,
        'Initial daily expense entry'
      );

      const expectedOfficialPaise = (150 + 300 + 800 + 3200 + 6000) * 100;
      const expectedPersonalPaise = (120 + 60 + 550 + 380) * 100;
      const expectedGrandTotalPaise = expectedOfficialPaise + expectedPersonalPaise;

      expect(record.entryDate).toBe(testDate);
      expect(record.official.totalOfficialPaise).toBe(expectedOfficialPaise);
      expect(record.personal.totalPersonalPaise).toBe(expectedPersonalPaise);
      expect(record.dailyGrandTotalPaise).toBe(expectedGrandTotalPaise);

      const accDocSnap = await adminDb.collection('accounts_daily').doc(testDate).get();
      expect(accDocSnap.exists).toBe(true);
      const serverAcc = accDocSnap.data()!;
      expect(serverAcc.dailyGrandTotalPaise).toBe(expectedGrandTotalPaise);
      expect(serverAcc.official.salaryEntries.length).toBe(2);

      const updatedPersonal = { ...personalForm, groceriesVegMilk: 650 };
      await saveDailyAccounts(
        testDate,
        officialForm,
        updatedPersonal,
        AUTHORIZED_OWNER_EMAIL,
        'Added extra vegetable expense ₹100'
      );

      const auditSnap = await adminDb.collection('accounts_daily').doc(testDate).collection('audit_log').get();
      expect(auditSnap.empty).toBe(false);
      const auditLog = auditSnap.docs[0].data();
      expect(auditLog.modifiedBy).toBe(AUTHORIZED_OWNER_EMAIL);
      expect(auditLog.reason).toBe('Added extra vegetable expense ₹100');
      expect(auditLog.previousTotals.grandTotalPaise).toBe(expectedGrandTotalPaise);
      expect(auditLog.newTotals.grandTotalPaise).toBe(expectedGrandTotalPaise + 10000);
    }, 60000);
  });

  describe('Failure and Security Scenarios Live Verification', () => {
    it('rejects unauthenticated requests with unauthenticated error', async () => {
      await signOut(auth);

      const payload = {
        idempotencyKey: generateOperationIdempotencyKey('SITE_CREATE', 'UNAUTH_TEST'),
        clientDeviceId: getClientDeviceId(),
        workDate: '2026-11-09',
        customerName: 'Attacker Customer',
        location: 'Nowhere',
        contactNumber: '0000000000',
        billNumber: 'HACK-01',
        paymentMode: 'Cash' as const,
        billValuePaise: 100000,
        discountPaise: 0,
        finalValuePaise: 100000,
        tanks: [{ tankType: 'OHT' as const, length: 5, breadth: 4, height: 4, capacityLitres: 2265 }]
      };

      await expect(callCommitSiteJob(payload)).rejects.toThrow(CallableApiError);
      try {
        await callCommitSiteJob(payload);
      } catch (err: any) {
        expect(err.code).toBe('unauthenticated');
      }
    }, 60000);

    it('rejects non-owner authenticated accounts with permission-denied', async () => {
      await signInWithEmailAndPassword(auth, ATTACKER_EMAIL, ATTACKER_PASSWORD);

      const payload = {
        idempotencyKey: generateOperationIdempotencyKey('SITE_CREATE', 'UNAUTHORIZED_TEST'),
        clientDeviceId: getClientDeviceId(),
        workDate: '2026-11-09',
        customerName: 'Attacker Customer',
        location: 'Nowhere',
        contactNumber: '0000000000',
        billNumber: 'HACK-02',
        paymentMode: 'Cash' as const,
        billValuePaise: 100000,
        discountPaise: 0,
        finalValuePaise: 100000,
        tanks: [{ tankType: 'OHT' as const, length: 5, breadth: 4, height: 4, capacityLitres: 2265 }]
      };

      await expect(callCommitSiteJob(payload)).rejects.toThrow(CallableApiError);
      try {
        await callCommitSiteJob(payload);
      } catch (err: any) {
        expect(err.code).toBe('permission-denied');
        expect(err.message).toContain('Access Denied');
      }
    }, 60000);

    it('strictly rejects previous owner email vetriwatersolutions@gmail.com with permission-denied', async () => {
      await signInWithEmailAndPassword(auth, PREVIOUS_OWNER_EMAIL, PREVIOUS_OWNER_PASSWORD);

      const payload = {
        idempotencyKey: generateOperationIdempotencyKey('SITE_CREATE', 'OLD_OWNER_REJECT_TEST'),
        clientDeviceId: getClientDeviceId(),
        workDate: '2026-11-09',
        customerName: 'Old Owner Attempt',
        location: 'Nowhere',
        contactNumber: '0000000000',
        billNumber: 'OLD-01',
        paymentMode: 'Cash' as const,
        billValuePaise: 100000,
        discountPaise: 0,
        finalValuePaise: 100000,
        tanks: [{ tankType: 'OHT' as const, length: 5, breadth: 4, height: 4, capacityLitres: 2265 }]
      };

      await expect(callCommitSiteJob(payload)).rejects.toThrow(CallableApiError);
      try {
        await callCommitSiteJob(payload);
      } catch (err: any) {
        expect(err.code).toBe('permission-denied');
        expect(err.message).toContain('Access Denied');
      }
    }, 60000);

    it('rejects non-canonical idempotency keys with invalid-argument', async () => {
      const payload = {
        idempotencyKey: 'INVALID_IDEMP_KEY_WITHOUT_PREFIX',
        clientDeviceId: getClientDeviceId(),
        workDate: '2026-11-09',
        customerName: 'Bad Key Customer',
        location: 'Nowhere',
        contactNumber: '0000000000',
        billNumber: 'BAD-KEY-01',
        paymentMode: 'Cash' as const,
        billValuePaise: 100000,
        discountPaise: 0,
        finalValuePaise: 100000,
        tanks: [{ tankType: 'OHT' as const, length: 5, breadth: 4, height: 4, capacityLitres: 2265 }]
      };

      await expect(callCommitSiteJob(payload)).rejects.toThrow(CallableApiError);
      try {
        await callCommitSiteJob(payload);
      } catch (err: any) {
        expect(err.code).toBe('invalid-argument');
      }
    }, 60000);

    it('correctly queries operation status via queryOperationStatus Cloud Function', async () => {
      const testKey = generateOperationIdempotencyKey('QUERY_TEST', `SAMPLE_${Date.now()}`);
      
      const resUnknown = await callQueryOperationStatus({ idempotencyKey: testKey });
      expect(resUnknown.status).toBe('UNKNOWN');

      await adminDb.collection('committed_operations').doc(testKey).set({
        idempotencyKey: testKey,
        status: 'ABORTED_TERMINAL',
        terminalReason: 'Test fatal simulation',
        abortedAt: Timestamp.now()
      });

      const resNotCommitted = await callQueryOperationStatus({ idempotencyKey: testKey });
      expect(resNotCommitted.status).toBe('NOT_COMMITTED');
      expect(resNotCommitted.terminalReason).toBe('Test fatal simulation');
    }, 60000);
  });

  describe('Canonical Firestore Security Rules Live Verification', () => {
    it('strictly denies direct client writes to /sites/{siteId}', async () => {
      const illegalSiteRef = doc(db, 'sites', 'illegal_client_direct_write');
      const illegalData = {
        id: 'illegal_client_direct_write',
        customerName: 'Hacked Direct Client Entry',
        billValuePaise: 10000000
      };

      await expect(setDoc(illegalSiteRef, illegalData)).rejects.toThrow(/PERMISSION_DENIED|permission-denied|Missing or insufficient permissions/i);
    });

    it('strictly denies direct client writes to /accounts_daily/{dateId}', async () => {
      const illegalAccRef = doc(db, 'accounts_daily', '2026-11-09');
      const illegalData = {
        entryDate: '2026-11-09',
        dailyGrandTotalPaise: 0
      };

      await expect(setDoc(illegalAccRef, illegalData)).rejects.toThrow(/PERMISSION_DENIED|permission-denied|Missing or insufficient permissions/i);
    });

    it('strictly denies direct client writes to /system_counters/sites_seq', async () => {
      const illegalCounterRef = doc(db, 'system_counters', 'sites_seq');
      await expect(setDoc(illegalCounterRef, { currentSeq: 99999 })).rejects.toThrow(/PERMISSION_DENIED|permission-denied|Missing or insufficient permissions/i);
    });

    it('permits authorized owner to read collections directly via Firestore Client SDK', async () => {
      await signInWithEmailAndPassword(auth, AUTHORIZED_OWNER_EMAIL, OWNER_PASSWORD);
      await auth.currentUser?.getIdToken(true);

      const sitesCollectionRef = collection(db, 'sites');
      const snapshot = await getDocs(sitesCollectionRef);
      expect(snapshot).toBeDefined();
      expect(snapshot.empty).toBe(false);
    });

    it('denies unauthorized accounts from reading collections directly', async () => {
      await signInWithEmailAndPassword(auth, ATTACKER_EMAIL, ATTACKER_PASSWORD);
      await auth.currentUser?.getIdToken(true);

      const sitesCollectionRef = collection(db, 'sites');
      await expect(getDocs(sitesCollectionRef)).rejects.toThrow();
      try {
        await getDocs(sitesCollectionRef);
      } catch (err: any) {
        expect(err.code === 'permission-denied' || /false for 'list'|PERMISSION_DENIED/i.test(err.message)).toBe(true);
      }
    });

    it('strictly denies previous owner email vetriwatersolutions@gmail.com from reading collections directly', async () => {
      await signInWithEmailAndPassword(auth, PREVIOUS_OWNER_EMAIL, PREVIOUS_OWNER_PASSWORD);
      await auth.currentUser?.getIdToken(true);

      const sitesCollectionRef = collection(db, 'sites');
      await expect(getDocs(sitesCollectionRef)).rejects.toThrow();
      try {
        await getDocs(sitesCollectionRef);
      } catch (err: any) {
        expect(err.code === 'permission-denied' || /false for 'list'|PERMISSION_DENIED/i.test(err.message)).toBe(true);
      }
    });
  });
});
