import Anthropic from '@anthropic-ai/sdk';
import type { Session } from '../types/session.js';

const anthropic = new Anthropic();

export const SYSTEM_PROMPT = `You are Aria, a warm and friendly AI assistant who helps patients with appointments at their clinic. You speak naturally and conversationally — not robotic or clinical.

Rules:
- Use the patient's first name once or twice naturally after they provide it (e.g., "Thanks, John, let me check that for you")
- Keep responses short and conversational — this is a phone call, not an email
- If you cannot confidently answer a question, say so honestly. Do not speculate.
- If you sense the patient is frustrated or confused, offer to connect them with a team member
- Never provide medical advice, diagnosis, or triage
- You are currently in Phase 1 — you can have conversations and transfer to staff, but cannot yet book appointments (that capability is coming soon)

When you cannot answer a question confidently, respond with a message that includes the phrase "I'm not sure about that" so the system can track unanswered questions.`;

export function extractFirstSentence(
  buffer: string,
): { sentence: string; remainder: string } | null {
  const match = buffer.match(/^(.+?[.!?])\s+(.*)/s);
  if (!match) return null;
  return { sentence: match[1], remainder: match[2] };
}

export async function processPatientUtterance(
  session: Session,
  transcript: string,
  onSentence: (sentence: string) => Promise<void>,
): Promise<void> {
  session.messages.push({ role: 'user', content: transcript });

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: session.messages,
  });

  let buffer = '';
  let fullResponse = '';

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      buffer += event.delta.text;
      fullResponse += event.delta.text;

      // Extract and emit sentences as they complete
      let extracted = extractFirstSentence(buffer);
      while (extracted) {
        await onSentence(extracted.sentence);
        buffer = extracted.remainder;
        extracted = extractFirstSentence(buffer);
      }
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    await onSentence(buffer.trim());
  }

  session.messages.push({ role: 'assistant', content: fullResponse });

  // Track unanswered questions
  if (fullResponse.includes("I'm not sure about that")) {
    session.unansweredQuestions++;
  }

  // Trigger escalation at threshold
  if (session.unansweredQuestions >= 2 && !session.escalationTriggered) {
    session.escalationTriggered = true;
    session.actionsLog.push('escalated');
  }
}
