const VOICE_ID = () => import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const API_KEY = () => import.meta.env.VITE_ELEVENLABS_API_KEY;

let currentAudio: HTMLAudioElement | null = null;

export const stopSpeaking = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();
};

const speakWithBrowser = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-CA';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.lang === 'en-US' && (v.name.includes('David') || v.name.includes('Mark') || v.name.includes('Guy') || v.name.includes('Alex'))) ??
      voices.find(v => v.lang === 'en-US' && !v.name.includes('Female') && !v.name.includes('Zira')) ??
      voices.find(v => v.lang.startsWith('en') && !v.name.includes('Female'));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(new Error(`Browser TTS error: ${e.error}`));
    window.speechSynthesis.speak(utterance);
  });
};

export const speakText = async (text: string, stressLevel?: number | null): Promise<void> => {
  stopSpeaking();

  const apiKey = API_KEY();
  if (!apiKey) {
    console.warn('ElevenLabs API key not set — using browser TTS');
    return speakWithBrowser(text);
  }

  const stability = stressLevel && stressLevel > 60 ? 0.85 : 0.65;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID()}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability,
            similarity_boost: 0.8,
            style: 0.1,
            use_speaker_boost: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.warn(`ElevenLabs failed (${response.status}), falling back to browser TTS`);
      return speakWithBrowser(text);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        resolve();
      };
      audio.onerror = (e) => {
        currentAudio = null;
        reject(e);
      };
      audio.play().catch(reject);
    });
  } catch (err) {
    console.warn('ElevenLabs TTS failed, falling back to browser TTS:', err);
    return speakWithBrowser(text);
  }
};
