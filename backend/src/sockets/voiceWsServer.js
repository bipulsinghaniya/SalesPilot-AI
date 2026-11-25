import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Agent, Call, Conversation } from '../models/index.js';
import { createDeepgramLiveConnection } from '../services/voice/deepgramService.js';
import { synthesizeSpeech } from '../services/voice/elevenlabsService.js';
import { runSalesAgentTurn } from '../agents/salesAgent/index.js';
import { emitToOrg } from './index.js';
import { enqueueCallPostProcessing } from '../queues/producers/jobProducers.js';

export function attachVoiceWebSockets(httpServer) {
  const voiceWss = new WebSocketServer({ noServer: true });
  const twilioWss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (pathname === '/ws/voice') {
      voiceWss.handleUpgrade(request, socket, head, (ws) => {
        voiceWss.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/twilio-stream') {
      twilioWss.handleUpgrade(request, socket, head, (ws) => {
        twilioWss.emit('connection', ws, request);
      });
    }
  });

  // Browser Microphone Real-Time Voice Agent WebSocket
  voiceWss.on('connection', async (ws, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const organizationId = url.searchParams.get('organizationId');
    const conversationId = url.searchParams.get('conversationId');
    const agentId = url.searchParams.get('agentId');

    try {
      if (!token) throw new Error('Missing auth token');
      jwt.verify(token, env.jwtSecret);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized voice connection' }));
      ws.close();
      return;
    }

    let agent = await Agent.findOne({ _id: agentId, organizationId, deletedAt: null }).lean();
    if (!agent) {
      ws.send(JSON.stringify({ type: 'error', message: 'Agent not found' }));
      ws.close();
      return;
    }

    let conversation = conversationId
      ? await Conversation.findOne({ _id: conversationId, organizationId })
      : null;

    if (!conversation) {
      conversation = await Conversation.create({
        organizationId,
        agentId: agent._id,
        channel: 'voice',
        activeMode: 'voice',
        language: agent.preferredLanguage,
      });
    }

    const callRecord = await Call.create({
      organizationId,
      agentId: agent._id,
      conversationId: conversation._id,
      provider: 'browser_mic',
      direction: 'inbound',
      status: 'in_progress',
      consentObtained: true,
      aiDisclosed: true,
    });

    emitToOrg(organizationId, 'call:connected', { call: callRecord });

    let isSpeaking = false;
    let utteranceBuffer = '';
    let dgConnection = null;

    const processCustomerUtterance = async (text) => {
      const cleaned = text.trim();
      if (!cleaned) return;

      await Call.findByIdAndUpdate(callRecord._id, {
        $push: { transcript: { speaker: 'customer', text: cleaned, timestamp: new Date() } },
      });

      emitToOrg(organizationId, 'transcript:update', {
        callId: String(callRecord._id),
        speaker: 'customer',
        text: cleaned,
      });

      ws.send(JSON.stringify({ type: 'transcript', speaker: 'customer', text: cleaned, isFinal: true }));

      try {
        const result = await runSalesAgentTurn({
          organizationId,
          conversationId: conversation._id,
          userMessage: cleaned,
          mode: 'voice',
          emitEvent: (evt, data) => emitToOrg(organizationId, evt, data),
        });

        await Call.findByIdAndUpdate(callRecord._id, {
          $push: { transcript: { speaker: 'agent', text: result.reply, timestamp: new Date() } },
        });

        emitToOrg(organizationId, 'transcript:update', {
          callId: String(callRecord._id),
          speaker: 'agent',
          text: result.reply,
        });

        ws.send(JSON.stringify({ type: 'transcript', speaker: 'agent', text: result.reply, isFinal: true }));

        isSpeaking = true;
        const audioBuffer = await synthesizeSpeech({
          text: result.reply,
          voiceId: agent.voiceConfig?.voiceId,
          stability: agent.voiceConfig?.stability,
          speed: agent.voiceConfig?.speakingSpeed,
        }).catch(() => null);

        if (isSpeaking && audioBuffer) {
          ws.send(
            JSON.stringify({
              type: 'audio',
              mimeType: 'audio/mpeg',
              data: audioBuffer.toString('base64'),
            })
          );
        }
        isSpeaking = false;
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    };

    if (env.deepgramApiKey) {
      dgConnection = createDeepgramLiveConnection({
        language: agent.preferredLanguage,
        encoding: 'linear16',
        sampleRate: 16000,
        onSpeechStarted: () => {
          // Barge-in / interruption support
          if (isSpeaking) {
            isSpeaking = false;
            ws.send(JSON.stringify({ type: 'barge_in' }));
          }
        },
        onTranscript: ({ text, isFinal }) => {
          if (!isFinal) {
            ws.send(JSON.stringify({ type: 'transcript', speaker: 'customer', text, isFinal: false }));
          } else {
            utteranceBuffer = `${utteranceBuffer} ${text}`.trim();
          }
        },
        onUtteranceEnd: async () => {
          if (utteranceBuffer) {
            const toProcess = utteranceBuffer;
            utteranceBuffer = '';
            await processCustomerUtterance(toProcess);
          }
        },
      });
    }

    ws.send(
      JSON.stringify({
        type: 'session_ready',
        callId: String(callRecord._id),
        conversationId: String(conversation._id),
        welcomeMessage: agent.welcomeMessage,
      })
    );

    ws.on('message', async (raw, isBinary) => {
      if (isBinary) {
        if (dgConnection) {
          dgConnection.send(raw);
        }
        return;
      }
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'barge_in') {
          isSpeaking = false;
        } else if (msg.type === 'utterance_text' && msg.text) {
          // Fallback / direct browser SpeechRecognition transcript input
          await processCustomerUtterance(msg.text);
        }
      } catch {
        // Ignore malformed control frames
      }
    });

    ws.on('close', async () => {
      if (dgConnection) {
        try {
          dgConnection.finish();
        } catch {}
      }
      const endTime = new Date();
      const durationSec = Math.max(1, Math.round((endTime - callRecord.startTime) / 1000));
      const updatedCall = await Call.findByIdAndUpdate(
        callRecord._id,
        { status: 'completed', endTime, durationSec },
        { new: true }
      );
      emitToOrg(organizationId, 'call:ended', { call: updatedCall });
      await enqueueCallPostProcessing({ callId: String(callRecord._id), organizationId });
    });
  });

  // Twilio Media Streams WebSocket
  twilioWss.on('connection', (ws) => {
    let callMeta = {};
    let dgConnection = null;
    let utteranceBuffer = '';

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'start') {
          callMeta = msg.start?.customParameters || {};
          if (env.deepgramApiKey) {
            dgConnection = createDeepgramLiveConnection({
              language: 'en',
              encoding: 'mulaw',
              sampleRate: 8000,
              onTranscript: ({ text, isFinal }) => {
                if (isFinal) utteranceBuffer = `${utteranceBuffer} ${text}`.trim();
              },
              onUtteranceEnd: async () => {
                if (!utteranceBuffer || !callMeta.organizationId || !callMeta.callId) return;
                const text = utteranceBuffer;
                utteranceBuffer = '';
                const call = await Call.findById(callMeta.callId);
                if (!call) return;
                await runSalesAgentTurn({
                  organizationId: callMeta.organizationId,
                  conversationId: call.conversationId,
                  userMessage: text,
                  mode: 'voice',
                  emitEvent: (evt, data) => emitToOrg(callMeta.organizationId, evt, data),
                });
              },
            });
          }
        } else if (msg.event === 'media' && msg.media?.payload && dgConnection) {
          dgConnection.send(Buffer.from(msg.media.payload, 'base64'));
        } else if (msg.event === 'stop') {
          if (dgConnection) dgConnection.finish();
          if (callMeta.callId && callMeta.organizationId) {
            await enqueueCallPostProcessing({
              callId: callMeta.callId,
              organizationId: callMeta.organizationId,
            });
          }
        }
      } catch {
        // Ignore malformed Twilio frame
      }
    });
  });
}
