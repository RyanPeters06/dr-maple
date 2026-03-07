export interface PresageVitals {
  heartRate: number | null;
  breathingRate: number | null;
  stressLevel: number | null;
  engagement: number | null;
}

// Realistic vitals simulator — slowly drifts within normal ranges
const clamp = (val: number, min: number, max: number) =>
  Math.min(max, Math.max(min, val));

const drift = (current: number, min: number, max: number, step: number) => {
  const delta = (Math.random() - 0.5) * step;
  return clamp(current + delta, min, max);
};

interface SimState {
  heartRate: number;
  breathingRate: number;
  stressLevel: number;
  engagement: number;
}

export const createVitalsSimulator = (
  onVitals: (data: PresageVitals) => void
): (() => void) => {
  const state: SimState = {
    heartRate:     72 + Math.random() * 10,
    breathingRate: 15 + Math.random() * 3,
    stressLevel:   30 + Math.random() * 20,
    engagement:    70 + Math.random() * 20,
  };

  // Warm up delay — emit first reading after 3 seconds (mimics SDK init time)
  const warmup = setTimeout(() => {
    onVitals({
      heartRate:     Math.round(state.heartRate),
      breathingRate: Math.round(state.breathingRate),
      stressLevel:   Math.round(state.stressLevel),
      engagement:    Math.round(state.engagement),
    });
  }, 3000);

  // Update every 2 seconds with small realistic drifts
  const interval = setInterval(() => {
    state.heartRate     = drift(state.heartRate,     55, 105, 2);
    state.breathingRate = drift(state.breathingRate, 11, 22,  1);
    state.stressLevel   = drift(state.stressLevel,   15, 85,  3);
    state.engagement    = drift(state.engagement,    40, 100, 4);

    onVitals({
      heartRate:     Math.round(state.heartRate),
      breathingRate: Math.round(state.breathingRate),
      stressLevel:   Math.round(state.stressLevel),
      engagement:    Math.round(state.engagement),
    });
  }, 2000);

  return () => {
    clearTimeout(warmup);
    clearInterval(interval);
  };
};
