import type { AppleWatchMetrics } from '../services/firebase';

function formatSleepHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'rose' | 'emerald' | 'amber' | 'sky' | 'violet';
}

const accentClasses: Record<NonNullable<StatCardProps['accent']>, string> = {
  rose: 'bg-rose-50 border-rose-200 text-rose-700',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  sky: 'bg-sky-50 border-sky-200 text-sky-700',
  violet: 'bg-violet-50 border-violet-200 text-violet-700',
};

function StatCard({ icon, label, value, sub, accent = 'rose' }: StatCardProps) {
  return (
    <div className={`rounded-2xl border p-5 ${accentClasses[accent]} transition-shadow hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" aria-hidden>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
          <p className="text-xl font-bold mt-0.5 tabular-nums">{value}</p>
          {sub && <p className="text-xs mt-1 opacity-90">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

interface WatchCompanionStatsProps {
  metrics: AppleWatchMetrics | null;
  isLoading: boolean;
}

export function WatchCompanionStats({ metrics, isLoading }: WatchCompanionStatsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-20 h-20 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-4xl mx-auto mb-4 shadow-sm">
          ⌚️
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">No watch data yet</h2>
        <p className="text-gray-500 max-w-md mx-auto text-sm">
          Get a pairing code above, enter it in the Dr. Maple Watch app on your iPhone, then tap Sync to see your health stats here.
        </p>
      </div>
    );
  }

  const hasAny =
    typeof metrics.avgHeartRate === 'number' ||
    typeof metrics.stepsToday === 'number' ||
    typeof metrics.sleepDurationHours === 'number' ||
    typeof metrics.exerciseMinutes === 'number' ||
    typeof metrics.standHours === 'number' ||
    typeof metrics.activeEnergyKcal === 'number' ||
    (metrics.sleepQuality != null && metrics.sleepQuality !== '') ||
    typeof metrics.avgNoiseDbA === 'number';

  if (!hasAny) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-gray-500 text-sm">Watch connected. Sync from the app to see heart rate, sleep, and activity.</p>
        {metrics.updatedAt && (
          <p className="text-gray-400 text-xs mt-2">Last sync: {formatUpdatedAt(metrics.updatedAt)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {typeof metrics.sleepDurationHours === 'number' && (
          <StatCard
            icon="😴"
            label="Sleep last night"
            value={formatSleepHours(metrics.sleepDurationHours)}
            sub={metrics.sleepQuality ?? undefined}
            accent="violet"
          />
        )}
        {typeof metrics.avgHeartRate === 'number' && (
          <StatCard
            icon="❤️"
            label="Avg heart rate (24h)"
            value={`${Math.round(metrics.avgHeartRate)} bpm`}
            accent="rose"
          />
        )}
        {typeof metrics.stepsToday === 'number' && (
          <StatCard
            icon="🚶"
            label="Steps today"
            value={metrics.stepsToday.toLocaleString()}
            accent="emerald"
          />
        )}
        {typeof metrics.exerciseMinutes === 'number' && (
          <StatCard
            icon="🏃"
            label="Exercise"
            value={`${metrics.exerciseMinutes} min`}
            accent="amber"
          />
        )}
        {typeof metrics.standHours === 'number' && (
          <StatCard
            icon="🧍"
            label="Stand hours"
            value={metrics.standHours}
            sub="hours with at least 1 min standing"
            accent="sky"
          />
        )}
        {typeof metrics.activeEnergyKcal === 'number' && (
          <StatCard
            icon="🔥"
            label="Active energy"
            value={`${metrics.activeEnergyKcal} kcal`}
            accent="amber"
          />
        )}
        {typeof metrics.avgNoiseDbA === 'number' && (
          <StatCard
            icon="🔊"
            label="Avg noise exposure"
            value={`${Math.round(metrics.avgNoiseDbA)} dB`}
            accent="sky"
          />
        )}
      </div>
      {metrics.updatedAt && (
        <p className="text-xs text-gray-400">
          Data synced {formatUpdatedAt(metrics.updatedAt)} from your Apple Watch.
        </p>
      )}
    </div>
  );
}
