import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface LeafletMapProps {
  theme: 'dark' | 'warm' | 'original';
}

export default function LeafletMap({ theme }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [userId: string]: L.Marker }>({});

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

  // Initialize Map
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

    // Static point marker for "Olsztyn Próba" (the landmark itself)
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

  // Real-time Active Users Coordinates Sync
  useEffect(() => {
    // We need both mapInstanceRef to be populated and stable
    const checkMapInterval = setInterval(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      clearInterval(checkMapInterval);

      console.log('[LeafletMap] Initializing real-time active users coordinates listener...');
      const unsubscribeUsers = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const activeUserIds = new Set<string>();

          snapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            const userId = userDoc.id;

            // Render marker if user is active (isActive is true or they are an admin) and has valid coordinates
            const isUserActive = userData.isActive === true || userData.role === 'admin';
            const hasCoords = typeof userData.latitude === 'number' && typeof userData.longitude === 'number';

            if (isUserActive && hasCoords) {
              activeUserIds.add(userId);
              const lat = userData.latitude as number;
              const lng = userData.longitude as number;
              const initials = userData.initials || '??';
              const name = userData.name || 'Przejezdny Gość';
              const role = userData.role || 'user';

              const userIconHtml = `
                <div class="relative flex items-center justify-center">
                  <div class="absolute w-8 h-8 bg-amber-500/40 rounded-full animate-ping" style="animation-duration: 3s"></div>
                  <div class="relative w-8 h-8 bg-[#8C8476] border-2 border-[#FAF8F5] rounded-full shadow-xl flex items-center justify-center text-[10px] font-sans font-bold text-white uppercase tracking-tight transition-all duration-300 hover:scale-110 hover:border-amber-400">
                    ${initials}
                  </div>
                </div>
              `;

              const userIcon = L.divIcon({
                html: userIconHtml,
                className: 'custom-user-marker',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              });

              // If marker already exists, update position and contents
              if (markersRef.current[userId]) {
                markersRef.current[userId].setLatLng([lat, lng]);
                markersRef.current[userId].setIcon(userIcon);
              } else {
                // Otherwise create a new marker on the map
                const marker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
                marker.bindPopup(`
                  <div class="p-1 font-sans text-xs text-[#1E1B18]">
                    <p class="font-bold text-[13px] text-gray-900 mb-0.5">${name}</p>
                    <p class="text-[10px] text-gray-500 capitalize font-medium mb-1 flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      Rola: ${role}
                    </p>
                    <p class="text-[9px] text-gray-400 font-mono tracking-tighter">${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
                  </div>
                `, { closeButton: true });
                markersRef.current[userId] = marker;
              }
            }
          });

          // Clean up markers for users who are no longer active or have removed their location
          Object.keys(markersRef.current).forEach((userId) => {
            if (!activeUserIds.has(userId)) {
              markersRef.current[userId].remove();
              delete markersRef.current[userId];
              console.log(`[LeafletMap] Removed marker for user UID: ${userId}`);
            }
          });
        },
        (error) => {
          console.error('[LeafletMap] Error listening to user coordinates:', error);
        }
      );

      // Save unsubscribe to a cleanup function on map change
      map.on('unload', () => {
        unsubscribeUsers();
      });
    }, 100);

    return () => {
      clearInterval(checkMapInterval);
      // Clean up all markers on component unmount
      Object.keys(markersRef.current).forEach((userId) => {
        markersRef.current[userId].remove();
      });
      markersRef.current = {};
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
