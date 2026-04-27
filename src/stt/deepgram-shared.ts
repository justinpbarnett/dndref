export const DEEPGRAM_HTTP_URL = 'https://api.deepgram.com/v1/listen';
export const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen';
export const DEEPGRAM_PARAMS = 'model=nova-2&punctuate=true&smart_format=true&language=en-US';

type DeepgramTranscriptChannel = {
  alternatives?: Array<{ transcript?: string }>;
};

type DeepgramHttpResponse = {
  results?: { channels?: DeepgramTranscriptChannel[] };
};

type DeepgramStreamingResponse = {
  channel?: DeepgramTranscriptChannel;
  is_final?: boolean;
  type?: string;
};

export function assertDeepgramApiKey(apiKey: string): void {
  if (!apiKey) throw new Error('Deepgram API key not set. Configure it in the Settings tab.');
}

export function getDeepgramCloseMessage(event: CloseEvent): string {
  if (event.code === 1008) return 'Deepgram rejected the connection -- verify your API key.';
  return `Deepgram connection closed (${event.code}). Check your network.`;
}

export function extractDeepgramTranscript(body: string): string {
  const data = JSON.parse(body) as DeepgramHttpResponse | null;
  return getFirstTranscript(data?.results?.channels?.[0]);
}

export function extractDeepgramFinalTranscript(message: string): string {
  const data = JSON.parse(message) as DeepgramStreamingResponse;
  if (data.type !== 'Results' || !data.is_final) return '';
  return getFirstTranscript(data.channel);
}

function getFirstTranscript(channel: DeepgramTranscriptChannel | undefined): string {
  return channel?.alternatives?.[0]?.transcript ?? '';
}
