/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Trash2, 
  CheckCircle2, 
  Clock,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  ChevronDown,
  ClipboardList,
  MessageSquare,
  User
} from 'lucide-react';
import { Task, Comment } from '../types';
import { storage } from '../services/storage';
import { auth as authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { IT_TEAM } from '../constants';
import CommentSection from './CommentSection';

interface TaskBoardProps {
  tasks: Task[];
  onUpdate: () => void;
  initialSelectedId?: string | null;
}

export default function TaskBoard({ tasks, onUpdate, initialSelectedId }: TaskBoardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialSelectedId) {
      setExpandedId(initialSelectedId);
      // If the task is completed, we might need to switch filter, 
      // but SearchResults navigates to TaskBoard generally for active ones (though it shows all).
      // If a task is completed, it's filtered out of 'all' by default in TaskBoard's logic.
      const task = tasks.find(t => t.id === initialSelectedId);
      if (task && task.status === 'completed') {
        setFilter('completed');
      }

      setTimeout(() => {
        const element = document.getElementById(initialSelectedId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [initialSelectedId, tasks]);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium' as Task['priority'],
    assignedTo: [] as string[] 
  });
  
  const { user: sessionUser } = useAuth();
  const localUser = authService.getUser();
  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const currentUserName = sessionUser?.name || localUser.name;

  const handleAddComment = async (taskId: string, text: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const newComment: Comment = {
          id: Math.random().toString(36).substring(2, 9),
          text,
          author: currentUserName,
          timestamp: Date.now()
        };
        return {
          ...t,
          comments: [...(t.comments || []), newComment]
        };
      }
      return t;
    });
    await storage.saveTasks(updated);
    onUpdate();
  };

  const handleDeleteComment = async (taskId: string, commentId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          comments: (t.comments || []).filter(c => c.id !== commentId)
        };
      }
      return t;
    });
    await storage.saveTasks(updated);
    onUpdate();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || isSubmitting) return;

    if (!newTask.assignedTo || newTask.assignedTo.length === 0) {
      alert("Please assign at least one person to this task before creating it.");
      return;
    }

    setIsSubmitting(true);
    const task: Task = {
      id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      assignedTo: newTask.assignedTo,
      status: 'on-going',
      createdBy: currentUserName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await storage.saveTasks([task, ...tasks]);
      setNewTask({ title: '', description: '', priority: 'medium', assignedTo: [] });
      setIsAdding(false);
      onUpdate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTaskStatus = async (id: string, targetStatus?: Task['status']) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        if (t.status === 'completed') return t; // Locked

        // Check ownership for cancellation
        if (targetStatus === 'cancelled' && t.createdBy !== currentUserName) {
          return t;
        }

        let nextStatus: Task['status'] = 'completed';
        if (targetStatus) nextStatus = targetStatus;
        
        const now = Date.now();
        const updates: Partial<Task> = { 
          status: nextStatus,
          updatedAt: now
        };

        if (nextStatus === 'completed' && !t.completedAt) {
          updates.completedAt = now;
        }

        if (nextStatus === 'pending') {
          // If moving back to pending, we don't necessarily reset startedAt 
          // unless we want to restart the SLA timer. 
          // User said "once completed it will not revert", but didn't say reset SLA on pause.
          // Usually SLA is cumulative or just from first start.
        }
        
        return { ...t, ...updates };
      }
      return t;
    });
    await storage.saveTasks(updated);
    onUpdate();
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const deleteTask = async (id: string) => {
    const filtered = tasks.filter(t => t.id !== id);
    await storage.saveTasks(filtered);
    onUpdate();
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return t.status !== 'completed' && t.status !== 'cancelled';
    if (filter === 'pending') return t.status === 'pending' || t.status === 'on-going';
    return t.status === filter;
  });

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
          title="Add Task"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="hc-card p-8 border-l-4 border-l-[#88C13E] shadow-xl"
            >
              <form onSubmit={handleAddTask} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Task Title</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    placeholder="E.g. Device deployment..."
                    className="w-full text-2xl font-black bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-gray-300 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Description</label>
                  <textarea 
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                    placeholder="Provide full context for the incoming officer..."
                    className="w-full bg-gray-50 rounded-2xl p-5 text-sm text-gray-700 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-[#88C13E] outline-none min-h-[120px] transition-all"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between pt-4 gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest pl-1">Priority</label>
                      <select 
                        value={newTask.priority}
                        onChange={e => setNewTask({...newTask, priority: e.target.value as Task['priority']})}
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none text-gray-600 focus:bg-white focus:ring-2 focus:ring-[#88C13E]"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest pl-1">Assign To</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {IT_TEAM.map(name => {
                          const isSelected = newTask.assignedTo.includes(name);
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                const next = isSelected 
                                  ? newTask.assignedTo.filter(n => n !== name)
                                  : [...newTask.assignedTo, name];
                                setNewTask({ ...newTask, assignedTo: next });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                                isSelected 
                                  ? 'bg-[#88C13E] text-white border-[#88C13E] shadow-sm' 
                                  : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                              }`}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Discard
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting || newTask.assignedTo.length === 0}
                      className="bg-[#4A773C] text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-[#4A773C]/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Clock size={16}/></motion.div>}
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

            {filteredTasks.length > 0 ? (
            filteredTasks.map((task, idx) => {
              const isAssignedToMe = task.assignedTo && (
                Array.isArray(task.assignedTo) 
                  ? task.assignedTo.includes(currentUserName) 
                  : task.assignedTo === currentUserName
              );

              return (
                <motion.div
                  layout
                  key={`${task.id}-${idx}`}
                  id={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group hc-card p-6 transition-all flex items-start gap-6 hover:shadow-md ${
                    isAssignedToMe 
                      ? 'bg-[#4A773C]/5 border-[#4A773C]/30 shadow-sm ring-1 ring-[#4A773C]/10' 
                      : 'hover:border-[#88C13E]/30'
                  } ${
                    task.status === 'completed' ? 'opacity-50' : ''
                  }`}
                >
                
                <div className="flex-1 min-w-0">
                  <div 
                    className="flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  >
                    <h4 className={`font-bold text-xl leading-tight transition-all truncate tracking-tight text-gray-900 ${
                      task.status === 'completed' ? 'line-through text-gray-400' : ''
                    }`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                        task.status === 'completed' ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' :
                        task.status === 'on-going' ? 'bg-[#F2F7FF] text-[#4A773C] border-[#DCE8F9]' :
                        task.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {task.status === 'on-going' ? 'Ongoing' : task.status}
                      </span>
                      <span className={`shrink-0 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] border ${
                        task.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                        task.priority === 'medium' ? 'bg-[#4A773C]/10 text-[#4A773C] border-[#4A773C]/20' : 
                        'bg-[#88C13E]/10 text-[#88C13E] border-[#88C13E]/20'
                      }`}>
                        {task.priority}
                      </span>
                      {isAssignedToMe && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#4A773C] text-white rounded-lg shadow-sm">
                          <User size={10} className="fill-current" />
                          <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Assigned to You</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p 
                    className="text-sm text-gray-500 mt-2 leading-relaxed italic line-clamp-2 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  >
                    "{task.description}"
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-6 pt-5 border-t border-gray-50">
                    <div className="flex flex-col gap-1">
                      <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Created By</p>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#4A773C]/10 border border-[#4A773C]/20 flex items-center justify-center text-[10px] font-black text-[#4A773C]">
                          {authService.getInitials(task.createdBy)}
                        </div>
                        <span className="text-[10px] text-gray-900 font-black uppercase tracking-widest">{task.createdBy}</span>
                      </div>
                    </div>

                    {task.assignedTo && (Array.isArray(task.assignedTo) ? task.assignedTo.length > 0 : task.assignedTo) && (
                      <div className="flex flex-col gap-1">
                        <p className="text-[8px] font-black uppercase text-[#88C13E] tracking-widest leading-none mb-1">Assigned To</p>
                        <div className="flex flex-wrap items-center gap-3">
                          {(Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo]).map((assigned, idx) => (
                            <div key={`${assigned}-${idx}`} className="flex items-center gap-2 bg-[#88C13E]/5 px-2 py-1 rounded-lg border border-[#88C13E]/10">
                              <div className="w-5 h-5 rounded-full bg-[#88C13E]/10 flex items-center justify-center text-[8px] font-black text-[#88C13E]">
                                {authService.getInitials(assigned)}
                              </div>
                              <span className="text-[10px] text-gray-900 font-black uppercase tracking-widest">{assigned}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-1">
                       <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Created</p>
                       <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                         {new Date(task.createdAt).toLocaleDateString()} {formatTime(task.createdAt)}
                       </span>
                    </div>

                    <div className="flex flex-col gap-1">
                       <p className="text-[8px] font-black uppercase text-blue-600 tracking-widest leading-none mb-1">SLA</p>
                       <span className="text-[10px] text-blue-700 font-black uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                         {formatDuration((task.completedAt || Date.now()) - task.createdAt)}
                       </span>
                    </div>

                    {task.status === 'completed' && task.completedAt && (
                      <div className="flex flex-col gap-1">
                        <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest leading-none mb-1">Resolution Time</p>
                        <span className="text-[10px] text-emerald-700 font-black uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {new Date(task.completedAt).toLocaleDateString()} {formatTime(task.completedAt)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 ml-auto">
                      <div className="flex items-center gap-3">
                        {(!task.status || task.status !== 'completed') && (
                          <button 
                            onClick={() => {
                              if (task.createdBy === currentUserName) {
                                toggleTaskStatus(task.id, task.status === 'cancelled' ? 'pending' : 'cancelled');
                              }
                            }}
                            disabled={task.createdBy !== currentUserName}
                            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all border ${
                              task.status === 'cancelled'
                                ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-500/30'
                                : task.createdBy === currentUserName
                                ? 'text-gray-300 hover:text-rose-500 border-gray-100 hover:bg-rose-50'
                                : 'text-gray-200 border-gray-50 cursor-not-allowed opacity-50'
                            }`}
                            title={
                              task.createdBy !== currentUserName 
                                ? "Only the task owner can cancel this task" 
                                : task.status === 'cancelled' ? "Revert Cancellation" : "Cancel Task"
                            }
                          >
                            <XCircle size={20} strokeWidth={3} />
                          </button>
                        )}

                        <button 
                          onClick={() => toggleTaskStatus(task.id, 'completed')}
                          className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all border ${
                            task.status === 'completed' 
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-500/30' 
                              : 'text-gray-300 hover:text-emerald-500 border-gray-100 hover:bg-emerald-50'
                          }`}
                          title="Set as Complete"
                        >
                          <CheckCircle2 size={20} strokeWidth={3} />
                        </button>
                      </div>

                      <div className="w-px h-8 bg-gray-100" />

                      <div className="flex items-center gap-1.5 text-gray-400 px-1">
                        <MessageSquare size={12} />
                        <span className="text-[10px] font-bold">{task.comments?.length || 0}</span>
                      </div>
                      <button 
                        onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                        className={`p-2 rounded-full transition-all ${expandedId === task.id ? 'bg-[#4A773C] text-white shadow-lg shadow-[#4A773C]/20' : 'text-gray-300 hover:bg-gray-50'}`}
                      >
                        <ChevronDown size={20} className={`transform transition-transform ${expandedId === task.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === task.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-8 pt-8 border-t border-gray-100 space-y-8">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Detailed Requirements</p>
                            <div className="bg-gray-50 p-6 rounded-2xl italic text-gray-600 text-sm leading-relaxed border border-gray-100">
                              "{task.description}"
                            </div>
                          </div>
                          
                          <CommentSection 
                            comments={task.comments || []} 
                            onAddComment={(text) => handleAddComment(task.id, text)}
                            onDeleteComment={(commentId) => handleDeleteComment(task.id, commentId)}
                            title="Task Updates"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {sessionUser?.role === 'ADMIN' && (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
          ) : (
            <div className="py-32 text-center text-gray-400">
              <ClipboardList size={80} className="mx-auto mb-6 opacity-20" />
              <p className="font-black text-2xl tracking-tighter italic text-gray-600">Terminal Clear</p>
              <p className="text-sm uppercase tracking-[0.2em] mt-2">Zero open requirements on current matrix</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
