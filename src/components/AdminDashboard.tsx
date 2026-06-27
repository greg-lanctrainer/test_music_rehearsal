import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, UserProfile } from '../context/AuthContext';
import { Shield, ToggleLeft, ToggleRight, ArrowLeft, Users, RefreshCw, Trash2 } from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUid, setActionUid] = useState<string | null>(null);

  // Subscribe to all users in the system
  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersList: UserProfile[] = [];
        snapshot.forEach((doc) => {
          usersList.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        // Sort users: admins first, then by name
        usersList.sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          return a.name.localeCompare(b.name);
        });
        setUsers(usersList);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to users:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile]);

  // Protect view check
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-black/50 border border-white/10 rounded-2xl backdrop-blur-md">
        <Shield className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="font-serif text-2xl text-white mb-2">Brak Uprawnień</h2>
        <p className="text-sm text-[#D4CEC5] font-sans leading-relaxed mb-6">
          Ta sekcja jest dostępna wyłącznie dla administratorów systemu.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-white/10 border border-white/15 rounded-full hover:bg-white/20 transition-all text-xs font-sans tracking-widest uppercase text-white cursor-pointer"
        >
          Powrót
        </button>
      </div>
    );
  }

  // Handle toggle isActive status
  const handleToggleActive = async (uid: string, currentStatus: boolean) => {
    setActionUid(uid);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isActive: !currentStatus
      });
    } catch (error) {
      console.error('Error toggling active state:', error);
      alert('Nie udało się zmienić statusu użytkownika.');
    } finally {
      setActionUid(null);
    }
  };

  // Optional: Toggle admin role
  const handleToggleRole = async (uid: string, currentRole: 'admin' | 'user') => {
    if (uid === profile.uid) {
      alert('Nie możesz odebrać sobie roli administratora.');
      return;
    }
    setActionUid(uid);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        role: currentRole === 'admin' ? 'user' : 'admin'
      });
    } catch (error) {
      console.error('Error toggling role:', error);
    } finally {
      setActionUid(null);
    }
  };

  // Optional: Delete user profile
  const handleDeleteUser = async (uid: string, name: string) => {
    if (uid === profile.uid) {
      alert('Nie możesz usunąć swojego konta.');
      return;
    }
    if (!confirm(`Czy na pewno chcesz usunąć profil użytkownika ${name}?`)) {
      return;
    }
    setActionUid(uid);
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Nie udało się usunąć użytkownika.');
    } finally {
      setActionUid(null);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-[#1a1715]/90 border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-md mx-4 overflow-hidden flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white font-light">Panel Administratora</h1>
            <p className="text-xs text-[#A09488] font-sans mt-0.5">Zarządzanie kontami użytkowników i aktywacjami</p>
          </div>
        </div>
        
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-xs font-sans tracking-wide text-white cursor-pointer transition-all self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Główny Portal
        </button>
      </div>

      {/* User Stats Overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-left">
          <span className="text-[10px] uppercase tracking-wider font-sans text-[#A09488]">Zarejestrowani</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-serif text-white font-semibold">{users.length}</span>
            <Users className="w-4 h-4 text-white/40" />
          </div>
        </div>
        <div className="bg-[#8C8476]/10 border border-[#8C8476]/20 rounded-xl p-4 text-left">
          <span className="text-[10px] uppercase tracking-wider font-sans text-amber-300">Aktywni</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-serif text-amber-300 font-semibold">
              {users.filter(u => u.isActive).length}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-left">
          <span className="text-[10px] uppercase tracking-wider font-sans text-[#A09488]">Z lokalizacją</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-serif text-white/80 font-semibold">
              {users.filter(u => u.lat !== null && u.lat !== undefined).length}
            </span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <RefreshCw className="w-8 h-8 text-white/30 animate-spin" />
            <span className="text-xs font-sans text-[#A09488]">Ładowanie użytkowników...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/5 rounded-xl">
            <span className="text-sm font-sans text-[#D4CEC5]">Brak zarejestrowanych użytkowników.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm font-sans">
              <thead>
                <tr className="border-b border-white/10 text-[#A09488] text-[10px] uppercase tracking-widest font-medium">
                  <th className="py-3 px-4">Inicjały</th>
                  <th className="py-3 px-4">Imię i nazwisko</th>
                  <th className="py-3 px-4">Email / Rola</th>
                  <th className="py-3 px-4">Koordynaty</th>
                  <th className="py-3 px-4 text-center">Status (Aktywny)</th>
                  <th className="py-3 px-4 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => {
                  const hasCoords = u.lat !== null && u.lat !== undefined;
                  const isCurrent = u.uid === profile.uid;
                  const isProcessing = actionUid === u.uid;

                  return (
                    <tr 
                      key={u.uid} 
                      className={`hover:bg-white/5 transition-colors ${
                        isCurrent ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Initials badge */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-xs ${
                          u.role === 'admin' 
                            ? 'bg-amber-600 border-amber-300 text-white' 
                            : 'bg-zinc-800 border-zinc-600 text-white/80'
                        }`}>
                          {u.initials || '??'}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-4 px-4 font-medium text-white">
                        <div className="flex flex-col">
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="text-[9px] text-amber-400 font-sans tracking-wide font-medium uppercase mt-0.5">
                              To Ty (Zalogowany)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email & Role badge */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-[#D4CEC5]">{u.email}</span>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-1.5 py-0.5 text-[9px] rounded font-medium uppercase tracking-wide ${
                              u.role === 'admin' 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' 
                                : 'bg-white/5 text-[#A09488]'
                            }`}>
                              {u.role}
                            </span>
                            {!isCurrent && (
                              <button 
                                onClick={() => handleToggleRole(u.uid, u.role)}
                                disabled={isProcessing}
                                className="text-[9px] text-[#A09488] hover:text-white underline cursor-pointer"
                              >
                                Zmień rolę
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Coordinates */}
                      <td className="py-4 px-4 font-mono text-xs">
                        {hasCoords ? (
                          <span className="text-amber-400">
                            {u.lat?.toFixed(5)}, {u.lng?.toFixed(5)}
                          </span>
                        ) : (
                          <span className="text-white/30 italic">Brak</span>
                        )}
                      </td>

                      {/* Toggle status */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleToggleActive(u.uid, u.isActive)}
                            disabled={isProcessing}
                            className={`flex items-center gap-1 cursor-pointer transition-all ${
                              isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                            }`}
                            title={u.isActive ? "Wyłącz aktywację konta" : "Aktywuj konto"}
                          >
                            {u.isActive ? (
                              <ToggleRight className="w-8 h-8 text-amber-500" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-white/20" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Delete */}
                      <td className="py-4 px-4 text-right">
                        {!isCurrent && (
                          <button
                            onClick={() => handleDeleteUser(u.uid, u.name)}
                            disabled={isProcessing}
                            className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-white/40 hover:text-red-400 rounded-md cursor-pointer transition-all"
                            title="Usuń profil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
