import { DeepgramClient } from '@deepgram/sdk';

export function createDeepgramConnection(onFinalTranscript: (text: string) => void) {
  const deepgram = new DeepgramClient(process.env.DEEPGRAM_API_KEY!);

  const connection = deepgram.listen.v1.connect({
    model: 'nova-2',
    encoding: 'mulaw',
    sample_rate: 8000,
    channels: 1,
    punctuate: true,
    interim_results: false,
    endpointing: 300,
    utterance_end_ms: 1000,
  });

  connection.on('transcript', (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    const isFinal = data.speech_final;
    if (isFinal && transcript?.trim()) {
      onFinalTranscript(transcript.trim());
    }
  });

  connection.on('error', (err: any) => {
    console.error('[deepgram] error:', err);
  });

  return connection;
}
