import { Router } from 'express';
import { Call, Agent, Lead, Conversation } from '../../models/index.js';
import { requireAuth, requireOrg } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import {
  isWithinCallingHours,
  initiateTwilioOutboundCall,
  initiateExotelOutboundCall,
  buildTwilioStreamTwiml,
  verifyTwilioSignature,
} from '../../services/telephony/telephonyService.js';
import { env } from '../../config/env.js';
import { emitToOrg } from '../../sockets/index.js';
import { enqueueCallPostProcessing } from '../../queues/producers/jobProducers.js';

const router = Router();

router.get('/', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { organizationId: req.organization._id, deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.sentiment) filter.sentiment = req.query.sentiment;
  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ 'transcript.text': regex }, { summary: regex }, { customerPhone: regex }];
  }

  const [items, total] = await Promise.all([
    Call.find(filter)
      .populate('agentId', 'name')
      .populate('leadId', 'name email phone leadScore')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Call.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: buildPaginationMeta(total, page, limit) });
}));

router.get('/live', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const activeCalls = await Call.find({
    organizationId: req.organization._id,
    status: { $in: ['ringing', 'in_progress'] },
    deletedAt: null,
  })
    .populate('agentId', 'name personality preferredLanguage')
    .populate('leadId', 'name phone email leadScore')
    .sort({ startTime: -1 })
    .lean();

  res.json({ success: true, data: activeCalls });
}));

router.get('/:id', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const call = await Call.findOne({ _id: req.params.id, organizationId: req.organization._id, deletedAt: null })
    .populate('agentId', 'name personality preferredLanguage')
    .populate('leadId')
    .lean();
  if (!call) throw new AppError('Call not found', 404, 'CALL_NOT_FOUND');
  res.json({ success: true, data: call });
}));

router.post('/outbound', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const { agentId, leadId, phoneNumber, provider = 'twilio' } = req.body;
  if (!agentId || !phoneNumber) {
    throw new AppError('agentId and phoneNumber are required', 400, 'VALIDATION_ERROR');
  }

  if (!isWithinCallingHours(req.organization)) {
    throw new AppError('Outbound calls are restricted outside configured calling hours', 403, 'OUTSIDE_CALLING_HOURS');
  }

  if (leadId) {
    const lead = await Lead.findOne({ _id: leadId, organizationId: req.organization._id }).lean();
    if (lead?.optOut?.doNotCall) {
      throw new AppError('Lead has opted out of phone calls', 403, 'DO_NOT_CALL');
    }
  }

  const agent = await Agent.findOne({ _id: agentId, organizationId: req.organization._id, deletedAt: null });
  if (!agent) throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');

  const conversation = await Conversation.create({
    organizationId: req.organization._id,
    agentId: agent._id,
    leadId: leadId || null,
    channel: 'telephony',
    activeMode: 'voice',
    language: agent.preferredLanguage,
  });

  const call = await Call.create({
    organizationId: req.organization._id,
    agentId: agent._id,
    leadId: leadId || null,
    conversationId: conversation._id,
    provider,
    direction: 'outbound',
    customerPhone: phoneNumber,
    status: 'ringing',
    aiDisclosed: req.organization.compliance?.discloseAiIdentity ?? true,
  });

  let providerRes = null;
  if (provider === 'exotel') {
    providerRes = await initiateExotelOutboundCall({ to: phoneNumber, callId: call._id });
  } else {
    providerRes = await initiateTwilioOutboundCall({
      to: phoneNumber,
      callId: call._id,
      organizationId: req.organization._id,
      agentId: agent._id,
    });
    call.callSid = providerRes.sid;
    await call.save();
  }

  emitToOrg(req.organization._id, 'call:incoming', { call });
  res.status(201).json({ success: true, data: call });
}));

// Twilio Voice Webhook
router.post('/webhooks/twilio/voice', asyncHandler(async (req, res) => {
  if (!verifyTwilioSignature(req)) {
    throw new AppError('Invalid Twilio webhook signature', 403, 'INVALID_SIGNATURE');
  }

  const { callId, organizationId, agentId } = req.query;
  const streamWsUrl = `${env.backendUrl.replace(/^http/, 'ws')}/ws/twilio-stream`;
  const twiml = buildTwilioStreamTwiml({
    streamWsUrl,
    callId: callId || '',
    organizationId: organizationId || '',
    agentId: agentId || '',
    disclosureMessage: 'Hello, this call is assisted by an AI sales representative from SalesPilot AI.',
  });

  res.type('text/xml').send(twiml);
}));

router.post('/webhooks/twilio/status', asyncHandler(async (req, res) => {
  if (!verifyTwilioSignature(req)) {
    throw new AppError('Invalid Twilio webhook signature', 403, 'INVALID_SIGNATURE');
  }
  const { CallSid, CallStatus, CallDuration } = req.body;
  const call = await Call.findOne({ callSid: CallSid });
  if (call) {
    const statusMap = {
      completed: 'completed',
      'in-progress': 'in_progress',
      ringing: 'ringing',
      failed: 'failed',
      'no-answer': 'no_answer',
      busy: 'busy',
      canceled: 'canceled',
    };
    call.status = statusMap[CallStatus] || call.status;
    if (CallDuration) call.durationSec = Number(CallDuration);
    if (call.status === 'completed') {
      call.endTime = new Date();
      await enqueueCallPostProcessing({ callId: String(call._id), organizationId: String(call.organizationId) });
      emitToOrg(call.organizationId, 'call:ended', { call });
    }
    await call.save();
  }
  res.sendStatus(200);
}));

export default router;
