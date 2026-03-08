import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getUserSessions, deleteSession as firebaseDeleteSession, type SessionRecord } from '../services/firebase';

export const useHealthHistory = () => {
  const { user, isAuthenticated } = useAuth0();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!isAuthenticated || !user?.sub) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserSessions(user.sub);
      setSessions(data);
    } catch (err) {
      setError('Failed to load health history');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.sub]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    // Optimistic update — remove from local state immediately
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    const ok = await firebaseDeleteSession(sessionId);
    if (!ok) {
      // Rollback on failure by reloading
      loadSessions();
    }
    return ok;
  }, [loadSessions]);

  return { sessions, isLoading, error, refresh: loadSessions, deleteSession };
};
