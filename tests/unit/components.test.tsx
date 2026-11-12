
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OwnerAuthGuard } from '../../src/components/auth/OwnerAuthGuard';
import { DashboardScreen } from '../../src/components/dashboard/DashboardScreen';
import { SiteEntryModal } from '../../src/components/sites/SiteEntryModal';
import * as AuthContextModule from '../../src/context/AuthContext';
import { SiteRecord } from '../../src/types/database';
import { formatIndianRupees } from '../../src/utils/money';

describe('OwnerAuthGuard (SCR-01 & DOC-006 §2)', () => {
  it('renders loading indicator while authentication is verifying', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: null,
      isOwner: false,
      loading: true,
      unauthorizedAttemptEmail: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      clearUnauthorizedState: vi.fn()
    });

    render(
      <OwnerAuthGuard>
        <div>Protected App Content</div>
      </OwnerAuthGuard>
    );

    expect(screen.getByText(/Verifying owner credentials/i)).toBeInTheDocument();
    expect(screen.queryByText(/Protected App Content/i)).not.toBeInTheDocument();
  });

  it('strictly displays Unauthorized Access alert when a non-owner logs in', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: null,
      isOwner: false,
      loading: false,
      unauthorizedAttemptEmail: 'intruder@gmail.com',
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      clearUnauthorizedState: vi.fn()
    });

    render(
      <OwnerAuthGuard>
        <div>Protected App Content</div>
      </OwnerAuthGuard>
    );

    expect(screen.getByText(/Unauthorized Access/i)).toBeInTheDocument();
    expect(screen.getByText(/intruder@gmail.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Single-Owner Security Policy/i)).toBeInTheDocument();
    expect(screen.queryByText(/Protected App Content/i)).not.toBeInTheDocument();
  });

  it('renders sign-in screen when unauthenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: null,
      isOwner: false,
      loading: false,
      unauthorizedAttemptEmail: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      clearUnauthorizedState: vi.fn()
    });

    render(
      <OwnerAuthGuard>
        <div>Protected App Content</div>
      </OwnerAuthGuard>
    );

    expect(screen.getByText(/Sign in with Google/i)).toBeInTheDocument();
    expect(screen.getByText(/vetriwatersolution@gmail.com/i)).toBeInTheDocument();
    expect(screen.queryByText(/Protected App Content/i)).not.toBeInTheDocument();
  });

  it('renders protected app content when authenticated as authorized owner', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: { email: 'vetriwatersolution@gmail.com' } as any,
      isOwner: true,
      loading: false,
      unauthorizedAttemptEmail: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      clearUnauthorizedState: vi.fn()
    });

    render(
      <OwnerAuthGuard>
        <div>Protected Owner Dashboard</div>
      </OwnerAuthGuard>
    );

    expect(screen.getByText(/Protected Owner Dashboard/i)).toBeInTheDocument();
  });

  it('renders unauthorized access screen when attempted by previous owner email vetriwatersolutions@gmail.com', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: null,
      isOwner: false,
      loading: false,
      unauthorizedAttemptEmail: 'vetriwatersolutions@gmail.com',
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      clearUnauthorizedState: vi.fn()
    });

    render(
      <OwnerAuthGuard>
        <div>Protected Owner Dashboard</div>
      </OwnerAuthGuard>
    );

    expect(screen.getByText(/Unauthorized Access/i)).toBeInTheDocument();
    expect(screen.getByText(/vetriwatersolutions@gmail.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Access requires sign-in with/i)).toBeInTheDocument();
    expect(screen.queryByText(/Protected Owner Dashboard/i)).not.toBeInTheDocument();
  });
});

describe('SiteEntryModal Form (SCR-04, DEC-08, DEC-10, DEC-11, DEC-25)', () => {
  it('enforces strict OHT/UG selection without custom tank type inputs (DEC-25)', () => {
    render(
      <SiteEntryModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const ohtBtn = screen.getByRole('button', { name: /OHT \(Overhead\)/i });
    const ugBtn = screen.getByRole('button', { name: /UG \(Underground\)/i });
    expect(ohtBtn).toBeInTheDocument();
    expect(ugBtn).toBeInTheDocument();

    expect(screen.queryByPlaceholderText(/custom tank/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/other/i)).not.toBeInTheDocument();
  });

  it('provides explicit Cash and Online payment buttons (DEC-11)', () => {
    render(
      <SiteEntryModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const cashBtn = screen.getByRole('button', { name: /^Cash$/i });
    const onlineBtn = screen.getByRole('button', { name: /^Online/i });
    expect(cashBtn).toBeInTheDocument();
    expect(onlineBtn).toBeInTheDocument();
  });
});

describe('DashboardScreen (SCR-02)', () => {
  it('calculates KPIs correctly from active sites excluding superseded records', () => {
    const mockSites: SiteRecord[] = [
      {
        id: 's1_v1',
        sequenceNumber: 1,
        year: 2026,
        workDate: '2026-03-01',
        customerName: 'Customer A',
        location: 'Location A',
        contactNumber: '9999999999',
        billNumber: '100',
        paymentMode: 'Cash',
        totalTanks: 1,
        tanks: [{ tankType: 'OHT', length: 10, breadth: 10, height: 10, capacityLitres: 28317 }],
        billValuePaise: 500000,
        discountPaise: 0,
        finalValuePaise: 500000,
        version: 1,
        originalRecordId: 's1_v1',
        status: 'SUPERSEDED',
        isLatestValidVersion: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 's1_v2',
        sequenceNumber: 1,
        year: 2026,
        workDate: '2026-03-01',
        customerName: 'Customer A',
        location: 'Location A',
        contactNumber: '9999999999',
        billNumber: '100',
        paymentMode: 'Cash',
        totalTanks: 1,
        tanks: [{ tankType: 'OHT', length: 10, breadth: 10, height: 10, capacityLitres: 28317 }],
        billValuePaise: 400000,
        discountPaise: 50000,
        finalValuePaise: 350000,
        version: 2,
        originalRecordId: 's1_v1',
        status: 'ACTIVE',
        isLatestValidVersion: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    render(
      <DashboardScreen
        selectedYear={2026}
        sites={mockSites}
        accounts={[]}
        onOpenNewSiteModal={vi.fn()}
        onOpenAccountsEntry={vi.fn()}
        onDownloadExcel={vi.fn()}
        onNavigateToTab={vi.fn()}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(formatIndianRupees(4000))).toBeInTheDocument();
    expect(screen.getByText(formatIndianRupees(500))).toBeInTheDocument();
    expect(screen.getAllByText(formatIndianRupees(3500)).length).toBeGreaterThanOrEqual(1);
  });
});
