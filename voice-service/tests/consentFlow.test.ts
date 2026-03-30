import { describe, it, expect } from 'vitest';
import {
  detectConsentResponse,
  CONSENT_SCRIPT,
  CONSENT_TIMEOUT_SCRIPT,
} from '../src/handlers/consentFlow.js';

describe('detectConsentResponse', () => {
  it('returns "granted" for "yes"', () => {
    expect(detectConsentResponse('yes')).toBe('granted');
  });

  it('returns "granted" for "I agree"', () => {
    expect(detectConsentResponse('I agree')).toBe('granted');
  });

  it('returns "granted" for "sure, go ahead"', () => {
    expect(detectConsentResponse('sure, go ahead')).toBe('granted');
  });

  it('returns "declined" for "no"', () => {
    expect(detectConsentResponse('no')).toBe('declined');
  });

  it('returns "declined" for "I don\'t agree"', () => {
    expect(detectConsentResponse("I don't agree")).toBe('declined');
  });

  it('returns null for ambiguous response "what time is my appointment"', () => {
    expect(detectConsentResponse('what time is my appointment')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectConsentResponse('')).toBeNull();
  });
});

describe('CONSENT_SCRIPT', () => {
  it('contains "AI"', () => {
    expect(CONSENT_SCRIPT).toContain('AI');
  });

  it('contains "health"', () => {
    expect(CONSENT_SCRIPT).toContain('health');
  });

  it('contains "agree"', () => {
    expect(CONSENT_SCRIPT).toContain('agree');
  });
});

describe('CONSENT_TIMEOUT_SCRIPT', () => {
  it('is a non-empty string', () => {
    expect(typeof CONSENT_TIMEOUT_SCRIPT).toBe('string');
    expect(CONSENT_TIMEOUT_SCRIPT.length).toBeGreaterThan(0);
  });
});
