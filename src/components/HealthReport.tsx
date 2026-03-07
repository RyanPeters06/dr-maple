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
        <h3 className="font-bold text-white text-lg">Health Report</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${level.bgClass} text-white`}>
          {level.label}
        </span>
      </div>

      <div className="space-y-4">
        {/* Action */}
        <div className={`rounded-xl p-4 border ${level.borderClass} bg-gray-800/50`}>
          <p className="text-xs text-gray-500 mb-1">Recommended Action</p>
          <p className={`font-semibold ${level.textClass}`}>{triageResult.action}</p>
        </div>

        {/* Summary */}
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Summary</p>
          <p className="text-gray-300 text-sm leading-relaxed">{triageResult.summary}</p>
        </div>

        {/* Symptoms */}
        {triageResult.symptoms.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Reported Symptoms</p>
            <div className="flex flex-wrap gap-2">
              {triageResult.symptoms.map((s, i) => (
                <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2.5 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Vitals */}
        {(triageResult.vitals_noted.heartRate > 0 || triageResult.vitals_noted.breathingRate > 0) && (
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Vitals Noted</p>
            <div className="grid grid-cols-3 gap-2">
              {triageResult.vitals_noted.heartRate > 0 && (
                <div className="text-center">
                  <p className="text-xl">❤️</p>
                  <p className="text-sm font-semibold text-white">{triageResult.vitals_noted.heartRate}</p>
                  <p className="text-xs text-gray-500">bpm</p>
                </div>
              )}
              {triageResult.vitals_noted.breathingRate > 0 && (
                <div className="text-center">
                  <p className="text-xl">🌬️</p>
                  <p className="text-sm font-semibold text-white">{triageResult.vitals_noted.breathingRate}</p>
                  <p className="text-xs text-gray-500">/min</p>
                </div>
              )}
              {triageResult.vitals_noted.stressLevel > 0 && (
                <div className="text-center">
                  <p className="text-xl">🧠</p>
                  <p className="text-sm font-semibold text-white">{triageResult.vitals_noted.stressLevel}</p>
                  <p className="text-xs text-gray-500">/100</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advice */}
        {triageResult.advice && (
          <div className="bg-teal-900/20 border border-teal-700/30 rounded-xl p-4">
            <p className="text-xs text-teal-500 mb-1">Dr. Nova's Advice</p>
            <p className="text-teal-200 text-sm">{triageResult.advice}</p>
          </div>
        )}

        {/* Canadian resource */}
        <div className="bg-red-900/10 border border-red-800/20 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">🍁 Canadian Resource</p>
          <p className="text-gray-300 text-sm font-medium">{triageResult.canadian_resource}</p>
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            📄 Download PDF Report
          </>
        )}
      </button>
    </div>
  );
};
