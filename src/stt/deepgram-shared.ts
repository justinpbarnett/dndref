export const DEEPGRAM_HTTP_URL = 'https://api.deepgram.com/v1/listen';
export const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen';
export const DEEPGRAM_PARAMS = 'model=nova-2&punctuate=true&smart_format=true&language=en-US';

export function assertDeepgramApiKey(apiKey: string): void {
  if (!apiKey) throw new Error('Deepgram API key not set. Configure it in the Settings tab.');
}

export function getDeepgramCloseMessage(event: CloseEvent): string {
  if (event.code === 1008) return 'Deepgram rejected the connection -- verify your API key.';
  return `Deepgram connection closed (${event.code}). Check your network.`;
}

export function extractDeepgramTranscript(body: string): string {
  const data = JSON.parse(body) as {
    results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
  };
  return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
}
