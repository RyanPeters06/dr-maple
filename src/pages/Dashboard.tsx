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
import { createPairingCode } from '../services/firebase';

type DashSection = 'history' | 'map' | 'watch';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth0();
  const { sessions, isLoading, error, refresh } = useHealthHistory();
  const [activeSection, setActiveSection] = useState<DashSection>('history');
  const mainRef = useRef<HTMLDivElement>(null);
  useScrollReveal(mainRef);
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

        {/* User + sign out */}
        <div className="p-4 border-t border-rose-100 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3 min-w-0">
            {user?.picture
              ? <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-rose-200 object-cover flex-shrink-0" />
              : <div className="w-8 h-8 rounded-full bg-rose-100 border-2 border-rose-200 flex items-center justify-center text-sm text-rose-600 font-bold flex-shrink-0">
                  {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
                </div>
            }
            <span className="text-xs text-gray-600 font-medium truncate">
              {user?.name ?? user?.email}
            </span>
          </div>
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
        <div className={`flex-1 ${activeSection === 'map' ? '' : 'px-8 py-6'} min-h-0 overflow-auto`}>

          {/* ── Health History ─────────────────────────────────────────────── */}
          {activeSection === 'history' && (
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Health History</h2>
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

          {/* ── Apple Watch ────────────────────────────────────────────────── */}
          {activeSection === 'watch' && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Apple Watch Companion</h2>

              {/* Pairing card */}
              <div className="card border border-rose-100">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-2xl flex-shrink-0">
                    ⌚️
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Link Your Apple Watch</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Get a pairing code, enter it in the Dr. Maple Watch app on your iPhone, then tap Sync.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
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
              </div>

              {/* Health stats from watch */}
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-4">Your Health Stats</h3>
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
    </div>
  );
};
