import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { WebSocket } from 'ws';

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

export async function streamTtsToTwilio(
  text: string,
  streamSid: string,
  twilioWs: WebSocket,
): Promise<void> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

  const audioStream = await client.textToSpeech.stream(voiceId, {
    text,
    model_id: 'eleven_flash_v2_5',
    output_format: 'ulaw_8000',
  });

  for await (const chunk of audioStream) {
    if (chunk instanceof Buffer || chunk instanceof Uint8Array) {
      twilioWs.send(
        JSON.stringify({
          event: 'media',
          streamSid,
          media: { payload: Buffer.from(chunk).toString('base64') },
        }),
      );
    }
  }
}

export async function playConsentGreeting(
  consentScript: string,
  streamSid: string,
  twilioWs: WebSocket,
): Promise<void> {
  await streamTtsToTwilio(consentScript, streamSid, twilioWs);
  twilioWs.send(
    JSON.stringify({
      event: 'mark',
      streamSid,
      mark: { name: 'consent-greeting-complete' },
    }),
  );
}
