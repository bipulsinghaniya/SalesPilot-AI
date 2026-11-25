import { Router } from 'express';
import { z } from 'zod';
import { Agent, Conversation, Message } from '../../models/index.js';
import { requireAuth, requireOrg } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { runSalesAgentTurn } from '../../agents/salesAgent/index.js';
import { emitToOrg } from '../../sockets/index.js';
import { synthesizeSpeech } from '../../services/voice/elevenlabsService.js';

const router = Router();

const startConversationSchema = z.object({
  agentId: z.string(),
  leadId: z.string().optional(),
  mode: z.enum(['text', 'voice']).default('text'),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  mode: z.enum(['text', 'voice']).default('text'),
});

router.get('/', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { organizationId: req.organization._id, deletedAt: null };
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Conversation.find(filter)
      .populate('agentId', 'name personality preferredLanguage')
      .populate('leadId', 'name email phone leadScore leadStatus')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: buildPaginationMeta(total, page, limit) });
}));

router.post('/', requireAuth, requireOrg, validate(startConversationSchema), asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({
    _id: req.body.agentId,
    organizationId: req.organization._id,
    deletedAt: null,
  }).lean();
  if (!agent) throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');

  const conversation = await Conversation.create({
    organizationId: req.organization._id,
    agentId: agent._id,
    leadId: req.body.leadId || null,
    channel: req.body.mode,
    activeMode: req.body.mode,
    language: agent.preferredLanguage,
  });

  if (agent.welcomeMessage) {
    await Message.create({
      organizationId: req.organization._id,
      conversationId: conversation._id,
      role: 'assistant',
      mode: req.body.mode,
      content: agent.welcomeMessage,
    });
    conversation.messageCount = 1;
    await conversation.save();
  }

  res.status(201).json({ success: true, data: conversation });
}));

router.get('/:id', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    organizationId: req.organization._id,
    deletedAt: null,
  })
    .populate('agentId', 'name personality preferredLanguage voiceConfig welcomeMessage')
    .populate('leadId')
    .lean();

  if (!conversation) throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');

  const messages = await Message.find({
    conversationId: conversation._id,
    organizationId: req.organization._id,
  })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ success: true, data: { conversation, messages } });
}));

router.post('/:id/messages', requireAuth, requireOrg, validate(sendMessageSchema), asyncHandler(async (req, res) => {
  const result = await runSalesAgentTurn({
    organizationId: req.organization._id,
    conversationId: req.params.id,
    userMessage: req.body.content,
    mode: req.body.mode,
    emitEvent: (evt, data) => emitToOrg(req.organization._id, evt, data),
  });

  res.json({ success: true, data: result });
}));

router.post('/:id/tts', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const { text, voiceId } = req.body;
  if (!text) throw new AppError('Text is required', 400, 'MISSING_TEXT');
  const audioBuffer = await synthesizeSpeech({ text, voiceId });
  if (!audioBuffer) {
    return res.json({ success: true, data: { audioBase64: null, mocked: true } });
  }
  res.json({
    success: true,
    data: { audioBase64: audioBuffer.toString('base64'), mimeType: 'audio/mpeg' },
  });
}));

router.patch('/:id/mode', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const { mode } = req.body;
  if (!['text', 'voice'].includes(mode)) throw new AppError('Invalid mode', 400, 'INVALID_MODE');
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organization._id, deletedAt: null },
    { $set: { activeMode: mode, channel: 'hybrid' } },
    { new: true }
  );
  if (!conversation) throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  res.json({ success: true, data: conversation });
}));

export default router;
