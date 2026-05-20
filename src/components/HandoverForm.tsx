/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  CheckCircle2, 
  AlertCircle,
  Activity,
  User,
  Clock,
  Send
} from 'lucide-react';
import { Task, Handover } from '../types';
import { storage } from '../services/storage';
import { auth as authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { IT_TEAM } from '../constants';

interface HandoverFormProps {
  tasks: Task[];
  onComplete: () => void;
}

const MultiSelect = ({ 
  label, 
  options, 
  selected, 
  onChange, 
  icon: Icon 
}: { 
  label: string; 
  options: string[]; 
  selected: string[]; 
  onChange: (val: string[]) => void;
  icon: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="space-y-3 relative">
      <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.1em]">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full pl-14 pr-12 py-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#88C13E] font-bold transition-all text-gray-700 text-left flex items-center justify-between"
        >
          <Icon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
          <span className="truncate">
            {selected.length > 0 ? selected.join(', ') : `Select IT Staff...`}
          </span>
          <ChevronDown size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)} 
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 py-3 max-h-64 overflow-y-auto custom-scrollbar"
              >
                {options.map((opt, idx) => (
                  <button
                    key={`${opt}-${idx}`}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                  >
                    <span className={`text-sm font-medium ${selected.includes(opt) ? 'text-[#4A773C] font-bold' : 'text-gray-600'}`}>
                      {opt}
                    </span>
                    {selected.includes(opt) && <CheckCircle2 size={16} className="text-[#88C13E]" />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function HandoverForm({ tasks, onComplete }: HandoverFormProps) {
  const { user: sessionUser } = useAuth();
  const localUser = authService.getUser();
  const currentUserName = sessionUser?.name || localUser.name;
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fromShift: 'Day',
    toShift: 'Night',
    endorsedBy: [currentUserName] as string[],
    endorsedTo: [] as string[],
    title: '',
    description: '',
    urgency: 'medium' as 'low' | 'medium' | 'high'
  });

  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  const handleSubmit = async () => {
    if ((formData.endorsedBy || []).length === 0 || (formData.endorsedTo || []).length === 0) {
      alert('Please select personnel for both Endorsed By and Endorsed To.');
      return;
    }

    const newHandover: Handover = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      taskIds: pendingTasks.map(t => t.id),
      fromShift: formData.fromShift,
      toShift: formData.toShift,
      endorsedBy: formData.endorsedBy,
      endorsedTo: formData.endorsedTo,
      title: formData.title || 'Untitled Endorsement',
      description: formData.description || 'No description provided',
      urgency: formData.urgency,
      status: 'on-going'
    };

    await storage.saveHandover(newHandover);
    onComplete();
  };

  const steps = [
    { id: 1, title: 'Identity', icon: User },
    { id: 2, title: 'Urgency', icon: CheckCircle2 },
    { id: 3, title: 'Confirm', icon: Send },
  ];

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-16 relative px-8">
        <div className="absolute left-16 right-16 top-1/2 -translate-y-1/2 h-px bg-gray-100 -z-0" />
        {steps.map((s, idx) => (
          <div key={`${s.id}-${idx}`} className="relative z-10 flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${
              step >= s.id 
                ? 'bg-[#4A773C] text-white shadow-[#4A773C]/20' 
                : 'bg-white border border-gray-100 text-gray-400'
            }`}>
              {step > s.id ? <CheckCircle2 size={24} /> : <s.icon size={24} />}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] pointer-events-none transition-colors duration-500 ${
              step >= s.id ? 'text-[#4A773C]' : 'text-gray-400'
            }`}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      <div className="hc-card rounded-[2.5rem] shadow-xl ring-1 ring-black/5">
        <div className="p-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-10"
              >
                <div className="space-y-3">
                  <h3 className="text-3xl font-black tracking-tight italic text-gray-900">Shift Schedule</h3>
                  <p className="text-gray-500 font-medium">Indicate the shift schedule associated with this endorsement.</p>
                </div>

                <div className="grid grid-cols-2 gap-8 text-gray-900">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.1em]">Origin Shift</label>
                    <select 
                      value={formData.fromShift}
                      onChange={e => setFormData({...formData, fromShift: e.target.value})}
                      className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#88C13E] font-bold transition-all text-gray-700"
                    >
                      <option>Day</option>
                      <option>Night</option>
                      <option>Graveyard</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.1em]">Destination Shift</label>
                    <select 
                      value={formData.toShift}
                      onChange={e => setFormData({...formData, toShift: e.target.value})}
                      className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#88C13E] font-bold transition-all text-gray-700"
                    >
                      <option>Day</option>
                      <option>Night</option>
                      <option>Graveyard</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3 relative opacity-60 cursor-not-allowed">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.1em]">Endorsed By</label>
                    <div className="w-full pl-14 pr-12 py-5 bg-gray-100 border border-gray-200 rounded-2xl font-bold text-gray-500 flex items-center gap-3">
                      <User className="text-gray-400" size={24} />
                      {currentUserName}
                    </div>
                    <p className="text-[8px] font-black uppercase text-[#4A773C] tracking-widest mt-2 px-1">Automatic Identifier Detected</p>
                  </div>
                  <MultiSelect 
                    label="Endorse To"
                    options={IT_TEAM.filter(name => name !== currentUserName)}
                    selected={formData.endorsedTo}
                    onChange={(val) => setFormData({...formData, endorsedTo: val})}
                    icon={Send}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-10"
              >
                <div className="space-y-3">
                  <h3 className="text-3xl font-black tracking-tight italic text-gray-900">Endorsement Urgency</h3>
                  <p className="text-gray-500 font-medium">Define the criticality level of this endorsement package.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {(['low', 'medium', 'high'] as const).map((level, idx) => (
                    <button
                      key={`${level}-${idx}`}
                      onClick={() => setFormData({ ...formData, urgency: level })}
                      className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 transition-all group ${
                        formData.urgency === level 
                          ? level === 'high' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                            level === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                            'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`p-4 rounded-2xl transition-all ${
                        formData.urgency === level 
                          ? level === 'high' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' :
                            level === 'medium' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                            'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <AlertCircle size={32} />
                      </div>
                      <span className="font-black uppercase tracking-[0.2em] text-xs">{level}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-10"
              >
                <div className="space-y-3">
                  <h3 className="text-3xl font-black tracking-tight italic text-gray-900">Protocol Endorsement</h3>
                  <p className="text-gray-500 font-medium">Encrypt final instructions into the handover memo.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Endorsement Title</label>
                    <input 
                      type="text"
                      autoFocus
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Device Deployment"
                      className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#88C13E] font-bold text-gray-800 transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Provide shift endorsement notes and pending actions for next support team...."
                      className="w-full p-8 bg-gray-50 border border-gray-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-[#88C13E] font-bold min-h-[160px] text-lg text-gray-800 transition-all shadow-inner placeholder:text-gray-300"
                    />
                  </div>
                </div>

                <div className="bg-[#4A773C]/5 border border-[#4A773C]/10 p-6 rounded-3xl flex gap-5 items-start">
                  <div className="p-3 bg-[#4A773C]/10 rounded-xl text-[#4A773C]">
                    <AlertCircle size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-500 leading-relaxed pt-1">
                    By finalizing, you confirm the matrix state is accurate. This protocol will be timestamped and logged permanently for incoming personnel.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-12 py-10 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            disabled={step === 1}
            onClick={() => setStep(s => s - 1)}
            className={`flex items-center gap-3 font-black uppercase tracking-[0.2em] text-[10px] transition-all ${
              step === 1 ? 'opacity-0' : 'text-gray-400 hover:text-[#4A773C]'
            }`}
          >
            <ChevronLeft size={20} />
            Reverse Step
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-12 py-4 bg-[#4A773C] text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-[#88C13E] transition-all shadow-xl shadow-[#4A773C]/20"
            >
              Advance Step
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-12 py-4 bg-[#4A773C] text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-[#88C13E] transition-all shadow-xl shadow-[#4A773C]/20 group"
            >
              FINALIZE ENDORSEMENT
              <ArrowRightLeft size={20} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
