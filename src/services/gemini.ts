import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TriageResult } from '../constants';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export type VitalsContext = {
  heartRate?: number | null;
  breathingRate?: number | null;
  stressLevel?: number | null;
};

export type AppleWatchContext = {
  avgHeartRate?: number | null;
  stepsToday?: number;
  activeEnergyKcal?: number;
  exerciseMinutes?: number;
  standHours?: number;
  sleepDurationHours?: number | null;
  sleepQuality?: string | null;
  avgNoiseDbA?: number | null;
  updatedAt?: string | null;
};

const SYSTEM_PROMPT = `You are Dr. Maple, a warm AI health triage assistant for Canadians. Keep replies to 2-3 sentences (voice call). Never diagnose — only triage to: Emergency(911), ER, Walk-in, Telehealth, or Rest at home. Ask ONE question at a time. If chest pain, stroke signs, or severe symptoms: say call 911. Reference Canadian resources (811, Telehealth). Factor in any biometric or Apple Watch data shared.

After 4-6 exchanges, give a warm summary then output EXACTLY:
TRIAGE_RESULT:
{"urgency":"Non-urgent","action":"Rest at home","summary":"...","symptoms":[],"vitals_noted":{"heartRate":0,"breathingRate":0,"stressLevel":0},"advice":"...","canadian_resource":"811"}

Urgency must be one of: "Emergency", "Urgent", "Semi-urgent", "Non-urgent". Start by greeting the patient and asking what brings them in today.`;

const MODEL_PRIORITY = [
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

export type ChatSession = ReturnType<ReturnType<typeof genAI.getGenerativeModel>['startChat']>;

export const createDoctorChat = (modelName = MODEL_PRIORITY[0]): ChatSession => {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
  });
  const chat = model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 300,
      temperature: 0.8,
    },
  });
  return chat;
};

export { MODEL_PRIORITY };

export const sendMessage = async (
  chat: ChatSession,
  userMessage: string,
  vitals?: VitalsContext,
  appleWatch?: AppleWatchContext | null
): Promise<string> => {
  let message = userMessage;
  const parts: string[] = [];

  if (appleWatch && (appleWatch.avgHeartRate != null || appleWatch.stepsToday != null || appleWatch.sleepDurationHours != null)) {
    const watchParts: string[] = [];
    if (appleWatch.avgHeartRate != null) watchParts.push(`Heart rate: ${Math.round(appleWatch.avgHeartRate)} bpm`);
    if (appleWatch.stepsToday != null) watchParts.push(`Steps today: ${appleWatch.stepsToday}`);
    if (appleWatch.exerciseMinutes != null) watchParts.push(`Exercise: ${appleWatch.exerciseMinutes} min`);
    if (appleWatch.standHours != null) watchParts.push(`Stand hours: ${appleWatch.standHours}`);
    if (appleWatch.sleepDurationHours != null) watchParts.push(`Sleep last night: ${appleWatch.sleepDurationHours.toFixed(1)} h (${appleWatch.sleepQuality ?? '—'})`);
    if (appleWatch.activeEnergyKcal != null) watchParts.push(`Active energy: ${Math.round(appleWatch.activeEnergyKcal)} kcal`);
    if (appleWatch.avgNoiseDbA != null) watchParts.push(`Noise exposure: ${appleWatch.avgNoiseDbA.toFixed(0)} dB`);
    parts.push(`Apple Watch data — ${watchParts.join(', ')}`);
  }

  if (vitals && (vitals.heartRate || vitals.breathingRate || vitals.stressLevel)) {
    const vitalParts: string[] = [];
    if (vitals.heartRate) vitalParts.push(`Heart rate: ${vitals.heartRate} bpm`);
    if (vitals.breathingRate) vitalParts.push(`Breathing rate: ${vitals.breathingRate}/min`);
    if (vitals.stressLevel) vitalParts.push(`Stress level: ${vitals.stressLevel}/100`);
    parts.push(`Camera vitals — ${vitalParts.join(', ')}`);
  }

  if (parts.length > 0) {
    message += `\n\n[Live data: ${parts.join(' | ')}]`;
  }

  const result = await chat.sendMessage(message);
  return result.response.text();
};

export const parseTriageResult = (responseText: string): TriageResult | null => {
  try {
    const marker = 'TRIAGE_RESULT:';
    const idx = responseText.indexOf(marker);
    if (idx === -1) return null;
    const jsonStr = responseText.slice(idx + marker.length).trim();
    const parsed = JSON.parse(jsonStr);
    return parsed as TriageResult;
  } catch {
    return null;
  }
};

export const extractCleanText = (responseText: string): string => {
  const marker = 'TRIAGE_RESULT:';
  const idx = responseText.indexOf(marker);
  if (idx === -1) return responseText.trim();
  return responseText.slice(0, idx).trim();
};
