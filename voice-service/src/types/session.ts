import type Anthropic from '@anthropic-ai/sdk';

export type ConsentState = 'pending' | 'granted' | 'declined';

export interface ShopService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export interface ShopStaff {
  id: string;
  name: string;
  role: string;
}

export interface WorkingHours {
  day: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface ShopContext {
  shopId: string;
  shopName: string;
  businessType: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
  primaryColor?: string;
  staffLabel: string;
  serviceLabel: string;
  bookingLabel: string;
  staffCount: number;
  services: ShopService[];
  staff: ShopStaff[];
  workingHours: WorkingHours[];
}

export interface Session {
  callSid: string;
  streamSid: string;
  clinicId: string;
  consentState: ConsentState;
  consentTimestamp?: Date;
  messages: Anthropic.MessageParam[];
  unansweredQuestions: number;
  escalationTriggered: boolean;
  startedAt: Date;
  actionsLog: string[];
  patientPhoneHash?: string;
  staffPhoneNumber?: string;
  shopContext?: ShopContext;
  channel: 'voice' | 'chat';
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
