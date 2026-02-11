import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserId(firebaseUser.uid);

        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            setUserProfile({ id: profileDoc.id, ...profileDoc.data() });
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }

        setIsLoading(false);
      } else {
        setUser(null);
        setUserId(null);
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const signUp = async (email, password, additionalData = {}) => {
    try {
      setError('');
      const result = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'users', result.user.uid), {
        email,
        createdAt: new Date().toISOString(),
        role: 'owner',
        ...additionalData,
      });

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signIn = async (email, password) => {
    try {
      setError('');
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError('');
      await signOut(auth);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateUserProfile = async (updates) => {
    if (!userId) return;

    try {
      await setDoc(doc(db, 'users', userId), updates, { merge: true });
      setUserProfile(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Error updating user profile:', err);
      throw err;
    }
  };

  const value = {
    user,
    userId,
    userProfile,
    isLoading,
    error,
    signUp,
    signIn,
    logout,
    updateUserProfile,
    isAuthenticated: !!user,
    userRole: userProfile?.role || 'member',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
