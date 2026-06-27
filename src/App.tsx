/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';

export default function App() {
  return (
    <div
      id="welcome-container"
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAF8F5] text-[#2D2926] font-serif select-none overflow-hidden relative"
    >
      {/* Decorative Outer Border */}
      <div id="design-border" className="absolute inset-0 pointer-events-none border-[16px] sm:border-[32px] border-white/40 z-20"></div>

      {/* Portal Indicator */}
      <div id="portal-header" className="absolute top-8 left-8 sm:top-16 sm:left-16 flex items-center gap-4 text-[#A09488] z-10">
        <div className="w-10 h-[1px] bg-current"></div>
        <span className="text-[10px] uppercase tracking-[0.4em] font-sans font-medium">Portal Powitalny</span>
      </div>

      {/* Sideways Text Decorator */}
      <div id="sideways-decorator" className="absolute top-1/2 left-4 sm:left-8 -translate-y-1/2 -rotate-90 origin-center text-[9px] uppercase tracking-[0.5em] text-[#D4CEC5] font-sans whitespace-nowrap hidden lg:block z-10">
        Minimalistyczny Projekt Interfejsu
      </div>

      {/* Main Content Area */}
      <main id="welcome-text-wrapper" className="flex flex-col items-center text-center px-6 sm:px-12 md:px-24 max-w-4xl z-10">
        {/* Localization Capsule Badge */}
        <motion.div
          id="location-badge-container"
          className="mb-8 md:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <span className="inline-block px-4 py-1 rounded-full border border-[#D4CEC5] text-[10px] uppercase tracking-[0.2em] font-sans text-[#70685F]">
            Lokalizacja Próbna
          </span>
        </motion.div>

        {/* Headling Title */}
        <motion.h1
          id="welcome-title"
          className="font-serif text-[44px] sm:text-[60px] md:text-[80px] lg:text-[88px] leading-[1.1] md:leading-[1.05] font-light tracking-tight text-[#2D2926] mb-8 md:mb-10"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          Witamy w Lanckoronie <br className="hidden sm:inline" />
          <span className="italic text-[#8C8476]">na Olsztyn Próba!</span>
        </motion.h1>

        {/* Minimal Divider Line */}
        <motion.div
          id="divider-line"
          className="w-16 h-[1px] bg-[#D4CEC5] mb-8 md:mb-10"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        ></motion.div>

        {/* Subtle Description Subtitle */}
        <motion.p
          id="welcome-subtitle"
          className="max-w-md text-[14px] sm:text-[16px] leading-relaxed text-[#70685F] font-sans font-light tracking-wide italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          Pozdrawiają "warsztaty programistyczne" dla wyjątkowych gości odwiedzających nasze skromne progi.
        </motion.p>
      </main>

      {/* Coordinates (Left Bottom) */}
      <div id="coordinates-footer" className="absolute bottom-8 left-8 sm:bottom-16 sm:left-16 flex flex-col font-sans text-[10px] text-[#A09488] tracking-[0.3em] uppercase leading-relaxed text-left z-10">
        <span>Szerokość: 49.8447° N</span>
        <span>Długość: 19.7122° E</span>
      </div>

      {/* Decorative Dot Circle & Year Stamp (Right Bottom) */}
      <div id="stamp-footer" className="absolute bottom-8 right-8 sm:bottom-16 sm:right-16 flex flex-col items-end z-10">
        <div className="w-12 h-12 rounded-full bg-[#EAE7E1] flex items-center justify-center mb-4">
          <div className="w-2 h-2 rounded-full bg-[#8C8476]"></div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] font-sans text-[#A09488]">Lanckorona 2026</span>
      </div>
    </div>
  );
}

