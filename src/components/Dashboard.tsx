/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Activity,
  Plus,
  Users
} from 'lucide-react';
import { Task, Handover, View } from '../types';
import { storage } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';

import { fetchMonthData, getStaffStatus, StaffSchedule } from '../services/scheduleService';

interface DashboardProps {
  tasks: Task[];
  handovers: Handover[];
  onNavigate: (view: View) => void;
  onUpdate: () => void;
}

export default function Dashboard({ tasks, handovers, onNavigate, onUpdate }: DashboardProps) {
  const { user: sessionUser } = useAuth();
  const [schedules, setSchedules] = React.useState<StaffSchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = React.useState(true);

  React.useEffect(() => {
    const loadSchedule = async () => {
      try {
        const now = new Date();
        const currentMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const { data } = await fetchMonthData(currentMonth);
        setSchedules(data);
      } catch (error) {
        console.error('Failed to load dashboard schedules:', error);
      } finally {
        setIsLoadingSchedules(false);
      }
    };
    loadSchedule();
  }, []);

  const activeStaff = schedules.filter(s => getStaffStatus(s) === 'Active');

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'on-going');
  const urgentTasks = pendingTasks.filter(t => t.priority === 'high');
  const lastHandover = [...handovers].sort((a, b) => b.timestamp - a.timestamp)[0];

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const stats = [
    { label: 'Active Tasks', value: pendingTasks.length, icon: Clock, color: 'text-[#4A773C]', bg: 'bg-[#4A773C]/10' },
    { label: 'Urgent Action', value: urgentTasks.length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Completed Today', value: tasks.filter(t => t.status === 'completed').length, icon: CheckCircle2, color: 'text-[#88C13E]', bg: 'bg-[#88C13E]/10' },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Quick Access */}
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={() => onNavigate('schedule')}
          className="hc-card px-6 py-4 flex items-center gap-3 hover:border-[#88C13E]/30 group transition-all"
        >
          <div className="p-2 bg-[#F1F7EB] rounded-xl text-[#4A773C]">
            <Users size={20} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-gray-600">IT Team Monitoring</span>
          <ArrowRightLeft size={14} className="text-gray-300 group-hover:text-[#4A773C] transition-all ml-2" />
        </button>
      </div>

      {/* Welcome & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="hc-card p-6 flex items-center gap-4 transition-all hover:border-[#88C13E]/30">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <section className="hc-card overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black flex items-center gap-2 text-xs uppercase tracking-wider text-gray-700">
                <Activity size={18} className="text-[#88C13E]" />
                Latest Shift Activity
              </h3>
              <button 
                onClick={() => onNavigate('logs')}
                className="text-xs text-[#4A773C] hover:text-[#88C13E] font-bold uppercase tracking-widest transition-colors"
              >
                Full History
              </button>
            </div>
            <div className="p-0">
              {lastHandover ? (
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#F8F9FA] border border-gray-100 flex items-center justify-center font-black text-[#4A773C] text-lg">
                        {lastHandover.endorsedBy[0]?.[0]}
                      </div>
                      <div>
                        <div className="flex flex-col">
                          <p className="font-black text-[10px] uppercase text-[#4A773C] tracking-widest leading-none">Endorsed By</p>
                          <p className="font-bold text-sm text-gray-900 mt-1">{(lastHandover.endorsedBy || []).join(', ')}</p>
                        </div>
                        <div className="flex flex-col mt-2">
                          <p className="font-black text-[10px] uppercase text-[#88C13E] tracking-widest leading-none">Endorsed To</p>
                          <p className="font-bold text-sm text-gray-900 mt-1">{(lastHandover.endorsedTo || []).join(', ')}</p>
                        </div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-2">
                          Created: {new Date(lastHandover.timestamp).toLocaleDateString()} {formatTime(lastHandover.timestamp)}
                        </p>
                        {(lastHandover.startedAt || lastHandover.completedAt) && (
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            {lastHandover.startedAt && (
                              <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                <Clock size={10} />
                                SLA: {formatDuration((lastHandover.completedAt || Date.now()) - lastHandover.startedAt)}
                              </span>
                            )}
                            {lastHandover.completedAt && (
                              <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest bg-[#D1FAE5] px-2 py-0.5 rounded border border-[#A7F3D0] flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                Resolution Time: {formatTime(lastHandover.completedAt)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 bg-[#4A773C]/10 text-[#4A773C] border border-[#4A773C]/20 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        {lastHandover.fromShift} → {lastHandover.toShift}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                        lastHandover.urgency === 'high' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                        lastHandover.urgency === 'medium' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                        'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]'
                      }`}>
                        {lastHandover.urgency} Priority
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-black text-gray-900 leading-tight">
                      {lastHandover.title || 'Untitled Endorsement'}
                    </h4>
                    
                    <div className="bg-[#F8F9FA] rounded-2xl p-6 text-gray-600 italic border-l-4 border-[#88C13E] text-sm leading-relaxed">
                      "{lastHandover.description}"
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-20 text-center text-gray-400">
                  <ArrowRightLeft size={64} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold text-lg text-gray-600">No Endorsement Task Initiated</p>
                  <p className="text-sm opacity-60">System stands by for first shift endorsement.</p>
                </div>
              )}
            </div>
          </section>

          <section className="hc-card overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-black flex items-center gap-2 text-xs uppercase tracking-wider text-gray-700">
                <TrendingUp size={18} className="text-[#88C13E]" />
                Resource Analytics
              </h3>
            </div>
            <div className="p-10 h-64 flex items-end justify-around gap-6">
              {['low', 'medium', 'high'].map((p) => {
                const count = tasks.filter(t => t.priority === p && t.status !== 'completed').length;
                const max = Math.max(...['low', 'medium', 'high'].map(p2 => tasks.filter(t => t.priority === p2 && t.status !== 'completed').length), 1);
                const height = (count / max) * 100;
                return (
                  <div key={p} className="flex-1 flex flex-col items-center gap-4">
                    <div className="w-full relative bg-gray-50 rounded-2xl h-48 overflow-hidden group">
                      <div 
                        className={`absolute bottom-0 w-full transition-all duration-1000 ease-out group-hover:brightness-110 ${
                          p === 'high' ? 'bg-rose-500' : 
                          p === 'medium' ? 'bg-[#4A773C]' : 
                          'bg-[#88C13E]'
                        }`}
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute top-3 w-full text-center text-white font-black text-xs">
                          {count}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{p} priority</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="bg-[#4A773C] p-8 rounded-[2rem] shadow-xl shadow-[#4A773C]/20 relative overflow-hidden group transition-all hover:shadow-[#4A773C]/40">
            <div className="relative z-10 flex flex-col h-full">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-200 mb-2">Protocol Ready</p>
              <h4 className="text-2xl font-black mb-4 leading-tight italic text-white">Transition Phase?</h4>
              <p className="text-white/80 text-sm mb-10 leading-relaxed font-medium">Verify your output and endorse the terminal state for the incoming shift.</p>
              <button 
                onClick={() => onNavigate('handover')}
                className="w-full bg-white text-[#4A773C] py-4 rounded-2xl font-black hover:bg-[#88C13E] hover:text-white transition-all flex items-center justify-center gap-3 shadow-xl group-hover:gap-5"
              >
                NEXT SHIFT ENDORSEMENT
                <ArrowRightLeft size={20} />
              </button>
            </div>
            {/* Decorative element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
            <ArrowRightLeft size={160} className="absolute -bottom-16 -right-16 text-white/5 group-hover:rotate-12 transition-transform duration-700" />
          </div>

          <div className="hc-card p-6">
            <h4 className="font-black mb-5 flex items-center gap-2 text-xs uppercase tracking-wider text-gray-700">
              <Activity size={18} className="text-[#4A773C]" />
              Active Engineers
            </h4>
            <div className="space-y-3">
              {isLoadingSchedules ? (
                <div className="py-4 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[#4A773C]/20 border-t-[#4A773C] rounded-full animate-spin" />
                </div>
              ) : activeStaff.length > 0 ? (
                activeStaff.map((staff, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#4A773C] text-white flex items-center justify-center font-black text-[10px]">
                        {(staff.name || '??').split(' ').map(n => n?.[0] || '').join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900">{staff.name}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-[#4A773C]">Online</p>
                      </div>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#88C13E] animate-pulse" />
                  </div>
                ))
              ) : (
                <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No active shifts</p>
                </div>
              )}
              <button 
                onClick={() => onNavigate('schedule')}
                className="w-full mt-2 text-[10px] text-gray-400 hover:text-[#4A773C] font-black uppercase tracking-widest transition-colors text-center"
              >
                View Full Team Matrix →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
