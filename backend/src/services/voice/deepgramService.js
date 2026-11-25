import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { env } from '../../config/env.js';

export function createDeepgramLiveConnection({
  language = 'en',
  encoding = 'linear16',
  sampleRate = 16000,
  onTranscript,
  onSpeechStarted,
  onUtteranceEnd,
  onError,
}) {
  if (!env.deepgramApiKey) {
    return null;
  }

  const deepgram = createClient(env.deepgramApiKey);
  const dgLanguage = language === 'hi' ? 'hi' : language === 'hinglish' ? 'hi' : 'en-US';

  const connection = deepgram.listen.live({
    model: 'nova-2',
    language: dgLanguage,
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1100,
    vad_events: true,
    encoding,
    sample_rate: sampleRate,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const alt = data.channel?.alternatives?.[0];
      if (!alt?.transcript) return;
      onTranscript?.({
        text: alt.transcript,
        isFinal: Boolean(data.is_final),
        speechFinal: Boolean(data.speech_final),
      });
    });

    connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
      onSpeechStarted?.();
    });

    connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      onUtteranceEnd?.();
    });

    connection.on(LiveTranscriptionEvents.Error, (err) => {
      onError?.(err);
    });
  });

  return connection;
}

export async function transcribeAudioBuffer(audioBuffer, mimetype = 'audio/webm', language = 'en') {
  if (!env.deepgramApiKey) {
    throw new Error('DEEPGRAM_API_KEY is not configured');
  }
  const deepgram = createClient(env.deepgramApiKey);
  const dgLanguage = language === 'hi' ? 'hi' : 'en-US';

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
    model: 'nova-2',
    language: dgLanguage,
    smart_format: true,
    mimetype,
  });

  if (error) throw error;
  return result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}
