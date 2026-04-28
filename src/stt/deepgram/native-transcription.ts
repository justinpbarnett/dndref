import * as FileSystem from "expo-file-system/legacy";

import { DEEPGRAM_HTTP_URL, DEEPGRAM_PARAMS, extractDeepgramTranscript } from "../deepgram-shared";

export async function transcribeNativeChunk(apiKey: string, uri: string): Promise<string> {
  try {
    const result = await FileSystem.uploadAsync(`${DEEPGRAM_HTTP_URL}?${DEEPGRAM_PARAMS}`, uri, {
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/mp4",
      },
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Deepgram HTTP ${result.status}: ${result.body}`);
    }
    return extractDeepgramTranscript(result.body);
  } finally {
    FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
