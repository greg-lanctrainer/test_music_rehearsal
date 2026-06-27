/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Map as MapIcon, Shield, Navigation, AlertTriangle, CheckCircle } from 'lucide-react';
import LeafletMap from './components/LeafletMap';
import AdminDashboard from './components/AdminDashboard';
import { useAuth } from './context/AuthContext';

import desktopBg from './assets/images/bench_welcome_desktop_1782569187419.jpg';
import mobileBg from './assets/images/bench_welcome_mobile_1782569205002.jpg';
import tabletBg from './assets/images/bench_welcome_tablet_1782569218564.jpg';

export default function App() {
  const { 
    user, 
    profile, 
    loading, 
    signInWithGoogle, 
    logout, 
    addLocation, 
    removeLocation 
  } = useAuth();

  const [currentPath, setCurrentPath] = useState(() => {
    const path = window.location.pathname;
    if (path === '/where-we-are' || path === '/admin') return path;
    return '/';
  });

  const [mapTheme, setMapTheme] = useState<'dark' | 'warm' | 'original'>('dark');

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/where-we-are' || path === '/admin') {
        setCurrentPath(path);
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

  // Check if current user is active or is admin (used for viewing map pins)
  const isActiveOrAdmin = Boolean(profile?.isActive || profile?.role === 'admin');
  const hasCoordinates = Boolean(profile?.lat !== null && profile?.lat !== undefined && profile?.lng !== null && profile?.lng !== undefined);

  return (
    <div
      id="welcome-container"
      className="min-h-screen w-full flex flex-col items-center justify-center text-white font-serif select-none overflow-hidden relative bg-[#1E1B18]"
    >
      {/* Background Responsive Picture (Only for Home view) */}
      <AnimatePresence mode="wait">
        {currentPath === '/' && (
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
          
          <button
            id="nav-map-btn"
            onClick={() => navigateTo('/where-we-are')}
            className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center border backdrop-blur-md cursor-pointer ${
              currentPath === '/where-we-are' 
                ? 'bg-white/20 border-white/40 text-white shadow-lg shadow-black/10' 
                : 'bg-black/20 border-white/10 text-[#EAE7E1]/60 hover:text-white hover:bg-white/15 hover:border-white/20'
            }`}
            title="Gdzie Jesteśmy (Map)"
          >
            <MapIcon className="w-4 h-4" />
          </button>

          {profile?.role === 'admin' && (
            <button
              id="nav-admin-btn"
              onClick={() => navigateTo('/admin')}
              className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center border backdrop-blur-md cursor-pointer ${
                currentPath === '/admin' 
                  ? 'bg-amber-600/30 border-amber-500/50 text-amber-300 shadow-lg' 
                  : 'bg-black/20 border-white/10 text-[#EAE7E1]/60 hover:text-amber-300 hover:bg-white/15 hover:border-amber-500/20'
              }`}
              title="Panel Administratora (Admin)"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* User Auth Info (Top Right) */}
      <div id="user-auth-panel" className="absolute top-8 right-8 sm:top-16 sm:right-16 z-40 flex items-center gap-3">
        {loading ? (
          <div className="text-xs text-[#EAE7E1]/60 font-sans tracking-wide">Weryfikacja...</div>
        ) : user ? (
          <div className="flex items-center gap-3 bg-black/45 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-sans font-medium text-white">{profile?.name}</span>
              <span className="text-[9px] font-sans text-[#A09488] uppercase tracking-wider">
                {profile?.role === 'admin' ? 'Administrator' : 'Uczestnik'}
              </span>
            </div>
            
            {/* Elegant initials avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
              profile?.role === 'admin' 
                ? 'bg-amber-600 border-amber-300 text-white' 
                : 'bg-zinc-800 border-zinc-600 text-white/95'
            }`}>
              {profile?.initials || '??'}
            </div>

            <button
              onClick={logout}
              className="text-[10px] font-sans text-red-400 hover:text-red-300 font-medium tracking-wide uppercase px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 cursor-pointer transition-all ml-1"
            >
              Wyloguj
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 hover:border-white/30 text-white px-4 py-2 rounded-full text-xs font-sans font-medium tracking-wide shadow-lg cursor-pointer transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Zaloguj z Google
          </button>
        )}
      </div>

      {/* Dark Overlay with subtle warm tint matching the forest and wood */}
      {currentPath !== '/where-we-are' && (
        <div id="bg-overlay" className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#1E1B18]/30 to-black/65 z-10 pointer-events-none"></div>
      )}

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
          ) : currentPath === '/admin' ? (
            /* ================= ADMIN VIEW ================= */
            <motion.div
              key="admin-view"
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#1E1B18]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <AdminDashboard onBack={() => navigateTo('/')} />
            </motion.div>
          ) : (
            /* ================= MAP VIEW ================= */
            <motion.div
              key="map-view"
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div id="leaflet-map-wrapper" className="w-full h-full z-0">
                <LeafletMap 
                  theme={mapTheme} 
                  currentUserUid={user?.uid}
                  isActiveOrAdmin={isActiveOrAdmin}
                />
              </div>

              {/* Awaiting Admin Activation Glassmorphism Overlay */}
              {user && !isActiveOrAdmin && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-10 p-6">
                  <div className="max-w-md bg-zinc-900/90 border border-white/10 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
                    <h3 className="font-serif text-xl sm:text-2xl text-white mb-2">Account awaiting admin activation</h3>
                    <p className="text-sm text-[#D4CEC5] leading-relaxed mb-6 font-sans">
                      Dziękujemy za zalogowanie! Twoje konto zostało zarejestrowane, lecz wymaga aktywacji przez administratora zanim uzyskasz pełen dostęp do mapy i lokalizacji uczestników.
                    </p>
                    <div className="inline-block px-4 py-2 bg-white/5 border border-white/5 rounded-lg text-xs font-mono text-[#A09488]">
                      Status: Oczekiwanie na aktywację
                    </div>
                  </div>
                </div>
              )}

              {/* Cinematic text overlay panel on top of the map to give context, status & actions */}
              <div className="absolute bottom-28 sm:bottom-32 left-8 sm:left-16 max-w-sm bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-5 text-left z-20 pointer-events-auto shadow-2xl">
                <span className="text-[9px] uppercase tracking-[0.2em] font-sans text-[#A09488] block mb-1">Miejsce Próby</span>
                <h2 className="font-serif text-lg sm:text-xl text-white mb-1">Olsztyn Próba</h2>
                <p className="text-xs text-[#D4CEC5] font-sans leading-relaxed mb-4">
                  Trasa oraz punkt docelowy warsztatów programistycznych w malowniczej Lanckoronie.
                </p>

                {/* Firestore Location controls */}
                <div className="py-3.5 border-t border-white/10 flex flex-col gap-2.5">
                  <span className="text-[9px] uppercase tracking-[0.15em] font-sans text-[#A09488]">Udostępnianie lokalizacji</span>
                  
                  {!user ? (
                    // Not signed in state
                    <div className="bg-white/5 border border-white/5 p-3 rounded-lg flex flex-col gap-2">
                      <p className="text-[11px] text-[#D4CEC5] font-sans leading-normal">
                        Zaloguj się z Google, aby dodać swój punkt na mapie.
                      </p>
                      <button
                        onClick={signInWithGoogle}
                        className="w-full py-1.5 bg-[#8C8476] hover:bg-[#A09488] rounded text-[11px] font-sans font-medium transition-all text-white cursor-pointer"
                      >
                        Zaloguj i Udostępnij
                      </button>
                    </div>
                  ) : !profile?.isActive && profile?.role !== 'admin' ? (
                    // Logged in but not active
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#D4CEC5] font-sans leading-normal">
                        Konto czeka na aktywację. Nie możesz udostępniać lokalizacji.
                      </p>
                    </div>
                  ) : (
                    // Logged in and active
                    <div className="flex flex-col gap-2">
                      {hasCoordinates ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-[10px] font-sans text-green-300">Jesteś widoczny na mapie</span>
                          </div>
                          <button
                            onClick={removeLocation}
                            className="w-full py-2 bg-red-600/25 hover:bg-red-600/40 border border-red-500/35 rounded-lg text-[10px] font-sans tracking-wide uppercase font-medium text-red-200 transition-all cursor-pointer"
                          >
                            Remove me from Map (Usuń z mapy)
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
                            <Navigation className="w-3.5 h-3.5 text-[#A09488]" />
                            <span className="text-[10px] font-sans text-[#D4CEC5]">Lokalizacja nieudostępniana</span>
                          </div>
                          <button
                            onClick={addLocation}
                            className="w-full py-2 bg-amber-600/35 hover:bg-amber-600/50 border border-amber-500/45 rounded-lg text-[10px] font-sans tracking-wide uppercase font-medium text-amber-200 transition-all cursor-pointer"
                          >
                            Add me to Map (Udostępnij)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Map Styling Theme Toggle */}
                <div className="pt-3.5 border-t border-white/10 flex flex-col gap-2">
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
