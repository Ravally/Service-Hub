import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
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
  const pendingSignUpDataRef = useRef(null);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUserId(firebaseUser.uid);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUser(firebaseUser);
          setUserProfile(userDocSnap.data());
        } else {
          // Check for an invite (skip for anonymous users who don't have email)
          if (!firebaseUser.email) {
            // Anonymous user - no profile needed
            setUser(firebaseUser);
            setUserProfile(null);
            return;
          }
          const invitesQuery = query(collection(db, 'invites'), where("email", "==", firebaseUser.email.toLowerCase()));
          const invitesSnapshot = await getDocs(invitesQuery);

          let userRole = 'member'; // Default role
          if (!invitesSnapshot.empty) {
            const inviteDoc = invitesSnapshot.docs[0];
            userRole = inviteDoc.data().role;
            await deleteDoc(inviteDoc.ref); // Delete invite after claiming
          } else {
            // If no invite, check if they are the VERY first user ever.
            const usersQuery = query(collection(db, 'users'));
            const usersSnapshot = await getDocs(usersQuery);
            if (usersSnapshot.empty) {
              userRole = 'admin'; // First user is always admin
            } else {
              // Block sign-up if not invited and not the first user
              alert("Sign-up failed: No invitation found for this email address.");
              await signOut(auth);
              setUserId(null);
              setUser(null);
              setUserProfile(null);
              setIsLoading(false);
              return;
            }
          }

          // Merge any additional sign-up data (firstName, lastName, phone)
          const additionalData = pendingSignUpDataRef.current || {};
          pendingSignUpDataRef.current = null;

          const newUserProfile = {
            email: firebaseUser.email,
            role: userRole,
            firstName: additionalData.firstName || '',
            lastName: additionalData.lastName || '',
            phone: additionalData.phone || '',
            trialStartDate: new Date().toISOString(),
            subscriptionStatus: 'trial',
            createdAt: new Date().toISOString(),
          };

          await setDoc(userDocRef, newUserProfile);
          setUser(firebaseUser);
          setUserProfile(newUserProfile);
        }
      } else {
        setUserId(null);
        setUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const signUp = async (email, password, additionalData = {}) => {
    try {
      setError('');
      pendingSignUpDataRef.current = additionalData;
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result;
    } catch (err) {
      pendingSignUpDataRef.current = null;
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

  const resetPassword = async (email) => {
    try {
      setError('');
      await sendPasswordResetEmail(auth, email);
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
    setUserProfile,
    isLoading,
    error,
    signUp,
    signIn,
    logout,
    resetPassword,
    updateUserProfile,
    isAuthenticated: !!user,
    userRole: userProfile?.role || 'member',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
