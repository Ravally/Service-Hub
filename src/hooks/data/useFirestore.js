import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

/**
 * Generic Firestore collection hook with real-time updates
 * @param {string} userId - User ID
 * @param {string} collectionName - Collection name
 * @param {Object} queryConstraints - Optional query constraints
 * @returns {Object} { data, loading, error, add, update, remove }
 */
export function useFirestoreCollection(userId, collectionName, queryConstraints = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const collectionRef = collection(db, `users/${userId}/${collectionName}`);
    const q = queryConstraints ? query(collectionRef, ...queryConstraints) : collectionRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, collectionName, queryConstraints]);

  const add = async (item) => {
    if (!userId) throw new Error('User not authenticated');
    const docRef = await addDoc(collection(db, `users/${userId}/${collectionName}`), {
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return docRef.id;
  };

  const update = async (id, updates) => {
    if (!userId) throw new Error('User not authenticated');
    await updateDoc(doc(db, `users/${userId}/${collectionName}`, id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  };

  const set = async (id, item) => {
    if (!userId) throw new Error('User not authenticated');
    await setDoc(doc(db, `users/${userId}/${collectionName}`, id), {
      ...item,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  };

  const remove = async (id) => {
    if (!userId) throw new Error('User not authenticated');
    await deleteDoc(doc(db, `users/${userId}/${collectionName}`, id));
  };

  return { data, loading, error, add, update, set, remove };
}
