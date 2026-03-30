export type ConsentState = 'pending' | 'granted' | 'declined';

export interface Session {
  callSid: string;
  streamSid: string;
  clinicId: string;
  consentState: ConsentState;
  consentTimestamp?: Date;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  unansweredQuestions: number;
  escalationTriggered: boolean;
  startedAt: Date;
  actionsLog: string[];
  patientPhoneHash?: string;
  staffPhoneNumber?: string;
}

export interface TwilioMediaEvent {
  event: 'connected' | 'start' | 'media' | 'stop' | 'mark';
  sequenceNumber?: string;
  start?: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
    mediaFormat: { encoding: string; sampleRate: number; channels: number };
  };
  media?: { track: string; chunk: string; timestamp: string; payload: string };
  stop?: { accountSid: string; callSid: string };
  mark?: { name: string };
}

export type CallEvent = 'consent_granted' | 'consent_declined' | 'greeted' | 'escalated' | 'transferred' | 'summary_saved' | 'call_ended';
