/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  MapPin, 
  Calendar,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { IT_TEAM } from '../constants';

import { 
  fetchMonthData, 
  getStaffStatus, 
  StaffSchedule,
  getDateISO
} from '../services/scheduleService';

// Initial fallback names mapping
const INITIAL_DATA: StaffSchedule[] = [
  { name: 'Errol', monthlySchedule: {} },
  { name: 'Ron', monthlySchedule: {} },
  { name: 'Paulo', monthlySchedule: {} },
  { name: 'Rex', monthlySchedule: {} },
  { name: 'Kristel', monthlySchedule: {} },
  { name: 'Kiel', monthlySchedule: {} },
];


export default function ITSchedule() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [schedules, setSchedules] = useState<StaffSchedule[]>(INITIAL_DATA);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const currentMonthName = currentTime.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (now.getMinutes() !== currentTime.getMinutes()) {
        setCurrentTime(now);
      }
    }, 1000); 
    
    fetchRelevantMonths();
    
    return () => clearInterval(timer);
  }, [currentMonthName]);

  const fetchRelevantMonths = async () => {
    const monthsToFetch = new Set<string>();
    
    // Check 3 days back and 3 days forward to see if we need multiple months
    for (let i = -3; i <= 3; i++) {
        const d = new Date(currentTime);
        d.setDate(currentTime.getDate() + i);
        monthsToFetch.add(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const allResults = await Promise.all(
        Array.from(monthsToFetch).map(month => fetchMonthData(month))
      );

      // Merge all months into the schedule state
      setSchedules(prev => {
        const merged = [...prev];
        allResults.forEach(({ data }) => {
          if (!data || data.length === 0) return;
          
          data.forEach(fetchedStaff => {
            let existing = merged.find(s => s.name.toLowerCase() === fetchedStaff.name.toLowerCase());
            if (!existing) {
              existing = { name: fetchedStaff.name, monthlySchedule: {} };
              merged.push(existing);
            }
            
            // Overwrite/update with new monthly data
            Object.assign(existing.monthlySchedule, fetchedStaff.monthlySchedule);
          });
        });
        return [...merged];
      });

      setLastSync(new Date());
    } catch (error) {
      console.error('Multi-month sync failed:', error);
      setSyncError('Sync failed. Check spreadsheet sharing.');
    } finally {
      setIsSyncing(false);
    }
  };


  const getStatusRank = (status: string) => {
    switch (status) {
      case 'Active': return 0;
      case 'Next Shift': return 1;
      case 'Offline': return 2;
      case 'Restday': return 3;
      case 'PTO': return 4;
      case 'OFFSET': return 5;
      default: return 6;
    }
  };

  const filteredStaff = schedules.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const aStatus = getStaffStatus(a);
    const bStatus = getStaffStatus(b);
    const aRank = getStatusRank(aStatus);
    const bRank = getStatusRank(bStatus);
    
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });

  const activeCount = schedules.filter(s => getStaffStatus(s) === 'Active').length;

  const startOfWeek = new Date(currentTime);
  startOfWeek.setDate(currentTime.getDate() - currentTime.getDay());

  return (
    <div className="space-y-6 pb-8">
      <div className="hc-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-white shadow-sm border border-gray-100 rounded-3xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-[#F1F7EB] rounded-2xl flex items-center justify-center text-[#4A773C]">
            <Calendar size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black italic tracking-tight text-gray-900">IT Team Schedule</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4A773C] bg-[#4A773C]/10 px-3 py-1 rounded-full border border-[#4A773C]/20">
                {currentMonthName} Matrix
              </span>
              <p className="text-xs font-bold text-gray-500">
                {currentTime.toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#88C13E] outline-none transition-all"
            />
          </div>
          <div className="relative group">
            <button 
              onClick={fetchRelevantMonths}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 border ${
                syncError 
                  ? 'bg-rose-50 text-rose-500 border-rose-100 animate-pulse' 
                  : lastSync ? 'bg-[#F1F7EB] text-[#4A773C] border-[#4A773C]/10' : 'bg-white text-[#4A773C] border-[#4A773C]/20 hover:bg-gray-50'
              }`}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : syncError ? 'Auth Error' : lastSync ? 'Live Linked' : 'Matrix Master'}
            </button>
            {(syncError || lastSync) && (
              <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 text-[10px] text-gray-500 font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {syncError ? (
                  <>
                    <AlertCircle size={14} className="mb-2 text-rose-500" />
                    <span className="text-rose-600">{syncError}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="mb-2 text-[#4A773C]" />
                    <span>Synchronized with Google Sheets</span>
                    <p className="mt-1 text-[9px] opacity-70">Last update: {lastSync?.toLocaleTimeString()}</p>
                  </>
                )}
                <div className="mt-2 pt-2 border-t border-gray-50 text-gray-400 italic">File &gt; Share &gt; Publish to web &gt; CSV</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hc-card overflow-hidden p-0 border-collapse bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Personnel</th>
                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Live Status</th>
                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Time Schedule</th>
                <th className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <div className="mb-3 text-center">Monthly Matrix</div>
                  <div className="flex gap-1.5 justify-center">
                    {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                      const targetDate = new Date(startOfWeek);
                      targetDate.setDate(startOfWeek.getDate() + dayOffset);
                      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
                      const isToday = targetDate.toDateString() === currentTime.toDateString();
                      return (
                        <div 
                          key={`header-day-${dayOffset}`} 
                          className={`w-11 text-center transition-colors ${isToday ? 'text-[#4A773C] font-black underline underline-offset-4 decoration-2' : 'text-gray-400 font-bold'}`}
                        >
                          {dayName.toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStaff.map((staff, idx) => {
                const status = getStaffStatus(staff);
                const isoToday = getDateISO(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
                const currentShift = staff.monthlySchedule[isoToday];

                return (
                  <motion.tr 
                    key={`${staff.name}-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`group transition-all ${
                      status === 'Active' ? 'hover:bg-[#F1F7EB]/30' : 
                      status === 'Next Shift' ? 'bg-[#6D28D9]/5 hover:bg-[#6D28D9]/10 border-l-4 border-l-[#6D28D9]' :
                      status === 'Offline' || status === 'Restday' || status === 'PTO' ? 'opacity-40 grayscale-[0.9] hover:bg-gray-50/50' : ''
                    }`}
                  >
                    <td className="px-8 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] transition-all shadow-sm ${
                          status === 'Active' ? 'bg-[#4A773C] text-white shadow-[#4A773C]/20 border-2 border-white' : 
                          status === 'Next Shift' ? 'bg-[#6D28D9] text-white shadow-[#6D28D9]/20 border-2 border-white' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {staff.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className={`font-black text-xs transition-colors ${status === 'Next Shift' ? 'text-[#6D28D9]' : 'text-gray-900 group-hover:text-[#4A773C]'}`}>{staff.name}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">IT Ops Manila</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`relative flex items-center justify-center w-2.5 h-2.5`}>
                          {status === 'Active' && <div className={`absolute inset-0 rounded-full animate-ping bg-[#88C13E]/40`} />}
                          {status === 'Next Shift' && <div className={`absolute inset-0 rounded-full animate-pulse bg-[#6D28D9]/40`} />}
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            status === 'Active' ? 'bg-[#88C13E]' : 
                            status === 'Next Shift' ? 'bg-[#6D28D9]' :
                            status === 'OFFSET' ? 'bg-indigo-400' :
                            'bg-gray-300'
                          }`} />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          status === 'Active' ? 'text-[#4A773C]' : 
                          status === 'Next Shift' ? 'text-[#6D28D9]' :
                          status === 'OFFSET' ? 'text-indigo-600' :
                          'text-gray-400'
                        }`}>
                          {status === 'Active' ? 'Active Now' : status === 'Next Shift' ? 'Incoming Shift' : status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className={`flex items-center gap-1.5 text-[11px] font-black ${status === 'Next Shift' ? 'text-[#6D28D9]' : 'text-gray-600'}`}>
                          <Clock size={10} className={status === 'Next Shift' ? 'text-[#6D28D9]/60' : 'text-gray-400'} />
                          {currentShift === 'OFF' ? 'RESTDAY' : currentShift === 'PTO' ? 'ON LEAVE' : currentShift?.split(': ')[1] || currentShift || '-'}
                        </div>
                        <p className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter italic">PHT (UTC+8)</p>
                      </div>
                    </td>
                    <td className="px-8 py-3">
                      <div className="flex gap-1.5 justify-center">
                        {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                          const targetDate = new Date(startOfWeek);
                          targetDate.setDate(startOfWeek.getDate() + dayOffset);
                          const dateNum = targetDate.getDate();
                          const isoDate = getDateISO(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                          const shift = staff.monthlySchedule[isoDate] || 'OFF';
                          const isOff = shift === 'OFF';
                          const isPTO = shift === 'PTO';
                          const isToday = targetDate.toDateString() === currentTime.toDateString();

                          return (
                            <div 
                              key={`${staff.name}-${targetDate.getTime()}`}
                              className={`w-11 h-11 flex flex-col items-center justify-center rounded-xl transition-all border-2 ${
                                !isToday 
                                  ? 'bg-gray-100 text-gray-600 border-gray-200/50' 
                                  : isPTO || isOff 
                                    ? 'bg-gray-100 text-gray-500 border-gray-200' 
                                    : status === 'Next Shift' 
                                      ? 'bg-[#6D28D9] text-white border-[#5B21B6] shadow-xl shadow-[#6D28D9]/20'
                                      : 'bg-[#4A773C] text-white border-[#3d6331] shadow-xl shadow-[#4A773C]/20'
                              } ${isToday ? `ring-2 ring-offset-1 ${status === 'Next Shift' ? 'ring-[#6D28D9]/40' : 'ring-[#88C13E]'} scale-105 z-10` : 'hover:scale-105'}`}
                              title={`${dateNum}: ${shift}`}
                            >
                              <span className="text-[8px] font-black opacity-80 leading-none mb-1">{dateNum}</span>
                              <span className="text-xs leading-none font-black tracking-tighter uppercase">
                                {shift === 'OFF' ? '✖' : (shift.includes(':') ? shift.split(':')[0] : shift[0])}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#4A773C]/5 border border-[#4A773C]/10 p-8 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white rounded-2xl text-[#4A773C] shadow-lg shadow-[#4A773C]/5 border border-[#4A773C]/10">
            <AlertCircle size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4A773C] mb-2">Matrix Synchronization Engine</p>
            <p className="text-sm font-medium text-[#4A773C]/70 italic max-w-md leading-relaxed">
              Monitoring {schedules.length} active personnel. Real-time availability is synchronized with the 
              HC-Local IT Manila spreadsheet master file.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-8 bg-white/50 px-10 py-5 rounded-3xl border border-white">
          <div className="text-center">
            <p className="text-3xl font-black text-[#4A773C] leading-none mb-1">{activeCount}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#4A773C]/40">Active Engineers</p>
          </div>
          <div className="w-px h-10 bg-[#4A773C]/10" />
          <div className="text-center">
            <p className="text-3xl font-black text-gray-300 leading-none mb-1">{schedules.length - activeCount}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400/40">Standby/Off</p>
          </div>
        </div>
      </div>
    </div>
  );
}
