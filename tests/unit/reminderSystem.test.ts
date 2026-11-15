
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  DEFAULT_REMINDER_INTERVAL_DAYS,
  getReminderIntervalDays,
  setReminderIntervalDays,
  getCompletedReminders,
  markReminderCompleted,
  unmarkReminderCompleted,
  generateRemindersFromSites
} from '../../src/services/reminderService';
import { 
  calculateNextReminderDate, 
  getDaysDifference, 
  determineReminderStatus 
} from '../../src/utils/reminder';
import { SiteRecord } from '../../src/types/database';

describe('VWS Automatic Reminder System — Logic & Persistence Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Default Reminder Interval and User Customization', () => {
    it('initializes with default interval of 30 days on a new installation', () => {
      expect(getReminderIntervalDays()).toBe(30);
      expect(DEFAULT_REMINDER_INTERVAL_DAYS).toBe(30);
    });

    it('persists customized interval and retrieves it across application restarts', () => {
      setReminderIntervalDays(45);
      expect(localStorage.getItem('vws_reminder_interval_days')).toBe('45');
      expect(getReminderIntervalDays()).toBe(45);

      setReminderIntervalDays(60);
      expect(getReminderIntervalDays()).toBe(60);
    });

    it('gracefully handles corrupted or non-positive values by falling back to 30 days', () => {
      localStorage.setItem('vws_reminder_interval_days', '-5');
      expect(getReminderIntervalDays()).toBe(30);

      localStorage.setItem('vws_reminder_interval_days', 'invalid_string');
      expect(getReminderIntervalDays()).toBe(30);
    });
  });

  describe('2. Automatic Date Calculations', () => {
    it('calculates December 1 from November 1 service completion with 30-day interval', () => {
      const nextDate = calculateNextReminderDate('2026-11-01', 30);
      expect(nextDate).toBe('2026-12-01');
    });

    it('correctly adds customized intervals (e.g., 15, 45, 60 days)', () => {
      expect(calculateNextReminderDate('2026-01-01', 15)).toBe('2026-01-16');
      expect(calculateNextReminderDate('2026-01-01', 45)).toBe('2026-02-15');
      expect(calculateNextReminderDate('2026-01-01', 60)).toBe('2026-03-02');
    });

    it('computes days difference accurately relative to a base date', () => {
      expect(getDaysDifference('2026-12-01', '2026-11-01')).toBe(30);
      expect(getDaysDifference('2026-11-01', '2026-12-01')).toBe(-30);
      expect(getDaysDifference('2026-11-01', '2026-11-01')).toBe(0);
    });
  });

  describe('3. Reminder Status Determination', () => {
    it('marks reminder as overdue when next reminder date is strictly before today', () => {
      const today = '2026-11-14';
      const status = determineReminderStatus('2026-11-10', false, today);
      expect(status).toBe('overdue');
    });

    it('marks reminder as upcoming when next reminder date is today or in the future', () => {
      const today = '2026-11-14';
      expect(determineReminderStatus('2026-11-14', false, today)).toBe('upcoming');
      expect(determineReminderStatus('2026-11-20', false, today)).toBe('upcoming');
    });

    it('marks reminder as completed regardless of date when isCompleted is true', () => {
      expect(determineReminderStatus('2026-10-01', true, '2026-11-14')).toBe('completed');
      expect(determineReminderStatus('2026-12-01', true, '2026-11-14')).toBe('completed');
    });
  });

  describe('4. Automatic Reminder Generation from Customer Records', () => {
    const createMockSite = (overrides: Partial<SiteRecord> = {}): SiteRecord => ({
      id: overrides.id || 'site_001',
      sequenceNumber: overrides.sequenceNumber || 1,
      year: 2026,
      workDate: overrides.workDate || '2026-10-01',
      customerName: overrides.customerName || 'Kavitha Silks',
      location: overrides.location || 'Coimbatore',
      contactNumber: overrides.contactNumber || '9876543210',
      billNumber: 'BILL-101',
      paymentMode: 'Online',
      totalTanks: 2,
      tanks: [
        { tankType: 'OHT', length: 10, breadth: 10, height: 10, capacityLitres: 28317 },
        { tankType: 'UG', length: 12, breadth: 10, height: 8, capacityLitres: 27184 }
      ],
      billValuePaise: 400000,
      discountPaise: 0,
      finalValuePaise: 400000,
      version: 1,
      originalRecordId: overrides.originalRecordId || overrides.id || 'site_001',
      status: 'ACTIVE',
      isLatestValidVersion: overrides.isLatestValidVersion ?? true,
      isDeleted: overrides.isDeleted ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    });

    it('generates reminders with all required customer and service details', () => {
      const mockSites = [createMockSite({ workDate: '2026-11-01' })];
      const reminders = generateRemindersFromSites(mockSites, 30);

      expect(reminders).toHaveLength(1);
      const r = reminders[0];
      expect(r.customerName).toBe('Kavitha Silks');
      expect(r.contactNumber).toBe('9876543210');
      expect(r.previousServiceDate).toBe('2026-11-01');
      expect(r.nextReminderDate).toBe('2026-12-01');
      expect(r.reminderType).toContain('Tank Cleaning');
      expect(r.intervalDays).toBe(30);
    });

    it('strictly excludes deleted and superseded customer records', () => {
      const mockSites = [
        createMockSite({ id: 's1', isDeleted: true, customerName: 'Deleted Customer' }),
        createMockSite({ id: 's2', isLatestValidVersion: false, customerName: 'Superseded Customer' }),
        createMockSite({ id: 's3', isLatestValidVersion: true, isDeleted: false, customerName: 'Valid Customer' })
      ];

      const reminders = generateRemindersFromSites(mockSites, 30);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].customerName).toBe('Valid Customer');
    });

    it('avoids duplicate reminders for the same customer and service cycle', () => {
      const mockSites = [
        createMockSite({ id: 's1', customerName: 'Senthil Kumar', workDate: '2026-10-01' })
      ];

      const reminders = generateRemindersFromSites(mockSites, 30);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].id).toBe('s1');
    });

    it('updates next reminder date when a new service is recorded for an existing customer', () => {
      const mockSites = [
        createMockSite({ id: 's1', customerName: 'Ramesh Textiles', workDate: '2026-08-01' }),
        createMockSite({ id: 's2', customerName: 'Ramesh Textiles', workDate: '2026-11-01' })
      ];

      const reminders = generateRemindersFromSites(mockSites, 30);
      expect(reminders).toHaveLength(2);

      const latestReminder = reminders.find((r) => r.id === 's2');
      const historicalReminder = reminders.find((r) => r.id === 's1');

      expect(latestReminder).toBeDefined();
      expect(latestReminder?.previousServiceDate).toBe('2026-11-01');
      expect(latestReminder?.nextReminderDate).toBe('2026-12-01');

      expect(historicalReminder).toBeDefined();
      expect(historicalReminder?.status).toBe('completed');
    });

    it('displays at least 15 genuine records when 15 or more records are available', () => {
      const mockSites: SiteRecord[] = [];
      for (let i = 1; i <= 18; i++) {
        mockSites.push(
          createMockSite({
            id: `site_${i}`,
            customerName: `Customer ${i}`,
            contactNumber: `98000000${String(i).padStart(2, '0')}`,
            workDate: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`
          })
        );
      }

      const reminders = generateRemindersFromSites(mockSites, 30);
      expect(reminders.length).toBe(18);
      expect(reminders.length).toBeGreaterThanOrEqual(15);
    });

    it('displays available records without inventing fake data when fewer than 15 exist', () => {
      const mockSites = [
        createMockSite({ id: 's1', customerName: 'Real Client Alpha' }),
        createMockSite({ id: 's2', customerName: 'Real Client Beta' })
      ];

      const reminders = generateRemindersFromSites(mockSites, 30);
      expect(reminders).toHaveLength(2);
      expect(reminders.map((r) => r.customerName)).toEqual(['Real Client Alpha', 'Real Client Beta']);
    });
  });

  describe('5. Manual Completion and History Preservation', () => {
    it('marks a reminder as completed and persists it to localStorage', () => {
      markReminderCompleted('site_001');
      const completed = getCompletedReminders();
      expect(completed['site_001']).toBeDefined();
      expect(completed['site_001'].completedAt).toBeDefined();

      const mockSites = [{
        id: 'site_001',
        sequenceNumber: 1,
        year: 2026,
        workDate: '2026-10-01',
        customerName: 'Test Customer',
        location: 'Coimbatore',
        contactNumber: '9999999999',
        billNumber: '101',
        paymentMode: 'Cash' as const,
        totalTanks: 1,
        tanks: [{ tankType: 'OHT', length: 10, breadth: 10, height: 10, capacityLitres: 28317 }],
        billValuePaise: 100000,
        discountPaise: 0,
        finalValuePaise: 100000,
        version: 1,
        originalRecordId: 'site_001',
        status: 'ACTIVE' as const,
        isLatestValidVersion: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const reminders = generateRemindersFromSites(mockSites, 30);
      expect(reminders[0].status).toBe('completed');
    });

    it('allows unmarking/reopening a reminder if needed', () => {
      markReminderCompleted('site_001');
      expect(getCompletedReminders()['site_001']).toBeDefined();

      unmarkReminderCompleted('site_001');
      expect(getCompletedReminders()['site_001']).toBeUndefined();
    });
  });
});
