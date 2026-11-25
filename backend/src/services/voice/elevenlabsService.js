import { env } from '../../config/env.js';

export async function synthesizeSpeech({
  text,
  voiceId = env.elevenlabsDefaultVoiceId,
  stability = 0.5,
  similarityBoost = 0.75,
  speed = 1.0,
  outputFormat = 'mp3_44100_128',
}) {
  if (!env.elevenlabsApiKey) {
    return null;
  }

  const targetVoice = voiceId || env.elevenlabsDefaultVoiceId;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(targetVoice)}?output_format=${outputFormat}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': env.elevenlabsApiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          speed,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function listElevenLabsVoices() {
  if (!env.elevenlabsApiKey) {
    return [
      { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Default)', category: 'premade' },
      { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade' },
      { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', category: 'premade' },
      { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade' },
    ];
  }

  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': env.elevenlabsApiKey },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.voices || [];
}
