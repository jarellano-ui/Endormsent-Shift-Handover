/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  ChevronDown,
  ArrowRightLeft,
  Clock,
  Pause,
  Play,
  XCircle,
  ChevronUp,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { Handover, Task, Comment } from '../types';
import { storage } from '../services/storage';
import { motion, AnimatePresence } from 'motion/react';
import HandoverForm from './HandoverForm';
import CommentSection from './CommentSection';
import { useAuth } from '../contexts/AuthContext';
import { auth as authService } from '../services/auth';

interface EndorsementBoardProps {
  handovers: Handover[];
  tasks: Task[];
  onUpdate: () => void;
}

export default function EndorsementBoard({ handovers, tasks, onUpdate }: EndorsementBoardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { user: sessionUser } = useAuth();
  const localUser = authService.getUser();
  const currentUserName = sessionUser?.name || localUser.name;

  const handleAddComment = async (handoverId: string, text: string) => {
    const updated = handovers.map(h => {
      if (h.id === handoverId) {
        const newComment: Comment = {
          id: Math.random().toString(36).substring(2, 9),
          text,
          author: currentUserName,
          timestamp: Date.now()
        };
        return {
          ...h,
          comments: [...(h.comments || []), newComment]
        };
      }
      return h;
    });
    await storage.updateHandovers(updated);
    onUpdate();
  };

  const handleDeleteComment = async (handoverId: string, commentId: string) => {
    const updated = handovers.map(h => {
      if (h.id === handoverId) {
        return {
          ...h,
          comments: (h.comments || []).filter(c => c.id !== commentId)
        };
      }
      return h;
    });
    await storage.updateHandovers(updated);
    onUpdate();
  };

  const toggleHandoverStatus = async (id: string, targetStatus?: Handover['status']) => {
    const updated = handovers.map(h => {
      if (h.id === id) {
        if (h.status === 'completed' && !targetStatus) return h; 

        // Check ownership for cancellation
        if (targetStatus === 'cancelled' && !h.endorsedBy.includes(currentUserName)) {
          return h;
        }

        let nextStatus: Handover['status'] = 'completed';
        if (targetStatus) nextStatus = targetStatus;

        const now = Date.now();
        const updates: Partial<Handover> = { 
          status: nextStatus
        };

        if (nextStatus === 'completed' && !h.completedAt) {
          updates.completedAt = now;
        }

        return { ...h, ...updates };
      }
      return h;
    });
    await storage.updateHandovers(updated);
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

  const sortedHandovers = [...handovers].sort((a, b) => b.timestamp - a.timestamp);
  
  const deleteHandover = async (id: string) => {
    const filtered = handovers.filter(h => h.id !== id);
    await storage.updateHandovers(filtered);
    onUpdate();
  };

  const filteredHandovers = sortedHandovers.filter(h => {
    if (filter === 'all') return h.status !== 'completed' && h.status !== 'cancelled';
    if (filter === 'pending') return h.status === 'pending' || h.status === 'on-going';
    return h.status === filter;
  });

  if (isAdding) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsAdding(false)}
            className="text-[10px] font-black uppercase tracking-widest text-[#4A773C] hover:text-[#88C13E] transition-colors flex items-center gap-2"
          >
            <ChevronDown className="rotate-90" size={16} />
            Back to Monitoring
          </button>
        </div>
        <HandoverForm tasks={tasks} onComplete={() => {
          setIsAdding(false);
          onUpdate();
        }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl self-start overflow-x-auto">
          {(['all', 'pending', 'completed', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === f ? 'bg-white text-[#4A773C] shadow-sm' : 'hover:bg-gray-200 text-gray-500'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#4A773C] text-white p-4 rounded-xl hover:bg-[#88C13E] transition-all shadow-lg shadow-[#4A773C]/20 flex items-center justify-center shrink-0"
          title="Add Endorsement"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredHandovers.length > 0 ? (
            filteredHandovers.map((log, idx) => (
              <motion.div 
                layout
                key={`${log.id}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`hc-card overflow-hidden transition-all hover:bg-white hover:shadow-md group border-l-4 border-l-[#88C13E]`}
              >
                <div 
                  className="w-full p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left"
                >
                  <div 
                    className="flex items-center gap-5 cursor-pointer flex-1"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <div className={`w-14 h-14 bg-gray-50 group-hover:bg-opacity-10 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 transition-all group-hover:bg-[#4A773C] group-hover:text-[#4A773C] group-hover:border-[#4A773C]/30`}>
                      <Clock size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`font-black text-[10px] uppercase tracking-widest py-1.5 px-3 border rounded-lg text-[#4A773C] bg-[#4A773C]/10 border-[#4A773C]/20`}>
                          {log.fromShift} → {log.toShift}
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
                            ? 'bg-[#F2F7FF] text-blue-600 border-[#DCE8F9]'
                            : log.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {log.status === 'on-going' ? 'Ongoing' : log.status}
                        </span>
                      </div>
                      <div className="mt-2 text-left">
                        <h4 className="font-black text-gray-900 leading-tight">
                          {log.title}
                        </h4>
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Endorsed By: {(log.endorsedBy || []).join(', ')}</p>
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Endorsed To: {(log.endorsedTo || []).join(', ')}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                              Created: {new Date(log.timestamp).toLocaleDateString()} {formatTime(log.timestamp)}
                            </span>
                            {log.startedAt && (
                              <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                SLA: {formatDuration((log.completedAt || Date.now()) - log.startedAt)}
                              </span>
                            )}
                            {log.completedAt && (
                              <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                Resolution Time: {new Date(log.completedAt).toLocaleDateString()} {formatTime(log.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                    <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {log.status !== 'completed' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if ((log.endorsedBy || []).includes(currentUserName)) {
                              toggleHandoverStatus(log.id, log.status === 'cancelled' ? 'pending' : 'cancelled');
                            }
                          }}
                          disabled={!(log.endorsedBy || []).includes(currentUserName)}
                          className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all border ${
                            log.status === 'cancelled'
                              ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-500/30' 
                              : (log.endorsedBy || []).includes(currentUserName)
                              ? 'text-gray-300 hover:text-rose-500 border-gray-100 hover:bg-rose-50'
                              : 'text-gray-200 border-gray-50 cursor-not-allowed opacity-50'
                          }`}
                          title={
                            !(log.endorsedBy || []).includes(currentUserName)
                              ? "Only the endorsement owners can cancel this"
                              : log.status === 'cancelled' ? "Revert Cancellation" : "Cancel Endorsement"
                          }
                        >
                          <XCircle size={20} strokeWidth={3} />
                        </button>
                      )}

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHandoverStatus(log.id, 'completed');
                        }}
                        className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all border ${
                          log.status === 'completed' 
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-500/30' 
                            : 'text-gray-300 hover:text-emerald-500 border-gray-100 hover:bg-emerald-50'
                        }`}
                        title="Set as Complete"
                      >
                        <CheckCircle2 size={20} strokeWidth={3} />
                      </button>
                    </div>

                    {sessionUser?.role === 'ADMIN' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHandover(log.id);
                        }}
                        className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Endorsement"
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
                            onAddComment={(text) => handleAddComment(log.id, text)} 
                            onDeleteComment={(commentId) => handleDeleteComment(log.id, commentId)}
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
              </motion.div>
            ))
          ) : (
            <div className="py-32 text-center text-gray-400">
              <ArrowRightLeft size={80} className="mx-auto mb-6 opacity-20" />
              <p className="font-black text-2xl tracking-tighter italic text-gray-600">No Endorsements</p>
              <p className="text-sm uppercase tracking-[0.2em] mt-2">Zero active protocols on current matrix</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
