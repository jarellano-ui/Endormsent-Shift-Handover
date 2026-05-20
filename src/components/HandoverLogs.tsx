/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  History, 
  Calendar, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Activity,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  XCircle,
  Download,
  Table as TableIcon,
  LayoutList,
  Filter,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { Handover, Task, Comment } from '../types';
import { storage } from '../services/storage';
import { auth as authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import CommentSection from './CommentSection';

interface HandoverLogsProps {
  handovers: Handover[];
  tasks: Task[];
  onUpdate: () => void;
  initialSelectedId?: string | null;
}

export default function HandoverLogs({ handovers, tasks, onUpdate, initialSelectedId }: HandoverLogsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialSelectedId) {
      setExpandedId(initialSelectedId);
      // Optional: scroll to the element
      setTimeout(() => {
        const element = document.getElementById(initialSelectedId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [initialSelectedId]);
  const [isSpreadsheetView, setIsSpreadsheetView] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'protocol' | 'task'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');

  const { user: sessionUser } = useAuth();
  const localUser = authService.getUser();
  const currentUserName = sessionUser?.name || localUser.name;

  const handleAddComment = async (originalId: string, type: 'protocol' | 'task', text: string) => {
    const now = Date.now();
    const newComment: Comment = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      author: currentUserName,
      timestamp: now
    };

    if (type === 'protocol') {
      const updated = handovers.map(h => {
        if (h.id === originalId) {
          return { ...h, comments: [...(h.comments || []), newComment] };
        }
        return h;
      });
      await storage.updateHandovers(updated);
    } else {
      const updated = tasks.map(t => {
        if (t.id === originalId) {
          return { ...t, comments: [...(t.comments || []), newComment] };
        }
        return t;
      });
      await storage.saveTasks(updated);
    }
    onUpdate();
  };

  const handleDeleteComment = async (originalId: string, type: 'protocol' | 'task', commentId: string) => {
    if (type === 'protocol') {
      const updated = handovers.map(h => {
        if (h.id === originalId) {
          return { ...h, comments: (h.comments || []).filter(c => c.id !== commentId) };
        }
        return h;
      });
      await storage.updateHandovers(updated);
    } else {
      const updated = tasks.map(t => {
        if (t.id === originalId) {
          return { ...t, comments: (t.comments || []).filter(c => c.id !== commentId) };
        }
        return t;
      });
      await storage.saveTasks(updated);
    }
    onUpdate();
  };

  // Unified Log Item type
  type LogItem = {
    id: string;
    type: 'protocol' | 'task';
    timestamp: number;
    title: string;
    description: string;
    urgency: 'low' | 'medium' | 'high';
    status: 'pending' | 'on-going' | 'completed' | 'cancelled';
    startedAt?: number;
    completedAt?: number;
    comments?: Comment[];
    meta: any;
  };

  const allLogs: LogItem[] = [
    ...handovers.map(h => ({
      id: `protocol-${h.id}`, 
      type: 'protocol' as const,
      timestamp: h.timestamp,
      title: h.title,
      description: h.description,
      urgency: h.urgency,
      status: h.status,
      startedAt: h.startedAt,
      completedAt: h.completedAt,
      comments: h.comments,
      meta: { originalId: h.id, fromShift: h.fromShift, toShift: h.toShift, endorsedBy: h.endorsedBy, endorsedTo: h.endorsedTo, taskIds: h.taskIds }
    })),
    ...tasks.map(t => ({
      id: `task-${t.id}`, 
      type: 'task' as const,
      timestamp: t.createdAt, // Creation time
      title: t.title,
      description: t.description,
      urgency: t.priority,
      status: t.status,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      comments: t.comments,
      meta: { originalId: t.id, createdBy: t.createdBy, assignedTo: t.assignedTo }
    }))
  ];

  const filteredLogs = allLogs.filter(l => {
    const matchesStatus = statusFilter === 'all' ? true : (statusFilter === 'pending' ? (l.status === 'pending' || l.status === 'on-going') : l.status === statusFilter);
    const matchesType = typeFilter === 'all' ? true : l.type === typeFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const logDate = new Date(l.timestamp);
      const now = new Date();
      if (dateFilter === 'today') {
        matchesDate = logDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesDate = logDate >= weekAgo;
      }
    }
    
    return matchesStatus && matchesType && matchesDate;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => b.timestamp - a.timestamp);
  
  const deleteLogItem = async (compositeId: string, type: 'protocol' | 'task') => {
    const logItem = allLogs.find(l => l.id === compositeId);
    const originalId = logItem?.meta?.originalId;
    if (!originalId) return;

    if (type === 'protocol') {
      const updated = handovers.filter(h => h.id !== originalId);
      await storage.updateHandovers(updated);
    } else {
      const updated = tasks.filter(t => t.id !== originalId);
      await storage.saveTasks(updated);
    }
    onUpdate();
  };

  const toggleStatus = async (compositeId: string, type: 'protocol' | 'task', targetStatus?: 'pending' | 'on-going' | 'completed' | 'cancelled') => {
    const logItem = allLogs.find(l => l.id === compositeId);
    const originalId = logItem?.meta?.originalId;
    if (!originalId || !logItem) return;

    if (logItem.status === 'completed') return; // Locked

    // Check ownership for cancellation
    if (targetStatus === 'cancelled') {
      const isOwner = type === 'protocol' 
        ? logItem.meta?.endorsedBy?.includes(currentUserName)
        : logItem.meta?.createdBy === currentUserName;
      
      if (!isOwner) return;
    }

    let nextStatus: 'pending' | 'on-going' | 'completed' | 'cancelled' = logItem.status === 'pending' ? 'on-going' : 'completed';
    if (targetStatus) nextStatus = targetStatus;

    const now = Date.now();

    if (type === 'protocol') {
      const updated = handovers.map(h => {
        if (h.id === originalId) {
          const updates: Partial<Handover> = { status: nextStatus };
          if (nextStatus === 'on-going' && !h.startedAt) updates.startedAt = now;
          if (nextStatus === 'completed' && !h.completedAt) updates.completedAt = now;
          return { ...h, ...updates };
        }
        return h;
      });
      await storage.updateHandovers(updated);
    } else {
      const updated = tasks.map(t => {
        if (t.id === originalId) {
          const updates: Partial<Task> = { status: nextStatus, updatedAt: now };
          if (nextStatus === 'on-going' && !t.startedAt) updates.startedAt = now;
          if (nextStatus === 'completed' && !t.completedAt) updates.completedAt = now;
          return { ...t, ...updates };
        }
        return t;
      });
      await storage.saveTasks(updated);
    }
    onUpdate();
  };

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const exportToCSV = () => {
    if (sortedLogs.length === 0) return;

    // Headers
    const headers = ['Date', 'Type', 'Title', 'Urgency', 'Status', 'Description'];
    
    // Data rows
    const rows = sortedLogs.map(log => [
      new Date(log.timestamp).toLocaleDateString(),
      log.type === 'protocol' ? 'ENDORSEMENT TASK' : 'STANDALONE TASK',
      log.title || 'Untitled',
      log.urgency.toUpperCase(),
      log.status.toUpperCase(),
      (log.description || '').replace(/"/g, '""') // Escape quotes for CSV
    ]);

    // Construct CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Handover_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="hc-card p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="font-black flex items-center gap-3 text-xs uppercase tracking-wider text-gray-700">
            <History size={20} className="text-[#88C13E]" />
            Records & Activity Logs
          </h3>
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-[#4A773C] font-black bg-[#4A773C]/10 border border-[#4A773C]/20 px-4 py-1.5 rounded-full uppercase tracking-widest">
              Total Entries: {allLogs.length}
            </p>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-[#88C13E] hover:text-[#4A773C] transition-all group shadow-sm"
            >
              <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <Filter size={14} className="text-gray-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filters:</span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-gray-50/50 p-1 rounded-xl border border-gray-100">
            {['all', 'pending', 'completed', 'cancelled'].map((f, idx) => (
              <button
                key={`${f}-${idx}`}
                onClick={() => setStatusFilter(f as any)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === f 
                    ? 'bg-white shadow-sm text-[#4A773C]' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-gray-50/50 p-1 rounded-xl border border-gray-100">
            {['all', 'protocol', 'task'].map((f, idx) => (
              <button
                key={`${f}-${idx}`}
                onClick={() => setTypeFilter(f as any)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  typeFilter === f 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {f === 'all' ? 'Any Type' : f === 'protocol' ? 'Endorsement Task' : 'Standalone Task'}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center bg-gray-50/50 p-1 rounded-xl border border-gray-100">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  dateFilter === f.id 
                    ? 'bg-white shadow-sm text-amber-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-inner">
            <button 
              onClick={() => setIsSpreadsheetView(false)}
              className={`p-2 rounded-lg transition-all ${!isSpreadsheetView ? 'bg-white shadow-sm text-[#4A773C]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Card View"
            >
              <LayoutList size={16} />
            </button>
            <button 
              onClick={() => setIsSpreadsheetView(true)}
              className={`p-2 rounded-lg transition-all ${isSpreadsheetView ? 'bg-white shadow-sm text-[#4A773C]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Spreadsheet View"
            >
              <TableIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedLogs.length > 0 ? (
          isSpreadsheetView ? (
            <div className="hc-card overflow-x-auto custom-scrollbar p-0 border-collapse">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Title</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Urgency</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Personnel</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedLogs.map((log, idx) => (
                    <tr key={`${log.id}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-gray-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                          log.type === 'protocol' ? 'bg-[#88C13E]/10 text-[#4A773C]' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {log.type === 'protocol' ? 'Endorsement Task' : 'Standalone Task'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900 truncate max-w-[150px] block">
                          {log.title}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${
                          log.urgency === 'high' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                          log.urgency === 'medium' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                          'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]'
                        }`}>
                          {log.urgency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {log.type === 'protocol' ? 'By: ' + (log.meta?.endorsedBy || []).join(', ') : 'By: ' + log.meta?.createdBy}
                          </p>
                          {log.meta?.assignedTo && (
                            <p className="text-[9px] font-bold text-[#88C13E] uppercase tracking-widest">
                              To: {Array.isArray(log.meta.assignedTo) ? log.meta.assignedTo.join(', ') : log.meta.assignedTo}
                            </p>
                          )}
                          {log.type === 'protocol' && log.meta?.endorsedTo?.length > 0 && (
                            <p className="text-[9px] font-bold text-[#88C13E] uppercase tracking-widest">
                              To: {log.meta?.endorsedTo.join(', ')}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {log.status !== 'completed' && (() => {
                            const isOwner = log.type === 'protocol' 
                              ? log.meta?.endorsedBy?.includes(currentUserName)
                              : log.meta?.createdBy === currentUserName;
                            
                            return (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isOwner) {
                                    toggleStatus(log.id, log.type, log.status === 'cancelled' ? 'pending' : 'cancelled');
                                  }
                                }}
                                disabled={!isOwner}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border ${
                                  log.status === 'cancelled'
                                    ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-500/30'
                                    : isOwner
                                    ? 'text-gray-300 hover:text-rose-500 border-gray-100 hover:bg-rose-50'
                                    : 'text-gray-200 border-gray-50 cursor-not-allowed opacity-50'
                                }`}
                                title={!isOwner ? "Only owners can cancel" : log.status === 'cancelled' ? "Revert" : "Cancel"}
                              >
                                <XCircle size={16} strokeWidth={3} />
                              </button>
                            );
                          })()}

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStatus(log.id, log.type, 'completed');
                            }}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border ${
                              log.status === 'completed'
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-500/30'
                                : 'text-gray-300 hover:text-emerald-500 border-gray-100 hover:bg-emerald-50'
                            }`}
                            title="Complete"
                          >
                            <CheckCircle2 size={16} strokeWidth={3} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            sortedLogs.map((log, idx) => (
            <div 
              key={`${log.id}-${idx}`}
              id={log.id}
              className={`hc-card overflow-hidden transition-all hover:bg-white hover:shadow-md group ${
                log.type === 'task' ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-[#88C13E]'
              }`}
            >
              <div 
                className="w-full p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left"
              >
                <div 
                  className="flex items-center gap-5 cursor-pointer flex-1"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div className={`w-14 h-14 bg-gray-50 group-hover:bg-opacity-10 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 transition-all ${
                    log.type === 'protocol' ? 'group-hover:bg-[#4A773C] group-hover:text-[#4A773C] group-hover:border-[#4A773C]/30' : 'group-hover:bg-blue-600 group-hover:text-blue-600 group-hover:border-blue-400/30'
                  }`}>
                    {log.type === 'protocol' ? <Clock size={28} /> : <Activity size={28} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={`font-black text-[10px] uppercase tracking-widest py-1.5 px-3 border rounded-lg ${
                        log.type === 'protocol' 
                          ? 'text-[#4A773C] bg-[#4A773C]/10 border-[#4A773C]/20' 
                          : 'text-blue-600 bg-blue-50 border-blue-100'
                      }`}>
                        {log.type === 'protocol' ? (log.meta?.fromShift + ' → ' + log.meta?.toShift) : 'Standalone Task'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                        log.urgency === 'high' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                        log.urgency === 'medium' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                        'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]'
                      }`}>
                        {log.urgency}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                        log.status === 'completed' 
                          ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' 
                          : log.status === 'on-going'
                          ? 'bg-blue-50 text-blue-500 border-blue-100'
                          : log.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-600 border-rose-100'
                          : 'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {log.status === 'on-going' ? 'Ongoing' : log.status}
                      </span>
                      <span className="text-xs text-gray-400 font-bold">
                        {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="mt-2 text-left">
                      <h4 className="font-black text-gray-900 leading-tight">
                        {log.title}
                      </h4>
                      {log.type === 'protocol' ? (
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Endorsed By: {(log.meta?.endorsedBy || []).join(', ')}</p>
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Endorsed To: {(log.meta?.endorsedTo || []).join(', ')}</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                          <div className="flex flex-col gap-1">
                            <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none">Created By</p>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-[#4A773C]/10 flex items-center justify-center text-[8px] font-black text-[#4A773C]">
                                {authService.getInitials(log.meta?.createdBy || '??')}
                              </div>
                              <span className="text-[9px] font-black uppercase text-gray-600">{log.meta?.createdBy}</span>
                            </div>
                          </div>
                          {log.meta?.assignedTo && (
                            <div className="flex flex-col gap-1">
                              <p className="text-[8px] font-black uppercase text-[#88C13E] tracking-widest leading-none">Assigned To</p>
                              <div className="flex flex-wrap items-center gap-2">
                                {(Array.isArray(log.meta.assignedTo) ? log.meta.assignedTo : [log.meta.assignedTo]).map((assigned, idx) => (
                                  <div key={`${assigned}-${idx}`} className="flex items-center gap-2 bg-[#88C13E]/5 px-1.5 py-0.5 rounded border border-[#88C13E]/10">
                                    <div className="w-4 h-4 rounded-full bg-[#88C13E]/10 flex items-center justify-center text-[7px] font-black text-[#88C13E]">
                                      {authService.getInitials(assigned)}
                                    </div>
                                    <span className="text-[8px] font-black uppercase text-gray-600">{assigned}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          Created: {new Date(log.timestamp).toLocaleDateString()} {formatTime(log.timestamp)}
                        </span>
                        <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          SLA: {formatDuration((log.completedAt || Date.now()) - log.timestamp)}
                        </span>
                        {log.completedAt && (
                          <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            Resolution Time: {new Date(log.completedAt).toLocaleDateString()} {formatTime(log.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {log.status !== 'completed' && (() => {
                        const isOwner = log.type === 'protocol' 
                          ? log.meta?.endorsedBy?.includes(currentUserName)
                          : log.meta?.createdBy === currentUserName;
                        
                        return (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isOwner) {
                                toggleStatus(log.id, log.type, log.status === 'cancelled' ? 'pending' : 'cancelled');
                              }
                            }}
                            disabled={!isOwner}
                            className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all border ${
                              log.status === 'cancelled'
                                ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-500/30' 
                                : isOwner
                                ? 'text-gray-300 hover:text-rose-500 border-gray-100 hover:bg-rose-50'
                                : 'text-gray-200 border-gray-50 cursor-not-allowed opacity-50'
                            }`}
                            title={!isOwner ? "Only owners can cancel" : log.status === 'cancelled' ? "Revert Cancellation" : "Cancel"}
                          >
                            <XCircle size={20} strokeWidth={3} />
                          </button>
                        );
                      })()}

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(log.id, log.type, 'completed');
                        }}
                        className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all border ${
                          log.status === 'completed' 
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-500/30' 
                            : 'text-gray-300 hover:text-emerald-500 border-gray-100 hover:bg-emerald-50'
                        }`}
                        title="Complete"
                      >
                        <CheckCircle2 size={20} strokeWidth={3} />
                      </button>
                    </div>

                  {sessionUser?.role === 'ADMIN' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLogItem(log.id, log.type);
                      }}
                      className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      title="Delete entry"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  <div className="w-px h-8 bg-gray-100" />

                  <div className="flex items-center gap-1.5 text-gray-400 px-1">
                    <MessageSquare size={12} />
                    <span className="text-[10px] font-bold">{log.comments?.length || 0}</span>
                  </div>

                  <button 
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    className={`p-2 rounded-full transition-all ${expandedId === log.id ? 'bg-[#4A773C] text-white shadow-lg shadow-[#4A773C]/20' : 'text-gray-300 hover:bg-gray-50'}`}
                  >
                    <ChevronDown size={20} className={`transform transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === log.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 overflow-hidden"
                  >
                    <div className="p-10 space-y-10 bg-gray-50/50">
                      <div>
                        <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4A773C] mb-6 flex items-center gap-3">
                          <CheckCircle2 size={14} />
                          Entry Details
                        </h5>
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 italic shadow-inner">
                          <p className="text-gray-600 leading-relaxed font-medium text-lg">
                            {log.description || 'No additional notes provided for this record.'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-100">
                        <CommentSection 
                          comments={log.comments || []} 
                          onAddComment={(text) => handleAddComment(log.meta.originalId, log.type, text)} 
                          onDeleteComment={(commentId) => handleDeleteComment(log.meta.originalId, log.type, commentId)}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] pt-6 border-t border-gray-100">
                        <span>Record Token: {log.id}</span>
                        <span>Captured At: {new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )
      ) : (
        <div className="py-32 text-center text-gray-400">
          <History size={80} className="mx-auto mb-6 opacity-20" />
          <p className="font-black text-2xl tracking-tighter italic text-gray-600">History Empty</p>
          <p className="text-sm border-gray-100 border uppercase tracking-[0.2em] mt-3 py-2 px-6 rounded-full inline-block">No activity or protocol data recorded</p>
        </div>
      )}
    </div>
    </div>
  );
}
