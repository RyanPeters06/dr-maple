import type { PresageVitals } from '../services/presage';

interface PresageMonitorProps {
  vitals: PresageVitals;
  isReady: boolean;
}

const VitalItem = ({ icon, label, value, unit, alert }: {
  icon: string; label: string; value: number | null; unit: string; alert?: boolean;
}) => (
  <div className={`vitals-badge ${alert ? 'border-red-300' : ''}`}>
    <span className="text-base">{icon}</span>
    <div>
      <p className="text-xs text-gray-400 leading-none">{label}</p>
      <p className={`font-semibold text-sm leading-none mt-0.5 ${alert ? 'text-red-500' : 'text-gray-800'}`}>
        {value !== null ? `${value} ${unit}` : '—'}
      </p>
    </div>
  </div>
);

export const PresageMonitor = ({ vitals, isReady }: PresageMonitorProps) => {
  if (!isReady) return (
    <div className="vitals-badge opacity-60">
      <span>📷</span>
      <div>
        <p className="text-xs text-gray-400">Vitals</p>
        <p className="text-xs text-gray-300">Initializing...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <VitalItem icon="❤️" label="Heart Rate"   value={vitals.heartRate}     unit="bpm"  alert={vitals.heartRate !== null && (vitals.heartRate > 100 || vitals.heartRate < 50)} />
      <VitalItem icon="🌬️" label="Breathing"    value={vitals.breathingRate} unit="/min" />
      <VitalItem icon="🧠" label="Stress"        value={vitals.stressLevel}   unit="/100" alert={vitals.stressLevel !== null && vitals.stressLevel > 70} />
      <div className="flex items-center gap-1.5 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        <span className="text-xs text-rose-500">Vitals Live</span>
      </div>
    </div>
  );
};
