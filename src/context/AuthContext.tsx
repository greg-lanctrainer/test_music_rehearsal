import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  initials: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ALLOWED_EMAIL = 'latuszek.grzegorz@gmail.com';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile subscription if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const email = firebaseUser.email || '';
        
        // 1. Check if the user email matches the authorized developer email
        if (email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
          console.error(`Access rejected for unauthorized email: ${email}`);
          setError('Brak uprawnień. Tylko deweloper (latuszek.grzegorz@gmail.com) może się zalogować.');
          setUser(null);
          setProfile(null);
          setLoading(false);
          // Sign out of Firebase Auth to completely clear session
          try {
            await signOut(auth);
          } catch (err) {
            console.error('Error signing out unauthorized user:', err);
          }
          return;
        }

        // 2. Check/Create profile document in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const name = firebaseUser.displayName || 'Anonimowy Użytkownik';
            const initials = generateInitials(name);
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name,
              email: email,
              initials,
              role: 'admin', // as requested: set role to admin
              isActive: true, // as requested: default isActive to true
            };

            await setDoc(userRef, newProfile);
            console.log('Created new admin user profile in Firestore for:', email);
          }
        } catch (err) {
          console.error('Error checking or creating user profile in Firestore:', err);
        }

        // Log successful sign in
        console.log(`User signed in: ${firebaseUser.displayName || 'Anonimowy'} (${email}) [UID: ${firebaseUser.uid}]`);
        setUser(firebaseUser);

        // 3. Subscribe to user profile updates
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        }, (err) => {
          console.error('Error subscribing to user profile:', err);
          setLoading(false);
        });

      } else {
        // Log sign out if we had a user before
        if (user) {
          console.log(`User signed out: ${user.email}`);
        }
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [user]);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError(err.message || 'Wystąpił błąd podczas logowania przez Google.');
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    setLoading(true);
    const emailToLog = user?.email;
    try {
      await signOut(auth);
      if (emailToLog) {
        console.log(`User logged out successfully: ${emailToLog}`);
      }
    } catch (err: any) {
      console.error('Logout Error:', err);
      setError(err.message || 'Wystąpił błąd podczas wylogowywania.');
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signInWithGoogle, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
