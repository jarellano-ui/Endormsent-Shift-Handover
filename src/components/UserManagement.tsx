import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, UserMinus, Shield, User, Mail, Lock, Search, Trash2, ShieldCheck, ShieldAlert, Edit2 } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  position?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'USER' as 'ADMIN' | 'USER',
    password: '',
    position: ''
  });

  const [editingUser, setEditingUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'USER';
    position: string;
    password?: string;
  } | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
        credentials: 'include'
      });
      if (res.ok) {
        fetchUsers();
        setIsAddModalOpen(false);
        setNewUser({ name: '', email: '', role: 'USER', password: '', position: '' });
      }
    } catch (err) {
      console.error('Failed to add user:', err);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
        credentials: 'include'
      });
      if (res.ok) {
        fetchUsers();
        setIsEditModalOpen(false);
        setEditingUser(null);
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        fetchUsers();
        setDeleteId(null);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const openEditModal = (u: UserData) => {
    setEditingUser({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      position: u.position || '',
      password: '' // Keep empty unless changing
    });
    setIsEditModalOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black italic tracking-tight text-gray-900 leading-none">
            HCIT <span className="text-[#4A773C]">Accounts</span>
          </h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <Shield size={12} className="text-[#88C13E]" /> Identity & Access Management
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search personnel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-[#88C13E] focus:ring-4 focus:ring-[#88C13E]/10 transition-all text-sm font-bold w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-[#4A773C] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#4A773C]/20 hover:bg-[#3D6332] active:scale-95 transition-all"
          >
            <UserPlus size={16} /> Create User
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
            <div className="w-10 h-10 border-4 border-[#88C13E] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Synchronizing Identity Database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((u) => (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm group hover:border-[#88C13E] transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=${u.role === 'ADMIN' ? '4A773C' : '88C13E'}&color=fff`} 
                          alt={u.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 leading-tight">{u.name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{u.position || 'IT Specialist'}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {u.role === 'ADMIN' ? (
                            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[#4A773C] bg-[#F1F7EB] px-2 py-0.5 rounded-full">
                              <ShieldCheck size={8} /> IT Admin
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[#88C13E] bg-[#F9FAF8] px-2 py-0.5 rounded-full">
                              <User size={8} /> IT Personnel
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {deleteId === u.id ? (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-2 py-1 bg-rose-500 text-white text-[8px] font-black uppercase rounded-lg hover:bg-rose-600 transition-all"
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => setDeleteId(null)}
                            className="px-2 py-1 bg-gray-100 text-gray-500 text-[8px] font-black uppercase rounded-lg hover:bg-gray-200 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => openEditModal(u)}
                            className="p-2 text-gray-300 hover:text-[#4A773C] hover:bg-[#F1F7EB] rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteId(u.id)}
                            className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail size={12} className="shrink-0" />
                      <span className="text-[10px] font-bold truncate">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Lock size={12} className="shrink-0" />
                      <span className="text-[10px] font-bold">••••••••</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-black italic tracking-tight text-gray-900 leading-none">
                  {isEditModalOpen ? 'Edit' : 'New'} <span className="text-[#4A773C]">Account</span>
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">
                  {isEditModalOpen ? 'Update' : 'Provision'} HCIT Access Profile
                </p>
              </div>

              <form onSubmit={isEditModalOpen ? handleEditUser : handleAddUser} className="space-y-5">
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#88C13E] transition-colors">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={isEditModalOpen ? editingUser?.name : newUser.name}
                      onChange={e => isEditModalOpen 
                        ? setEditingUser(prev => prev ? {...prev, name: e.target.value} : null)
                        : setNewUser({...newUser, name: e.target.value})
                      }
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-[#88C13E] focus:ring-4 focus:ring-[#88C13E]/10 transition-all font-bold text-sm"
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#88C13E] transition-colors">
                      <Shield size={18} />
                    </div>
                    <input
                      type="text"
                      placeholder="IT Position / Role (e.g. Senior IT Support)"
                      required
                      value={isEditModalOpen ? editingUser?.position : newUser.position}
                      onChange={e => isEditModalOpen
                        ? setEditingUser(prev => prev ? {...prev, position: e.target.value} : null)
                        : setNewUser({...newUser, position: e.target.value})
                      }
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-[#88C13E] focus:ring-4 focus:ring-[#88C13E]/10 transition-all font-bold text-sm"
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#88C13E] transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      placeholder="Email Address"
                      required
                      value={isEditModalOpen ? editingUser?.email : newUser.email}
                      onChange={e => isEditModalOpen
                        ? setEditingUser(prev => prev ? {...prev, email: e.target.value} : null)
                        : setNewUser({...newUser, email: e.target.value})
                      }
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-[#88C13E] focus:ring-4 focus:ring-[#88C13E]/10 transition-all font-bold text-sm"
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#88C13E] transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      placeholder={isEditModalOpen ? "New Password (leave blank to keep)" : "Initial Password"}
                      required={!isEditModalOpen}
                      value={isEditModalOpen ? editingUser?.password : newUser.password}
                      onChange={e => isEditModalOpen
                        ? setEditingUser(prev => prev ? {...prev, password: e.target.value} : null)
                        : setNewUser({...newUser, password: e.target.value})
                      }
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-[#88C13E] focus:ring-4 focus:ring-[#88C13E]/10 transition-all font-bold text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => isEditModalOpen 
                        ? setEditingUser(prev => prev ? {...prev, role: 'USER' as 'ADMIN' | 'USER'} : null)
                        : setNewUser({...newUser, role: 'USER'})
                      }
                      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        (isEditModalOpen ? editingUser?.role : newUser.role) === 'USER' 
                        ? 'border-[#88C13E] bg-[#F9FAF8]' 
                        : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <User size={20} className={(isEditModalOpen ? editingUser?.role : newUser.role) === 'USER' ? 'text-[#88C13E]' : 'text-gray-400'} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">IT Personnel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => isEditModalOpen
                        ? setEditingUser(prev => prev ? {...prev, role: 'ADMIN' as 'ADMIN' | 'USER'} : null)
                        : setNewUser({...newUser, role: 'ADMIN'})
                      }
                      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        (isEditModalOpen ? editingUser?.role : newUser.role) === 'ADMIN' 
                        ? 'border-[#4A773C] bg-[#F1F7EB]' 
                        : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <ShieldCheck size={20} className={(isEditModalOpen ? editingUser?.role : newUser.role) === 'ADMIN' ? 'text-[#4A773C]' : 'text-gray-400'} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">IT Administrator</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                    }}
                    className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#4A773C] text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#4A773C]/20 hover:bg-[#3D6332] active:scale-95 transition-all"
                  >
                    {isEditModalOpen ? 'Update Profile' : 'Create Profile'}
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
