import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TriageResult } from '../constants';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Dr. Maple, a warm AI health triage assistant for Canadians. Keep replies to 2-3 sentences (voice call). Never diagnose — only triage to: Emergency(911), ER, Walk-in, Telehealth, or Rest at home. Ask ONE question at a time. If chest pain, stroke signs, or severe symptoms: say call 911. Reference Canadian resources (811, Telehealth). Factor in any biometric data shared.

After 4-6 exchanges, give a warm summary then output EXACTLY:
TRIAGE_RESULT:
{"urgency":"Non-urgent","action":"Rest at home","summary":"...","symptoms":[],"vitals_noted":{"heartRate":0,"breathingRate":0,"stressLevel":0},"advice":"...","canadian_resource":"811"}

Urgency must be one of: "Emergency", "Urgent", "Semi-urgent", "Non-urgent". Start by greeting the patient and asking what brings them in today.`;

// Models tried in order until one succeeds
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
  vitals?: { heartRate?: number | null; breathingRate?: number | null; stressLevel?: number | null }
): Promise<string> => {
  let message = userMessage;

  if (vitals && (vitals.heartRate || vitals.breathingRate || vitals.stressLevel)) {
    const vitalParts: string[] = [];
    if (vitals.heartRate) vitalParts.push(`Heart rate: ${vitals.heartRate} bpm`);
    if (vitals.breathingRate) vitalParts.push(`Breathing rate: ${vitals.breathingRate}/min`);
    if (vitals.stressLevel) vitalParts.push(`Stress level: ${vitals.stressLevel}/100`);
    message += `\n\n[Biometric data from camera — ${vitalParts.join(', ')}]`;
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
