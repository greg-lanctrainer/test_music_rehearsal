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
        const userRef = doc(db, 'users', firebaseUser.uid);
        let userRole: 'admin' | 'user' = 'user';
        let userActiveStatus = false;

        try {
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const name = firebaseUser.displayName || 'Anonimowy Użytkownik';
            const initials = generateInitials(name);
            const isAdmin = email.toLowerCase() === ALLOWED_EMAIL.toLowerCase();
            userRole = isAdmin ? 'admin' : 'user';
            userActiveStatus = isAdmin; // true for developer, false for others

            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name,
              email: email,
              initials,
              role: userRole,
              isActive: userActiveStatus,
            };

            await setDoc(userRef, newProfile);
            console.log(`[Auth] Registered new user in Firestore: ${email} with role: ${userRole}, active: ${userActiveStatus}`);
          } else {
            const existingData = userSnap.data() as UserProfile;
            userRole = existingData.role;
            userActiveStatus = existingData.isActive;
          }
        } catch (err) {
          console.error('[Auth] Error checking or creating user profile in Firestore:', err);
        }

        // Log successful sign-in
        console.log(`[Auth Log] Who signed in: ${firebaseUser.displayName || 'Anonimowy'} (${email}) [UID: ${firebaseUser.uid}] [Role: ${userRole}] [Active: ${userActiveStatus}]`);
        setUser(firebaseUser);

        // 3. Subscribe to user profile updates
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        }, (err) => {
          console.error('[Auth] Error subscribing to user profile:', err);
          setLoading(false);
        });

      } else {
        // Log sign out if we had a user before
        if (user) {
          console.log(`[Auth Log] Who signed out: ${user.displayName || 'Anonimowy'} (${user.email || 'N/A'}) [UID: ${user.uid}]`);
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
