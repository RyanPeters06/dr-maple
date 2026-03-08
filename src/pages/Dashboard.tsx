import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useHealthHistory } from '../hooks/useHealthHistory';
import { TRIAGE_LEVELS } from '../constants';
import type { TriageLevel } from '../constants';
import { ClinicMap } from '../components/ClinicMap';
import { WatchCompanionStats } from '../components/WatchCompanionStats';
import { useState, useRef } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useAppleWatchMetrics } from '../hooks/useAppleWatchMetrics';
import { useUserProfile } from '../hooks/useUserProfile';
import { createPairingCode, clearAppleWatchMetrics } from '../services/firebase';

type DashSection = 'history' | 'map' | 'watch';
type WatchBlockDetail = 'sleep' | 'heartRate' | 'exercise' | 'steps' | null;

function ageFromDateOfBirth(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth0();
  const { sessions, isLoading, error, refresh } = useHealthHistory();
  const [activeSection, setActiveSection] = useState<DashSection>('history');
  const mainRef = useRef<HTMLDivElement>(null);
  useScrollReveal(mainRef);
  const { metrics: watchMetrics, isLoading: watchLoading } = useAppleWatchMetrics();
  const { profile } = useUserProfile(user?.sub);
  const [watchBlockDetail, setWatchBlockDetail] = useState<WatchBlockDetail>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [sleepPeriod, setSleepPeriod] = useState<'night' | 'week' | 'month'>('night');
  const [heartRatePeriod, setHeartRatePeriod] = useState<'day' | 'week' | 'month'>('day');
  const [exercisePeriod, setExercisePeriod] = useState<'day' | 'week' | 'month'>('day');
  const [stepsPeriod, setStepsPeriod] = useState<'daily' | 'bestMonth'>('daily');

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-CA', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return null;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  const getUrgencyStyle = (urgency: string) =>
    TRIAGE_LEVELS[urgency as TriageLevel] ?? TRIAGE_LEVELS['Non-urgent'];

  const handleGeneratePairingCode = async () => {
    setPairingError(null);
    setPairingCode(null);
    if (!user?.sub) {
      setPairingError('Please sign out and sign in again to generate a code.');
      return;
    }
    setIsGeneratingCode(true);
    try {
      const { code, saved } = await createPairingCode(user.sub);
      setPairingCode(code);
      if (!saved) {
        setPairingError('Code not saved to cloud. In Firebase Console → Firestore Database → Rules, add allow read, write for pairingCodes, then Publish.');
      }
    } catch (err) {
      console.error('Pairing code error:', err);
      setPairingError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleDisconnectWatch = async () => {
    if (!user?.sub) return;
    setIsDisconnecting(true);
    try {
      await clearAppleWatchMetrics(user.sub);
      setPairingCode(null);
      setPairingError(null);
    } catch (err) {
      console.error('Disconnect error:', err);
      setPairingError(err instanceof Error ? err.message : 'Failed to disconnect.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const watchPaired = watchMetrics != null;

  const navItems: { id: DashSection | 'call'; icon: string; label: string; action: () => void }[] = [
    { id: 'call',    icon: '📞', label: 'New Call',       action: () => navigate('/call') },
    { id: 'history', icon: '📋', label: 'Health History', action: () => setActiveSection('history') },
    { id: 'watch',   icon: '⌚️', label: 'Apple Watch',    action: () => setActiveSection('watch') },
    { id: 'map',     icon: '🗺️', label: 'Find a Clinic',  action: () => setActiveSection('map') },
  ];

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* ── Left Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-rose-100 flex flex-col sticky top-0 h-screen z-20">
        {/* Logo */}
        <div className="px-4 py-3 border-b border-rose-100 flex items-center">
          <img
            src="/dr-maple-logo.png"
            alt="Dr. Maple"
            className="h-20 object-contain cursor-pointer"
            onClick={() => navigate('/')}
          />
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                item.id !== 'call' && activeSection === item.id
                  ? 'bg-rose-50 text-rose-600'
                  : item.id === 'call'
                  ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User + sign out — click user to open profile */}
        <div className="p-4 border-t border-rose-100 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-2 mb-3 min-w-0 rounded-lg py-1 pr-2 text-left hover:bg-rose-50/50 transition-colors"
          >
            {user?.picture
              ? <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-rose-200 object-cover flex-shrink-0" />
              : <div className="w-8 h-8 rounded-full bg-rose-100 border-2 border-rose-200 flex items-center justify-center text-sm text-rose-600 font-bold flex-shrink-0">
                  {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
                </div>
            }
            <span className="text-xs text-gray-600 font-medium truncate">
              {user?.name ?? user?.email}
            </span>
          </button>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="text-xs text-gray-400 hover:text-rose-600 transition-colors font-medium"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main ref={mainRef} className="flex-1 overflow-auto flex flex-col min-w-0">

        {/* Greeting header */}
        <div className="px-8 py-8 border-b border-rose-100 bg-white flex items-center gap-6 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="fade-in-up delay-1 text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-1">
              Welcome back,{' '}
              <span className="text-rose-600">{user?.name?.split(' ')[0] ?? 'there'}</span>
            </h1>
            <p className="fade-in-up delay-2 text-gray-400 text-sm">
              {sessions.length > 0
                ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''} recorded · How are you feeling today?`
                : "No sessions yet — start your first call with Dr. Maple."}
            </p>
          </div>
          <div className="hidden md:block relative flex-shrink-0">
            <div className="absolute w-32 h-32 rounded-full bg-rose-100 blur-2xl opacity-60" />
            <img src="/mascot-wave.png" alt="Dr. Maple" className="relative z-10 w-32 h-32 object-contain drop-shadow-xl" />
          </div>
        </div>

        {/* Section content */}
        <div className={`flex-1 ${activeSection === 'map' ? '' : 'px-8 py-8'} min-h-0 overflow-auto`}>

          {/* ── Health History ─────────────────────────────────────────────── */}
          {activeSection === 'history' && (
            <div className="min-h-[60vh] pb-16">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Health History</h2>
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <p className="text-red-400 text-sm mb-3">{error}</p>
                  <button onClick={refresh} className="text-rose-500 text-sm hover:underline">Try again</button>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center gap-5">
                  <div className="w-20 h-20 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-3xl shadow-sm">
                    📋
                  </div>
                  <div>
                    <p className="text-gray-700 font-semibold text-lg">No sessions yet</p>
                    <p className="text-gray-400 text-sm mt-1">Your health history will appear here after your first call.</p>
                  </div>
                  <button onClick={() => navigate('/call')} className="btn-primary px-8 py-3">
                    Start Your First Call
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {sessions.map((session, idx) => {
                    const style = getUrgencyStyle(session.triageResult.urgency);
                    return (
                      <button
                        key={session.id}
                        onClick={() => navigate(`/report/${session.id}`)}
                        className={`fade-in-up delay-${Math.min(idx + 1, 6)} text-left bg-white border border-rose-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-rose-300 transition-all group`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold text-white ${style.bgClass}`}>
                              {session.triageResult.urgency}
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(session.timestamp)}</span>
                            {session.duration && (
                              <span className="text-xs text-gray-300">{formatDuration(session.duration)}</span>
                            )}
                          </div>
                          <span className="text-gray-300 group-hover:text-rose-400 transition-colors text-sm flex-shrink-0">→</span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm mb-1">{session.triageResult.action}</p>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{session.triageResult.summary}</p>
                        {session.triageResult.symptoms.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {session.triageResult.symptoms.slice(0, 3).map((s, i) => (
                              <span key={i} className="text-xs bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full">
                                {s}
                              </span>
                            ))}
                            {session.triageResult.symptoms.length > 3 && (
                              <span className="text-xs text-gray-400">+{session.triageResult.symptoms.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Apple Watch ────────────────────────────────────────────────── */}
          {activeSection === 'watch' && (
            <div className="max-w-2xl min-h-[70vh] pb-20 space-y-10">
              <h2 className="text-xl font-bold text-gray-800">Apple Watch Companion</h2>

              {/* Pairing / Paired card */}
              <div className="card border border-rose-100 p-6 rounded-2xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-3xl flex-shrink-0">
                    ⌚️
                  </div>
                  <div className="min-w-0 flex-1">
                    {watchPaired ? (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800">Watch paired</p>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Paired
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Your Apple Watch is linked. Data appears below when you sync from the Watch app.
                        </p>
                        <button
                          type="button"
                          onClick={handleDisconnectWatch}
                          disabled={isDisconnecting}
                          className="mt-4 text-sm text-rose-600 hover:text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl px-4 py-2.5 transition-colors disabled:opacity-60"
                        >
                          {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-800">Link Your Apple Watch</p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Get a pairing code, enter it in the Dr. Maple Watch app on your iPhone, then tap Sync.
                        </p>
                        <div className="space-y-3 mt-4">
                          {pairingError && (
                            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                              <p className="text-xs text-red-500">{pairingError}</p>
                            </div>
                          )}
                          <button
                            onClick={handleGeneratePairingCode}
                            className="btn-primary w-full disabled:opacity-60 disabled:cursor-wait"
                            disabled={isGeneratingCode}
                          >
                            {isGeneratingCode ? 'Generating…' : 'Get Pairing Code'}
                          </button>
                          {pairingCode && (
                            <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200">
                              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Enter in Watch app (all caps)</p>
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-mono text-2xl text-rose-600 tracking-[0.3em] font-bold">{pairingCode}</p>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(pairingCode)}
                                  className="text-sm text-rose-400 hover:text-rose-600 border border-rose-200 rounded-lg px-3 py-1.5 transition-colors"
                                >
                                  Copy
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Sleep — inside Watch area, supports last night / week / month */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Sleep</h3>
                <div className="flex gap-2 mb-4">
                  {(['night', 'week', 'month'] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setSleepPeriod(period)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        sleepPeriod === period
                          ? 'bg-violet-100 text-violet-700 border border-violet-200'
                          : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {period === 'night' ? 'Last night' : period === 'week' ? 'This week' : 'This month'}
                    </button>
                  ))}
                </div>
                {watchLoading ? (
                  <div className="flex items-center justify-center py-16 rounded-2xl border border-violet-100 bg-violet-50/30">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : sleepPeriod === 'night' && watchMetrics?.sleepDurationHours != null ? (
                  <button
                    type="button"
                    onClick={() => setWatchBlockDetail('sleep')}
                    className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 md:p-8 shadow-sm w-full text-left hover:shadow-md hover:border-violet-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl flex-shrink-0">
                        😴
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 mb-0.5">Last night</p>
                        <p className="text-3xl md:text-4xl font-bold text-violet-900 tabular-nums">
                          {watchMetrics.sleepDurationHours < 1
                            ? `${Math.round(watchMetrics.sleepDurationHours * 60)} min`
                            : `${Math.floor(watchMetrics.sleepDurationHours)}h ${Math.round((watchMetrics.sleepDurationHours % 1) * 60)}m`}
                        </p>
                        {watchMetrics.sleepQuality && (
                          <p className="text-violet-600 font-medium mt-1">{watchMetrics.sleepQuality}</p>
                        )}
                        {watchMetrics.updatedAt && (
                          <p className="text-violet-400 text-xs mt-2">
                            Synced {new Date(watchMetrics.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-4">
                      Good sleep supports your immune system and recovery. Dr. Maple uses this during calls. Aim for 7–9 hours when you can.
                    </p>
                    <p className="text-xs text-violet-500 mt-2">Click for your profile &amp; personalized context</p>
                  </button>
                ) : sleepPeriod === 'week' || sleepPeriod === 'month' ? (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-8 text-center">
                    <p className="text-violet-700 font-medium mb-1">
                      {sleepPeriod === 'week' ? 'Weekly' : 'Monthly'} sleep summary
                    </p>
                    <p className="text-gray-500 text-sm">
                      {watchMetrics?.sleepDurationHours != null
                        ? 'Averages and trends for this period will appear here as you sync more sleep data from your Watch app.'
                        : 'Sync sleep data from the Watch app to see last night first; weekly and monthly views will fill in as more data is synced.'}
                    </p>
                  </div>
                ) : watchMetrics != null ? (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/30 py-10 px-6 text-center">
                    <p className="text-gray-600 text-sm">No sleep data for last night yet. Sync from the Dr. Maple Watch app to see it here.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 py-10 px-6 text-center">
                    <p className="text-gray-500 text-sm">Connect your Apple Watch above to see sleep (last night, weekly, and monthly).</p>
                  </div>
                )}
              </div>

              {/* Heart rate — same pattern as Sleep */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Heart rate</h3>
                <div className="flex gap-2 mb-4">
                  {(['day', 'week', 'month'] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setHeartRatePeriod(period)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        heartRatePeriod === period
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {period === 'day' ? 'Today' : period === 'week' ? 'This week' : 'This month'}
                    </button>
                  ))}
                </div>
                {watchLoading ? (
                  <div className="flex items-center justify-center py-16 rounded-2xl border border-rose-100 bg-rose-50/30">
                    <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : heartRatePeriod === 'day' && typeof watchMetrics?.avgHeartRate === 'number' ? (
                  <button
                    type="button"
                    onClick={() => setWatchBlockDetail('heartRate')}
                    className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 md:p-8 shadow-sm w-full text-left hover:shadow-md hover:border-rose-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center text-3xl flex-shrink-0">
                        ❤️
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-0.5">Avg heart rate (24h)</p>
                        <p className="text-3xl md:text-4xl font-bold text-rose-900 tabular-nums">
                          {Math.round(watchMetrics.avgHeartRate)} bpm
                        </p>
                        {watchMetrics.updatedAt && (
                          <p className="text-rose-400 text-xs mt-2">
                            Synced {new Date(watchMetrics.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-4">
                      Resting and active heart rate help Dr. Maple understand your cardiovascular state during calls.
                    </p>
                    <p className="text-xs text-rose-500 mt-2">Click for your profile &amp; personalized context</p>
                  </button>
                ) : heartRatePeriod === 'week' || heartRatePeriod === 'month' ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-8 text-center">
                    <p className="text-rose-700 font-medium mb-1">
                      {heartRatePeriod === 'week' ? 'Weekly' : 'Monthly'} heart rate summary
                    </p>
                    <p className="text-gray-500 text-sm">
                      {typeof watchMetrics?.avgHeartRate === 'number'
                        ? 'Averages and trends for this period will appear here as more data is synced.'
                        : 'Sync from the Watch app to see today first; weekly and monthly views will fill in with more data.'}
                    </p>
                  </div>
                ) : watchMetrics != null ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/30 py-10 px-6 text-center">
                    <p className="text-gray-600 text-sm">No heart rate data yet. Sync from the Dr. Maple Watch app to see it here.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 py-10 px-6 text-center">
                    <p className="text-gray-500 text-sm">Connect your Apple Watch above to see heart rate (today, weekly, and monthly).</p>
                  </div>
                )}
              </div>

              {/* Exercise — same pattern */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Exercise</h3>
                <div className="flex gap-2 mb-4">
                  {(['day', 'week', 'month'] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setExercisePeriod(period)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        exercisePeriod === period
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {period === 'day' ? 'Today' : period === 'week' ? 'This week' : 'This month'}
                    </button>
                  ))}
                </div>
                {watchLoading ? (
                  <div className="flex items-center justify-center py-16 rounded-2xl border border-amber-100 bg-amber-50/30">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : exercisePeriod === 'day' && typeof watchMetrics?.exerciseMinutes === 'number' ? (
                  <button
                    type="button"
                    onClick={() => setWatchBlockDetail('exercise')}
                    className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 md:p-8 shadow-sm w-full text-left hover:shadow-md hover:border-amber-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl flex-shrink-0">
                        🏃
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-0.5">Exercise today</p>
                        <p className="text-3xl md:text-4xl font-bold text-amber-900 tabular-nums">
                          {watchMetrics.exerciseMinutes} min
                        </p>
                        {watchMetrics.updatedAt && (
                          <p className="text-amber-500 text-xs mt-2">
                            Synced {new Date(watchMetrics.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-4">
                      Movement and exercise minutes help Dr. Maple tailor advice. Even short bouts count.
                    </p>
                    <p className="text-xs text-amber-600 mt-2">Click for your profile &amp; personalized context</p>
                  </button>
                ) : exercisePeriod === 'week' || exercisePeriod === 'month' ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-8 text-center">
                    <p className="text-amber-700 font-medium mb-1">
                      {exercisePeriod === 'week' ? 'Weekly' : 'Monthly'} exercise summary
                    </p>
                    <p className="text-gray-500 text-sm">
                      {typeof watchMetrics?.exerciseMinutes === 'number'
                        ? 'Totals and trends for this period will appear here as more data is synced.'
                        : 'Sync from the Watch app to see today first; weekly and monthly views will fill in with more data.'}
                    </p>
                  </div>
                ) : watchMetrics != null ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/30 py-10 px-6 text-center">
                    <p className="text-gray-600 text-sm">No exercise data yet. Sync from the Dr. Maple Watch app to see it here.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 py-10 px-6 text-center">
                    <p className="text-gray-500 text-sm">Connect your Apple Watch above to see exercise (today, weekly, and monthly).</p>
                  </div>
                )}
              </div>

              {/* Steps — Daily (main) and Highest step count this month */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Steps</h3>
                <div className="flex gap-2 mb-4">
                  {(['daily', 'bestMonth'] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setStepsPeriod(period)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        stepsPeriod === period
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {period === 'daily' ? 'Daily' : 'Highest step count this month'}
                    </button>
                  ))}
                </div>
                {watchLoading ? (
                  <div className="flex items-center justify-center py-16 rounded-2xl border border-emerald-100 bg-emerald-50/30">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : stepsPeriod === 'daily' && typeof watchMetrics?.stepsToday === 'number' ? (
                  <button
                    type="button"
                    onClick={() => setWatchBlockDetail('steps')}
                    className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 md:p-8 shadow-sm w-full text-left hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-3xl flex-shrink-0">
                        🚶
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-0.5">Steps today</p>
                        <p className="text-3xl md:text-4xl font-bold text-emerald-900 tabular-nums">
                          {watchMetrics.stepsToday.toLocaleString()}
                        </p>
                        <p className="text-emerald-600 text-sm mt-1">steps</p>
                        {watchMetrics.updatedAt && (
                          <p className="text-emerald-500 text-xs mt-2">
                            Synced {new Date(watchMetrics.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-4">
                      Daily steps reflect your activity level. Dr. Maple can use this context during triage.
                    </p>
                    <p className="text-xs text-emerald-600 mt-2">Click for your profile &amp; personalized context</p>
                  </button>
                ) : stepsPeriod === 'bestMonth' && typeof watchMetrics?.stepsToday === 'number' ? (
                  <button
                    type="button"
                    onClick={() => setWatchBlockDetail('steps')}
                    className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 md:p-8 shadow-sm w-full text-left hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-3xl flex-shrink-0">
                        🚶
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-0.5">Highest step count this month</p>
                        <p className="text-3xl md:text-4xl font-bold text-emerald-900 tabular-nums">
                          {watchMetrics.stepsToday.toLocaleString()}
                        </p>
                        <p className="text-emerald-600 text-sm mt-1">steps</p>
                        {watchMetrics.updatedAt && (
                          <p className="text-emerald-500 text-xs mt-2">
                            Synced {new Date(watchMetrics.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-4">
                      Your best day this month so far. Sync more days to see your true top day — can you beat it?
                    </p>
                    <p className="text-xs text-emerald-600 mt-2">Click for your profile &amp; personalized context</p>
                  </button>
                ) : watchMetrics != null ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 py-10 px-6 text-center">
                    <p className="text-gray-600 text-sm">No steps data yet. Sync from the Dr. Maple Watch app to see it here.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 py-10 px-6 text-center">
                    <p className="text-gray-500 text-sm">Connect your Apple Watch above to see daily steps and your highest step count this month.</p>
                  </div>
                )}
              </div>

              {/* Other health stats (stand, active energy, noise) */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-5">More from your watch</h3>
                <WatchCompanionStats metrics={watchMetrics} isLoading={watchLoading} />
              </div>
            </div>
          )}

          {/* ── Find a Clinic ──────────────────────────────────────────────── */}
          {activeSection === 'map' && (
            <div style={{ height: 'calc(100vh - 120px)' }}>
              <ClinicMap />
            </div>
          )}
        </div>
      </main>

      {/* Watch block detail modal — profile + contextual averages */}
      {watchBlockDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setWatchBlockDetail(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Metric detail and profile context"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] overflow-auto border border-rose-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  {watchBlockDetail === 'sleep' && 'Sleep'}
                  {watchBlockDetail === 'heartRate' && 'Heart rate'}
                  {watchBlockDetail === 'exercise' && 'Exercise'}
                  {watchBlockDetail === 'steps' && 'Steps'}
                </h3>
                <button
                  type="button"
                  onClick={() => setWatchBlockDetail(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Current value */}
              {watchBlockDetail === 'sleep' && watchMetrics?.sleepDurationHours != null && (
                <p className="text-2xl font-bold text-violet-700 mb-2">
                  Last night: {watchMetrics.sleepDurationHours < 1
                    ? `${Math.round(watchMetrics.sleepDurationHours * 60)} min`
                    : `${Math.floor(watchMetrics.sleepDurationHours)}h ${Math.round((watchMetrics.sleepDurationHours % 1) * 60)}m`}
                  {watchMetrics.sleepQuality && ` · ${watchMetrics.sleepQuality}`}
                </p>
              )}
              {watchBlockDetail === 'heartRate' && typeof watchMetrics?.avgHeartRate === 'number' && (
                <p className="text-2xl font-bold text-rose-700 mb-2">Today: {Math.round(watchMetrics.avgHeartRate)} bpm</p>
              )}
              {watchBlockDetail === 'exercise' && typeof watchMetrics?.exerciseMinutes === 'number' && (
                <p className="text-2xl font-bold text-amber-700 mb-2">Today: {watchMetrics.exerciseMinutes} min</p>
              )}
              {watchBlockDetail === 'steps' && typeof watchMetrics?.stepsToday === 'number' && (
                <p className="text-2xl font-bold text-emerald-700 mb-2">{watchMetrics.stepsToday.toLocaleString()} steps</p>
              )}

              {/* Your profile */}
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Your profile (for personalized context)</h4>
                {profile && (profile.sex || profile.heightCm != null || profile.weightKg != null || profile.dateOfBirth) ? (
                  <ul className="text-sm text-gray-600 space-y-0.5">
                    {profile.sex && <li>Sex: {profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1)}</li>}
                    {ageFromDateOfBirth(profile.dateOfBirth) != null && (
                      <li>Age: {ageFromDateOfBirth(profile.dateOfBirth)} years</li>
                    )}
                    {profile.heightCm != null && <li>Height: {profile.heightCm} cm</li>}
                    {profile.weightKg != null && <li>Weight: {profile.weightKg} kg</li>}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Add your age, sex, height, and weight in your profile to see averages and context tailored to you.</p>
                )}
                <button
                  type="button"
                  onClick={() => { setWatchBlockDetail(null); navigate('/profile'); }}
                  className="mt-2 text-sm text-rose-600 hover:text-rose-700 font-medium"
                >
                  {profile ? 'Edit profile' : 'Add profile'}
                </button>
              </div>

              {/* Context by metric */}
              {watchBlockDetail === 'sleep' && (
                <p className="text-sm text-gray-600">Adults typically need 7–9 hours of sleep. Your profile helps Dr. Maple compare your sleep to others like you and give better advice during calls.</p>
              )}
              {watchBlockDetail === 'heartRate' && (
                <p className="text-sm text-gray-600">Resting heart rate varies by age and fitness. With your age and sex, we can show how your reading compares to typical ranges.</p>
              )}
              {watchBlockDetail === 'exercise' && (
                <p className="text-sm text-gray-600">Health guidelines suggest 150+ minutes of moderate activity per week. Your profile helps personalize what “moderate” means for you.</p>
              )}
              {watchBlockDetail === 'steps' && (
                <p className="text-sm text-gray-600">Daily steps vary by age and lifestyle. Your profile lets us tailor step goals and context to you.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
