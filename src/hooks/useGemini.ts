import { useState, useRef, useCallback } from 'react';
import { createDoctorChat, sendMessage, parseTriageResult, extractCleanText, type ChatSession, type AppleWatchContext } from '../services/gemini';
import type { TriageResult } from '../constants';

export interface TranscriptMessage {
  role: 'doctor' | 'patient';
  text: string;
  timestamp: Date;
}

export const useGemini = () => {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const chatRef = useRef<ChatSession | null>(null);

  const initChat = useCallback(() => {
    chatRef.current = createDoctorChat();
    setTranscript([]);
    setTriageResult(null);
  }, []);

  const startCall = useCallback(async (
    vitals?: { heartRate?: number | null; breathingRate?: number | null; stressLevel?: number | null },
    appleWatch?: AppleWatchContext | null
  ): Promise<string> => {
    if (!chatRef.current) initChat();
    setIsThinking(true);
    try {
      const rawResponse = await sendMessage(
        chatRef.current!,
        'The patient has just joined the video call. Please warmly greet them and ask what brings them in today.',
        vitals,
        appleWatch
      );
      const cleanText = extractCleanText(rawResponse);
      const triage = parseTriageResult(rawResponse);
      if (triage) setTriageResult(triage);

      setTranscript([{ role: 'doctor', text: cleanText, timestamp: new Date() }]);
      return cleanText;
    } finally {
      setIsThinking(false);
    }
  }, [initChat]);

  const sendPatientMessage = useCallback(async (
    patientText: string,
    vitals?: { heartRate?: number | null; breathingRate?: number | null; stressLevel?: number | null },
    appleWatch?: AppleWatchContext | null
  ): Promise<string> => {
    if (!chatRef.current) return '';
    setIsThinking(true);
    setTranscript(prev => [...prev, { role: 'patient', text: patientText, timestamp: new Date() }]);

    try {
      const rawResponse = await sendMessage(chatRef.current, patientText, vitals, appleWatch);
      const cleanText = extractCleanText(rawResponse);
      const triage = parseTriageResult(rawResponse);
      if (triage) setTriageResult(triage);

      setTranscript(prev => [...prev, { role: 'doctor', text: cleanText, timestamp: new Date() }]);
      return cleanText;
    } finally {
      setIsThinking(false);
    }
  }, []);

  const resetChat = useCallback(() => {
    chatRef.current = null;
    setTranscript([]);
    setTriageResult(null);
    setIsThinking(false);
  }, []);

  return {
    transcript,
    isThinking,
    triageResult,
    initChat,
    startCall,
    sendPatientMessage,
    resetChat,
  };
};
