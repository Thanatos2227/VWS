
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReminderModal } from '../../src/components/reminders/ReminderModal';
import { DashboardScreen } from '../../src/components/dashboard/DashboardScreen';
import { SiteRecord } from '../../src/types/database';

describe('ReminderModal & Dashboard Reminder Icon UI Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockSites: SiteRecord[] = [
    {
      id: 'site_alpha',
      sequenceNumber: 1,
      year: 2026,
      workDate: '2026-10-01',
      customerName: 'Kavitha Silks',
      location: 'Gandhipuram',
      contactNumber: '9842100001',
      billNumber: '101',
      paymentMode: 'Online',
      totalTanks: 2,
      tanks: [{ tankType: 'OHT', length: 10, breadth: 10, height: 10, capacityLitres: 28317 }],
      billValuePaise: 400000,
      discountPaise: 0,
      finalValuePaise: 400000,
      version: 1,
      originalRecordId: 'site_alpha',
      status: 'ACTIVE',
      isLatestValidVersion: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'site_beta',
      sequenceNumber: 2,
      year: 2026,
      workDate: '2026-11-10',
      customerName: 'Senthil Agencies',
      location: 'RS Puram',
      contactNumber: '9842100002',
      billNumber: '102',
      paymentMode: 'Cash',
      totalTanks: 1,
      tanks: [{ tankType: 'OHT', length: 8, breadth: 8, height: 8, capacityLitres: 14498 }],
      billValuePaise: 250000,
      discountPaise: 0,
      finalValuePaise: 250000,
      version: 1,
      originalRecordId: 'site_beta',
      status: 'ACTIVE',
      isLatestValidVersion: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  it('renders reminder icon on DashboardScreen and triggers onOpenReminders when clicked', () => {
    const handleOpenReminders = vi.fn();

    render(
      <DashboardScreen
        selectedYear={2026}
        sites={mockSites}
        accounts={[]}
        onOpenNewSiteModal={vi.fn()}
        onOpenAccountsEntry={vi.fn()}
        onDownloadExcel={vi.fn()}
        onNavigateToTab={vi.fn()}
        onOpenReminders={handleOpenReminders}
      />
    );

    const reminderBtn = screen.getByRole('button', { name: /Service Reminders/i });
    expect(reminderBtn).toBeInTheDocument();

    fireEvent.click(reminderBtn);
    expect(handleOpenReminders).toHaveBeenCalledTimes(1);
  });

  it('renders reminder modal with genuine customer records and metadata', () => {
    render(
      <ReminderModal
        isOpen={true}
        onClose={vi.fn()}
        sites={mockSites}
      />
    );

    expect(screen.getByText('Customer Service Reminders')).toBeInTheDocument();
    expect(screen.getByText('Kavitha Silks')).toBeInTheDocument();
    expect(screen.getByText('Senthil Agencies')).toBeInTheDocument();
    expect(screen.getByText('9842100001')).toBeInTheDocument();
    expect(screen.getByText('9842100002')).toBeInTheDocument();
    expect(screen.getByText('Gandhipuram')).toBeInTheDocument();
  });

  it('filters reminders by search query matching customer name', () => {
    render(
      <ReminderModal
        isOpen={true}
        onClose={vi.fn()}
        sites={mockSites}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search by customer name/i);
    fireEvent.change(searchInput, { target: { value: 'Kavitha' } });

    expect(screen.getByText('Kavitha Silks')).toBeInTheDocument();
    expect(screen.queryByText('Senthil Agencies')).not.toBeInTheDocument();
  });

  it('allows user to customize reminder interval via Settings and saves to localStorage', () => {
    render(
      <ReminderModal
        isOpen={true}
        onClose={vi.fn()}
        sites={mockSites}
      />
    );

    const settingsBtn = screen.getByTitle('Reminder Settings');
    fireEvent.click(settingsBtn);

    expect(screen.getByText(/Service Reminder Interval Setting/i)).toBeInTheDocument();

    const preset45 = screen.getByRole('button', { name: /^45d$/i });
    fireEvent.click(preset45);

    expect(localStorage.getItem('vws_reminder_interval_days')).toBe('45');
    expect(screen.getByText(/Reminder interval saved \(45 days\)/i)).toBeInTheDocument();
  });

  it('marks a reminder as completed when clicking Mark Completed', () => {
    render(
      <ReminderModal
        isOpen={true}
        onClose={vi.fn()}
        sites={mockSites}
      />
    );

    const markButtons = screen.getAllByRole('button', { name: /Mark Completed/i });
    expect(markButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(markButtons[0]);

    expect(screen.getByText(/Service Completed/i)).toBeInTheDocument();
  });
});
