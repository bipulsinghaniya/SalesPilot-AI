import { Router } from 'express';
import { z } from 'zod';
import { Agent } from '../../models/index.js';
import { requireAuth, requireOrg, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { listElevenLabsVoices } from '../../services/voice/elevenlabsService.js';
import { emitToOrg } from '../../sockets/index.js';

const router = Router();

const agentSchema = z.object({
  name: z.string().min(2).max(100),
  personality: z.enum(['professional', 'friendly', 'consultative', 'persuasive', 'informative']).default('consultative'),
  companyName: z.string().min(1).max(150),
  productDescription: z.string().optional(),
  salesObjectives: z.string().optional(),
  preferredLanguage: z.enum(['en', 'hi', 'hinglish']).default('en'),
  voiceConfig: z
    .object({
      voiceId: z.string().optional(),
      voiceName: z.string().optional(),
      speakingSpeed: z.number().min(0.7).max(1.3).optional(),
      stability: z.number().min(0).max(1).optional(),
      style: z.string().optional(),
    })
    .optional(),
  welcomeMessage: z.string().optional(),
  salesInstructions: z.string().optional(),
  callDurationLimitSec: z.number().min(60).max(3600).optional(),
  isActive: z.boolean().optional(),
});

router.get('/voices', requireAuth, requireOrg, asyncHandler(async (_req, res) => {
  const voices = await listElevenLabsVoices();
  res.json({ success: true, data: voices });
}));

router.get('/', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const agents = await Agent.find({ organizationId: req.organization._id, deletedAt: null })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: agents });
}));

router.post(
  '/',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin', 'sales_manager'),
  validate(agentSchema),
  asyncHandler(async (req, res) => {
    const agent = await Agent.create({
      ...req.body,
      organizationId: req.organization._id,
      createdBy: req.user._id,
    });
    emitToOrg(req.organization._id, 'agent:status', { agent });
    res.status(201).json({ success: true, data: agent });
  })
);

router.get('/:id', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ _id: req.params.id, organizationId: req.organization._id, deletedAt: null }).lean();
  if (!agent) throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
  res.json({ success: true, data: agent });
}));

router.patch(
  '/:id',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin', 'sales_manager'),
  asyncHandler(async (req, res) => {
    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organization._id, deletedAt: null },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!agent) throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    emitToOrg(req.organization._id, 'agent:status', { agent });
    res.json({ success: true, data: agent });
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin'),
  asyncHandler(async (req, res) => {
    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organization._id, deletedAt: null },
      { $set: { deletedAt: new Date(), isActive: false } },
      { new: true }
    );
    if (!agent) throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
