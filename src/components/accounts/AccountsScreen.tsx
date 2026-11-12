
import React, { useState, useEffect, useMemo } from 'react';
import { DailyAccountsRecord } from '../../types/database';
import { 
  OfficialExpenseFormData, 
  PersonalExpenseFormData,
  saveDailyAccounts 
} from '../../services/accountService';
import { toRupees, formatIndianRupees, checkFinancialWarningCeilings } from '../../utils/money';
import { useAuth } from '../../context/AuthContext';
import { 
  Wallet, 
  Calendar, 
  Save, 
  Users, 
  Coffee, 
  Truck, 
  Wrench, 
  ShoppingBag, 
  Utensils, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Receipt
} from 'lucide-react';

interface AccountsScreenProps {
  selectedYear: number;
  accounts: DailyAccountsRecord[];
  initialSelectedDate?: string;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({
  selectedYear,
  accounts,
  initialSelectedDate
}) => {
  const { currentUser } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(
    initialSelectedDate || new Date().toISOString().slice(0, 10)
  );

  const [viewMode, setViewMode] = useState<'daily-entry' | 'annual-ledger'>('daily-entry');

  const [offRefreshment, setOffRefreshment] = useState<number | ''>('');
  const [offTransport, setOffTransport] = useState<number | ''>('');
  const [offSparesHO, setOffSparesHO] = useState<number | ''>('');
  const [offStaffAttendanceCount, setOffStaffAttendanceCount] = useState<number | ''>('');
  const [offStaffAttendanceExpense, setOffStaffAttendanceExpense] = useState<number | ''>('');
  const [offSalaryMode, setOffSalaryMode] = useState<'combined' | 'individual'>('combined');
  const [offStaffSalary, setOffStaffSalary] = useState<number | ''>('');
  const [individualSalaryEntries, setIndividualSalaryEntries] = useState<Array<{ name: string; amount: number | '' }>>([]);
  const [offNotes, setOffNotes] = useState<string>('');

  const [persTransport, setPersTransport] = useState<number | ''>('');
  const [persRefreshment, setPersRefreshment] = useState<number | ''>('');
  const [persGroceriesVegMilk, setPersGroceriesVegMilk] = useState<number | ''>('');
  const [persLunchDinner, setPersLunchDinner] = useState<number | ''>('');
  const [persOther, setPersOther] = useState<number | ''>('');
  const [persNotes, setPersNotes] = useState<string>('');

  const [incrementalField, setIncrementalField] = useState<string | null>(null);
  const [incrementalAmount, setIncrementalAmount] = useState<number | ''>('');

  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    const existing = accounts.find((a) => a.entryDate === selectedDate);
    if (existing) {
      setOffRefreshment(toRupees(existing.official.refreshmentPaise) || '');
      setOffTransport(toRupees(existing.official.transportPaise) || '');
      setOffSparesHO(toRupees(existing.official.sparesHOPaise) || '');
      setOffStaffAttendanceCount(existing.official.staffAttendanceCount || '');
      setOffStaffAttendanceExpense(toRupees(existing.official.staffAttendanceExpensePaise) || '');
      setOffStaffSalary(toRupees(existing.official.staffSalaryPaise) || '');
      setOffNotes(existing.official.notes || '');

      setPersTransport(toRupees(existing.personal.transportPaise) || '');
      setPersRefreshment(toRupees(existing.personal.refreshmentPaise) || '');
      setPersGroceriesVegMilk(toRupees(existing.personal.groceriesVegMilkPaise) || '');
      setPersLunchDinner(toRupees(existing.personal.lunchDinnerPaise) || '');
      setPersOther(toRupees(existing.personal.otherPaise) || '');
      setPersNotes(existing.personal.notes || '');
    } else {
      setOffRefreshment('');
      setOffTransport('');
      setOffSparesHO('');
      setOffStaffAttendanceCount('');
      setOffStaffAttendanceExpense('');
      setOffStaffSalary('');
      setIndividualSalaryEntries([]);
      setOffNotes('');

      setPersTransport('');
      setPersRefreshment('');
      setPersGroceriesVegMilk('');
      setPersLunchDinner('');
      setPersOther('');
      setPersNotes('');
    }
    setSuccessMessage(null);
    setErrorMessage(null);
    setWarningMessage(null);
  }, [selectedDate, accounts]);

  const numOffRef = Number(offRefreshment) || 0;
  const numOffTrans = Number(offTransport) || 0;
  const numOffSpares = Number(offSparesHO) || 0;
  const numOffAttExp = Number(offStaffAttendanceExpense) || 0;
  
  const numOffSalary = offSalaryMode === 'individual'
    ? individualSalaryEntries.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    : Number(offStaffSalary) || 0;

  const dailyOfficialTotal = numOffRef + numOffTrans + numOffSpares + numOffAttExp + numOffSalary;

  const numPersTrans = Number(persTransport) || 0;
  const numPersRef = Number(persRefreshment) || 0;
  const numPersGroc = Number(persGroceriesVegMilk) || 0;
  const numPersLunch = Number(persLunchDinner) || 0;
  const numPersOther = Number(persOther) || 0;

  const dailyPersonalTotal = numPersTrans + numPersRef + numPersGroc + numPersLunch + numPersOther;
  const dailyGrandTotal = dailyOfficialTotal + dailyPersonalTotal;

  const handleAddSalaryPerson = () => {
    setIndividualSalaryEntries([...individualSalaryEntries, { name: '', amount: '' }]);
  };

  const handleUpdateSalaryPerson = (index: number, field: 'name' | 'amount', val: string | number) => {
    const updated = [...individualSalaryEntries];
    if (field === 'name') {
      updated[index].name = String(val);
    } else {
      updated[index].amount = val === '' ? '' : Number(val);
    }
    setIndividualSalaryEntries(updated);
  };

  const handleRemoveSalaryPerson = (index: number) => {
    setIndividualSalaryEntries(individualSalaryEntries.filter((_, i) => i !== index));
  };

  const applyIncrementalAdd = () => {
    if (!incrementalField || Number(incrementalAmount) <= 0) return;
    const addVal = Number(incrementalAmount);

    switch (incrementalField) {
      case 'offRefreshment':
        setOffRefreshment((prev) => (Number(prev) || 0) + addVal);
        break;
      case 'offTransport':
        setOffTransport((prev) => (Number(prev) || 0) + addVal);
        break;
      case 'offSparesHO':
        setOffSparesHO((prev) => (Number(prev) || 0) + addVal);
        break;
      case 'offStaffAttendanceExpense':
        setOffStaffAttendanceExpense((prev) => (Number(prev) || 0) + addVal);
        break;
      case 'persTransport':
        setPersTransport((prev) => (Number(prev) || 0) + addVal);
        break;
      case 'persRefreshment':
        setPersRefreshment((prev) => (Number(prev) || 0) + addVal);
        break;
      case 'persGroceriesVegMilk':
        setPersGroceriesVegMilk((prev) => (Number(prev) || 0) + addVal);
        break;
      case 'persLunchDinner':
        setPersLunchDinner((prev) => (Number(prev) || 0) + addVal);
        break;
      case 'persOther':
        setPersOther((prev) => (Number(prev) || 0) + addVal);
        break;
    }

    setIncrementalField(null);
    setIncrementalAmount('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setWarningMessage(null);

    if (!selectedDate) {
      setErrorMessage('Please select an entry date.');
      return;
    }

    const warnings = checkFinancialWarningCeilings({ dailyTotal: dailyGrandTotal });
    if (warnings.length > 0 && !warningMessage) {
      setWarningMessage(warnings.join(' '));
      return;
    }

    setSaving(true);
    try {
      const officialData: OfficialExpenseFormData = {
        refreshment: numOffRef,
        transport: numOffTrans,
        sparesHO: numOffSpares,
        staffAttendanceCount: Number(offStaffAttendanceCount) || 0,
        staffAttendanceExpense: numOffAttExp,
        staffSalary: numOffSalary,
        notes: offNotes
      };

      const personalData: PersonalExpenseFormData = {
        transport: numPersTrans,
        refreshment: numPersRef,
        groceriesVegMilk: numPersGroc,
        lunchDinner: numPersLunch,
        other: numPersOther,
        notes: persNotes
      };

      await saveDailyAccounts(
        selectedDate,
        officialData,
        personalData,
        currentUser?.email || 'Owner',
        'Updated daily accounts'
      );

      setSuccessMessage(`Daily accounts for ${selectedDate} saved successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save daily accounts.';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const annualSummary = useMemo(() => {
    let offTotal = 0;
    let persTotal = 0;
    accounts.forEach((a) => {
      offTotal += a.official.totalOfficialPaise;
      persTotal += a.personal.totalPersonalPaise;
    });
    return {
      officialRupees: toRupees(offTotal),
      personalRupees: toRupees(persTotal),
      grandTotalRupees: toRupees(offTotal + persTotal)
    };
  }, [accounts]);

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              Daily Accounts & Expense Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official business operating costs vs personal household expenditures • Year {selectedYear}
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setViewMode('daily-entry')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              viewMode === 'daily-entry'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Entry Form
          </button>
          <button
            onClick={() => setViewMode('annual-ledger')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              viewMode === 'annual-ledger'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual Rollup Ledger
          </button>
        </div>
      </div>

      {viewMode === 'daily-entry' ? (
        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-sky-400" />
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400">
                  Select Ledger Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Official</span>
                <span className="text-sm font-black text-sky-300">
                  {formatIndianRupees(dailyOfficialTotal)}
                </span>
              </div>
              <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Personal</span>
                <span className="text-sm font-black text-teal-300">
                  {formatIndianRupees(dailyPersonalTotal)}
                </span>
              </div>
              <div className="bg-sky-600 px-3.5 py-1.5 rounded-xl text-white">
                <span className="text-sky-100 block text-[10px] font-semibold">Day Grand Total</span>
                <span className="text-base font-black">
                  {formatIndianRupees(dailyGrandTotal)}
                </span>
              </div>
            </div>
          </div>

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-red-50 text-red-800 text-xs rounded-2xl border border-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {warningMessage && (
            <div className="p-3.5 bg-amber-50 text-amber-800 text-xs rounded-2xl border border-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{warningMessage} Please confirm if this high amount is intentional.</span>
              </div>
              <button
                type="button"
                onClick={() => setWarningMessage(null)}
                className="px-2 py-1 bg-amber-200 hover:bg-amber-300 font-bold rounded text-[11px] text-amber-900 shrink-0"
              >
                Confirm
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="font-bold text-slate-900 text-sm">
                    Official Expenses
                  </h2>
                </div>
                <span className="text-xs font-black text-sky-700">
                  Total: {formatIndianRupees(dailyOfficialTotal)}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-slate-400" />
                    <span>Refreshment (₹)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncrementalField('offRefreshment')}
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-700"
                  >
                    + Add
                  </button>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0.00"
                  value={offRefreshment}
                  onChange={(e) => setOffRefreshment(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-sky-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Transport / Fuel (₹)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncrementalField('offTransport')}
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-700"
                  >
                    + Add
                  </button>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0.00"
                  value={offTransport}
                  onChange={(e) => setOffTransport(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-sky-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                    <span>Spares / HO (₹)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncrementalField('offSparesHO')}
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-700"
                  >
                    + Add
                  </button>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0.00"
                  value={offSparesHO}
                  onChange={(e) => setOffSparesHO(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-sky-500"
                />
              </div>

              <div className="bg-sky-50/60 p-3.5 rounded-2xl border border-sky-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-700" />
                    <span>Staff Attendance (Daily Workers)</span>
                  </span>
                  <span className="text-[10px] text-sky-600 font-semibold">
                    Includes Wages + Tea + Bata
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Staff Headcount
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 3"
                      value={offStaffAttendanceCount}
                      onChange={(e) => setOffStaffAttendanceCount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 bg-white border border-sky-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        Total Amount (₹)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIncrementalField('offStaffAttendanceExpense')}
                        className="text-[10px] font-bold text-sky-700"
                      >
                        + Add
                      </button>
                    </div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 1500"
                      value={offStaffAttendanceExpense}
                      onChange={(e) => setOffStaffAttendanceExpense(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 bg-white border border-sky-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Staff Monthly Salary
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Daily wages are in Attendance; do not double count here.
                    </p>
                  </div>
                  
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setOffSalaryMode('combined')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        offSalaryMode === 'combined' ? 'bg-sky-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Combined
                    </button>
                    <button
                      type="button"
                      onClick={() => setOffSalaryMode('individual')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        offSalaryMode === 'individual' ? 'bg-sky-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Individual
                    </button>
                  </div>
                </div>

                {offSalaryMode === 'combined' ? (
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Combined monthly salary amount (₹)"
                    value={offStaffSalary}
                    onChange={(e) => setOffStaffSalary(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500"
                  />
                ) : (
                  <div className="space-y-2">
                    {individualSalaryEntries.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Staff Name"
                          value={item.name}
                          onChange={(e) => handleUpdateSalaryPerson(idx, 'name', e.target.value)}
                          className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        />
                        <input
                          type="number"
                          placeholder="Amount (₹)"
                          value={item.amount}
                          onChange={(e) => handleUpdateSalaryPerson(idx, 'amount', e.target.value)}
                          className="w-28 p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSalaryPerson(idx)}
                          className="text-xs text-red-600 p-1 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddSalaryPerson}
                      className="text-[11px] font-bold text-sky-700 hover:underline"
                    >
                      + Add Staff Member
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes about pump repair, spare parts bought, etc."
                  value={offNotes}
                  onChange={(e) => setOffNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-sky-500"
                />
              </div>

            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="font-bold text-slate-900 text-sm">
                    Personal Household Expenses
                  </h2>
                </div>
                <span className="text-xs font-black text-teal-700">
                  Total: {formatIndianRupees(dailyPersonalTotal)}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Personal Transport / Fuel (₹)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncrementalField('persTransport')}
                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700"
                  >
                    + Add
                  </button>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0.00"
                  value={persTransport}
                  onChange={(e) => setPersTransport(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-teal-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-slate-400" />
                    <span>Personal Refreshment / Tea (₹)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncrementalField('persRefreshment')}
                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700"
                  >
                    + Add
                  </button>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0.00"
                  value={persRefreshment}
                  onChange={(e) => setPersRefreshment(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-teal-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Groceries / Vegetables / Milk (₹)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncrementalField('persGroceriesVegMilk')}
                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700"
                  >
                    + Add
                  </button>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0.00"
                  value={persGroceriesVegMilk}
                  onChange={(e) => setPersGroceriesVegMilk(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-teal-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lunch / Dinner (₹)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncrementalField('persLunchDinner')}
                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700"
                  >
                    + Add
                  </button>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0.00"
                  value={persLunchDinner}
                  onChange={(e) => setPersLunchDinner(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-teal-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    <span>Other Personal Expenses (₹)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncrementalField('persOther')}
                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700"
                  >
                    + Add
                  </button>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0.00"
                  value={persOther}
                  onChange={(e) => setPersOther(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Personal Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Personal remarks or household purchase details"
                  value={persNotes}
                  onChange={(e) => setPersNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-teal-500"
                />
              </div>

            </div>

          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-teal-600/20 transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Accounts...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Daily Accounts ({selectedDate})</span>
                </>
              )}
            </button>
          </div>

        </form>
      ) : (
        <div className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 block mb-1">Annual Official Total</span>
              <span className="text-2xl font-black text-sky-700">
                {formatIndianRupees(annualSummary.officialRupees)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 block mb-1">Annual Personal Total</span>
              <span className="text-2xl font-black text-teal-700">
                {formatIndianRupees(annualSummary.personalRupees)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 block mb-1">Annual Grand Total</span>
              <span className="text-2xl font-black text-slate-900">
                {formatIndianRupees(annualSummary.grandTotalRupees)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {accounts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs sm:text-sm">
                No daily accounts recorded for {selectedYear} yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Official (₹)</th>
                      <th className="py-3 px-4 text-right">Personal (₹)</th>
                      <th className="py-3 px-4 text-right">Day Total (₹)</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((a) => {
                      const offRupees = toRupees(a.official.totalOfficialPaise);
                      const persRupees = toRupees(a.personal.totalPersonalPaise);
                      const dayGrand = toRupees(a.dailyGrandTotalPaise);

                      return (
                        <tr key={a.entryDate} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {a.entryDate}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-sky-700">
                            {formatIndianRupees(offRupees)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-teal-700">
                            {formatIndianRupees(persRupees)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {formatIndianRupees(dayGrand)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedDate(a.entryDate);
                                setViewMode('daily-entry');
                              }}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                            >
                              Edit Day
                            </button>
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
      )}

      {incrementalField && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              + Add Incremental Expense
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Appends an additional amount to the existing category total.
            </p>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="Amount to add (₹)"
              value={incrementalAmount}
              onChange={(e) => setIncrementalAmount(e.target.value === '' ? '' : Number(e.target.value))}
              autoFocus
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-teal-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIncrementalField(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyIncrementalAdd}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs shadow-sm"
              >
                Add Amount
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
