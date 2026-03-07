import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getUserSessions, type SessionRecord } from '../services/firebase';

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

  return { sessions, isLoading, error, refresh: loadSessions };
};
