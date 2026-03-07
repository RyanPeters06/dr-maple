import { useState, useCallback } from 'react';
import { speakText, stopSpeaking } from '../services/elevenlabs';

export const useElevenLabs = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text: string, stressLevel?: number | null) => {
    setIsSpeaking(true);
    try {
      await speakText(text, stressLevel);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
};
