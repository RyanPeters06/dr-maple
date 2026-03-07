import type { PresageVitals } from '../services/presage';

interface PresageMonitorProps {
  vitals: PresageVitals;
  isReady: boolean;
}

const VitalItem = ({
  icon,
  label,
  value,
  unit,
  alert,
}: {
  icon: string;
  label: string;
  value: number | null;
  unit: string;
  alert?: boolean;
}) => (
  <div className={`vitals-badge ${alert ? 'border-red-500/40' : ''}`}>
    <span className="text-base">{icon}</span>
    <div>
      <p className="text-xs text-gray-500 leading-none">{label}</p>
      <p className={`font-semibold text-sm leading-none mt-0.5 ${alert ? 'text-red-400' : 'text-white'}`}>
        {value !== null ? `${value} ${unit}` : '—'}
      </p>
    </div>
  </div>
);

export const PresageMonitor = ({ vitals, isReady }: PresageMonitorProps) => {
  if (!isReady) {
    return (
      <div className="vitals-badge opacity-50">
        <span className="text-base">📷</span>
        <div>
          <p className="text-xs text-gray-500">Vitals monitor</p>
          <p className="text-xs text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  const heartRateAlert = vitals.heartRate !== null && (vitals.heartRate > 100 || vitals.heartRate < 50);
  const stressAlert = vitals.stressLevel !== null && vitals.stressLevel > 70;

  return (
    <div className="flex flex-col gap-2">
      <VitalItem
        icon="❤️"
        label="Heart Rate"
        value={vitals.heartRate}
        unit="bpm"
        alert={heartRateAlert}
      />
      <VitalItem
        icon="🌬️"
        label="Breathing"
        value={vitals.breathingRate}
        unit="/min"
      />
      <VitalItem
        icon="🧠"
        label="Stress"
        value={vitals.stressLevel}
        unit="/100"
        alert={stressAlert}
      />
      {vitals.engagement !== null && (
        <VitalItem
          icon="👁️"
          label="Engagement"
          value={vitals.engagement}
          unit="/100"
        />
      )}
      <div className="flex items-center gap-1.5 px-2">
        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        <span className="text-xs text-teal-400/70">Vitals Live</span>
      </div>
    </div>
  );
};
