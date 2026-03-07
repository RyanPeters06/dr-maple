const VOICE_ID = () => import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const API_KEY = () => import.meta.env.VITE_ELEVENLABS_API_KEY;

let currentAudio: HTMLAudioElement | null = null;

export const stopSpeaking = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
};

export const speakText = async (text: string, stressLevel?: number | null): Promise<void> => {
  stopSpeaking();

  const apiKey = API_KEY();
  if (!apiKey) {
    console.warn('ElevenLabs API key not set — skipping TTS');
    return;
  }

  // Use a calmer, more stable voice when patient stress is high
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
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ElevenLabs error ${response.status}: ${err}`);
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
    console.error('ElevenLabs TTS failed:', err);
    // Gracefully degrade — no speech but app continues
  }
};
