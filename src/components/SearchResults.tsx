/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Search, X, Clock, ClipboardList, ArrowRightLeft, User, ChevronRight } from 'lucide-react';
import { Task, Handover, View } from '../types';

interface SearchResultsProps {
  query: string;
  tasks: Task[];
  handovers: Handover[];
  onClose: () => void;
  onSelectItem: (view: View, id: string) => void;
}

export default function SearchResults({ query, tasks, handovers, onClose, onSelectItem }: SearchResultsProps) {
  if (!query.trim()) return null;

  const normalizedQuery = query.toLowerCase();

  const taskResults = tasks.filter(t => 
    t.title.toLowerCase().includes(normalizedQuery) || 
    t.description.toLowerCase().includes(normalizedQuery) ||
    t.createdBy.toLowerCase().includes(normalizedQuery) ||
    t.assignedTo?.some(a => a.toLowerCase().includes(normalizedQuery))
  );

  const handoverResults = handovers.filter(h => 
    h.title?.toLowerCase().includes(normalizedQuery) || 
    h.description?.toLowerCase().includes(normalizedQuery) ||
    h.endorsedBy?.some(e => e.toLowerCase().includes(normalizedQuery)) ||
    h.endorsedTo?.some(e => e.toLowerCase().includes(normalizedQuery))
  );

  const hasResults = taskResults.length > 0 || handoverResults.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[2rem] shadow-2xl border border-gray-100 z-[100] max-h-[80vh] flex flex-col overflow-hidden"
    >
      <div className="p-6 border-b border-gray-50 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4A773C]">Search Engine</p>
          <h4 className="text-sm font-black italic text-gray-900">Found {taskResults.length + handoverResults.length} matches</h4>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
        {!hasResults ? (
          <div className="py-12 text-center text-gray-400">
            <Search size={40} className="mx-auto mb-4 opacity-20" />
            <p className="text-xs font-black uppercase tracking-widest leading-loose">No matches found for<br/>"{query}"</p>
          </div>
        ) : (
          <>
            {taskResults.length > 0 && (
              <section>
                <h5 className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                  <ClipboardList size={14} />
                  Standalone Tasks
                </h5>
                <div className="space-y-2">
                  {taskResults.map(task => (
                    <button
                      key={`task-${task.id}`}
                      onClick={() => onSelectItem('tasks', task.id)}
                      className="w-full p-4 rounded-2xl hover:bg-gray-50 flex items-center justify-between group transition-all text-left border border-transparent hover:border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          task.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' : 
                          task.status === 'cancelled' ? 'bg-rose-50 text-rose-500' :
                          'bg-blue-50 text-blue-500'
                        }`}>
                          <ClipboardList size={20} />
                        </div>
                        <div>
                          <h6 className="text-sm font-bold text-gray-900 line-clamp-1">{task.title}</h6>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                              {task.status === 'completed' ? 'Completed' : task.status === 'on-going' ? 'Ongoing' : task.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                            <span className="text-[9px] font-bold text-gray-400">
                              {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-[#4A773C] group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {handoverResults.length > 0 && (
              <section>
                <h5 className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#4A773C] flex items-center gap-2">
                  <ArrowRightLeft size={14} />
                  Endorsement Records
                </h5>
                <div className="space-y-2">
                  {handoverResults.map(h => (
                    <button
                      key={`handover-${h.id}`}
                      onClick={() => onSelectItem('logs', `protocol-${h.id}`)}
                      className="w-full p-4 rounded-2xl hover:bg-gray-50 flex items-center justify-between group transition-all text-left border border-transparent hover:border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          h.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46]' : 
                          h.status === 'cancelled' ? 'bg-rose-50 text-rose-500' :
                          'bg-blue-50 text-blue-500'
                        }`}>
                          <ArrowRightLeft size={20} />
                        </div>
                        <div>
                          <h6 className="text-sm font-bold text-gray-900 line-clamp-1">{h.title || 'Untitled Endorsement'}</h6>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#4A773C]">
                              Endorsement
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                            <span className="text-[9px] font-bold text-gray-400">
                              {new Date(h.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-[#4A773C] group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">
        Full Matrix Search Powered by HelloConnect
      </div>
    </motion.div>
  );
}
