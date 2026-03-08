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
  setDoc,
  onSnapshot,
  deleteDoc,
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
  triageResult?: TriageResult;
  transcript: Pick<TranscriptMessage, 'role' | 'text'>[];
  duration?: number;
}

export interface AppleWatchMetrics {
  avgHeartRate?: number | null;
  breathsPerMinute?: number | null;
  stepsToday?: number;
  activeEnergyKcal?: number;
  exerciseMinutes?: number;
  standHours?: number;
  sleepDurationHours?: number | null;
  sleepQuality?: string | null;
  avgNoiseDbA?: number | null;
  updatedAt?: string | null;
}

export const saveSession = async (
  userId: string,
  data: {
    triageResult?: TriageResult;
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
      transcript: data.transcript,
      // Firestore rejects `undefined` — only include optional fields when they have a value
      ...(data.triageResult != null && { triageResult: data.triageResult }),
      ...(data.duration != null && { duration: data.duration }),
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

const PAIRING_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAIRING_CODE_LENGTH = 6;

const generatePairingCode = () => {
  let code = '';
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * PAIRING_CODE_CHARS.length);
    code += PAIRING_CODE_CHARS[idx];
  }
  return code;
};

const PAIRING_CODE_TIMEOUT_MS = 12_000;

export type PairingCodeResult = { code: string; saved: boolean };

export const createPairingCode = async (userId: string): Promise<PairingCodeResult> => {
  const code = generatePairingCode();
  const firestore = getDb();
  if (!firestore) {
    return { code, saved: false };
  }

  const ref = doc(firestore, 'pairingCodes', code);
  const writePromise = setDoc(ref, {
    userId,
    createdAt: Timestamp.now(),
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), PAIRING_CODE_TIMEOUT_MS);
  });
  try {
    await Promise.race([writePromise, timeoutPromise]);
    return { code, saved: true };
  } catch {
    return { code, saved: false };
  }
};

export const subscribeAppleWatchMetrics = (
  userId: string,
  onChange: (metrics: AppleWatchMetrics | null) => void
): (() => void) | null => {
  const firestore = getDb();
  if (!firestore) {
    onChange(null);
    return null;
  }

  const metricsDoc = doc(firestore, 'users', userId, 'appleWatchMetrics', 'current');

  const unsubscribe = onSnapshot(
    metricsDoc,
    snapshot => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      const data = snapshot.data();
      const updatedAt =
        data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt ?? null;

      const metrics: AppleWatchMetrics = {
        avgHeartRate: data.avgHeartRate ?? null,
        breathsPerMinute: data.breathsPerMinute ?? data.respiratoryRate ?? null,
        stepsToday: data.stepsToday,
        activeEnergyKcal: data.activeEnergyKcal,
        exerciseMinutes: data.exerciseMinutes,
        standHours: data.standHours,
        sleepDurationHours: data.sleepDurationHours ?? null,
        sleepQuality: data.sleepQuality ?? null,
        avgNoiseDbA: data.avgNoiseDbA ?? null,
        updatedAt,
      };

      onChange(metrics);
    },
    error => {
      console.error('Failed to subscribe to Apple Watch metrics:', error);
      onChange(null);
    }
  );

  return unsubscribe;
};

/** Clears Apple Watch metrics for the user (disconnect on web — stops showing watch data). */
export const clearAppleWatchMetrics = async (userId: string): Promise<void> => {
  const firestore = getDb();
  if (!firestore) return;
  const metricsRef = doc(firestore, 'users', userId, 'appleWatchMetrics', 'current');
  await deleteDoc(metricsRef);
};

// ─── User profile (demographics, medical history, medications, allergies) ───

export interface UserProfile {
  // Demographics (for future averages / personalization)
  sex?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  dateOfBirth?: string | null; // ISO date, used to compute age
  // Medical
  pastMedicalProblems?: string[]; // e.g. ["Asthma", "Hypertension"]
  currentMedications?: string[];  // e.g. ["Lisinopril 10mg", "Vitamin D"]
  allergies?: string[];          // e.g. ["Penicillin", "Peanuts"]
  updatedAt?: string | null;
}

const USER_PROFILE_COLLECTION = 'userProfiles';

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const firestore = getDb();
  if (!firestore) return null;
  try {
    const ref = doc(firestore, USER_PROFILE_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      sex: data.sex ?? null,
      heightCm: data.heightCm ?? null,
      weightKg: data.weightKg ?? null,
      dateOfBirth: data.dateOfBirth ?? null,
      pastMedicalProblems: Array.isArray(data.pastMedicalProblems) ? data.pastMedicalProblems : [],
      currentMedications: Array.isArray(data.currentMedications) ? data.currentMedications : [],
      allergies: Array.isArray(data.allergies) ? data.allergies : [],
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt ?? null,
    };
  } catch (err) {
    console.error('Failed to get user profile:', err);
    return null;
  }
};

export const saveUserProfile = async (userId: string, profile: UserProfile): Promise<boolean> => {
  const firestore = getDb();
  if (!firestore) {
    const err = new Error('Firebase is not configured. Add VITE_FIREBASE_* env vars.');
    console.error(err.message);
    throw err;
  }
  const ref = doc(firestore, USER_PROFILE_COLLECTION, userId);
  await setDoc(ref, {
    sex: profile.sex ?? null,
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    dateOfBirth: profile.dateOfBirth ?? null,
    pastMedicalProblems: profile.pastMedicalProblems ?? [],
    currentMedications: profile.currentMedications ?? [],
    allergies: profile.allergies ?? [],
    updatedAt: Timestamp.now(),
  }, { merge: true });
  return true;
};

// ─── Symptom log (personal symptom diary, persisted per user) ────────────────

export interface SymptomEntry {
  id: string;
  date: string;
  symptom: string;
  note: string;
}

const SYMPTOM_LOG_COLLECTION = 'symptomLogs';

export const getSymptomLog = async (userId: string): Promise<SymptomEntry[] | null> => {
  const firestore = getDb();
  if (!firestore) return null;
  try {
    const ref = doc(firestore, SYMPTOM_LOG_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return Array.isArray(data.entries) ? data.entries : [];
  } catch (err) {
    console.error('Failed to load symptom log:', err);
    return null;
  }
};

export const saveSymptomLog = async (userId: string, entries: SymptomEntry[]): Promise<void> => {
  const firestore = getDb();
  if (!firestore) return;
  try {
    const ref = doc(firestore, SYMPTOM_LOG_COLLECTION, userId);
    await setDoc(ref, { entries, updatedAt: Timestamp.now() });
  } catch (err) {
    console.error('Failed to save symptom log:', err);
  }
};
