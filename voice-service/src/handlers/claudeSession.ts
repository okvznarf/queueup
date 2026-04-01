import Anthropic from '@anthropic-ai/sdk';
import type { Session, ShopContext } from '../types/session.js';
import { BOOKING_TOOLS, dispatchTool, MAX_TOOL_ITERATIONS } from './bookingTools.js';

const anthropic = new Anthropic();

export function buildSystemPrompt(ctx: ShopContext, channel: 'voice' | 'chat'): string {
  const hoursText = ctx.workingHours
    .filter((h) => !h.isClosed)
    .map((h) => `  ${h.day}: ${h.openTime}–${h.closeTime}`)
    .join('\n');

  const servicesText = ctx.services
    .map((s) => `  - ${s.name} (${s.duration} min, ${s.price} ${ctx.currency})`)
    .join('\n');

  const staffLabel = ctx.staffLabel;
  const staffPlural = `${staffLabel}s`;

  const staffPreferenceRule =
    ctx.staffCount >= 2
      ? `Ask "Do you have a preferred ${staffLabel}?" after service is selected`
      : `No staff preference needed (single provider)`;

  return `You are Aria, a warm and friendly AI receptionist assistant for ${ctx.shopName}.

CLINIC INFORMATION (answer patient questions from this data):
Name: ${ctx.shopName}
Address: ${ctx.address ?? 'Not provided'}
Phone: ${ctx.phone ?? 'Not provided'}
Email: ${ctx.email ?? 'Not provided'}
Timezone: ${ctx.timezone}

WORKING HOURS:
${hoursText}

SERVICES AVAILABLE:
${servicesText}

STAFF: ${ctx.staffCount} active ${staffLabel}${ctx.staffCount !== 1 ? 's' : ''}

BOOKING RULES:
- Ask patient what day works for them first, then show available slots for that day
- ${staffPreferenceRule}
- Read back full booking before confirming: service, date, time, ${staffLabel}
- Always collect patient name and phone number
- After confirming the booking, ask "What's the reason for your visit?" if the patient hasn't already mentioned it. Include their answer in the notes field.

CONVERSATION RULES:
- Keep responses short and conversational — this is a ${channel === 'voice' ? 'phone call' : 'chat'}
- Use patient's first name once or twice naturally after they provide it
- Never provide medical advice, diagnosis, or triage
- If uncertain after 2 questions, offer to connect with a team member
- When you cannot answer a question confidently, say "I'm not sure about that" so the system can track unanswered questions`;
}

export async function fetchShopContext(shopId: string): Promise<ShopContext> {
  const base = (process.env.QUEUEUP_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const url = `${base}/api/internal/shop-context?shopId=${encodeURIComponent(shopId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN ?? ''}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch shop context for ${shopId}: HTTP ${res.status}`);
  }

  return res.json() as Promise<ShopContext>;
}

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

  const systemPrompt = session.shopContext
    ? buildSystemPrompt(session.shopContext, session.channel ?? 'voice')
    : `You are Aria, a warm and friendly AI receptionist. Keep responses short and conversational. When you cannot answer a question confidently, say "I'm not sure about that".`;

  let iterations = 0;

  while (true) {
    if (iterations >= MAX_TOOL_ITERATIONS) {
      // Safety guard — prevent runaway tool loops
      session.escalationTriggered = true;
      session.actionsLog.push('escalated:max_tool_iterations');
      const fallback = "Let me connect you with a team member who can help you with that.";
      await onSentence(fallback);
      break;
    }

    iterations++;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      tools: BOOKING_TOOLS,
      messages: session.messages,
    });

    // Accumulate assistant content (may contain both text and tool_use blocks)
    session.messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      // Extract and emit text blocks for TTS/chat
      let fullText = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          fullText += block.text;
        }
      }

      // Split into sentences and emit
      let buffer = fullText;
      let extracted = extractFirstSentence(buffer);
      while (extracted) {
        await onSentence(extracted.sentence);
        buffer = extracted.remainder;
        extracted = extractFirstSentence(buffer);
      }
      if (buffer.trim()) {
        await onSentence(buffer.trim());
      }

      // Track unanswered questions
      if (fullText.includes("I'm not sure about that")) {
        session.unansweredQuestions++;
      }

      // Trigger escalation at threshold
      if (session.unansweredQuestions >= 2 && !session.escalationTriggered) {
        session.escalationTriggered = true;
        session.actionsLog.push('escalated');
      }

      break;
    }

    if (response.stop_reason === 'tool_use') {
      // Execute each tool call, collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await dispatchTool(
            block.name,
            block.input as Record<string, unknown>,
            session,
          );
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
          session.actionsLog.push(`tool:${block.name}`);
        }
      }
      // Feed results back — tool_result blocks come as user message
      session.messages.push({ role: 'user', content: toolResults });
      // Loop continues — Claude will process results and either call more tools or end_turn
    }
  }
}
