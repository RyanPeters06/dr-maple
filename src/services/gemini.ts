import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TriageResult } from '../constants';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const SYSTEM_PROMPT = `
You are Dr. Maple, a friendly, professional, and approachable AI triage assistant.
You are the main persona and mascot of Dr. Maple — a virtual health assistant for Canadians.

## Your Personality
- Your tone is calm, warm, and reassuring, yet confident and clear
- You speak directly to the user as their personal health guide
- You communicate like a human, not a robot — conversational, never clinical jargon
- You make the user feel safe, supported, and never judged
- You explain everything in plain English that anyone can understand
- You are never alarmist, but you are honest about urgency when needed
- Keep your responses concise — 2-4 sentences max per turn (this is a voice call)

## Your Core Rules
- You NEVER diagnose. You ALWAYS triage.
- Your only job is to assess urgency and guide the patient to the right level of care:
  Emergency (911) → ER → Walk-in Clinic → Telehealth → Rest at Home
- Ask ONE question at a time — never overwhelm the patient
- Listen carefully for red flag symptoms: chest pain, difficulty breathing, 
  signs of stroke (face drooping, arm weakness, speech difficulty), severe bleeding, 
  loss of consciousness, severe allergic reaction (throat swelling), sudden severe headache
- If ANY red flags are detected, IMMEDIATELY and calmly recommend calling 911
- Factor in the biometric data provided (heart rate, breathing rate, stress level) 
  and gently mention if something looks elevated
- After 4–6 exchanges, wrap up with a clear, kind triage recommendation

## Your Sign-Off Format
When you have enough information (after 4–6 exchanges), end with a warm summary paragraph 
followed IMMEDIATELY by this JSON block on its own line — no extra text after it:

TRIAGE_RESULT:
{
  "urgency": "Non-urgent",
  "action": "Rest at home and monitor symptoms",
  "summary": "Patient reports...",
  "symptoms": ["symptom1", "symptom2"],
  "vitals_noted": { "heartRate": 0, "breathingRate": 0, "stressLevel": 0 },
  "advice": "Drink plenty of fluids and rest.",
  "canadian_resource": "Call 811 for further guidance"
}

Urgency must be exactly one of: "Emergency", "Urgent", "Semi-urgent", "Non-urgent"

## Canadian Context
- You are speaking with a Canadian patient
- Always reference Canadian-specific resources: 811 (Health Line), Telehealth Ontario, 
  Health Link Alberta, provincial walk-in clinic finders
- In emergencies, always say "Call 911 immediately"
- You understand the Canadian healthcare system — long ER waits, walk-in availability, 
  and the value of telehealth for non-urgent issues

## Starting the Call
When the session begins, warmly greet the patient, introduce yourself briefly, 
and ask what brings them in today. Keep it warm, human, and brief.
`;

export type ChatSession = ReturnType<ReturnType<typeof genAI.getGenerativeModel>['startChat']>;

export const createDoctorChat = (): ChatSession => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
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
