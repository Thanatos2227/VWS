
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getReminderIntervalDays,
  setReminderIntervalDays,
  getReminderRegistry,
  generateImprovedRemindersFromSites,
  computeNotificationCounts,
  markReminderCompleted
} from '../../src/services/improvedReminderService';
import { 
  determineImprovedReminderStatus 
} from '../../src/utils/improvedReminder';
import { SiteRecord } from '../../src/types/database';

describe('VWS Improved Reminder System — Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const createMockSite = (overrides: Partial<SiteRecord> = {}): SiteRecord => ({
    id: overrides.id || 'site_test_01',
    sequenceNumber: overrides.sequenceNumber || 1,
    year: 2026,
    workDate: overrides.workDate || '2026-11-01',
    customerName: overrides.customerName || 'Kavitha Silks',
    location: overrides.location || 'Coimbatore',
    contactNumber: overrides.contactNumber || '9876543210',
    billNumber: 'BILL-101',
    paymentMode: 'Online',
    totalTanks: 2,
    tanks: [
      { tankType: 'OHT', length: 10, breadth: 10, height: 10, capacityLitres: 28317 }
    ],
    billValuePaise: 400000,
    discountPaise: 0,
    finalValuePaise: 400000,
    version: 1,
    originalRecordId: overrides.originalRecordId || overrides.id || 'site_test_01',
    status: 'ACTIVE',
    isLatestValidVersion: overrides.isLatestValidVersion ?? true,
    isDeleted: overrides.isDeleted ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  describe('Improvement 1: In-App Notification Indicator & Categorization', () => {
    it('distinguishes between due_today, overdue, and upcoming', () => {
      const today = '2026-11-15';
      expect(determineImprovedReminderStatus('2026-11-15', false, today)).toBe('due_today');
      expect(determineImprovedReminderStatus('2026-11-14', false, today)).toBe('overdue');
      expect(determineImprovedReminderStatus('2026-11-20', false, today)).toBe('upcoming');
      expect(determineImprovedReminderStatus('2026-11-14', true, today)).toBe('completed');
    });

    it('computes notification counts strictly for due_today and overdue, excluding future reminders', () => {
      const mockSites = [
        createMockSite({ id: 's1', customerName: 'Client Due Today', workDate: '2026-10-16' }), // +30d -> 2026-11-15
        createMockSite({ id: 's2', customerName: 'Client Overdue', workDate: '2026-10-01' }),   // +30d -> 2026-10-31
        createMockSite({ id: 's3', customerName: 'Client Future', workDate: '2026-11-01' })     // +30d -> 2026-12-01
      ];

      const reminders = generateImprovedRemindersFromSites(mockSites, {
        currentIntervalDays: 30,
        todayStr: '2026-11-15'
      });

      const counts = computeNotificationCounts(reminders);
      expect(counts.dueToday).toBe(1);
      expect(counts.overdue).toBe(1);
      expect(counts.totalActionable).toBe(2); // strictly dueToday + overdue
    });
  });

  describe('Improvement 2: Preserve Previously Generated Reminder Dates', () => {
    it('preserves existing reminder date when default interval changes later (Nov 1 + 30d -> Dec 1)', () => {
      // 1. Initial generation with 30-day default
      const mockSite1 = createMockSite({
        id: 'site_nov1',
        customerName: 'Preserved Customer',
        workDate: '2026-11-01'
      });

      const firstRunReminders = generateImprovedRemindersFromSites([mockSite1], {
        currentIntervalDays: 30,
        todayStr: '2026-11-15'
      });

      expect(firstRunReminders[0].nextReminderDate).toBe('2026-12-01');
      expect(firstRunReminders[0].intervalDays).toBe(30);

      // Verify stored in registry
      const registry = getReminderRegistry();
      expect(registry['site_nov1']).toBeDefined();
      expect(registry['site_nov1'].reminderDate).toBe('2026-12-01');
      expect(registry['site_nov1'].intervalDays).toBe(30);

      // 2. User changes default interval to 45 days
      setReminderIntervalDays(45);
      expect(getReminderIntervalDays()).toBe(45);

      // 3. Re-run generation with a new site alongside the original site
      const mockSite2 = createMockSite({
        id: 'site_nov10_new',
        customerName: 'New Customer',
        workDate: '2026-11-10'
      });

      const secondRunReminders = generateImprovedRemindersFromSites([mockSite1, mockSite2], {
        currentIntervalDays: 45,
        todayStr: '2026-11-15'
      });

      // Original reminder MUST remain 2026-12-01 (30 days)
      const preserved = secondRunReminders.find((r) => r.id === 'site_nov1');
      expect(preserved).toBeDefined();
      expect(preserved?.nextReminderDate).toBe('2026-12-01');
      expect(preserved?.intervalDays).toBe(30);

      // Newly recorded service uses the new 45-day interval: 2026-11-10 + 45 days -> 2026-12-25
      const newReminder = secondRunReminders.find((r) => r.id === 'site_nov10_new');
      expect(newReminder).toBeDefined();
      expect(newReminder?.nextReminderDate).toBe('2026-12-25');
      expect(newReminder?.intervalDays).toBe(45);
    });
  });

  describe('Improvement 3: Correct Reminder Completion and Service Cycle', () => {
    it('calculates next reminder strictly from actual new service date (Nov 25 + 45d -> Jan 9)', () => {
      // Prompt example:
      // Previous service date: Nov 1
      // Previous reminder date: Dec 1
      // Actual new service date: Nov 25
      // Current interval: 45 days
      // Next reminder date: Jan 9
      const service1 = createMockSite({
        id: 'site_cycle_1',
        customerName: 'Cycle Test Client',
        contactNumber: '9999900001',
        workDate: '2026-11-01'
      });

      // 1. Service 1 recorded
      const run1 = generateImprovedRemindersFromSites([service1], {
        currentIntervalDays: 30,
        todayStr: '2026-11-15'
      });
      expect(run1[0].previousServiceDate).toBe('2026-11-01');
      expect(run1[0].nextReminderDate).toBe('2026-12-01');

      // 2. Interval changed to 45 days
      setReminderIntervalDays(45);

      // 3. New service recorded on November 25
      const service2 = createMockSite({
        id: 'site_cycle_2',
        customerName: 'Cycle Test Client',
        contactNumber: '9999900001',
        workDate: '2026-11-25'
      });

      const run2 = generateImprovedRemindersFromSites([service1, service2], {
        currentIntervalDays: 45,
        todayStr: '2026-11-26'
      });

      expect(run2).toHaveLength(2);

      const latestCycle = run2.find((r) => r.id === 'site_cycle_2');
      const previousCycle = run2.find((r) => r.id === 'site_cycle_1');

      // Previous cycle marked completed
      expect(previousCycle?.status).toBe('completed');

      // Latest cycle calculated from actual new service date: 2026-11-25 + 45 days = 2027-01-09
      expect(latestCycle?.previousServiceDate).toBe('2026-11-25');
      expect(latestCycle?.nextReminderDate).toBe('2027-01-09');
      expect(latestCycle?.intervalDays).toBe(45);
      expect(latestCycle?.status).toBe('upcoming');
    });

    it('marking a reminder completed does not falsely create a new service cycle', () => {
      const site = createMockSite({
        id: 'site_single',
        customerName: 'Solo Client',
        workDate: '2026-11-01'
      });

      const beforeCompletion = generateImprovedRemindersFromSites([site], {
        currentIntervalDays: 30,
        todayStr: '2026-11-15'
      });
      expect(beforeCompletion).toHaveLength(1);
      expect(beforeCompletion[0].status).toBe('upcoming');

      // User marks reminder completed
      markReminderCompleted('site_single');

      const afterCompletion = generateImprovedRemindersFromSites([site], {
        currentIntervalDays: 30,
        todayStr: '2026-11-15'
      });

      // Still exactly 1 reminder, now completed; no fake new service or next cycle created
      expect(afterCompletion).toHaveLength(1);
      expect(afterCompletion[0].status).toBe('completed');
    });
  });
});
