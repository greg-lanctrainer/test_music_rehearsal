import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  getDocs, 
  limit, 
  query,
  serverTimestamp
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  initials: string;
  isActive: boolean;
  role: 'admin' | 'user';
  lat?: number | null;
  lng?: number | null;
  updatedAt?: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  addLocation: () => Promise<void>;
  removeLocation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateInitials = (name: string): string => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign-Out Error:', error);
    }
  };

  const addLocation = async () => {
    if (!user || !profile) return;
    
    if (!navigator.geolocation) {
      alert('Geolokalizacja nie jest wspierana przez Twoją przeglądarkę.');
      return;
    }

    // Request high-accuracy geolocation
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const userRef = doc(db, 'users', user.uid);
        
        try {
          await updateDoc(userRef, {
            lat: latitude,
            lng: longitude,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error updating location:', error);
          alert('Błąd podczas zapisywania lokalizacji w bazie danych.');
        }
      },
      (error) => {
        console.error('Geolocation Permission Denied/Error:', error);
        alert('Nie można pobrać lokalizacji. Upewnij się, że zezwoliłeś na dostęp do lokalizacji w przeglądarce.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const removeLocation = async () => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        lat: null,
        lng: null,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error removing location:', error);
      alert('Błąd podczas usuwania lokalizacji.');
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);

        // Check if user document already exists
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // Check if this is the first user overall or the developer email
          const q = query(collection(db, 'users'), limit(1));
          const existingUsersSnap = await getDocs(q);
          const isFirstUser = existingUsersSnap.empty;
          const isDevEmail = firebaseUser.email?.toLowerCase() === 'latuszek.grzegorz@gmail.com';
          
          // Make admin if it's the developer email or the very first user
          const makeAdmin = isDevEmail || isFirstUser;

          const name = firebaseUser.displayName || 'Anonimowy Użytkownik';
          const email = firebaseUser.email || '';
          const initials = generateInitials(name);

          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name,
            email,
            initials,
            isActive: makeAdmin ? true : false,
            role: makeAdmin ? 'admin' : 'user',
            lat: null,
            lng: null,
          };

          await setDoc(userRef, {
            ...newProfile,
            updatedAt: serverTimestamp()
          });
          setProfile(newProfile);
        }

        // Subscribe to real-time updates of the user profile
        const unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        });

        return () => {
          unsubscribeProfile();
        };
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout, addLocation, removeLocation }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
