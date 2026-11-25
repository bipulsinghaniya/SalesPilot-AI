import { Router } from 'express';
import { z } from 'zod';
import { Lead, Conversation, Call, Appointment, PIPELINE_STAGES } from '../../models/index.js';
import { requireAuth, requireOrg, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { emitToOrg } from '../../sockets/index.js';

const router = Router();

const createLeadSchema = z.object({
  name: z.string().min(1).max(140),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.enum(['voice_inbound', 'voice_outbound', 'text_chat', 'manual', 'web_widget', 'import']).default('manual'),
  pipelineStage: z.enum(PIPELINE_STAGES).default('new'),
  estimatedValue: z.number().min(0).optional(),
});

router.get('/', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { organizationId: req.organization._id, deletedAt: null };

  if (req.query.leadStatus) filter.leadStatus = req.query.leadStatus;
  if (req.query.pipelineStage) filter.pipelineStage = req.query.pipelineStage;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: regex }, { email: regex }, { company: regex }, { phone: regex }];
  }

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: buildPaginationMeta(total, page, limit) });
}));

router.post('/', requireAuth, requireOrg, validate(createLeadSchema), asyncHandler(async (req, res) => {
  const lead = await Lead.create({
    ...req.body,
    email: req.body.email || undefined,
    organizationId: req.organization._id,
  });
  emitToOrg(req.organization._id, 'lead:updated', { lead });
  res.status(201).json({ success: true, data: lead });
}));

router.get('/:id', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.organization._id, deletedAt: null })
    .populate('assignedTo', 'name email')
    .lean();
  if (!lead) throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');

  const [conversations, calls, appointments] = await Promise.all([
    Conversation.find({ organizationId: req.organization._id, leadId: lead._id, deletedAt: null })
      .sort({ lastMessageAt: -1 })
      .lean(),
    Call.find({ organizationId: req.organization._id, leadId: lead._id, deletedAt: null })
      .sort({ startTime: -1 })
      .lean(),
    Appointment.find({ organizationId: req.organization._id, leadId: lead._id, deletedAt: null })
      .sort({ startTime: -1 })
      .lean(),
  ]);

  res.json({ success: true, data: { lead, conversations, calls, appointments } });
}));

router.patch('/:id', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organization._id, deletedAt: null },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!lead) throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  emitToOrg(req.organization._id, 'lead:updated', { lead });
  res.json({ success: true, data: lead });
}));

router.post('/:id/notes', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) throw new AppError('Note content is required', 400, 'MISSING_CONTENT');

  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organization._id, deletedAt: null },
    {
      $push: {
        notes: {
          content,
          authorId: req.user._id,
          authorName: req.user.name,
          createdAt: new Date(),
        },
      },
    },
    { new: true }
  );
  if (!lead) throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  res.json({ success: true, data: lead });
}));

router.delete(
  '/:id',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin', 'sales_manager'),
  asyncHandler(async (req, res) => {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organization._id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
    if (!lead) throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
