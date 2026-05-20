/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  ClipboardList, 
  ArrowRightLeft, 
  User, 
  CircleDot
} from 'lucide-react';
import { Notification, View } from '../types';

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (view: View) => void;
  onClose: () => void;
  currentUserId?: string;
  currentUserName?: string;
}

export default function NotificationDropdown({ 
  notifications, 
  onMarkRead, 
  onMarkAllRead, 
  onNavigate,
  onClose,
  currentUserId,
  currentUserName
}: NotificationDropdownProps) {
  const [activeTab, setActiveTab] = React.useState<'all' | 'assigned'>('all');
  
  const unreadCount = notifications.filter(n => !(n.readBy || []).includes(currentUserId || '')).length;
  const assignedNotifications = notifications.filter(n => currentUserName && (n.assignedToUserIds || []).includes(currentUserName));
  const unreadAssignedCount = assignedNotifications.filter(n => !(n.readBy || []).includes(currentUserId || '')).length;

  const displayNotifications = activeTab === 'all' ? notifications : assignedNotifications;

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-[2rem] shadow-2xl z-[100] overflow-hidden flex flex-col max-h-[500px]">
      <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black italic tracking-tight text-gray-900">Notifications</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#4A773C]">
            {activeTab === 'all' ? unreadCount : unreadAssignedCount} New Alerts
          </p>
        </div>
        {unreadCount > 0 && activeTab === 'all' && (
          <button 
            onClick={onMarkAllRead}
            className="text-[9px] font-black uppercase tracking-widest text-[#88C13E] hover:text-[#4A773C] transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="px-5 py-2 border-b border-gray-50 flex gap-4">
        <button 
          onClick={() => setActiveTab('all')}
          className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all relative ${
            activeTab === 'all' ? 'text-[#4A773C]' : 'text-gray-400'
          }`}
        >
          All
          {activeTab === 'all' && <motion.div layoutId="notif-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A773C]" />}
        </button>
        <button 
          onClick={() => setActiveTab('assigned')}
          className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all relative flex items-center gap-2 ${
            activeTab === 'assigned' ? 'text-[#4A773C]' : 'text-gray-400'
          }`}
        >
          Assigned To Me
          {assignedNotifications.length > 0 && (
            <span className={`px-1 rounded-sm text-[8px] ${unreadAssignedCount > 0 ? 'bg-[#88C13E] text-white' : 'bg-gray-200 text-gray-500'}`}>
              {assignedNotifications.length}
            </span>
          )}
          {activeTab === 'assigned' && <motion.div layoutId="notif-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A773C]" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {displayNotifications.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {displayNotifications.map((n, idx) => {
              const isUnread = !(n.readBy || []).includes(currentUserId || '');
              const isAssignedToMe = currentUserName && (n.assignedToUserIds || []).includes(currentUserName);
              
              return (
                <button
                  key={`${n.id}-${idx}`}
                  onClick={() => {
                    onMarkRead(n.id);
                    onNavigate(n.linkView);
                    onClose();
                  }}
                  className={`w-full p-4 flex gap-4 text-left transition-all hover:bg-gray-50 group relative ${
                    isUnread ? 'bg-white' : 'opacity-60 bg-gray-50/20'
                  } ${isAssignedToMe && isUnread ? 'border-l-4 border-l-[#4A773C]' : ''}`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      n.type === 'task' ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white' : 'bg-[#D1FAE5] text-[#065F46] group-hover:bg-[#059669] group-hover:text-white'
                    } ${isAssignedToMe && isUnread ? 'ring-2 ring-[#4A773C]/20' : ''}`}>
                    {n.type === 'task' ? <ClipboardList size={18} /> : <ArrowRightLeft size={18} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${n.type === 'task' ? 'text-blue-500' : 'text-[#059669]'}`}>
                          {n.type}
                        </span>
                        {isAssignedToMe && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#4A773C] bg-[#4A773C]/5 px-1.5 py-0.5 rounded-md border border-[#4A773C]/10 flex items-center gap-1">
                            <CircleDot size={8} />
                            Your Task
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-medium text-gray-400 flex items-center gap-1 shrink-0">
                        <Clock size={10} />
                        {formatTime(n.timestamp)}
                      </span>
                    </div>
                    
                    <h4 className={`text-xs font-bold leading-tight ${isAssignedToMe && isUnread ? 'text-[#4A773C]' : 'text-gray-900'} truncate mb-0.5`}>
                      {n.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center gap-3">
             <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
               {activeTab === 'assigned' ? <User size={24} /> : <Bell size={24} />}
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
               {activeTab === 'assigned' ? 'No tasks assigned to you' : 'All caught up'}
             </p>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50/50 border-t border-gray-50 text-center">
        <button 
          onClick={onClose}
          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
        >
          Close Panel
        </button>
      </div>
    </div>
  );
}
