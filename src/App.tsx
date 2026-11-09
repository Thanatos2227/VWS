/**
 * src/App.tsx
 * 
 * Root Application Component for Vetri Water Solutions.
 * Integrates AuthProvider, OwnerAuthGuard, AppLayout, real-time Firestore subscriptions,
 * site and accounts state management, modals, and export triggers.
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OwnerAuthGuard } from './components/auth/OwnerAuthGuard';
import { AppLayout, ActiveTab } from './components/layout/AppLayout';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { SiteListScreen } from './components/sites/SiteListScreen';
import { SiteEntryModal } from './components/sites/SiteEntryModal';
import { SiteHistoryModal } from './components/sites/SiteHistoryModal';
import { RecycleBinScreen } from './components/sites/RecycleBinScreen';
import { AccountsScreen } from './components/accounts/AccountsScreen';
import { BackupScreen } from './components/backup/BackupScreen';
import { SiteRecord, DailyAccountsRecord } from './types/database';
import { 
  subscribeActiveSites, 
  subscribeRecycleBin, 
  createSiteEntry, 
  createSiteCorrection, 
  softDeleteSite, 
  restoreSite, 
  SiteFormData 
} from './services/siteService';
import { subscribeDailyAccountsForYear } from './services/accountService';
import { downloadExcelWorkbook } from './services/excelService';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

const AuthenticatedApp: React.FC = () => {
  const { currentUser } = useAuth();
  const currentYear = new Date().getFullYear();

  // Navigation & State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Data Collections
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [deletedSites, setDeletedSites] = useState<SiteRecord[]>([]);
  const [accounts, setAccounts] = useState<DailyAccountsRecord[]>([]);

  // Modals
  const [isSiteModalOpen, setIsSiteModalOpen] = useState<boolean>(false);
  const [editingSite, setEditingSite] = useState<SiteRecord | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historySite, setHistorySite] = useState<SiteRecord | null>(null);
  const [accountsInitialDate, setAccountsInitialDate] = useState<string | undefined>(undefined);

  // Native Android Device Integration (Back Button, Splash Screen, Status Bar)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Hide Splash Screen once app is authenticated and mounted
      SplashScreen.hide().catch(() => {});

      // Configure Status Bar for high-contrast outdoor visibility
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0284c7' }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backListener = CapacitorApp.addListener('backButton', () => {
      if (isSiteModalOpen) {
        setIsSiteModalOpen(false);
        return;
      }
      if (isHistoryModalOpen) {
        setIsHistoryModalOpen(false);
        return;
      }
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return;
      }
      // On root dashboard, minimize / exit
      CapacitorApp.exitApp();
    });

    return () => {
      backListener.then((handle) => handle.remove());
    };
  }, [isSiteModalOpen, isHistoryModalOpen, activeTab]);

  // Real-time Subscriptions
  useEffect(() => {
    // 1. Subscribe to active sites for selectedYear
    const unsubSites = subscribeActiveSites(selectedYear, (updatedSites) => {
      setSites(updatedSites);
    });

    // 2. Subscribe to recycle bin
    const unsubRecycle = subscribeRecycleBin((updatedDeleted) => {
      setDeletedSites(updatedDeleted);
    });

    // 3. Subscribe to daily accounts for selectedYear
    const unsubAccounts = subscribeDailyAccountsForYear(selectedYear, (updatedAccounts) => {
      setAccounts(updatedAccounts);
    });

    return () => {
      unsubSites();
      unsubRecycle();
      unsubAccounts();
    };
  }, [selectedYear]);

  // Site Handlers
  const handleOpenNewSiteModal = () => {
    setEditingSite(null);
    setIsSiteModalOpen(true);
  };

  const handleEditSite = (site: SiteRecord) => {
    setEditingSite(site);
    setIsSiteModalOpen(true);
  };

  const handleViewHistory = (site: SiteRecord) => {
    setHistorySite(site);
    setIsHistoryModalOpen(true);
  };

  const handleSaveSiteForm = async (formData: SiteFormData) => {
    const creatorEmail = currentUser?.email || 'Owner';
    if (editingSite) {
      await createSiteCorrection(editingSite, formData, creatorEmail);
    } else {
      await createSiteEntry(formData, creatorEmail);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    const userEmail = currentUser?.email || 'Owner';
    await softDeleteSite(siteId, userEmail);
  };

  const handleRestoreSite = async (siteId: string) => {
    await restoreSite(siteId);
  };

  // Accounts Handlers
  const handleOpenAccountsEntry = (date?: string) => {
    setAccountsInitialDate(date);
    setActiveTab('accounts');
  };

  // Excel Download Trigger
  const handleDownloadExcel = async () => {
    try {
      await downloadExcelWorkbook({
        calendarYears: [selectedYear],
        sitesByYear: { [selectedYear]: sites },
        accountsByYear: { [selectedYear]: accounts }
      });
    } catch (err) {
      console.error('Error downloading Excel:', err);
      alert('Failed to generate Excel workbook.');
    }
  };

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      selectedYear={selectedYear}
      onYearChange={setSelectedYear}
    >
      {activeTab === 'dashboard' && (
        <DashboardScreen
          selectedYear={selectedYear}
          sites={sites}
          accounts={accounts}
          onOpenNewSiteModal={handleOpenNewSiteModal}
          onOpenAccountsEntry={handleOpenAccountsEntry}
          onDownloadExcel={handleDownloadExcel}
          onNavigateToTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'sites' && (
        <SiteListScreen
          selectedYear={selectedYear}
          sites={sites}
          onOpenNewSiteModal={handleOpenNewSiteModal}
          onEditSite={handleEditSite}
          onViewHistory={handleViewHistory}
          onDeleteSite={handleDeleteSite}
        />
      )}

      {activeTab === 'accounts' && (
        <AccountsScreen
          selectedYear={selectedYear}
          accounts={accounts}
          initialSelectedDate={accountsInitialDate}
        />
      )}

      {activeTab === 'backup' && (
        <BackupScreen
          selectedYear={selectedYear}
          sites={sites}
          accounts={accounts}
        />
      )}

      {activeTab === 'recycle-bin' && (
        <RecycleBinScreen
          deletedSites={deletedSites}
          onRestoreSite={handleRestoreSite}
        />
      )}

      {/* Modals */}
      <SiteEntryModal
        isOpen={isSiteModalOpen}
        onClose={() => setIsSiteModalOpen(false)}
        onSubmit={handleSaveSiteForm}
        existingRecord={editingSite}
      />

      <SiteHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        site={historySite}
      />
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <OwnerAuthGuard>
        <AuthenticatedApp />
      </OwnerAuthGuard>
    </AuthProvider>
  );
};

export default App;

