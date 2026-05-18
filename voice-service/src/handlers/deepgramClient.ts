import { DeepgramClient } from '@deepgram/sdk';

export async function createDeepgramConnection(
  onFinalTranscript: (text: string) => void,
) {
  const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! });

  const connection = await deepgram.listen.v1.connect({
    model: 'nova-2',
    encoding: 'mulaw',
    sample_rate: 8000,
    channels: 1,
    // v5 SDK types punctuate/interim_results as string ('true'/'false').
    punctuate: 'true',
    interim_results: 'false',
    endpointing: 300,
    utterance_end_ms: 1000,
  } as Parameters<typeof deepgram.listen.v1.connect>[0]);

  connection.on('message', (data) => {
    if (data.type !== 'Results') return;
    const alt = data.channel?.alternatives?.[0];
    const transcript = alt?.transcript;
    const isFinal = (data as { speechFinal?: boolean; speech_final?: boolean }).speechFinal
      ?? (data as { speech_final?: boolean }).speech_final;
    if (isFinal && transcript && transcript.trim()) {
      onFinalTranscript(transcript.trim());
    }
  });

  connection.on('error', (err) => {
    console.error('[deepgram] error:', err);
  });

  connection.connect();
  await connection.waitForOpen();

  return connection;
}
