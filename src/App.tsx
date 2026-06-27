/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Map as MapIcon, LogIn, LogOut, Shield, User as UserIcon, AlertTriangle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { useAuth } from './context/AuthContext';
import LeafletMap from './components/LeafletMap';

import desktopBg from './assets/images/bench_welcome_desktop_1782569187419.jpg';
import mobileBg from './assets/images/bench_welcome_mobile_1782569205002.jpg';
import tabletBg from './assets/images/bench_welcome_tablet_1782569218564.jpg';

export default function App() {
  const { user, profile, loading, error, signInWithGoogle, logout, clearError } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname === '/where-we-are' ? '/where-we-are' : '/';
  });
  const [mapTheme, setMapTheme] = useState<'dark' | 'warm' | 'original'>('dark');
  const [showDropdown, setShowDropdown] = useState(false);

  // Automatically redirect unauthorized users back to home if they attempt to access the map
  useEffect(() => {
    if (currentPath === '/where-we-are' && !user) {
      setCurrentPath('/');
      window.history.pushState({}, '', '/');
    }
  }, [currentPath, user]);

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
      setCurrentPath(window.location.pathname === '/where-we-are' ? '/where-we-are' : '/');
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
          {user && (
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

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-[#EAE7E1] hover:text-red-400 border border-white/10 hover:border-red-500/25 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
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
      <div className="w-full h-full flex flex-col items-center justify-center z-20">
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
            </motion.main>
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
