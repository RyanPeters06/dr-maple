import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useHealthHistory } from '../hooks/useHealthHistory';
import { TRIAGE_LEVELS } from '../constants';
import type { TriageLevel } from '../constants';
import { ClinicMap } from '../components/ClinicMap';
import { useState } from 'react';

type DashTab = 'history' | 'map';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth0();
  const { sessions, isLoading, error, refresh } = useHealthHistory();
  const [activeTab, setActiveTab] = useState<DashTab>('history');

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const getUrgencyStyle = (urgency: string) => {
    const level = TRIAGE_LEVELS[urgency as TriageLevel];
    return level ?? TRIAGE_LEVELS['Non-urgent'];
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-600/30 border border-teal-600/50 flex items-center justify-center text-lg">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : '🧑'}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{user?.name ?? user?.email}</p>
              <p className="text-xs text-gray-500">{sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/call')}
              className="btn-primary py-2 px-4 text-sm"
            >
              + New Call
            </button>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-2 py-1"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-900 border-b border-gray-800 px-5 max-w-3xl mx-auto w-full">
        {([
          { id: 'history', label: 'Health History', icon: '📋' },
          { id: 'map', label: 'Find a Clinic', icon: '🗺️' },
        ] as { id: DashTab; label: string; icon: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-3xl mx-auto w-full ${activeTab === 'map' ? '' : 'px-5 py-5'}`}>
        {activeTab === 'history' && (
          <div>
            {/* Dr. Maple chat bubble */}
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center text-xl flex-shrink-0">
                🩺
              </div>
              <div className="bg-teal-900/30 border border-teal-700/30 rounded-2xl rounded-tl-none px-4 py-3 max-w-sm">
                <p className="text-sm text-teal-100">
                  {user?.name
                    ? `Welcome back, ${user.name.split(' ')[0]}! `
                    : 'Welcome back! '}
                  {sessions.length > 0
                    ? `I can see you've had ${sessions.length} session${sessions.length !== 1 ? 's' : ''} with me. How are you feeling today?`
                    : "You haven't had a session with me yet. Whenever you're ready, tap \"New Call\" above to get started."}
                </p>
              </div>
            </div>

            {/* Session history */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 text-sm mb-3">{error}</p>
                <button onClick={refresh} className="text-teal-400 text-sm hover:underline">
                  Try again
                </button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-3xl">
                  📋
                </div>
                <div>
                  <p className="text-gray-400 font-medium">No sessions yet</p>
                  <p className="text-gray-600 text-sm mt-1">Your health history will appear here after your first call.</p>
                </div>
                <button onClick={() => navigate('/call')} className="btn-primary">
                  Start Your First Call
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const urgencyStyle = getUrgencyStyle(session.triageResult.urgency);
                  return (
                    <button
                      key={session.id}
                      onClick={() => navigate(`/report/${session.id}`)}
                      className="w-full card hover:border-teal-700/50 transition-colors text-left group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold text-white ${urgencyStyle.bgClass}`}>
                              {session.triageResult.urgency}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(session.timestamp)}
                            </span>
                            {session.duration && (
                              <span className="text-xs text-gray-600">
                                · {formatDuration(session.duration)}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-white text-sm truncate">
                            {session.triageResult.action}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {session.triageResult.summary}
                          </p>
                          {session.triageResult.symptoms.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {session.triageResult.symptoms.slice(0, 3).map((s, i) => (
                                <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                                  {s}
                                </span>
                              ))}
                              {session.triageResult.symptoms.length > 3 && (
                                <span className="text-xs text-gray-600">
                                  +{session.triageResult.symptoms.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-gray-600 group-hover:text-teal-400 transition-colors flex-shrink-0">
                          →
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div style={{ height: 'calc(100vh - 130px)' }}>
            <ClinicMap />
          </div>
        )}
      </div>
    </div>
  );
};
