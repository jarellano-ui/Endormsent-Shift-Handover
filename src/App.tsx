/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  ArrowRightLeft, 
  History, 
  Plus, 
  Search,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Calendar,
  Users,
  Shield,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { View, Task, Handover, Notification } from './types';
import { storage } from './services/storage';

// Components
import Dashboard from './components/Dashboard';
import TaskBoard from './components/TaskBoard';
import EndorsementBoard from './components/EndorsementBoard';
import HandoverLogs from './components/HandoverLogs';
import ITSchedule from './components/ITSchedule';
import LoginPage from './components/LoginPage';
import UserManagement from './components/UserManagement';
import NotificationDropdown from './components/NotificationDropdown';
import SearchResults from './components/SearchResults';
import { FeedbackTab } from './components/FeedbackTab';

import { auth as authService, UserProfile } from './services/auth';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user: sessionUser, loading, logout, refreshUser } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserProfile>({ name: '', role: '', email: '', position: '' });
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fallback profile from local storage if needed
  const [localStorageUser, setLocalStorageUser] = useState<UserProfile>(authService.getUser());

  const user: UserProfile = {
    name: sessionUser?.name || localStorageUser.name || '',
    email: sessionUser?.email || localStorageUser.email || '',
    role: sessionUser?.role || localStorageUser.role || 'USER',
    position: sessionUser?.position || localStorageUser.position || (sessionUser?.role === 'ADMIN' ? 'IT Administrator' : 'IT Personnel')
  };

  useEffect(() => {
    if (sessionUser) {
      // Sync local storage with current login
      const syncedUser = {
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role || 'HCIT OFFICER',
        position: sessionUser.position || (sessionUser.role === 'ADMIN' ? 'IT Administrator' : 'IT Personnel')
      };
      authService.setUser(syncedUser);
      setLocalStorageUser(syncedUser);
    }
  }, [sessionUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchQuery('');
      }
    };

    if (isNotificationsOpen || searchQuery) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (sessionUser) {
      refreshData();
      
      // Polling for notifications every 60 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [sessionUser]);

  const fetchNotifications = async () => {
    const notifs = await storage.getNotifications();
    setNotifications(notifs);
  };

  const refreshData = async () => {
    setLocalStorageUser(authService.getUser());
    const [t, h, n] = await Promise.all([
      storage.getTasks(),
      storage.getHandovers(),
      storage.getNotifications()
    ]);
    setTasks(t);
    setHandovers(h);
    setNotifications(n);
  };

  const handleMarkNotificationRead = async (id: string | 'all') => {
    await storage.markNotificationRead(id);
    fetchNotifications();
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Attempt to save to server using generic update route
      // We need the user ID. Since sessionUser represents the session, we use its id.
      const userId = (sessionUser as any)?.id;
      if (!userId) {
        console.error('User ID not found for profile update');
        return;
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editUser.name,
          email: editUser.email,
          position: editUser.position,
          password: editUser.password // Include password if set
        }),
        credentials: 'include'
      });
      
      if (res.ok) {
        const updatedUser = await res.json();
        // Update local state with what the server returned (which includes session update)
        setLocalStorageUser({
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          position: updatedUser.position
        });
        authService.setUser({
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          position: updatedUser.position
        });
        
        // CRITICAL: Refresh the AuthContext user to reflect changes globally
        await refreshUser();
      }
    } catch (err) {
      console.error('Failed to save profile to server:', err);
    }

    setIsProfileModalOpen(false);
    refreshData();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'handover', label: 'Next Shift Endorsement', icon: ArrowRightLeft },
    { id: 'schedule', label: 'IT Schedule', icon: Calendar },
    { id: 'logs', label: 'Activity Logs', icon: History },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  ];

  if (sessionUser?.role === 'ADMIN') {
    navItems.push({ id: 'users', label: 'Accounts', icon: Users });
  }

  if (loading) {
    return (
      <div className="h-screen bg-[#F9FAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#88C13E] border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4A773C]">Loading System...</p>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return <LoginPage onLoginSuccess={refreshData} />;
  }

  return (
    <div className="flex h-screen bg-[#F9FAF8] font-sans text-gray-900 overflow-hidden relative">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-gray-100 flex flex-col z-50 shrink-0 m-4 rounded-[2rem] shadow-sm"
      >
        <div className="p-6 flex items-center justify-between overflow-hidden">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#88C13E] rounded-full flex items-center justify-center shrink-0">
                  <div className="w-3 h-3 border-2 border-white rounded-full"></div>
                </div>
                <span className="font-black text-xs uppercase tracking-[0.1em] text-gray-400">HelloConnect</span>
              </div>
              <h1 className="font-extrabold text-sm tracking-tight text-[#4A773C] leading-none mt-1">
                HCIT ENDORSEMENT MATRIX
              </h1>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors ml-auto text-gray-400 hover:text-[#4A773C]"
          >
            {isSidebarOpen ? <Menu size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                currentView === item.id 
                  ? 'bg-[#4A773C]/5 text-[#4A773C] font-bold border border-[#4A773C]/10' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              <item.icon size={20} className={currentView === item.id ? 'text-[#88C13E]' : ''} />
              {isSidebarOpen && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => {
              setEditUser(user);
              setIsProfileModalOpen(true);
            }}
            className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-all ${isSidebarOpen ? '' : 'justify-center'}`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#4A773C] to-[#88C13E] border-2 border-white shadow-sm shrink-0 flex items-center justify-center text-white font-black text-xs overflow-hidden">
              {sessionUser?.picture ? (
                <img src={sessionUser.picture} alt="profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                authService.getInitials(user.name)
              )}
            </div>
            {isSidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden text-left py-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="font-bold text-sm truncate text-gray-900">{user.name || 'User Profile'}</p>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="System Verified" />
                </div>
                <p className="text-[10px] uppercase font-black tracking-widest text-[#88C13E]">
                  {user.position}
                </p>
              </motion.div>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 m-4">
        {/* Header */}
        <header className="h-20 bg-white border border-gray-100 rounded-[2rem] px-8 flex items-center justify-between shrink-0 mb-4 shadow-sm">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#4A773C] font-black mb-0.5">Official Endorsement Matrix</p>
            <h2 className="text-xl font-black italic tracking-tight text-gray-900 leading-none">
              {navItems.find(n => n.id === currentView)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative group hidden md:block" ref={searchRef}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4A773C] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search all tasks & history..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#88C13E] outline-none w-80 transition-all shadow-inner"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  <X size={16} />
                </button>
              )}

              <AnimatePresence>
                {searchQuery && (
                  <SearchResults 
                    query={searchQuery}
                    tasks={tasks}
                    handovers={handovers}
                    onClose={() => setSearchQuery('')}
                    onSelectItem={(view, id) => {
                      setCurrentView(view);
                      setSelectedResultId(id);
                      setSearchQuery('');
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
            
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`relative p-2.5 rounded-xl transition-all ${isNotificationsOpen ? 'bg-[#4A773C] text-white' : 'text-gray-400 hover:text-[#4A773C] hover:bg-gray-50'}`}
              >
                <Bell size={20} />
                {notifications.some(n => !(n.readBy || []).includes((sessionUser as any)?.id)) && (
                  <span className={`absolute top-3 right-3 w-2 h-2 rounded-full border-2 border-white shadow-sm ${
                    notifications.some(n => !(n.readBy || []).includes((sessionUser as any)?.id) && (n.assignedToUserIds || []).includes(sessionUser?.name || ''))
                      ? 'bg-rose-500 animate-pulse ring-2 ring-rose-200'
                      : 'bg-[#88C13E]'
                  }`} />
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0"
                  >
                    <NotificationDropdown 
                      notifications={notifications}
                      onMarkRead={(id) => handleMarkNotificationRead(id)}
                      onMarkAllRead={() => handleMarkNotificationRead('all')}
                      onNavigate={(view) => {
                        setCurrentView(view);
                        setIsNotificationsOpen(false);
                      }}
                      onClose={() => setIsNotificationsOpen(false)}
                      currentUserId={(sessionUser as any)?.id}
                      currentUserName={sessionUser?.name}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button 
              onClick={logout}
              className="p-2.5 text-rose-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto h-full"
            >
              {currentView === 'dashboard' && (
                <Dashboard tasks={tasks} handovers={handovers} onNavigate={setCurrentView} onUpdate={refreshData} />
              )}
              {currentView === 'tasks' && (
                <TaskBoard tasks={tasks} onUpdate={refreshData} initialSelectedId={selectedResultId} />
              )}
              {currentView === 'handover' && (
                <EndorsementBoard 
                  handovers={handovers} 
                  tasks={tasks} 
                  onUpdate={refreshData} 
                />
              )}
              {currentView === 'schedule' && (
                <ITSchedule />
              )}
              {currentView === 'logs' && (
                <HandoverLogs handovers={handovers} tasks={tasks} onUpdate={refreshData} initialSelectedId={selectedResultId} />
              )}
              {currentView === 'users' && sessionUser?.role === 'ADMIN' && (
                <UserManagement />
              )}
              {currentView === 'feedback' && (
                <FeedbackTab currentUser={{ id: (sessionUser as any).id, name: sessionUser.name, role: sessionUser.role }} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="hc-card w-full max-w-md p-8 relative z-10 border-t-4 border-t-[#88C13E]"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4A773C]">User Profile</p>
                  <h3 className="text-2xl font-black italic tracking-tight text-gray-900">Identity Config</h3>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={saveProfile} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Full Name</label>
                  <input 
                    type="text"
                    value={editUser.name}
                    onChange={e => setEditUser({...editUser, name: e.target.value})}
                    placeholder="Enter your full name"
                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-[#88C13E] focus:ring-4 focus:ring-[#88C13E]/10 transition-all font-bold text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">IT Position / Role</label>
                  <input 
                    type="text"
                    value={editUser.position}
                    onChange={e => setEditUser({...editUser, position: e.target.value})}
                    placeholder="e.g. IT Support Engineer"
                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-[#88C13E] focus:ring-4 focus:ring-[#88C13E]/10 transition-all font-bold text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Enterprise Email</label>
                  <input 
                    type="email"
                    value={editUser.email}
                    onChange={e => setEditUser({...editUser, email: e.target.value})}
                    placeholder="your.email@helloconnect.org"
                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-[#88C13E] focus:ring-4 focus:ring-[#88C13E]/10 transition-all font-bold text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Update Password (Optional)</label>
                  <input 
                    type="password"
                    value={editUser.password || ''}
                    onChange={e => setEditUser({...editUser, password: e.target.value})}
                    placeholder="New Secure Password"
                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-[#88C13E] focus:ring-4 focus:ring-[#88C13E]/10 transition-all font-bold text-gray-900"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-[#4A773C] text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#88C13E] transition-all shadow-xl shadow-[#4A773C]/20"
                  >
                    Commit Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
