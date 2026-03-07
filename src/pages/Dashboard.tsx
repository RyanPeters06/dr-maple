import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useHealthHistory } from '../hooks/useHealthHistory';
import { TRIAGE_LEVELS } from '../constants';
import type { TriageLevel } from '../constants';
import { ClinicMap } from '../components/ClinicMap';
import { useState, useRef } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useAppleWatchMetrics } from '../hooks/useAppleWatchMetrics';
import { createPairingCode } from '../services/firebase';

type DashTab = 'history' | 'map';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth0();
  const { sessions, isLoading, error, refresh } = useHealthHistory();
  const [activeTab, setActiveTab] = useState<DashTab>('history');
  const pageRef = useRef<HTMLDivElement>(null);
  useScrollReveal(pageRef);
  const { metrics: watchMetrics, isLoading: watchLoading } = useAppleWatchMetrics();
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

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

  return (
    <div ref={pageRef} className="min-h-screen bg-white flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-rose-100 bg-white sticky top-0 z-30">
        <img src="/dr-maple-logo.png" alt="Dr. Maple" className="h-28 object-contain cursor-pointer" onClick={() => navigate('/')} />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            {user?.picture
              ? <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-rose-200 object-cover" />
              : <div className="w-8 h-8 rounded-full bg-rose-100 border-2 border-rose-200 flex items-center justify-center text-sm text-rose-600 font-bold">
                  {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
                </div>
            }
            <span className="text-sm text-gray-600 font-medium hidden md:block">
              {user?.name ?? user?.email}
            </span>
          </div>
          <button onClick={() => navigate('/call')} className="btn-primary py-2 px-5 text-sm">
            New Call
          </button>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="text-sm text-gray-400 hover:text-rose-600 font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Hero greeting ───────────────────────────────────────────────────── */}
      <section className="px-8 md:px-16 py-10 max-w-7xl mx-auto w-full flex items-center gap-8">
        <div className="flex-1">
          <h1 className="fade-in-up delay-1 text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-3">
            Welcome back,{' '}
            <span className="text-rose-600">{user?.name?.split(' ')[0] ?? 'there'}</span>
          </h1>
          <p className="fade-in-up delay-2 text-gray-400 text-base mb-6">
            {sessions.length > 0
              ? `You have ${sessions.length} session${sessions.length !== 1 ? 's' : ''} recorded. How are you feeling today?`
              : "You haven't had a session yet. Start your first call with Dr. Maple below."}
          </p>
          <div className="fade-in-up delay-3 flex items-center gap-3 flex-wrap">
            <button onClick={() => navigate('/call')} className="btn-primary px-8 py-3">
              Start a Call with Dr. Maple
            </button>
            <button onClick={() => setActiveTab('map')} className="btn-ghost px-6 py-3 text-rose-600">
              Find a Clinic
            </button>
          </div>
        </div>
        <div className="hidden md:block relative">
          <div className="absolute w-48 h-48 rounded-full bg-rose-100 blur-2xl opacity-60" />
          <img
            src="/mascot-wave.png"
            alt="Dr. Maple"
            className="fade-in-up delay-2 relative z-10 w-48 h-48 object-contain drop-shadow-xl"
          />
        </div>
      </section>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="px-8 md:px-16 max-w-7xl mx-auto w-full">
        <div className="flex border-b border-rose-100 gap-1">
          {([
            { id: 'history', label: 'Health History' },
            { id: 'map',     label: 'Find a Clinic'  },
          ] as { id: DashTab; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className={`flex-1 max-w-7xl mx-auto w-full ${activeTab === 'map' ? '' : 'px-8 md:px-16 py-6'}`}>

        {activeTab === 'history' && (
          <>
            {/* Apple Watch companion card */}
            <div className="card mb-6 border border-rose-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-lg flex-shrink-0">
                    ⌚️
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Dr. Maple Watch Companion</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Connect your Apple Watch to share heart rate, sleep, and activity data with Dr. Maple.
                    </p>
                    {watchMetrics && (
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                        {typeof watchMetrics.avgHeartRate === 'number' && (
                          <p>❤️ Avg HR (24h): <span className="font-semibold text-gray-800">{Math.round(watchMetrics.avgHeartRate)} bpm</span></p>
                        )}
                        {typeof watchMetrics.stepsToday === 'number' && (
                          <p>🚶 Steps today: <span className="font-semibold text-gray-800">{watchMetrics.stepsToday}</span></p>
                        )}
                        {typeof watchMetrics.exerciseMinutes === 'number' && (
                          <p>🏃 Exercise: <span className="font-semibold text-gray-800">{watchMetrics.exerciseMinutes} min</span></p>
                        )}
                        {typeof watchMetrics.sleepDurationHours === 'number' && (
                          <p>😴 Sleep last night: <span className="font-semibold text-gray-800">{watchMetrics.sleepDurationHours.toFixed(1)} h</span></p>
                        )}
                      </div>
                    )}
                    {!watchMetrics && !watchLoading && (
                      <p className="text-xs text-gray-400 mt-2">
                        After pairing, open the Dr. Maple Watch app on your iPhone and tap &quot;Sync&quot; to send data here.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {pairingError && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-left max-w-xs">
                      <p className="text-xs text-red-500">{pairingError}</p>
                    </div>
                  )}
                  <button
                    onClick={handleGeneratePairingCode}
                    className="btn-primary px-3 py-1.5 text-xs disabled:opacity-60 disabled:cursor-wait"
                    disabled={isGeneratingCode}
                  >
                    {isGeneratingCode ? 'Generating…' : 'Get Pairing Code'}
                  </button>
                  {pairingCode && (
                    <div className="mt-1 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pairing code — enter in all caps on phone</p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="font-mono text-lg text-rose-600 tracking-[0.25em]">{pairingCode}</p>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(pairingCode)}
                          className="text-xs text-rose-400 hover:text-rose-600 whitespace-nowrap"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Session history */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions.map((session, idx) => {
                  const style = getUrgencyStyle(session.triageResult.urgency);
                  return (
                    <button
                      key={session.id}
                      onClick={() => navigate(`/report/${session.id}`)}
                      className={`fade-in-up delay-${Math.min(idx + 1, 6)} text-left bg-white border border-rose-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-rose-300 transition-all group`}
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
          </>
        )}

        {activeTab === 'map' && (
          <div style={{ height: 'calc(100vh - 200px)' }}>
            <ClinicMap />
          </div>
        )}
      </div>
    </div>
  );
};
