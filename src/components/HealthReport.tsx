import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { generateHealthReport } from '../services/report';
import { TRIAGE_LEVELS } from '../constants';
import type { TriageResult } from '../constants';
import type { TranscriptMessage } from '../hooks/useGemini';

interface HealthReportProps {
  triageResult: TriageResult;
  transcript?: TranscriptMessage[];
  duration?: number;
  date?: string;
}

export const HealthReport = ({ triageResult, transcript, duration, date }: HealthReportProps) => {
  const { user } = useAuth0();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      generateHealthReport({
        patientName: user?.name ?? user?.email ?? 'Patient',
        patientEmail: user?.email,
        date: date ?? new Date().toLocaleDateString('en-CA'),
        duration,
        triageResult,
        transcript,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const level = TRIAGE_LEVELS[triageResult.urgency] ?? TRIAGE_LEVELS['Non-urgent'];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-gray-800 text-lg">Health Report</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${level.bgClass} text-white`}>
          {level.label}
        </span>
      </div>

      <div className="space-y-4">
        <div className={`rounded-xl p-4 border ${level.borderClass} bg-rose-50`}>
          <p className="text-xs text-gray-400 mb-1">Recommended Action</p>
          <p className={`font-semibold ${level.textClass}`}>{triageResult.action}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Summary</p>
          <p className="text-gray-600 text-sm leading-relaxed">{triageResult.summary}</p>
        </div>

        {triageResult.symptoms.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Reported Symptoms</p>
            <div className="flex flex-wrap gap-2">
              {triageResult.symptoms.map((s, i) => (
                <span key={i} className="text-xs bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {(triageResult.vitals_noted.heartRate > 0 || triageResult.vitals_noted.breathingRate > 0) && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Vitals Noted</p>
            <div className="grid grid-cols-3 gap-2">
              {triageResult.vitals_noted.heartRate > 0 && (
                <div className="text-center">
                  <p className="text-xl">❤️</p>
                  <p className="text-sm font-semibold text-gray-800">{triageResult.vitals_noted.heartRate}</p>
                  <p className="text-xs text-gray-400">bpm</p>
                </div>
              )}
              {triageResult.vitals_noted.breathingRate > 0 && (
                <div className="text-center">
                  <p className="text-xl">🌬️</p>
                  <p className="text-sm font-semibold text-gray-800">{triageResult.vitals_noted.breathingRate}</p>
                  <p className="text-xs text-gray-400">/min</p>
                </div>
              )}
              {triageResult.vitals_noted.stressLevel > 0 && (
                <div className="text-center">
                  <p className="text-xl">🧠</p>
                  <p className="text-sm font-semibold text-gray-800">{triageResult.vitals_noted.stressLevel}</p>
                  <p className="text-xs text-gray-400">/100</p>
                </div>
              )}
            </div>
          </div>
        )}

        {triageResult.advice && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <p className="text-xs text-rose-400 mb-1">Dr. Maple's Advice</p>
            <p className="text-rose-800 text-sm">{triageResult.advice}</p>
          </div>
        )}

        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">🍁 Canadian Resource</p>
          <p className="text-red-700 text-sm font-medium">{triageResult.canadian_resource}</p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating PDF...</>
        ) : '📄 Download PDF Report'}
      </button>
    </div>
  );
};
