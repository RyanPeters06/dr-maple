import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { subscribeAppleWatchMetrics, type AppleWatchMetrics } from '../services/firebase';

interface UseAppleWatchMetricsResult {
  metrics: AppleWatchMetrics | null;
  isLoading: boolean;
}

export const useAppleWatchMetrics = (): UseAppleWatchMetricsResult => {
  const { user, isAuthenticated } = useAuth0();
  const [metrics, setMetrics] = useState<AppleWatchMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.sub) {
      setMetrics(null);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeAppleWatchMetrics(user.sub, data => {
      setMetrics(data);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated, user?.sub]);

  return { metrics, isLoading };
};

