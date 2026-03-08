export const CANADIAN_RESOURCES = {
  emergency: '911',
  telehealth_national: '811',
  ontario_telehealth: '811 (Telehealth Ontario)',
  bc_nurse_line: '811 (BC Nurse Line)',
  alberta_health_link: '811 (Alberta Health Link)',
  quebec_info_sante: '811 (Info-Santé Québec)',
  crisis_line: '1-833-456-4566 (Crisis Services Canada)',
  telehealth_direct: '1-866-797-0000',
} as const;

export const TRIAGE_LEVELS = {
  Emergency: {
    label: 'Emergency',
    color: 'red',
    action: 'Call 911 immediately',
    description: 'Life-threatening — do not delay',
    bgClass: 'bg-red-600',
    textClass: 'text-red-400',
    borderClass: 'border-red-600/40',
  },
  Urgent: {
    label: 'Urgent',
    color: 'orange',
    action: 'Go to ER or call 911',
    description: 'Needs attention within 1–2 hours',
    bgClass: 'bg-orange-600',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-600/40',
  },
  'Semi-urgent': {
    label: 'Semi-urgent',
    color: 'yellow',
    action: 'Visit a walk-in clinic within 4 hours',
    description: 'Should be seen today',
    bgClass: 'bg-yellow-500',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-600/40',
  },
  'Non-urgent': {
    label: 'Non-urgent',
    color: 'green',
    action: 'Call 811 or rest at home',
    description: 'Can be managed safely at home',
    bgClass: 'bg-emerald-600',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-600/40',
  },
} as const;

export type TriageLevel = keyof typeof TRIAGE_LEVELS;

export interface TriageResult {
  urgency: TriageLevel;
  action: string;
  summary: string;
  symptoms: string[];
  vitals_noted: {
    heartRate: number;
    breathingRate: number;
    stressLevel: number;
  };
  advice: string;
  canadian_resource: string;
}

export const DEFAULT_LOCATION = { lat: 43.6532, lng: -79.3832 }; // Toronto

export const ELEVENLABS_MODELS = {
  monolingual: 'eleven_monolingual_v1',
  multilingual: 'eleven_multilingual_v2',
  turbo: 'eleven_turbo_v2',
} as const;

/** Official provincial physician directories (College of Physicians and Surgeons). Link out to search. */
export const PROVINCIAL_DOCTOR_DIRECTORIES: Record<string, { name: string; searchUrl: string; advancedUrl?: string }> = {
  ON: { name: 'Ontario', searchUrl: 'https://doctors.cpso.on.ca/Doctor-Search-Results', advancedUrl: 'https://doctors.cpso.on.ca/Advanced-Search' },
  AB: { name: 'Alberta', searchUrl: 'https://search.cpsa.ca/' },
  BC: { name: 'British Columbia', searchUrl: 'https://www.cpsbc.ca/public/registrant-directory' },
  QC: { name: 'Quebec', searchUrl: 'https://www.cmq.org/en/directory' },
  MB: { name: 'Manitoba', searchUrl: 'https://www.cpsm.mb.ca/' },
  SK: { name: 'Saskatchewan', searchUrl: 'https://www.cps.sk.ca/' },
  NS: { name: 'Nova Scotia', searchUrl: 'https://cpsns.ns.ca/physician-search' },
  NB: { name: 'New Brunswick', searchUrl: 'https://www.cpsnb.org/en/find-a-physician' },
  NL: { name: 'Newfoundland & Labrador', searchUrl: 'https://cpsnl.ca/' },
};
