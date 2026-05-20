/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Bug, 
  Lightbulb, 
  Plus,
  Loader2,
  Trash2
} from 'lucide-react';
import { Feedback } from '../types';
import { storage } from '../services/storage';

interface FeedbackTabProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export function FeedbackTab({ currentUser }: FeedbackTabProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newFeedback, setNewFeedback] = useState({
    title: '',
    message: '',
    type: 'bug' as Feedback['type']
  });

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    const data = await storage.getFeedback();
    setFeedbacks(data.sort((a, b) => b.timestamp - a.timestamp));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedback.title.trim() || !newFeedback.message.trim()) return;

    setIsSubmitting(true);
    const feedback: Omit<Feedback, 'id' | 'timestamp' | 'status'> = {
      userId: currentUser.id,
      userName: currentUser.name,
      title: newFeedback.title,
      message: newFeedback.message,
      type: newFeedback.type
    };

    await storage.sendFeedback(feedback);
    await fetchFeedbacks();
    setIsSubmitting(false);
    setIsAdding(false);
    setNewFeedback({ title: '', message: '', type: 'bug' });
  };

  const updateStatus = async (id: string, status: Feedback['status']) => {
    await storage.updateFeedbackStatus(id, status);
    fetchFeedbacks();
  };

  const deleteFeedback = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      await storage.deleteFeedback(id);
      fetchFeedbacks();
    }
  };

  const getStatusIcon = (status: Feedback['status']) => {
    switch (status) {
      case 'resolved': return <CheckCircle2 className="text-green-500" size={18} />;
      case 'investigating': return <Clock className="text-amber-500" size={18} />;
      default: return <AlertCircle className="text-blue-500" size={18} />;
    }
  };

  const getTypeIcon = (type: Feedback['type']) => {
    switch (type) {
      case 'bug': return <Bug className="text-rose-500" size={16} />;
      case 'suggestion': return <Lightbulb className="text-amber-500" size={16} />;
      default: return <MessageSquare className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight text-gray-900 leading-none mb-2">
            FEEDBACK <span className="text-[#4A773C]">HUB</span>
          </h1>
          <p className="text-gray-500 font-medium">Report bugs or suggest improvements to help us improve the matrix.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="hc-button-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Submit Feedback
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="hc-card p-6 border-2 border-[#4A773C]/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Issue Title</label>
                  <input
                    type="text"
                    required
                    value={newFeedback.title}
                    onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
                    placeholder="Brief summary of the issue"
                    className="hc-input text-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Type</label>
                  <div className="flex gap-2">
                    {(['bug', 'suggestion', 'issue'] as const).map((type, idx) => (
                      <button
                        key={`${type}-${idx}`}
                        type="button"
                        onClick={() => setNewFeedback({ ...newFeedback, type })}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 ${
                          newFeedback.type === type 
                            ? 'bg-[#4A773C] border-[#4A773C] text-white' 
                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        {getTypeIcon(type)}
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Description</label>
                <textarea
                  required
                  rows={4}
                  value={newFeedback.message}
                  onChange={(e) => setNewFeedback({ ...newFeedback, message: e.target.value })}
                  placeholder="Tell us what happened or what could be better..."
                  className="hc-input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 font-black uppercase tracking-widest text-xs text-gray-500 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="hc-button-primary min-w-[140px] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Submit
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-[#4A773C]" size={40} />
          </div>
        ) : feedbacks.length > 0 ? (
          feedbacks.map((f, idx) => (
            <motion.div
              layout
              key={`${f.id}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="hc-card p-6 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 p-2.5 rounded-xl ${
                    f.type === 'bug' ? 'bg-rose-50' : f.type === 'suggestion' ? 'bg-amber-50' : 'bg-blue-50'
                  }`}>
                    {getTypeIcon(f.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-gray-900">{f.title}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                        f.status === 'resolved' ? 'bg-green-50 text-green-600' : 
                        f.status === 'investigating' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {getStatusIcon(f.status)}
                        {f.status}
                      </span>
                    </div>
                    <p className="text-gray-600 whitespace-pre-wrap mb-4">{f.message}</p>
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4A773C]" />
                        Reported by {f.userName}
                      </span>
                      <span>{new Date(f.timestamp).toLocaleDateString()} at {new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {currentUser.role === 'ADMIN' && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      value={f.status}
                      onChange={(e) => updateStatus(f.id, e.target.value as Feedback['status'])}
                      className="text-xs font-black uppercase tracking-widest bg-gray-50 border-none rounded-lg px-3 py-2 cursor-pointer outline-none hover:bg-gray-100"
                    >
                      <option value="new">New</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <button
                      onClick={() => deleteFeedback(f.id)}
                      className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete Feedback"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center hc-card border-dashed">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-200" />
            <h3 className="text-lg font-bold text-gray-400">No feedback yet</h3>
            <p className="text-gray-400 max-w-xs mx-auto">Help us improve the Endorsement Matrix by sharing your thoughts or reporting issues.</p>
          </div>
        )}
      </div>
    </div>
  );
}
