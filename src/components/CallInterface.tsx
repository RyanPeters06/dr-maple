import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { DoctorAvatar } from './DoctorAvatar';
import { PresageMonitor } from './PresageMonitor';
import { useGemini } from '../hooks/useGemini';
import { useElevenLabs } from '../hooks/useElevenLabs';
import { usePresage } from '../hooks/usePresage';
import { useRecorder } from '../hooks/useRecorder';
import { saveSession } from '../services/firebase';
import type { TriageResult } from '../constants';

type CallState = 'idle' | 'starting' | 'active' | 'ended';

export const CallInterface = () => {
  const navigate = useNavigate();
  const { user } = useAuth0();
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [callState, setCallState] = useState<CallState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { transcript, isThinking, triageResult, error: geminiError, initChat, startCall, sendPatientMessage } = useGemini();
  const { speak, stop: stopSpeaking, isSpeaking } = useElevenLabs();
  const { vitals, isReady: presageReady } = usePresage(videoRef);
  const { startRecording, stopRecording, downloadRecording } = useRecorder();

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);

  useEffect(() => {
    if (callState === 'active') {
      durationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (durationRef.current) clearInterval(durationRef.current);
    }
    return () => { if (durationRef.current) clearInterval(durationRef.current); };
  }, [callState]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      return stream;
    } catch {
      setCameraError('Camera access denied.');
      return null;
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleStartCall = async () => {
    setCallState('starting');
    initChat();
    setCallDuration(0);
    await startCamera();
    startRecording();
    setCallState('active');
    try {
      const greeting = await startCall(vitals);
      if (greeting) await speak(greeting, vitals.stressLevel);
    } catch (err) {
      console.error('Call start error:', err);
    }
  };

  const handleEndCall = async () => {
    stopSpeaking();
    setCallState('ended');
    stopCamera();
    const blob = stopRecording();
    if (user && triageResult) {
      try {
        const id = await saveSession(user.sub!, {
          triageResult,
          transcript: transcript.map(m => ({ role: m.role, text: m.text })),
          duration: callDuration,
        });
        if (id) setSavedSessionId(id);
      } catch { /* non-fatal */ }
    }
    if (blob && callDuration > 30) downloadRecording(blob);
  };

  const startListening = useCallback(() => {
    if (isSpeaking || isListening || callState !== 'active') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition requires Chrome.'); return; }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.lang = 'en-CA';
    setIsListening(true);
    recognition.onresult = async (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript;
      setIsListening(false);
      try {
        const reply = await sendPatientMessage(text, vitals);
        if (reply) await speak(reply, vitals.stressLevel);
      } catch (err) {
        console.error('Response error:', err);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend   = () => setIsListening(false);
    recognition.start();
  }, [isSpeaking, isListening, callState, vitals, sendPatientMessage, speak]);

  const getUrgencyStyle = (urgency: TriageResult['urgency']) => ({
    Emergency:    'bg-red-600 text-white',
    Urgent:       'bg-orange-500 text-white',
    'Semi-urgent':'bg-yellow-400 text-gray-900',
    'Non-urgent': 'bg-emerald-500 text-white',
  }[urgency] ?? 'bg-gray-400 text-white');

  // ── Post-call summary ────────────────────────────────────────────────────────
  if (callState === 'ended') {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <img src="/mascot-wave.png" alt="Dr. Maple" className="w-40 h-40 object-contain mx-auto mb-3 drop-shadow" />
            <h2 className="text-2xl font-bold text-gray-800">Call Complete</h2>
            <p className="text-gray-400 mt-1">Duration: {formatDuration(callDuration)}</p>
          </div>

          {triageResult && (
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-lg">Triage Result</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getUrgencyStyle(triageResult.urgency)}`}>
                  {triageResult.urgency}
                </span>
              </div>
              <div className="space-y-3">
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Recommended Action</p>
                  <p className="text-gray-800 font-medium">{triageResult.action}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Summary</p>
                  <p className="text-gray-600 text-sm">{triageResult.summary}</p>
                </div>
                {triageResult.advice && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Dr. Maple's Advice</p>
                    <p className="text-gray-600 text-sm">{triageResult.advice}</p>
                  </div>
                )}
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <p className="text-xs text-rose-400 mb-1">🍁 Canadian Resource</p>
                  <p className="text-rose-700 text-sm font-medium">{triageResult.canadian_resource}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {triageResult && (
              <button
                onClick={() => savedSessionId ? navigate(`/report/${savedSessionId}`) : navigate('/report/preview', { state: { triageResult, transcript } })}
                className="btn-primary w-full text-center"
              >
                📄 View & Download Health Report
              </button>
            )}
            <button onClick={() => navigate('/dashboard')} className="btn-ghost w-full text-center">
              📊 Go to My Dashboard
            </button>
            <button onClick={() => { setCallState('idle'); setSavedSessionId(null); }} className="text-gray-400 hover:text-rose-500 text-sm text-center transition-colors">
              Start Another Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Call screen ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-rose-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-rose-100 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/dr-maple-logo.png" alt="Dr. Maple" className="h-20 object-contain" />
          {callState === 'active' && (
            <span className="flex items-center gap-1.5 ml-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-500 font-mono">{formatDuration(callDuration)}</span>
            </span>
          )}
        </div>
        {callState === 'active' && (
          <button onClick={() => navigate('/dashboard')} className="text-xs text-gray-400 hover:text-rose-500 transition-colors">
            Dashboard
          </button>
        )}
      </div>

      {/* Main call area */}
      <div className="flex-1 relative flex items-center justify-center min-h-0 bg-gradient-to-b from-white to-rose-50">
        <div className="z-10">
          <DoctorAvatar isSpeaking={isSpeaking} isListening={isListening} />
        </div>

        {/* Patient PiP */}
        <div className="absolute bottom-4 right-4 z-20">
          <div className="w-36 h-28 rounded-2xl overflow-hidden border-2 border-rose-200 bg-rose-100 shadow-lg">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {!streamRef.current && (
              <div className="absolute inset-0 flex items-center justify-center bg-rose-50">
                <span className="text-2xl opacity-30">📷</span>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-rose-50/80 p-2">
                <p className="text-xs text-red-400 text-center">No camera</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 text-center mt-1">You</p>
        </div>

        {/* Vitals overlay */}
        {callState === 'active' && (
          <div className="absolute top-4 left-4 z-20">
            <PresageMonitor vitals={vitals} isReady={presageReady} />
          </div>
        )}

        {/* Error banner */}
        {geminiError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2 rounded-xl shadow-md max-w-xs text-center">
            ⚠️ {geminiError}
          </div>
        )}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-rose-100 shadow-sm">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-xs text-gray-400">Dr. Maple is thinking...</span>
          </div>
        )}
      </div>

      {/* Transcript */}
      {callState === 'active' && transcript.length > 0 && (
        <div ref={transcriptRef} className="h-48 overflow-y-auto px-4 py-3 bg-white border-t border-rose-100 space-y-2">
          {transcript.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'doctor' ? '' : 'flex-row-reverse'}`}>
              <span className="text-base flex-shrink-0 mt-0.5">{msg.role === 'doctor' ? '🩺' : '🧑'}</span>
              <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                msg.role === 'doctor'
                  ? 'bg-rose-50 text-rose-900 border border-rose-100 rounded-tl-none'
                  : 'bg-gray-100 text-gray-800 rounded-tr-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="p-5 bg-white border-t border-rose-100">
        {callState === 'idle' && (
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleStartCall} className="btn-primary flex items-center gap-3 text-base px-10 py-4">
              <span className="text-xl">📞</span> Start Call with Dr. Maple
            </button>
            <p className="text-xs text-gray-400">Camera + microphone required · Your session is private</p>
          </div>
        )}

        {callState === 'starting' && (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
            <span className="text-gray-500">Connecting to Dr. Maple...</span>
          </div>
        )}

        {callState === 'active' && (
          <div className="flex items-center justify-center gap-6">
            <div className="relative">
              {isListening && <div className="absolute inset-0 rounded-full bg-red-400/30 listen-ring" />}
              <button
                onClick={startListening}
                disabled={isSpeaking || isListening || isThinking}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-200 ${
                  isListening
                    ? 'bg-red-500 scale-110 shadow-lg shadow-red-300'
                    : isSpeaking || isThinking
                    ? 'bg-gray-200 opacity-50 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 active:scale-95 shadow-lg shadow-rose-300'
                }`}
              >
                🎤
              </button>
            </div>

            <p className="text-sm text-gray-400 w-24 text-center">
              {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isThinking ? 'Thinking...' : 'Tap to speak'}
            </p>

            <button
              onClick={handleEndCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 flex items-center justify-center text-xl transition-all shadow-md"
            >
              📵
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
