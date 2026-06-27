/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Map as MapIcon, LogIn, LogOut, Shield, User as UserIcon, AlertTriangle, MapPin, MapPinOff, Navigation, RefreshCw } from 'lucide-react';
import { doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from './lib/firebase';
import { useAuth } from './context/AuthContext';
import LeafletMap from './components/LeafletMap';
import AdminDashboard from './components/AdminDashboard';

import desktopBg from './assets/images/bench_welcome_desktop_1782569187419.jpg';
import mobileBg from './assets/images/bench_welcome_mobile_1782569205002.jpg';
import tabletBg from './assets/images/bench_welcome_tablet_1782569218564.jpg';

export default function App() {
  const { user, profile, loading, error, signInWithGoogle, logout, clearError } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => {
    const path = window.location.pathname;
    if (path === '/where-we-are') return '/where-we-are';
    if (path === '/admin') return '/admin';
    return '/';
  });

  // Users can enter the map route only if they are logged in and approved (admin or isActive: true)
  const isApproved = !!user && (profile?.role === 'admin' || profile?.isActive === true);

  const [mapTheme, setMapTheme] = useState<'dark' | 'warm' | 'original'>('dark');
  const [showDropdown, setShowDropdown] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastWriteTimeRef = useRef<number>(0);

  // High-accuracy live GPS tracking effect
  useEffect(() => {
    const hasActiveCoords = typeof profile?.latitude === 'number' && typeof profile?.longitude === 'number';
    const shouldWatch = currentPath === '/where-we-are' && isApproved && hasActiveCoords;

    if (shouldWatch && navigator.geolocation) {
      console.log('[Geolocation Watch] Starting active live tracking...');
      
      // Clear any previous active watch just in case
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const now = Date.now();
          
          // Throttle updates to at most once every 3 seconds to avoid spamming the database
          // while keeping the physical movement updates highly precise in real-time
          if (now - lastWriteTimeRef.current > 3000) {
            console.log(`[Geolocation Watch] Coordinates updated: ${latitude}, ${longitude} (Accuracy: ±${accuracy.toFixed(1)}m)`);
            try {
              if (user) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                  latitude,
                  longitude
                });
                lastWriteTimeRef.current = now;
              }
            } catch (err) {
              console.error('[Geolocation Watch] Error auto-updating location in Firestore:', err);
            }
          }
        },
        (err) => {
          console.warn('[Geolocation Watch] Warning/Error from hardware GPS:', err);
          let msg = 'Live tracking warning.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Odrzucono dostęp do lokalizacji.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Sygnał GPS niedostępny.';
          }
          console.warn(`[Geolocation Watch] ${msg}`);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 20000, 
          maximumAge: 0 // Force the browser to bypass any cache and fetch raw GPS readings
        }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        console.log('[Geolocation Watch] Stopping active live tracking...');
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [currentPath, isApproved, typeof profile?.latitude === 'number', typeof profile?.longitude === 'number', user?.uid]);

  const handleAddLocation = () => {
    if (!user) return;
    setLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolokalizacja nie jest obsługiwana przez Twoją przeglądarkę.');
      setLocating(false);
      return;
    }

    console.log('[Geolocation] Requesting current coordinates with high accuracy...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            latitude,
            longitude
          });
          console.log(`[Geolocation] Successfully updated user location in Firestore: ${latitude}, ${longitude}`);
        } catch (err) {
          console.error('[Geolocation] Failed to save user location:', err);
          setLocationError('Nie udało się zapisać lokalizacji w bazie danych.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.error('[Geolocation] Geolocation query failed:', err);
        let msg = 'Nie udało się pobrać lokalizacji.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Odrzucono dostęp do lokalizacji w przeglądarce.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Sygnał GPS / lokalizacja jest aktualnie niedostępna.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Przekroczono limit czasu żądania geolokalizacji.';
        }
        setLocationError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleRemoveLocation = async () => {
    if (!user) return;
    setLocating(true);
    setLocationError(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        latitude: deleteField(),
        longitude: deleteField()
      });
      console.log(`[Geolocation] Successfully removed user position from Firestore for: ${user.email}`);
    } catch (err) {
      console.error('[Geolocation] Failed to clear user location:', err);
      setLocationError('Nie udało się usunąć lokalizacji z bazy danych.');
    } finally {
      setLocating(false);
    }
  };

  // Automatically redirect unauthorized users back to home if they attempt to access protected routes
  useEffect(() => {
    if (currentPath === '/where-we-are' && !isApproved) {
      setCurrentPath('/');
      window.history.pushState({}, '', '/');
    }
    if (currentPath === '/admin' && (!user || profile?.role !== 'admin')) {
      setCurrentPath('/');
      window.history.pushState({}, '', '/');
    }
  }, [currentPath, user, profile, isApproved]);

  const triggerDbWrite = async () => {
    try {
      const docRef = doc(db, 'days', '2026-06-27');
      await setDoc(docRef, { today: '2026-06-27' });
      console.log('Database Write Test Successful!');
    } catch (error) {
      console.error('Database Write Test Failed Direct Error:', error);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/where-we-are') {
        setCurrentPath('/where-we-are');
      } else if (path === '/admin') {
        setCurrentPath('/admin');
      } else {
        setCurrentPath('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  return (
    <div
      id="welcome-container"
      className="min-h-screen w-full flex flex-col items-center justify-center text-white font-serif select-none overflow-hidden relative bg-[#1E1B18]"
    >
      {/* Background Responsive Picture (Only for Home view) */}
      <AnimatePresence mode="wait">
        {currentPath !== '/where-we-are' && (
          <motion.picture
            key="bg-picture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 w-full h-full z-0 pointer-events-none"
          >
            {/* Mobile view (< 640px) */}
            <source media="(max-w: 639px)" srcSet={mobileBg} />
            {/* Tablet view (>= 640px and < 1024px) */}
            <source media="(min-w: 640px) and (max-w: 1023px)" srcSet={tabletBg} />
            {/* Desktop view (>= 1024px) */}
            <source media="(min-w: 1024px)" srcSet={desktopBg} />
            {/* Fallback img */}
            <img
              src={desktopBg}
              alt="Lanckorona Background"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.picture>
        )}
      </AnimatePresence>

      {/* Navigation Menu (Top Left) */}
      <div id="navigation-menu" className="absolute top-8 left-8 sm:top-16 sm:left-16 flex flex-col gap-4 z-40">
        <div id="portal-header" className="flex items-center gap-4 text-[#EAE7E1]/85">
          <div className="w-6 h-[1px] bg-current"></div>
          <span className="text-[10px] uppercase tracking-[0.4em] font-sans font-medium">Portal Powitalny</span>
        </div>
        
        <div className="flex items-center gap-3 pl-10">
          <button
            id="nav-home-btn"
            onClick={() => navigateTo('/')}
            className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center border backdrop-blur-md cursor-pointer ${
              currentPath === '/' 
                ? 'bg-white/20 border-white/40 text-white shadow-lg shadow-black/10' 
                : 'bg-black/20 border-white/10 text-[#EAE7E1]/60 hover:text-white hover:bg-white/15 hover:border-white/20'
            }`}
            title="Strona Główna (Home)"
          >
            <Home className="w-4 h-4" />
          </button>
          
          {/* Only signed-in users should see and be able to click the active map menu button */}
          {isApproved && (
            <motion.button
              id="nav-map-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                triggerDbWrite();
                navigateTo('/where-we-are');
              }}
              className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center border backdrop-blur-md cursor-pointer ${
                currentPath === '/where-we-are' 
                  ? 'bg-white/20 border-white/40 text-white shadow-lg shadow-black/10' 
                  : 'bg-black/20 border-white/10 text-[#EAE7E1]/60 hover:text-white hover:bg-white/15 hover:border-white/20'
              }`}
              title="Gdzie Jesteśmy (Map)"
            >
              <MapIcon className="w-4 h-4" />
            </motion.button>
          )}

          {/* Admin shortcut button */}
          {user && profile?.role === 'admin' && (
            <motion.button
              id="nav-admin-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => navigateTo('/admin')}
              className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center border backdrop-blur-md cursor-pointer ${
                currentPath === '/admin' 
                  ? 'bg-white/20 border-white/40 text-white shadow-lg shadow-black/10' 
                  : 'bg-black/20 border-white/10 text-[#EAE7E1]/60 hover:text-white hover:bg-white/15 hover:border-white/20'
              }`}
              title="Panel Administratora (Admin)"
            >
              <Shield className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Authentication and Profile Section (Top Right) */}
      <div id="auth-section" className="absolute top-8 right-8 sm:top-16 sm:right-16 z-40 flex flex-col items-end">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 border border-white/10 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#8C8476] animate-ping"></span>
            <span className="text-[10px] font-sans tracking-widest text-[#EAE7E1]/60 uppercase">Weryfikacja...</span>
          </div>
        ) : user ? (
          /* Logged In Profile Badge and Dropdown */
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-black/40 border border-white/15 hover:border-white/30 transition-all backdrop-blur-md cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-full bg-[#8C8476]/80 text-[#FAF8F5] flex items-center justify-center text-xs font-sans font-bold border border-white/25">
                {profile?.initials || '??'}
              </div>
              <span className="text-xs font-sans tracking-wide text-[#EAE7E1] hidden sm:inline max-w-[120px] truncate">
                {profile?.name || 'Administrator'}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[9px] font-sans tracking-wider uppercase text-[#EAE7E1]/80 hidden sm:inline">
                {profile?.role || 'admin'}
              </span>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-3 w-64 bg-[#1E1B18]/95 border border-white/15 rounded-xl p-4 shadow-2xl backdrop-blur-lg flex flex-col gap-3 font-sans text-left"
                >
                  <div className="border-b border-white/10 pb-3 flex flex-col">
                    <span className="text-xs font-medium text-white truncate">{profile?.name}</span>
                    <span className="text-[11px] text-[#A09488] truncate">{profile?.email}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-[#D4CEC5]">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#8C8476]" />
                      Status Roli:
                    </span>
                    <span className="capitalize font-semibold text-white">{profile?.role || 'admin'}</span>
                  </div>

                  {profile?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigateTo('/admin');
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-[#8C8476]/20 hover:bg-[#8C8476]/30 text-white border border-[#8C8476]/40 hover:border-[#8C8476]/60 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer font-sans"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Panel Administratora</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-[#EAE7E1] hover:text-red-400 border border-white/10 hover:border-red-500/25 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Wyloguj się</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Sign In Button */
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 hover:border-white/45 text-[#FAF8F5] hover:text-white text-xs font-sans font-medium tracking-wider uppercase transition-all duration-300 cursor-pointer shadow-lg backdrop-blur-md"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Zaloguj z Google</span>
          </button>
        )}

        {/* Custom Auth Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 max-w-[280px] bg-red-950/80 border border-red-500/35 rounded-xl p-3 backdrop-blur-md flex flex-col gap-1.5 shadow-xl text-left"
            >
              <div className="flex items-center gap-2 text-red-400 font-sans text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Błąd autoryzacji</span>
              </div>
              <p className="text-[11px] font-sans text-red-200/90 leading-normal">
                {error}
              </p>
              <button
                onClick={clearError}
                className="self-end text-[10px] font-sans text-red-300 hover:text-white uppercase tracking-wider underline cursor-pointer"
              >
                Zamknij
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dark Overlay with subtle warm tint matching the forest and wood */}
      <div id="bg-overlay" className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#1E1B18]/30 to-black/65 z-10 pointer-events-none"></div>

      {/* Decorative Outer Border */}
      <div id="design-border" className="absolute inset-0 pointer-events-none border-[16px] sm:border-[32px] border-white/20 z-30"></div>

      {/* Sideways Text Decorator */}
      <div id="sideways-decorator" className="absolute top-1/2 left-4 sm:left-8 -translate-y-1/2 -rotate-90 origin-center text-[9px] uppercase tracking-[0.5em] text-[#D4CEC5]/50 font-sans whitespace-nowrap hidden lg:block z-20 pointer-events-none">
        Minimalistyczny Projekt Interfejsu
      </div>

      {/* View Router Routing Content */}
      <div className="w-full h-full flex flex-col items-center justify-center z-20 overflow-y-auto pt-24 pb-20 px-4">
        <AnimatePresence mode="wait">
          {currentPath === '/' ? (
            /* ================= HOME VIEW ================= */
            <motion.main
              key="home-view"
              id="welcome-text-wrapper"
              className="flex flex-col items-center text-center px-6 sm:px-12 md:px-24 max-w-4xl"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Localization Capsule Badge */}
              <motion.div
                id="location-badge-container"
                className="mb-8 md:mb-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              >
                <span className="inline-block px-4 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-xs text-[10px] uppercase tracking-[0.2em] font-sans text-[#EAE7E1]">
                  Lokalizacja Próbna
                </span>
              </motion.div>

              {/* Heading Title */}
              <motion.h1
                id="welcome-title"
                className="font-serif text-[42px] sm:text-[60px] md:text-[80px] lg:text-[88px] leading-[1.1] md:leading-[1.05] font-light tracking-tight text-white mb-8 md:mb-10 drop-shadow-md"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              >
                Witamy w Lanckoronie <br className="hidden sm:inline" />
                <span className="italic text-[#EAE7E1]/90">na Olsztyn Próba!</span>
              </motion.h1>

              {/* Minimal Divider Line */}
              <motion.div
                id="divider-line"
                className="w-16 h-[1px] bg-white/30 mb-8 md:mb-10"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.3 }}
              ></motion.div>

              {/* Subtle Description Subtitle */}
              <motion.p
                id="welcome-subtitle"
                className="max-w-md text-[14px] sm:text-[16px] leading-relaxed text-[#D4CEC5] font-sans font-light tracking-wide italic drop-shadow-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
              >
                Pozdrawiają "warsztaty programistyczne" dla wyjątkowych gości odwiedzających nasze skromne progi.
              </motion.p>

              {/* Status display for logged-in but unapproved users */}
              {user && !isApproved && (
                <motion.div
                  id="pending-approval-card"
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="mt-8 px-6 py-4 rounded-xl bg-amber-950/45 border border-amber-500/30 backdrop-blur-md max-w-md w-full flex flex-col items-center gap-2 text-center"
                >
                  <div className="flex items-center gap-2 text-amber-400 font-sans text-[11px] font-semibold uppercase tracking-wider">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span>Oczekiwanie na zatwierdzenie</span>
                  </div>
                  <p className="text-xs text-[#FAF8F5] font-sans font-medium">
                    Registered but awaiting Admin approval
                  </p>
                  <p className="text-[11px] text-[#D4CEC5]/80 font-sans leading-normal">
                    Twoje konto zostało zarejestrowane. Administrator musi aktywować Twój profil, aby udostępnić mapę.
                  </p>
                </motion.div>
              )}
            </motion.main>
          ) : currentPath === '/admin' ? (
            /* ================= ADMIN VIEW ================= */
            /* Guarded view: Only allowed if user is authenticated and is an admin */
            user && profile?.role === 'admin' && (
              <motion.div
                key="admin-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full flex justify-center"
              >
                <AdminDashboard onBack={() => navigateTo('/')} />
              </motion.div>
            )
          ) : (
            /* ================= MAP VIEW ================= */
            /* Guarded view: Only allowed if user is authenticated */
            user && (
              <motion.div
                key="map-view"
                className="absolute inset-0 w-full h-full flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div id="leaflet-map-wrapper" className="w-full h-full z-0">
                  <LeafletMap theme={mapTheme} />
                </div>

                {/* Cinematic text overlay panel on top of the map to give context & styling options */}
                <div className="absolute bottom-28 sm:bottom-32 left-8 sm:left-16 max-w-sm bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-5 text-left z-20 pointer-events-auto shadow-2xl">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-sans text-[#A09488] block mb-1">Miejsce Próby</span>
                  <h2 className="font-serif text-lg sm:text-xl text-white mb-1">Olsztyn Próba</h2>
                  <p className="text-xs text-[#D4CEC5] font-sans leading-relaxed mb-4">
                    Trasa oraz punkt docelowy warsztatów programistycznych w malowniczej Lanckoronie.
                  </p>

                  {/* Location Controls (Strictly on Map View Only) */}
                  <div className="pt-3 pb-3 border-t border-white/10 flex flex-col gap-2">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-sans text-[#A09488]">Twoja obecność</span>
                    
                    {locationError && (
                      <div className="text-[10px] text-red-400 bg-red-950/40 border border-red-500/20 px-2 py-1.5 rounded flex items-center gap-1.5 font-sans mb-1 leading-normal">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{locationError}</span>
                      </div>
                    )}

                    {typeof profile?.latitude === 'number' && typeof profile?.longitude === 'number' ? (
                      <button
                        onClick={handleRemoveLocation}
                        disabled={locating}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-200 border border-red-500/30 hover:border-red-500/50 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none font-sans cursor-pointer font-medium"
                      >
                        <MapPinOff className="w-3.5 h-3.5" />
                        <span>Usuń mnie z mapy</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleAddLocation}
                        disabled={locating}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg bg-[#8C8476]/30 hover:bg-[#8C8476]/50 text-white border border-[#8C8476]/45 hover:border-[#8C8476]/70 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none font-sans cursor-pointer font-medium"
                      >
                        {locating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-amber-400 animate-bounce" style={{ animationDuration: '2s' }} />
                        )}
                        <span>{locating ? 'Pobieranie lokalizacji...' : 'Dodaj mnie do mapy'}</span>
                      </button>
                    )}
                  </div>

                  {/* Map Styling Theme Toggle */}
                  <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-sans text-[#A09488]">Wygląd mapy</span>
                    <div className="grid grid-cols-3 gap-1 bg-black/45 p-0.5 rounded-lg border border-white/5">
                      <button
                        onClick={() => setMapTheme('dark')}
                        className={`px-2 py-1 text-[10px] rounded-md font-sans transition-all cursor-pointer text-center ${
                          mapTheme === 'dark'
                            ? 'bg-[#8C8476] text-white font-medium shadow'
                            : 'text-[#D4CEC5] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Ciemny
                      </button>
                      <button
                        onClick={() => setMapTheme('warm')}
                        className={`px-2 py-1 text-[10px] rounded-md font-sans transition-all cursor-pointer text-center ${
                          mapTheme === 'warm'
                            ? 'bg-[#8C8476] text-white font-medium shadow'
                            : 'text-[#D4CEC5] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Ciepły
                      </button>
                      <button
                        onClick={() => setMapTheme('original')}
                        className={`px-2 py-1 text-[10px] rounded-md font-sans transition-all cursor-pointer text-center ${
                          mapTheme === 'original'
                            ? 'bg-[#8C8476] text-white font-medium shadow'
                            : 'text-[#D4CEC5] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Oryginał
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {/* Coordinates (Left Bottom) */}
      <div id="coordinates-footer" className="absolute bottom-8 left-8 sm:bottom-16 sm:left-16 flex flex-col font-sans text-[10px] text-[#EAE7E1]/85 tracking-[0.3em] uppercase leading-relaxed text-left z-30 pointer-events-none">
        <span>Szerokość: 49.8447° N</span>
        <span>Długość: 19.7122° E</span>
      </div>

      {/* Decorative Dot Circle & Year Stamp (Right Bottom) */}
      <div id="stamp-footer" className="absolute bottom-8 right-8 sm:bottom-16 sm:right-16 flex flex-col items-end z-30 pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center mb-4 border border-white/15">
          <div className="w-2 h-2 rounded-full bg-white/80"></div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] font-sans text-[#EAE7E1]/85">Lanckorona 2026</span>
      </div>
    </div>
  );
}
