/**
 * src/components/dashboard/DashboardScreen.tsx
 * 
 * Master Cockpit Dashboard (SCR-02).
 * Displays active calendar year KPIs, reactive business margin, quick actions,
 * and recent operational activity.
 * Complies with DOC-002 (§2.2).
 */

import React from 'react';
import { SiteRecord, DailyAccountsRecord } from '../../types/database';
import { toRupees, formatIndianRupees } from '../../utils/money';
import { 
  Building2, 
  Wallet, 
  TrendingUp, 
  Percent, 
  IndianRupee, 
  Receipt, 
  Plus, 
  Download, 
  CheckCircle2,
  Layers
} from 'lucide-react';

interface DashboardScreenProps {
  selectedYear: number;
  sites: SiteRecord[];
  accounts: DailyAccountsRecord[];
  onOpenNewSiteModal: () => void;
  onOpenAccountsEntry: (date?: string) => void;
  onDownloadExcel: () => void;
  onNavigateToTab: (tab: 'sites' | 'accounts' | 'backup') => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  selectedYear,
  sites,
  accounts,
  onOpenNewSiteModal,
  onOpenAccountsEntry,
  onDownloadExcel,
  onNavigateToTab
}) => {
  // Compute Active Year KPIs (Only latest valid, non-deleted records count)
  const activeSites = sites.filter((s) => s.isLatestValidVersion && !s.isDeleted);
  const totalSitesCount = activeSites.length;

  let grossBillPaise = 0;
  let totalDiscountsPaise = 0;
  let netBillingPaise = 0;

  activeSites.forEach((s) => {
    grossBillPaise += s.billValuePaise;
    totalDiscountsPaise += s.discountPaise;
    netBillingPaise += s.finalValuePaise;
  });

  let totalOfficialExpensesPaise = 0;
  let totalPersonalExpensesPaise = 0;

  accounts.forEach((a) => {
    totalOfficialExpensesPaise += a.official.totalOfficialPaise;
    totalPersonalExpensesPaise += a.personal.totalPersonalPaise;
  });

  const netBusinessMarginPaise = netBillingPaise - totalOfficialExpensesPaise;

  const grossBillRupees = toRupees(grossBillPaise);
  const discountsRupees = toRupees(totalDiscountsPaise);
  const netBillingRupees = toRupees(netBillingPaise);
  const officialExpensesRupees = toRupees(totalOfficialExpensesPaise);
  const netMarginRupees = toRupees(netBusinessMarginPaise);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-600 rounded-3xl p-6 text-white shadow-xl shadow-sky-700/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur">
              Calendar Year {selectedYear}
            </span>
            <span className="text-xs text-sky-100 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-200" />
              Real-time Active Ledger
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            VWS Operations Cockpit
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 mt-1 max-w-xl">
            Live overview of water tank cleaning operations, customer billing, and operating expenditures.
          </p>
        </div>

        {/* Quick Utility Actions */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={onOpenNewSiteModal}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white text-sky-800 hover:bg-sky-50 active:bg-sky-100 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Site Entry</span>
          </button>
          <button
            onClick={() => onOpenAccountsEntry()}
            className="flex-1 md:flex-none px-4 py-2.5 bg-sky-900/60 hover:bg-sky-900/80 active:bg-sky-950 font-bold rounded-xl text-xs sm:text-sm border border-white/20 transition-all flex items-center justify-center gap-1.5"
          >
            <Wallet className="w-4 h-4" />
            <span>+ Daily Expense</span>
          </button>
          <button
            onClick={onDownloadExcel}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20"
            title="Download Excel Workbook"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Top-Level KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Sites */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Sites</span>
            <Building2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalSitesCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active customer jobs</p>
        </div>

        {/* Gross Billing */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Gross Billing</span>
            <IndianRupee className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatIndianRupees(grossBillRupees)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Before discounts</p>
        </div>

        {/* Discounts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Discounts</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            {formatIndianRupees(discountsRupees)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Concessions given</p>
        </div>

        {/* Net Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Net Billing</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            {formatIndianRupees(netBillingRupees)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Final collected revenue</p>
        </div>

        {/* Official Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Official Expenses</span>
            <Wallet className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            {formatIndianRupees(officialExpensesRupees)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Operating costs</p>
        </div>

        {/* Net Margin */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Net Margin</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className={`text-xl sm:text-2xl font-black ${netMarginRupees >= 0 ? 'text-sky-700' : 'text-red-600'}`}>
            {formatIndianRupees(netMarginRupees)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Revenue - Official</p>
        </div>

      </div>

      {/* Primary Module Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Sites Module Summary */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900">Site Details & Customer Ledger</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {activeSites.length} Records
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Customer site records, tank volume measurements (L*B*H in Feet, Litres), physical bill numbers, and Cash/Online billing history.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigateToTab('sites')}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
            >
              View Sites Table
            </button>
            <button
              onClick={onOpenNewSiteModal}
              className="py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        {/* Accounts Module Summary */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900">Daily Accounts & Expenses</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {accounts.length} Days Logged
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Official operating expenses (attendance wages+tea+bata, transport, spares, salary) and combined household personal expenses.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigateToTab('accounts')}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
            >
              View Accounts Ledger
            </button>
            <button
              onClick={() => onOpenAccountsEntry()}
              className="py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm">Recent Customer Site Visits</h3>
          </div>
          <button
            onClick={() => onNavigateToTab('sites')}
            className="text-xs font-bold text-sky-700 hover:underline"
          >
            View All ({activeSites.length})
          </button>
        </div>

        {activeSites.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No customer site entries logged for {selectedYear} yet. Click "+ New Site Entry" to record a job.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Tanks</th>
                  <th className="pb-2">Bill No.</th>
                  <th className="pb-2">Mode</th>
                  <th className="pb-2 text-right">Final Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSites.slice(0, 5).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 font-medium text-slate-700">{s.workDate}</td>
                    <td className="py-2.5 font-bold text-slate-900">{s.customerName}</td>
                    <td className="py-2.5 text-slate-600">{s.location}</td>
                    <td className="py-2.5 text-slate-600">
                      {s.totalTanks} {s.totalTanks === 1 ? 'Tank' : 'Tanks'}
                    </td>
                    <td className="py-2.5 font-mono text-slate-600">{s.billNumber}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.paymentMode === 'Cash' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-sky-50 text-sky-700'
                      }`}>
                        {s.paymentMode}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      {formatIndianRupees(toRupees(s.finalValuePaise))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
