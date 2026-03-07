import { useState, useEffect } from 'react';
import { createVitalsSimulator, type PresageVitals } from '../services/presage';

const EMPTY_VITALS: PresageVitals = {
  heartRate: null,
  breathingRate: null,
  stressLevel: null,
  engagement: null,
};

export const usePresage = (_videoRef?: React.RefObject<HTMLVideoElement | null>) => {
  const [vitals, setVitals] = useState<PresageVitals>(EMPTY_VITALS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stop = createVitalsSimulator((data) => {
      setVitals(data);
      setIsReady(true);
    });

    return () => {
      stop();
      setIsReady(false);
      setVitals(EMPTY_VITALS);
    };
  }, []);

  return { vitals, isReady };
};
