/**
 * src/components/sites/SiteListScreen.tsx
 * 
 * Customer Sites & Billing Ledger Screen (SCR-03).
 * Lists all latest active customer site visits for the calendar year,
 * provides fast search, payment mode filtering, edit/correction triggers,
 * history timeline inspection, and soft deletion.
 * Complies with DOC-002 (§2.3).
 */

import React, { useState, useMemo } from 'react';
import { SiteRecord } from '../../types/database';
import { toRupees, formatIndianRupees } from '../../utils/money';
import { 
  Building2, 
  Search, 
  Plus, 
  Filter, 
  MapPin, 
  Phone, 
  Edit3, 
  History, 
  Trash2, 
  ExternalLink
} from 'lucide-react';

interface SiteListScreenProps {
  selectedYear: number;
  sites: SiteRecord[];
  onOpenNewSiteModal: () => void;
  onEditSite: (site: SiteRecord) => void;
  onViewHistory: (site: SiteRecord) => void;
  onDeleteSite: (siteId: string) => Promise<void>;
}

export const SiteListScreen: React.FC<SiteListScreenProps> = ({
  selectedYear,
  sites,
  onOpenNewSiteModal,
  onEditSite,
  onViewHistory,
  onDeleteSite
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPaymentMode, setFilterPaymentMode] = useState<'All' | 'Cash' | 'Online'>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter only latest active records
  const activeSites = useMemo(() => {
    return sites.filter((s) => s.isLatestValidVersion && !s.isDeleted);
  }, [sites]);

  // Apply search query & payment mode filters
  const filteredSites = useMemo(() => {
    return activeSites.filter((s) => {
      // Payment Mode filter
      if (filterPaymentMode !== 'All' && s.paymentMode !== filterPaymentMode) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.customerName.toLowerCase().includes(q);
        const matchesPhone = s.contactNumber.toLowerCase().includes(q);
        const matchesLocation = s.location.toLowerCase().includes(q);
        const matchesBillNo = s.billNumber.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesLocation || matchesBillNo;
      }

      return true;
    });
  }, [activeSites, searchQuery, filterPaymentMode]);

  const handleDelete = async (site: SiteRecord) => {
    const confirmText = `Are you sure you want to delete customer entry for "${site.customerName}" (Bill #${site.billNumber})?\n\nThis will send the record to the 30-day Recycle Bin, where it can be restored anytime.`;
    if (confirm(confirmText)) {
      setDeletingId(site.id);
      try {
        await onDeleteSite(site.id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              Site Details & Billing Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Active customer sites for Year {selectedYear} • {activeSites.length} Active Records
          </p>
        </div>

        <button
          onClick={onOpenNewSiteModal}
          className="w-full md:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Customer Site Entry</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by customer name, phone, location, or bill number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-sky-500 outline-none font-medium"
          />
        </div>

        {/* Payment Mode Selector */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <span className="text-xs font-bold text-slate-600 hidden sm:inline">Mode:</span>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            {(['All', 'Cash', 'Online'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterPaymentMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  filterPaymentMode === mode
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Sites Table / Card List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredSites.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs sm:text-sm">
            {searchQuery || filterPaymentMode !== 'All' 
              ? 'No matching customer sites found for your filter criteria.' 
              : `No customer site entries logged for ${selectedYear} yet.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Tanks Cleaned</th>
                  <th className="py-3 px-4">Bill No.</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Version</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSites.map((site) => {
                  const billRupees = toRupees(site.billValuePaise);
                  const discountRupees = toRupees(site.discountPaise);
                  const finalRupees = toRupees(site.finalValuePaise);

                  return (
                    <tr key={site.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Date */}
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {site.workDate}
                      </td>

                      {/* Customer Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm">
                          {site.customerName}
                        </div>
                        <a 
                          href={`tel:${site.contactNumber}`} 
                          className="text-slate-500 hover:text-sky-700 flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{site.contactNumber}</span>
                        </a>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 font-medium max-w-xs truncate">
                          {site.location}
                        </div>
                        {(() => {
                          const mapsUrl = typeof site.googleLocation === 'string'
                            ? site.googleLocation
                            : site.googleLocation?.mapsUrl;
                          if (!mapsUrl) return null;
                          return (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-sky-700 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>Maps Link</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          );
                        })()}
                      </td>

                      {/* Tanks */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {site.totalTanks} {site.totalTanks === 1 ? 'Tank' : 'Tanks'}
                        </div>
                        <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
                          {site.tanks.map((t, idx) => (
                            <div key={idx} className="whitespace-nowrap">
                              <span className="font-semibold text-slate-600">{t.tankType}:</span> {t.length}x{t.breadth}x{t.height} ft ({t.capacityLitres.toLocaleString('en-IN')} L)
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Bill No. */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {site.billNumber}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          site.paymentMode === 'Cash'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-sky-50 text-sky-800 border border-sky-200'
                        }`}>
                          {site.paymentMode}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-slate-900 text-sm">
                          {formatIndianRupees(finalRupees)}
                        </div>
                        {discountRupees > 0 && (
                          <div className="text-[10px] text-slate-400">
                            Bill: {formatIndianRupees(billRupees)} - Disc: {formatIndianRupees(discountRupees)}
                          </div>
                        )}
                      </td>

                      {/* Version Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onViewHistory(site)}
                          title="View Version Audit Timeline"
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-transform hover:scale-105 ${
                            site.version > 1 
                              ? 'bg-sky-100 text-sky-800 border border-sky-300' 
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>v{site.version}</span>
                          {site.version > 1 && <span className="text-[10px]">(Corrected)</span>}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* Edit / Correct Button */}
                          <button
                            onClick={() => onEditSite(site)}
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Correct / Edit Entry (Creates Linked Version)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Version History Button */}
                          <button
                            onClick={() => onViewHistory(site)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Full Version Progression"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(site)}
                            disabled={deletingId === site.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            title="Send to 30-Day Recycle Bin"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
