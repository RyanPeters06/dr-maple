import type { AppleWatchMetrics } from '../services/firebase';

interface LiveVitalsProps {
  watchMetrics: AppleWatchMetrics;
}

const VitalRow = ({
  icon,
  label,
  value,
  unit,
  alert,
}: {
  icon: string;
  label: string;
  value: number | string | null | undefined;
  unit: string;
  alert?: boolean;
}) => {
  if (value == null || value === '') return null;
  return (
    <div className={`vitals-badge ${alert ? 'border-red-500/40' : ''}`}>
      <span className="text-base">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 leading-none">{label}</p>
        <p className={`font-semibold text-sm leading-none mt-0.5 ${alert ? 'text-red-400' : 'text-white'}`}>
          {unit ? `${value} ${unit}` : String(value)}
        </p>
      </div>
    </div>
  );
};

export const LiveVitals = ({ watchMetrics }: LiveVitalsProps) => {
  const heartRate = watchMetrics.avgHeartRate != null ? Math.round(watchMetrics.avgHeartRate) : null;
  const heartRateAlert = heartRate != null && (heartRate > 100 || heartRate < 50);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-900/40 border border-emerald-600/40">
        <span className="text-sm">⌚</span>
        <span className="text-xs font-semibold text-emerald-300">Apple Watch</span>
      </div>

      <VitalRow icon="❤️" label="Heart rate" value={heartRate} unit="bpm" alert={heartRateAlert} />
      <VitalRow icon="🌬️" label="Breathing" value={watchMetrics.breathsPerMinute} unit="/min" />
      <VitalRow icon="🚶" label="Steps today" value={watchMetrics.stepsToday} unit="" />
      <VitalRow icon="🏃" label="Exercise" value={watchMetrics.exerciseMinutes} unit="min" />
      {watchMetrics.sleepDurationHours != null && (
        <VitalRow
          icon="😴"
          label="Sleep"
          value={watchMetrics.sleepDurationHours.toFixed(1)}
          unit={`h ${watchMetrics.sleepQuality ?? ''}`.trim()}
        />
      )}

      <div className="flex items-center gap-1.5 px-2">
        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        <span className="text-xs text-teal-400/70">Watch live</span>
      </div>
    </div>
  );
};
