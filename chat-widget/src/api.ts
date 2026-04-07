export async function sendMessage(
  apiUrl: string,
  shopId: string,
  sessionId: string,
  message: string,
  onChunk: (text: string) => void,
): Promise<void> {
  const response = await fetch(apiUrl + '/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopId, sessionId, message, consentGranted: true }),
  });

  if (!response.ok) {
    throw new Error('Chat request failed: ' + response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'text') onChunk(data.delta);
        if (data.type === 'done') return;
      } catch {
        // skip malformed lines
      }
    }
  }
}
