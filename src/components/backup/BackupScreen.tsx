
import React, { useState } from 'react';
import { SiteRecord, DailyAccountsRecord } from '../../types/database';
import { downloadExcelWorkbook } from '../../services/excelService';
import { saveFileToDevice } from '../../utils/fileDownloader';
import { 
  Cloud, 
  Download, 
  FileSpreadsheet, 
  Database, 
  CheckCircle2, 
  Loader2, 
  HardDrive
} from 'lucide-react';

interface BackupScreenProps {
  selectedYear: number;
  sites: SiteRecord[];
  accounts: DailyAccountsRecord[];
}

export const BackupScreen: React.FC<BackupScreenProps> = ({
  selectedYear,
  sites,
  accounts
}) => {
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [exportingJson, setExportingJson] = useState<boolean>(false);
  const [lastExcelDownloadTime, setLastExcelDownloadTime] = useState<string | null>(null);
  const [lastJsonDumpTime, setLastJsonDumpTime] = useState<string | null>(null);
  const [lastSha256, setLastSha256] = useState<string | null>(null);

  const handleDownloadExcel = async () => {
    setExportingExcel(true);
    try {
      await downloadExcelWorkbook({
        calendarYears: [selectedYear],
        sitesByYear: { [selectedYear]: sites },
        accountsByYear: { [selectedYear]: accounts }
      });
      setLastExcelDownloadTime(new Date().toLocaleTimeString('en-IN'));
    } catch (err) {
      console.error('Excel download failed:', err);
      alert('Failed to generate Excel workbook.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleDownloadJsonDump = async () => {
    setExportingJson(true);
    try {
      const dumpPayload = {
        meta: {
          application: 'Vetri Water Solutions',
          backupType: 'TYPE_2_DATABASE_JSON_DUMP',
          schemaVersion: '1.0.0',
          exportedAt: new Date().toISOString(),
          calendarYear: selectedYear,
          retentionPolicy: 'RETAINED_INDEFINITELY_FOREVER'
        },
        collections: {
          sites,
          accounts_daily: accounts
        }
      };

      const jsonString = JSON.stringify(dumpPayload, null, 2);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);

      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      setLastSha256(hashHex);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `VWS_Database_Dump_${timestamp}.json`;
      await saveFileToDevice(filename, jsonString, 'application/json');

      const shaContent = `${hashHex}  ${filename}\n`;
      await saveFileToDevice(`${filename}.sha256`, shaContent, 'text/plain');

      setLastJsonDumpTime(new Date().toLocaleTimeString('en-IN'));
    } catch (err) {
      console.error('JSON dump failed:', err);
      alert('Failed to generate database JSON dump.');
    } finally {
      setExportingJson(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Cloud className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              Backup & Cloud Sync Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dual backup architecture: Type 1 Excel Spreadsheets & Type 2 Permanent Database Dumps.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Local Cache Synced</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Type 1 • Business Spreadsheet
                </span>
                <h2 className="font-bold text-slate-900 text-base">
                  Vetri_Water_Solutions.xlsx
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Native Excel (.xlsx) file containing partitioned annual sheets (<span className="font-mono">{selectedYear} - Site Details</span> & <span className="font-mono">{selectedYear} - Accounts</span>) with dynamic SUM formulas and verified calculated values.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center justify-between">
                <span>Active Customer Sites:</span>
                <strong className="text-slate-800">{sites.filter((s) => s.isLatestValidVersion && !s.isDeleted).length} records</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Daily Account Days:</span>
                <strong className="text-slate-800">{accounts.length} days</strong>
              </div>
              {lastExcelDownloadTime && (
                <div className="flex items-center justify-between text-emerald-700 pt-1 font-semibold">
                  <span>Last Downloaded:</span>
                  <span>{lastExcelDownloadTime}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={exportingExcel}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            {exportingExcel ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Excel Workbook...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Excel (.xlsx)</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                  Type 2 • Permanent Disaster Recovery
                </span>
                <h2 className="font-bold text-slate-900 text-base">
                  Complete Database JSON Dump
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Full uncompressed JSON database dump with all historical correction versions (v1, v2, v3), soft-deleted records, and companion SHA-256 checksum manifest.
            </p>

            <div className="p-3 bg-sky-50/70 rounded-xl border border-sky-100 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center justify-between">
                <span>Retention Policy:</span>
                <strong className="text-sky-900">Retained Indefinitely (Never Purged)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Site History Docs:</span>
                <strong className="text-slate-800">{sites.length} documents</strong>
              </div>
              {lastJsonDumpTime && (
                <div className="flex items-center justify-between text-sky-800 pt-1 font-semibold">
                  <span>Last Dump Generated:</span>
                  <span>{lastJsonDumpTime}</span>
                </div>
              )}
              {lastSha256 && (
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">SHA-256 Checksum:</span>
                  <span className="font-mono text-[9px] text-slate-700 break-all select-all">
                    {lastSha256}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleDownloadJsonDump}
            disabled={exportingJson}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
          >
            {exportingJson ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting JSON & Computing Hash...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export JSON Dump & Checksum</span>
              </>
            )}
          </button>
        </div>

      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-sm">
            Google Drive Storage Topology & Indefinite Retention
          </h3>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed overflow-x-auto">
          <div>My Google Drive /</div>
          <div>└── Vetri Water Solutions /</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;├── Vetri_Water_Solutions.xlsx&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;-- Master Live Workbook (Always latest)</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;├── Backups /&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;-- Type 1: Versioned Excel Snapshots</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;└── Database_Backups /&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;-- Type 2: Complete JSON Dumps (Retained Forever)</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <strong className="text-slate-800 block mb-0.5">Autonomous Cron:</strong>
            <span>Nightly at 23:00 IST via Cloud Scheduler (Firebase Blaze free tier).</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <strong className="text-slate-800 block mb-0.5">Quota Monitoring:</strong>
            <span>Alerts owner at 80% (12 GB) and 90% (13.5 GB) of 15 GB shared storage.</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <strong className="text-slate-800 block mb-0.5">Non-Blocking:</strong>
            <span>Drive token expiration never blocks core database operations or billing.</span>
          </div>
        </div>
      </div>

    </div>
  );
};
