import type { ConsentState } from '../types/session.js';

const CONSENT_AFFIRMATIVES = [
  'yes',
  'sure',
  'okay',
  'ok',
  'i agree',
  'agree',
  'go ahead',
  'yep',
  'yeah',
];

const CONSENT_REFUSALS = [
  'no',
  'i do not agree',
  "i don't agree",
  'i decline',
  'decline',
  'refuse',
  'nope',
];

export const CONSENT_SCRIPT =
  "Hi, I'm Aria, an AI assistant helping with appointments at this clinic. " +
  'Before we continue, I need to let you know that this call is handled by an AI ' +
  'and may involve processing health-related information. ' +
  'Do you agree to proceed? Please say yes or no.';

export const CONSENT_TIMEOUT_SCRIPT =
  "I didn't catch that. Would you like to proceed with the AI assistant, " +
  'or would you prefer I connect you with a team member?';

export function detectConsentResponse(transcript: string): ConsentState | null {
  const normalized = transcript.toLowerCase().trim();
  if (!normalized) return null;
  // Check refusals first — "I don't agree" contains "agree" but is a refusal
  if (CONSENT_REFUSALS.some((r) => normalized.includes(r))) return 'declined';
  if (CONSENT_AFFIRMATIVES.some((a) => normalized.includes(a))) return 'granted';
  return null;
}
