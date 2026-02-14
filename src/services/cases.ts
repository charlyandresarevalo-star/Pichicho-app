import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { ActionItem, CaseFilters, CaseItem, CaseStatus, CommentItem, ReportItem } from '../types/models';

export const createCase = async (data: Omit<CaseItem, 'id'>) => {
  const docRef = await addDoc(collection(db, 'cases'), data);
  return docRef.id;
};

export const uploadCasePhoto = async (uri: string, userId: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileRef = ref(storage, `cases/${userId}/${Date.now()}.jpg`);
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
};

export const subscribeCases = (
  callback: (items: CaseItem[]) => void,
  filters?: CaseFilters,
  neighborhood?: string,
) => {
  const minDate = Date.now() - (filters?.timeframe === '24h' ? 24 : 24 * 7) * 60 * 60 * 1000;

  let q = query(collection(db, 'cases'), where('createdAt', '>=', minDate), orderBy('createdAt', 'desc'));
  if (filters?.caseType) {
    q = query(q, where('caseType', '==', filters.caseType));
  }
  if (filters?.urgencyOnly) {
    q = query(q, where('urgency', '==', 'alta'));
  }
  if (neighborhood) {
    q = query(q, where('neighborhood', '==', neighborhood));
  }

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CaseItem, 'id'>) }));
    callback(items);
  });
};

export const addComment = async (comment: Omit<CommentItem, 'id'>) => {
  await addDoc(collection(db, 'comments'), comment);
};

export const listComments = async (caseId: string) => {
  const q = query(collection(db, 'comments'), where('caseId', '==', caseId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommentItem, 'id'>) }));
};

export const addAction = async (action: Omit<ActionItem, 'id'>) => {
  await addDoc(collection(db, 'actions'), action);
};

export const updateCaseStatus = async (caseId: string, status: CaseStatus) => {
  await updateDoc(doc(db, 'cases', caseId), { status });
};

export const createReport = async (report: Omit<ReportItem, 'id'>) => {
  await addDoc(collection(db, 'reports'), report);
};
