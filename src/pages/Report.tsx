import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HealthReport } from '../components/HealthReport';
import { ClinicMap } from '../components/ClinicMap';
import { getSession } from '../services/firebase';
import type { TriageResult } from '../constants';
import type { TranscriptMessage } from '../hooks/useGemini';

interface SessionData {
  triageResult: TriageResult;
  transcript: TranscriptMessage[];
  duration?: number;
  timestamp?: string;
}

type Tab = 'report' | 'map' | 'transcript';

export const Report = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('report');

  useEffect(() => {
    // Check if data was passed via navigation state (preview mode)
    const stateData = (location.state as SessionData | null);
    if (stateData?.triageResult) {
      setSession(stateData);
      setLoading(false);
      return;
    }

    // Otherwise load from Firebase
    if (id && id !== 'preview') {
      getSession(id)
        .then(data => {
          if (data) setSession(data as SessionData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Session not found.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'report', label: 'Report', icon: '📄' },
    { id: 'map', label: 'Clinics', icon: '🗺️' },
    { id: 'transcript', label: 'Transcript', icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
          ← Dashboard
        </button>
        <h1 className="font-bold text-white text-sm">Session Report</h1>
        <div className="w-16" />
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-900 border-b border-gray-800 px-4">
        {tabs.map(tab => (
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
      <div className={`flex-1 ${activeTab === 'map' ? '' : 'overflow-y-auto p-4'}`}>
        {activeTab === 'report' && (
          <div className="max-w-xl mx-auto">
            <HealthReport
              triageResult={session.triageResult}
              transcript={session.transcript}
              duration={session.duration}
              date={session.timestamp
                ? new Date(session.timestamp).toLocaleDateString('en-CA')
                : new Date().toLocaleDateString('en-CA')}
            />
          </div>
        )}

        {activeTab === 'map' && (
          <div className="h-full" style={{ height: 'calc(100vh - 120px)' }}>
            <ClinicMap />
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="font-bold text-white mb-4">Session Transcript</h2>
            {session.transcript && session.transcript.length > 0 ? (
              session.transcript.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'doctor' ? '' : 'flex-row-reverse'}`}>
                  <span className="text-xl flex-shrink-0">{msg.role === 'doctor' ? '🩺' : '🧑'}</span>
                  <div
                    className={`max-w-xs md:max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'doctor'
                        ? 'bg-teal-900/40 text-teal-100 rounded-tl-none'
                        : 'bg-gray-700 text-white rounded-tr-none'
                    }`}
                  >
                    <p className="text-xs text-gray-500 mb-1">
                      {msg.role === 'doctor' ? 'Dr. Maple' : 'You'}
                    </p>
                    {msg.text}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No transcript available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
