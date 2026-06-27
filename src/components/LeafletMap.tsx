import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../context/AuthContext';

interface LeafletMapProps {
  theme: 'dark' | 'warm' | 'original';
  currentUserUid?: string;
  isActiveOrAdmin: boolean;
}

export default function LeafletMap({ theme, currentUserUid, isActiveOrAdmin }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [uid: string]: L.Marker }>({});
  const [mapReady, setMapReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center coordinates: 49.845132686432265, 19.715029554103715 (Olsztyn Próba)
    const center: [number, number] = [49.845132686432265, 19.715029554103715];

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

    // Create central destination custom pin marker (Lanckorona "Olsztyn Próba")
    const centralIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-10 h-10 bg-[#8C8476] opacity-35 rounded-full animate-pulse"></div>
          <div class="relative w-7 h-7 bg-[#8C8476] border-2 border-[#EAE7E1] rounded-full shadow-lg flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-[#FAF8F5] rounded-full"></div>
          </div>
        </div>
      `,
      className: 'custom-pin-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Add Central Pin Marker with Popup to give context
    L.marker(center, { icon: centralIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: sans-serif; color: #1e1b18; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600;">Olsztyn Próba</h4>
          <p style="margin: 0; font-size: 11px; color: #70685f; line-height: 1.3;">Punkt docelowy warsztatów programistycznych.</p>
        </div>
      `);

    // Handle initial resize
    setTimeout(() => {
      map.invalidateSize();
      setMapReady(true);
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // Sync Active User Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Clear existing user markers if permissions revoked or logged out
    if (!isActiveOrAdmin) {
      Object.keys(markersRef.current).forEach((uid) => {
        markersRef.current[uid].remove();
      });
      markersRef.current = {};
      return;
    }

    // Subscribe to users real-time stream
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const dbUsers: { [uid: string]: UserProfile } = {};
      
      snapshot.forEach((doc) => {
        const userProf = doc.data() as UserProfile;
        // User must be active and have lat/lng set
        if (
          userProf.isActive && 
          userProf.lat !== null && 
          userProf.lat !== undefined && 
          userProf.lng !== null && 
          userProf.lng !== undefined
        ) {
          dbUsers[userProf.uid] = userProf;
        }
      });

      // Update or add markers
      Object.keys(dbUsers).forEach((uid) => {
        const userProf = dbUsers[uid];
        const position: [number, number] = [userProf.lat!, userProf.lng!];
        const isSelf = uid === currentUserUid;

        const initialsIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              ${isSelf ? '<div class="absolute w-9 h-9 bg-amber-500 opacity-30 rounded-full animate-ping"></div>' : ''}
              <div class="relative w-7 h-7 flex items-center justify-center rounded-full shadow-lg border-2 font-sans text-[10px] font-bold text-white transition-all duration-300 ${
                isSelf 
                  ? 'bg-amber-600 border-amber-300 scale-110 z-[1000]' 
                  : 'bg-[#5C5549] border-[#EAE7E1] z-[500]'
              }">
                ${userProf.initials || '??'}
              </div>
            </div>
          `,
          className: 'custom-pin-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        if (markersRef.current[uid]) {
          // Update existing marker position and icon
          markersRef.current[uid].setLatLng(position);
          markersRef.current[uid].setIcon(initialsIcon);
        } else {
          // Create new marker
          const newMarker = L.marker(position, { icon: initialsIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: sans-serif; color: #1e1b18; padding: 4px;">
                <h4 style="margin: 0 0 2px 0; font-size: 13px; font-weight: 600;">${userProf.name}</h4>
                <p style="margin: 0 0 4px 0; font-size: 10px; color: #8c8476;">${userProf.email}</p>
                <span style="font-size: 9px; padding: 2px 6px; background: #eae7e1; border-radius: 4px; display: inline-block;">${isSelf ? 'Ty' : 'Uczestnik'}</span>
              </div>
            `);
          markersRef.current[uid] = newMarker;
        }
      });

      // Delete markers for users who are no longer active or removed their locations
      Object.keys(markersRef.current).forEach((uid) => {
        if (!dbUsers[uid]) {
          markersRef.current[uid].remove();
          delete markersRef.current[uid];
        }
      });
    }, (error) => {
      console.error('Firestore active users listener error:', error);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserUid, isActiveOrAdmin, mapReady]);

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
