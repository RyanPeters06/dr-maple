import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import type { TriageResult } from '../constants';
import type { TranscriptMessage } from '../hooks/useGemini';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = () =>
  !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_firebase_key';

let db: ReturnType<typeof getFirestore> | null = null;

const getDb = () => {
  if (!isConfigured()) return null;
  if (!db) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
};

export interface SessionRecord {
  id: string;
  userId: string;
  timestamp: string;
  triageResult: TriageResult;
  transcript: Pick<TranscriptMessage, 'role' | 'text'>[];
  duration?: number;
}

export const saveSession = async (
  userId: string,
  data: {
    triageResult: TriageResult;
    transcript: Pick<TranscriptMessage, 'role' | 'text'>[];
    duration?: number;
  }
): Promise<string | null> => {
  const firestore = getDb();
  if (!firestore) {
    console.warn('Firebase not configured — session not saved');
    return null;
  }

  try {
    const docRef = await addDoc(collection(firestore, 'sessions'), {
      userId,
      timestamp: Timestamp.now(),
      ...data,
    });
    return docRef.id;
  } catch (err) {
    console.error('Failed to save session:', err);
    return null;
  }
};

export const getUserSessions = async (userId: string): Promise<SessionRecord[]> => {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const q = query(
      collection(firestore, 'sessions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        timestamp: data.timestamp instanceof Timestamp
          ? data.timestamp.toDate().toISOString()
          : data.timestamp,
        triageResult: data.triageResult,
        transcript: data.transcript ?? [],
        duration: data.duration,
      };
    });
  } catch (err) {
    console.error('Failed to load sessions:', err);
    return [];
  }
};

export const getSession = async (sessionId: string): Promise<SessionRecord | null> => {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const docSnap = await getDoc(doc(firestore, 'sessions', sessionId));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      timestamp: data.timestamp instanceof Timestamp
        ? data.timestamp.toDate().toISOString()
        : data.timestamp,
      triageResult: data.triageResult,
      transcript: data.transcript ?? [],
      duration: data.duration,
    };
  } catch (err) {
    console.error('Failed to load session:', err);
    return null;
  }
};
