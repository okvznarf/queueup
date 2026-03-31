import twilio from 'twilio';
import type { Session } from '../types/session.js';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const ESCALATION_PHRASES = [
  'talk to a human',
  'talk to someone',
  'speak to a receptionist',
  'speak to someone',
  'real person',
  'transfer me',
  'connect me',
  'human please',
  'speak to a person',
  'talk to a person',
];

export const TRANSFER_BRIDGE_MESSAGE =
  "Of course, I'm connecting you with a team member now. One moment please.";

export function shouldEscalate(transcript: string, session: Session): boolean {
  // Check explicit patient request phrases
  const normalized = transcript.toLowerCase().trim();
  if (ESCALATION_PHRASES.some((phrase) => normalized.includes(phrase))) return true;

  // Check automatic escalation triggers
  if (session.unansweredQuestions >= 2) return true;
  if (session.escalationTriggered) return true;

  return false;
}

export async function executeWarmTransfer(
  callSid: string,
  staffPhoneNumber: string
): Promise<void> {
  // Redirect the live call to new TwiML that dials the staff number
  await twilioClient.calls(callSid).update({
    twiml: `<Response><Say>Please hold while I connect you.</Say><Dial timeout="30"><Number>${staffPhoneNumber}</Number></Dial></Response>`,
  });
  // Twilio closes the Media Stream WebSocket after this update
}
