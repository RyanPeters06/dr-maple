import { useState, useRef, useCallback } from 'react';
import { createDoctorChat, sendMessage, parseTriageResult, extractCleanText, MODEL_PRIORITY, type ChatSession } from '../services/gemini';
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
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<ChatSession | null>(null);
  const modelIndexRef = useRef(0);

  const initChat = useCallback((modelName?: string) => {
    chatRef.current = createDoctorChat(modelName ?? MODEL_PRIORITY[modelIndexRef.current]);
    setTranscript([]);
    setTriageResult(null);
    setError(null);
  }, []);

  const startCall = useCallback(async (vitals?: {
    heartRate?: number | null;
    breathingRate?: number | null;
    stressLevel?: number | null;
  }): Promise<string> => {
    setIsThinking(true);
    setError(null);

    // Try each model in priority order
    for (let i = modelIndexRef.current; i < MODEL_PRIORITY.length; i++) {
      try {
        initChat(MODEL_PRIORITY[i]);
        modelIndexRef.current = i;
        const rawResponse = await sendMessage(
          chatRef.current!,
          'The patient has just joined the video call. Please warmly greet them as Dr. Maple and ask what brings them in today.',
          vitals
        );
        const cleanText = extractCleanText(rawResponse);
        const triage = parseTriageResult(rawResponse);
        if (triage) setTriageResult(triage);
        setTranscript([{ role: 'doctor', text: cleanText, timestamp: new Date() }]);
        setIsThinking(false);
        return cleanText;
      } catch (err) {
        console.warn(`Model ${MODEL_PRIORITY[i]} failed, trying next...`, err);
        if (i === MODEL_PRIORITY.length - 1) {
          const msg = err instanceof Error ? err.message : 'Gemini API error';
          setError(`AI connection failed: ${msg}`);
          setIsThinking(false);
          return '';
        }
      }
    }
    setIsThinking(false);
    return '';
  }, [initChat]);

  const sendPatientMessage = useCallback(async (
    patientText: string,
    vitals?: { heartRate?: number | null; breathingRate?: number | null; stressLevel?: number | null }
  ): Promise<string> => {
    if (!chatRef.current) {
      setError('Session expired — please end and restart the call.');
      return '';
    }
    setIsThinking(true);
    setError(null);
    setTranscript(prev => [...prev, { role: 'patient', text: patientText, timestamp: new Date() }]);

    try {
      const rawResponse = await sendMessage(chatRef.current, patientText, vitals);
      const cleanText = extractCleanText(rawResponse);
      const triage = parseTriageResult(rawResponse);
      if (triage) setTriageResult(triage);
      setTranscript(prev => [...prev, { role: 'doctor', text: cleanText, timestamp: new Date() }]);
      return cleanText;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('sendPatientMessage error:', err);
      setError(`Dr. Maple couldn't respond: ${msg}`);
      return '';
    } finally {
      setIsThinking(false);
    }
  }, []);

  const resetChat = useCallback(() => {
    chatRef.current = null;
    setTranscript([]);
    setTriageResult(null);
    setIsThinking(false);
    setError(null);
  }, []);

  return { transcript, isThinking, triageResult, error, initChat, startCall, sendPatientMessage, resetChat };
};
