import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface LeafletMapProps {
  theme: 'dark' | 'warm' | 'original';
}

export default function LeafletMap({ theme }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Incremental DB Read Test
  useEffect(() => {
    const testRead = async () => {
      try {
        const docRef = doc(db, 'days', '2026-06-27');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          console.log('Database Read Test Successful!', docSnap.data());
        } else {
          console.log('Database Read Test Successful! (Document "2026-06-27" does not exist yet.)');
        }
      } catch (error) {
        console.error('Database Read Test Failed Direct Error:', error);
      }
    };

    testRead();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center coordinates: 49.845132686432265, 19.715029554103715
    const center: [number, number] = [49.845132686432265, 19.715029554103715];

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Use OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Create custom pin marker styled with Natural Tones matching our layout
    const customIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-10 h-10 bg-[#8C8476] opacity-35 rounded-full animate-pulse"></div>
          <div class="relative w-6 h-6 bg-[#8C8476] border-2 border-[#EAE7E1] rounded-full shadow-lg flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-[#FAF8F5] rounded-full"></div>
          </div>
        </div>
      `,
      className: 'custom-pin-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    L.marker(center, { icon: customIcon }).addTo(map);

    // Handle initial resize to ensure leaflet renders correctly inside flex containers
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Determine container CSS class based on the chosen theme
  const getThemeClass = () => {
    if (theme === 'dark') return 'cinematic-dark-map';
    if (theme === 'warm') return 'warm-light-map';
    return 'original-map';
  };

  return (
    <div className={`w-full h-full ${getThemeClass()} relative overflow-hidden transition-all duration-500`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
