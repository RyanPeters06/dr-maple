import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HealthReport } from '../components/HealthReport';
import { ClinicMap } from '../components/ClinicMap';
import { getSession } from '../services/firebase';
import { downloadTranscriptPdf } from '../services/report';
import type { TriageResult } from '../constants';
import type { TranscriptMessage } from '../hooks/useGemini';

interface SessionData {
  triageResult: TriageResult;
  transcript: TranscriptMessage[];
  duration?: number;
  timestamp?: string;
  initialTab?: Tab;
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
    const stateData = (location.state as SessionData | null);
    if (stateData?.triageResult) {
      setSession(stateData);
      if (stateData.initialTab) setActiveTab(stateData.initialTab);
      setLoading(false);
      return;
    }
    if (id && id !== 'preview') {
      getSession(id).then(data => {
        if (data) setSession(data as SessionData);
        const initialTab = (location.state as { initialTab?: Tab } | null)?.initialTab;
        if (initialTab) setActiveTab(initialTab);
      }).catch(console.error).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [id, location.state]);

  if (loading) return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!session) return (
    <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400">Session not found.</p>
      <button onClick={() => navigate('/dashboard')} className="btn-primary">Back to Dashboard</button>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'report',     label: 'Report',     icon: '📄' },
    { id: 'map',        label: 'Clinics',    icon: '🗺️' },
    { id: 'transcript', label: 'Transcript', icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-rose-50 flex flex-col">
      <div className="px-4 py-3 bg-white border-b border-rose-100 shadow-sm flex items-center justify-between">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-rose-500 transition-colors flex items-center gap-2 text-sm">
          ← Dashboard
        </button>
        <img src="/dr-maple-logo.png" alt="Dr. Maple" className="h-20 object-contain" />
        <div className="w-16" />
      </div>

      <div className="flex bg-white border-b border-rose-100 px-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className={`flex-1 ${activeTab === 'map' ? '' : 'overflow-y-auto p-4'}`}>
        {activeTab === 'report' && (
          <div className="max-w-xl mx-auto">
            <HealthReport
              triageResult={session.triageResult}
              transcript={session.transcript}
              duration={session.duration}
              date={session.timestamp ? new Date(session.timestamp).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA')}
            />
          </div>
        )}
        {activeTab === 'map' && (
          <div style={{ height: 'calc(100vh - 120px)' }}><ClinicMap /></div>
        )}
        {activeTab === 'transcript' && (
          <div className="max-w-xl mx-auto space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Session Transcript</h2>
              {session.transcript?.length > 0 && (
                <button
                  onClick={() => downloadTranscriptPdf(
                    session.transcript,
                    session.timestamp ? new Date(session.timestamp).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA')
                  )}
                  className="text-sm text-rose-600 border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-50 transition-colors"
                >
                  Download PDF
                </button>
              )}
            </div>
            {session.transcript?.length > 0 ? session.transcript.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'doctor' ? '' : 'flex-row-reverse'}`}>
                <span className="text-xl flex-shrink-0">{msg.role === 'doctor' ? '🩺' : '🧑'}</span>
                <div className={`max-w-xs md:max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'doctor'
                    ? 'bg-white border border-rose-100 text-gray-800 rounded-tl-none shadow-sm'
                    : 'bg-rose-600 text-white rounded-tr-none'
                }`}>
                  <p className={`text-xs mb-1 ${msg.role === 'doctor' ? 'text-gray-400' : 'text-rose-200'}`}>
                    {msg.role === 'doctor' ? 'Dr. Maple' : 'You'}
                  </p>
                  {msg.text}
                </div>
              </div>
            )) : <p className="text-gray-400 text-sm">No transcript available.</p>}
          </div>
        )}
      </div>
    </div>
  );
};
