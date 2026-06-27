import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../context/AuthContext';
import { 
  Shield, 
  User as UserIcon, 
  Check, 
  X, 
  ArrowLeft, 
  Search, 
  RefreshCw, 
  UserCheck, 
  UserX 
} from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    // Real-time subscription to the users collection
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersList: UserProfile[] = [];
        snapshot.forEach((doc) => {
          usersList.push({
            uid: doc.id,
            ...(doc.data() as Omit<UserProfile, 'uid'>)
          });
        });
        setUsers(usersList);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to users collection:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggleActive = async (userId: string, currentActiveState: boolean) => {
    setUpdatingId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive: !currentActiveState
      });
      console.log(`Successfully toggled user ${userId} active status to ${!currentActiveState}`);
    } catch (error) {
      console.error('Error updating user active status:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      (user.name || '').toLowerCase().includes(query) ||
      (user.email || '').toLowerCase().includes(query) ||
      (user.uid || '').toLowerCase().includes(query)
    );
  });

  return (
    <motion.div
      id="admin-dashboard-container"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-5xl bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 text-left shadow-2xl mx-4 my-8 z-20 pointer-events-auto"
    >
      {/* Header section with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[#EAE7E1] hover:text-white transition-all cursor-pointer flex items-center justify-center group"
            title="Wróć do portalu"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-[#8C8476]" />
              <span className="text-[10px] uppercase tracking-[0.25em] font-sans text-[#A09488]">Zarządzanie</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white">Panel Administratora</h1>
          </div>
        </div>

        {/* Live status badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 font-sans text-xs text-[#EAE7E1]/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Połączenie Firestore: Aktywne</span>
          </div>
        </div>
      </div>

      {/* Search and stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search input */}
        <div className="md:col-span-2 relative flex items-center font-sans">
          <Search className="w-4 h-4 text-[#A09488] absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Szukaj użytkownika po nazwie, e-mailu lub UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#FAF8F5] placeholder-[#A09488] focus:border-[#8C8476] focus:outline-none transition-colors"
          />
        </div>

        {/* Stats */}
        <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between font-sans text-xs text-[#D4CEC5]">
          <span>Zarejestrowani goście:</span>
          <span className="font-serif font-semibold text-lg text-white">{users.length}</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/30 font-sans">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-[#A09488] font-semibold">
              <th className="py-3 px-4">Profil</th>
              <th className="py-3 px-4">E-mail</th>
              <th className="py-3 px-4">Rola</th>
              <th className="py-3 px-4 hidden md:table-cell">Google UID</th>
              <th className="py-3 px-4 text-center">Status (Aktywny)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs text-[#D4CEC5]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#A09488]">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#8C8476]" />
                    <span>Ładowanie listy użytkowników...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#A09488]">
                  Nie znaleziono żadnych zarejestrowanych użytkowników.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                  {/* Name with initials bubble */}
                  <td className="py-3.5 px-4 font-medium text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#8C8476]/30 text-[#EAE7E1] border border-white/10 flex items-center justify-center text-[10px] font-bold">
                        {user.initials || '??'}
                      </div>
                      <span className="truncate max-w-[150px]">{user.name || 'Anonimowy'}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="py-3.5 px-4 font-mono select-all tracking-tight">
                    {user.email}
                  </td>

                  {/* Role with dynamic styling */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${
                      user.role === 'admin' 
                        ? 'bg-[#8C8476]/20 text-[#FAF8F5] border border-[#8C8476]/40' 
                        : 'bg-white/5 text-[#A09488] border border-white/5'
                    }`}>
                      <Shield className="w-2.5 h-2.5 shrink-0" />
                      {user.role}
                    </span>
                  </td>

                  {/* UID */}
                  <td className="py-3.5 px-4 font-mono text-[10px] text-[#A09488] hidden md:table-cell select-all">
                    {user.uid}
                  </td>

                  {/* On/Off Toggle Switch */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleToggleActive(user.uid, user.isActive)}
                        disabled={updatingId === user.uid}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          user.isActive ? 'bg-[#8C8476]' : 'bg-white/10'
                        } ${updatingId === user.uid ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={user.isActive ? 'Wyłącz dostęp' : 'Włącz dostęp'}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                            user.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        >
                          {user.isActive ? (
                            <Check className="w-3 h-3 text-[#8C8476]" />
                          ) : (
                            <X className="w-3 h-3 text-gray-400" />
                          )}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
