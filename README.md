# Dr. Maple

> "The call you make before the call"

A voice + vision AI triage assistant for Canadians — built for Hack Canada 2026.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.local .env.local
```

Then open `.env.local` and fill in all your API keys (see instructions below).

### 3. Run the dev server

```bash
npm run dev
```

Open http://localhost:5173

---

## API Keys Setup

| Service | Where to get it | ENV VAR |
|---------|----------------|---------|
| Auth0 | https://auth0.com → Create SPA App | `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` |
| Gemini | https://aistudio.google.com → Get API Key | `VITE_GEMINI_API_KEY` |
| ElevenLabs | https://elevenlabs.io → Profile → API Keys | `VITE_ELEVENLABS_API_KEY` |
| Presage | https://presage.io → Dashboard | `VITE_PRESAGE_API_KEY` |
| Google Maps | https://console.cloud.google.com → Enable Maps JS API + Places API | `VITE_GOOGLE_MAPS_API_KEY` |
| Firebase | https://console.firebase.google.com → Web App → Firestore | `VITE_FIREBASE_*` |

### Auth0 Setup
1. Create Application → Single Page Application → React
2. In Application Settings, add to all URL fields: `http://localhost:5173`
3. Copy Domain and Client ID to `.env.local`

### Firebase Setup
1. Create project → Add Web App → Copy config
2. Go to Firestore Database → Create database (start in test mode)
3. Add a composite index if prompted: `sessions` collection, `userId` ASC + `timestamp` DESC

---

## Features

- **Voice Conversation** — Talk to Dr. Maple via Web Speech API (no key needed)
- **AI Triage** — Gemini 1.5 Flash synthesizes symptoms + vitals into triage recommendations
- **ElevenLabs Voice** — Dr. Maple speaks back with a warm, human voice
- **Presage Biometrics** — Real-time heart rate, breathing rate, and stress from your webcam
- **Session Recording** — MediaRecorder captures the full call as .webm
- **PDF Health Report** — Download a colour-coded triage report after every call
- **Clinic Finder** — Google Maps shows nearby walk-in clinics and ERs with estimated wait times
- **Health History** — Firebase Firestore persists all sessions, accessible from the Dashboard
- **Auth0 Login** — Secure login, sessions tied to your account

---

## Project Structure

```
src/
├── pages/          Landing, Call, Dashboard, Report
├── components/     CallInterface, DoctorAvatar, ClinicMap, PresageMonitor, HealthReport, WaitTimeBadge, AuthGate
├── hooks/          useGemini, useElevenLabs, usePresage, useRecorder, useHealthHistory
├── services/       gemini, elevenlabs, presage, maps, firebase, report
└── constants.ts    Canadian health resources, triage levels
```

---

## Disclaimer

Dr. Maple is an AI assistant for triage guidance only. It is **NOT** a substitute for professional medical advice, diagnosis, or treatment. In case of emergency, **call 911 immediately**. For non-emergency health advice, call **811** (Ontario/BC/AB) or your provincial telehealth line.

---

Built with love for **Hack Canada 2026** — Good luck! 🍁
