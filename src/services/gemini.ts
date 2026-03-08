import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Part } from '@google/generative-ai';
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

export type WellnessContext = {
  profileAge?: number | null;
  profileSex?: string | null;
  profileHeightCm?: number | null;
  profileWeightKg?: number | null;
  allergies?: string[];
  medications?: string[];
  medicalHistory?: string[];
  recentSymptoms?: { date: string; symptom: string; note?: string }[];
};

const SYSTEM_PROMPT = `You are Dr. Maple, a warm, knowledgeable AI health assistant for Canadians. You are on a live voice call, so keep each reply concise (2-4 sentences max). Ask ONE question at a time and wait for the answer before continuing.

IMPORTANT RULES:
- Always provide your best assessment. Never refuse to help citing AI limitations alone.
- When giving a rough diagnosis or assessment, briefly note: "Keep in mind I'm an AI and a real doctor should confirm this." Then give the answer anyway.
- If you see emergency signs (chest pain, stroke symptoms, severe bleeding, difficulty breathing): immediately say to call 911.
- Reference Canadian resources where relevant: 811 (Telehealth Ontario), Health811, walk-in clinics, HealthLink BC.
- Factor in any biometric or Apple Watch data provided.

STRUCTURED OUTPUT MARKERS — output these on their own line, never inside a sentence:

1. When presenting choices to the patient, append on a new line:
CHOICES:["Option A","Option B","Option C"]
Do NOT list the options verbally in your spoken reply — just introduce them naturally (e.g. "How can I help you today?") and let the CHOICES marker show them as buttons.

2. When it would help to visually examine a physical symptom (rash, bite, wound, swelling, skin lesion), append on a new line:
PHOTO_REQUEST:true
Only request a photo once per symptom. Do not request a photo for internal symptoms.

3. After 4-6 exchanges (or when you have enough information), wrap up warmly and append on a new line:
TRIAGE_RESULT:
{"urgency":"Non-urgent","action":"Rest at home","summary":"...","symptoms":[],"vitals_noted":{"heartRate":0,"breathingRate":0,"stressLevel":0},"advice":"...","canadian_resource":"811"}
Urgency must be one of: "Emergency", "Urgent", "Semi-urgent", "Non-urgent".

CALL START:
Greet the patient warmly by name if available, then present the consultation modes using the exact CHOICES list provided in the system message. Do not add or remove options from the list you are given.

MODE BEHAVIOUR:
- General Guidance: Standard health triage — ask about symptoms, duration, severity, relevant history.
- Vital Check-In: Focus on interpreting the patient's camera vitals and Apple Watch data. Comment on any readings that seem elevated or unusual. Ask how they are feeling.
- Non-Emergency Diagnosis: Attempt to identify conditions by description and/or photo. Provide a rough differential diagnosis with your best guess and a disclaimer. Ask about appearance, duration, associated symptoms. Request a photo if it is a visible condition.
- Wellness Review: Provide a holistic checkup based on the patient's stored wellness data. This data will be provided as [Wellness profile: ...] in the context. Comment on their profile stats (age, BMI if height/weight available), any known allergies or medications worth noting, recent symptoms logged, Apple Watch activity/sleep/heart rate trends, and give an overall wellness summary with actionable tips. Be encouraging and constructive.`;

const MODEL_PRIORITY = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview',
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
      maxOutputTokens: 1000,
      temperature: 0.8,
    },
  });
  return chat;
};

export { MODEL_PRIORITY };

// ── Marker parsers ────────────────────────────────────────────────────────────

export const parseChoices = (text: string): string[] | null => {
  try {
    const match = text.match(/CHOICES:(\[.*?\])/s);
    if (!match) return null;
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
};

export const parsePhotoRequest = (text: string): boolean =>
  /PHOTO_REQUEST:true/i.test(text);

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
  let text = responseText;
  // Strip TRIAGE_RESULT and everything after
  const triageIdx = text.indexOf('TRIAGE_RESULT:');
  if (triageIdx !== -1) text = text.slice(0, triageIdx);
  // Strip CHOICES:[...] lines
  text = text.replace(/CHOICES:\[.*?\]/gs, '');
  // Strip PHOTO_REQUEST:true lines
  text = text.replace(/PHOTO_REQUEST:true/gi, '');
  return text.trim();
};

// ── Message senders ───────────────────────────────────────────────────────────

export const buildWellnessSuffix = (wellness: WellnessContext): string => {
  const lines: string[] = [];

  const profileParts: string[] = [];
  if (wellness.profileAge != null) profileParts.push(`Age: ${wellness.profileAge}`);
  if (wellness.profileSex) profileParts.push(`Sex: ${wellness.profileSex}`);
  if (wellness.profileHeightCm != null && wellness.profileWeightKg != null) {
    const bmi = wellness.profileWeightKg / ((wellness.profileHeightCm / 100) ** 2);
    profileParts.push(`Height: ${wellness.profileHeightCm} cm, Weight: ${wellness.profileWeightKg} kg, BMI: ${bmi.toFixed(1)}`);
  } else {
    if (wellness.profileHeightCm != null) profileParts.push(`Height: ${wellness.profileHeightCm} cm`);
    if (wellness.profileWeightKg != null) profileParts.push(`Weight: ${wellness.profileWeightKg} kg`);
  }
  if (profileParts.length > 0) lines.push(`Profile — ${profileParts.join(', ')}`);

  if (wellness.allergies && wellness.allergies.length > 0)
    lines.push(`Known allergies: ${wellness.allergies.join(', ')}`);
  if (wellness.medications && wellness.medications.length > 0)
    lines.push(`Current medications: ${wellness.medications.join(', ')}`);
  if (wellness.medicalHistory && wellness.medicalHistory.length > 0)
    lines.push(`Medical history: ${wellness.medicalHistory.join(', ')}`);

  if (wellness.recentSymptoms && wellness.recentSymptoms.length > 0) {
    const symptomLines = wellness.recentSymptoms
      .slice(0, 8)
      .map(s => `${s.date}: ${s.symptom}${s.note ? ` (${s.note})` : ''}`);
    lines.push(`Recent symptom log — ${symptomLines.join('; ')}`);
  }

  return lines.length > 0 ? `\n\n[Wellness profile: ${lines.join(' | ')}]` : '';
};

const buildLiveDataSuffix = (
  vitals?: VitalsContext,
  appleWatch?: AppleWatchContext | null
): string => {
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

  return parts.length > 0 ? `\n\n[Live data: ${parts.join(' | ')}]` : '';
};

export const sendMessage = async (
  chat: ChatSession,
  userMessage: string,
  vitals?: VitalsContext,
  appleWatch?: AppleWatchContext | null
): Promise<string> => {
  const message = userMessage + buildLiveDataSuffix(vitals, appleWatch);
  const result = await chat.sendMessage(message);
  return result.response.text();
};

export const sendImageMessage = async (
  chat: ChatSession,
  imageBase64: string,
  mimeType: string,
  textContext: string,
  vitals?: VitalsContext,
  appleWatch?: AppleWatchContext | null
): Promise<string> => {
  const suffix = buildLiveDataSuffix(vitals, appleWatch);
  const parts: Part[] = [
    { inlineData: { data: imageBase64, mimeType } },
    { text: textContext + suffix },
  ];
  const result = await chat.sendMessage(parts);
  return result.response.text();
};
