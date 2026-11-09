/**
 * src/components/layout/AppLayout.tsx
 * 
 * Central layout shell for Vetri Water Solutions.
 * Implements mobile-first responsive design, outdoor high-contrast navigation,
 * sync status pill, calendar year selector, and quick action bars.
 * Conforms to DOC-002 (Feature Specification §1 & §2.2).
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Droplets, 
  LayoutDashboard, 
  Building2, 
  Wallet, 
  Cloud, 
  Trash2, 
  LogOut, 
  Wifi, 
  WifiOff, 
  Calendar
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'sites' | 'accounts' | 'backup' | 'recycle-bin';

interface AppLayoutProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onTabChange,
  selectedYear,
  onYearChange,
  children
}) => {
  const { currentUser, signOut } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [signingOut, setSigningOut] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      setSigningOut(true);
      try {
        await signOut();
      } finally {
        setSigningOut(false);
      }
    }
  };

  const availableYears = [2026, 2025, 2024];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 pb-20 md:pb-0">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={() => onTabChange('dashboard')} 
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shadow-sky-600/20">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                VWS
              </div>
              <div className="text-[10px] sm:text-xs font-semibold text-sky-700 tracking-wide uppercase leading-tight">
                Vetri Water Solutions
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-sky-50 text-sky-700' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onTabChange('sites')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'sites' 
                  ? 'bg-sky-50 text-sky-700' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Site Details</span>
            </button>
            <button
              onClick={() => onTabChange('accounts')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'accounts' 
                  ? 'bg-sky-50 text-sky-700' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Daily Accounts</span>
            </button>
            <button
              onClick={() => onTabChange('backup')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'backup' 
                  ? 'bg-sky-50 text-sky-700' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>Backup & Sync</span>
            </button>
            <button
              onClick={() => onTabChange('recycle-bin')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'recycle-bin' 
                  ? 'bg-sky-50 text-sky-700' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Recycle Bin</span>
            </button>
          </nav>

          {/* Right Header Status, Year Selector & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Year Selector */}
            <div className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200/80 rounded-lg px-2 py-1 transition-colors border border-slate-200/60">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                aria-label="Select Financial Year"
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Sync Health Pill */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={isOnline ? 'Online - Cloud Sync Active' : 'Offline - Local Cache Active'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Offline Cache</span>
                </>
              )}
            </div>

            {/* Owner Avatar & Sign Out */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
              <div 
                className="w-8 h-8 rounded-full bg-sky-100 border border-sky-300 text-sky-800 flex items-center justify-center text-xs font-bold uppercase"
                title={currentUser?.email || 'Owner'}
              >
                {currentUser?.email ? currentUser.email.charAt(0) : 'V'}
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                title="Sign Out"
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (High-Contrast Outdoor Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'dashboard' ? 'text-sky-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          onClick={() => onTabChange('sites')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'sites' ? 'text-sky-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <Building2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Sites</span>
        </button>

        <button
          onClick={() => onTabChange('accounts')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'accounts' ? 'text-sky-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Accounts</span>
        </button>

        <button
          onClick={() => onTabChange('backup')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'backup' ? 'text-sky-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <Cloud className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Backup</span>
        </button>

        <button
          onClick={() => onTabChange('recycle-bin')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'recycle-bin' ? 'text-sky-600 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <Trash2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Trash</span>
        </button>
      </nav>
    </div>
  );
};

