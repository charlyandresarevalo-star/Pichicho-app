import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types/models';

export const signInEmail = async (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signUpEmail = async (email: string, password: string, displayName: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile: UserProfile = {
    id: cred.user.uid,
    displayName,
    email,
    createdAt: Date.now(),
    helpsCount: 0,
  };
  await setDoc(doc(db, 'users', cred.user.uid), profile);
  return cred;
};

export const logout = async () => signOut(auth);

export const subscribeAuth = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb);

export const getProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.data() as UserProfile | undefined;
};
