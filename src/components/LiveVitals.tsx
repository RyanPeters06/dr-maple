import type { PresageVitals } from '../services/presage';
import type { AppleWatchMetrics } from '../services/firebase';

interface LiveVitalsProps {
  vitals: PresageVitals;
  presageReady: boolean;
  watchMetrics: AppleWatchMetrics | null;
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
}) => (
  <div className={`vitals-badge ${alert ? 'border-red-500/40' : ''}`}>
    <span className="text-base">{icon}</span>
    <div>
      <p className="text-xs text-gray-500 leading-none">{label}</p>
      <p className={`font-semibold text-sm leading-none mt-0.5 ${alert ? 'text-red-400' : 'text-white'}`}>
        {value != null && value !== '' ? (unit ? `${value} ${unit}` : String(value)) : '—'}
      </p>
    </div>
  </div>
);

export const LiveVitals = ({ vitals, presageReady, watchMetrics }: LiveVitalsProps) => {
  const watchConnected =
    watchMetrics &&
    (watchMetrics.avgHeartRate != null ||
      watchMetrics.stepsToday != null ||
      watchMetrics.sleepDurationHours != null ||
      watchMetrics.exerciseMinutes != null);

  // Prefer Apple Watch heart rate when connected; fall back to camera
  const heartRate =
    watchConnected && watchMetrics?.avgHeartRate != null
      ? Math.round(watchMetrics.avgHeartRate)
      : vitals.heartRate;
  const heartRateAlert = heartRate != null && (heartRate > 100 || heartRate < 50);
  const stressAlert = vitals.stressLevel != null && vitals.stressLevel > 70;

  return (
    <div className="flex flex-col gap-2">
      {watchConnected && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-900/40 border border-emerald-600/40">
          <span className="text-sm">⌚</span>
          <span className="text-xs font-semibold text-emerald-300">Apple Watch connected</span>
        </div>
      )}
      <VitalRow
        icon="❤️"
        label={watchConnected ? "Heart rate (Watch)" : "Heart rate"}
        value={heartRate}
        unit="bpm"
        alert={heartRateAlert}
      />
      {watchConnected && (
        <>
          {watchMetrics?.stepsToday != null && (
            <VitalRow icon="🚶" label="Steps today" value={watchMetrics.stepsToday} unit="" />
          )}
          {watchMetrics?.exerciseMinutes != null && (
            <VitalRow icon="🏃" label="Exercise" value={watchMetrics.exerciseMinutes} unit="min" />
          )}
          {watchMetrics?.sleepDurationHours != null && (
            <VitalRow
              icon="😴"
              label="Sleep last night"
              value={watchMetrics.sleepDurationHours.toFixed(1)}
              unit={`h ${watchMetrics.sleepQuality ?? ''}`.trim()}
            />
          )}
        </>
      )}
      {presageReady && (
        <>
          <VitalRow
            icon="🌬️"
            label="Breathing"
            value={vitals.breathingRate}
            unit="/min"
          />
          <VitalRow
            icon="🧠"
            label="Stress"
            value={vitals.stressLevel}
            unit="/100"
            alert={stressAlert}
          />
        </>
      )}
      {!presageReady && !watchConnected && (
        <div className="vitals-badge opacity-50">
          <span className="text-base">📷</span>
          <div>
            <p className="text-xs text-gray-500">Live data</p>
            <p className="text-xs text-gray-600">Connect Apple Watch or allow camera for vitals</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 px-2">
        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        <span className="text-xs text-teal-400/70">
          {watchConnected ? "Watch + Live" : presageReady ? "Vitals Live" : "Waiting for data…"}
        </span>
      </div>
    </div>
  );
};
