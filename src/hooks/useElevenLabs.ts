import { useState, useCallback } from 'react';
import { speakText, stopSpeaking } from '../services/elevenlabs';

export const useElevenLabs = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const speak = useCallback(async (text: string, stressLevel?: number | null) => {
    setIsSpeaking(true);
    setTtsError(null);
    try {
      await speakText(text, stressLevel);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'TTS failed';
      setTtsError(msg);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, ttsError };
};
