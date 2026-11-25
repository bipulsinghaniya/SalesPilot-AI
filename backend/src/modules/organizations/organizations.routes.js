import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireOrg, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as orgController from './organizations.controller.js';

const router = Router();

const createOrgSchema = z.object({
  name: z.string().min(2).max(150),
  industry: z.string().optional(),
  website: z.string().optional(),
  timezone: z.string().optional(),
  defaultLanguage: z.enum(['en', 'hi', 'hinglish']).optional(),
});

const inviteSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email(),
  role: z.enum(['org_admin', 'sales_manager', 'sales_rep']).default('sales_rep'),
});

const updateMemberSchema = z.object({
  role: z.enum(['org_admin', 'sales_manager', 'sales_rep']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});

router.post('/', requireAuth, validate(createOrgSchema), orgController.create);
router.get('/current', requireAuth, requireOrg, orgController.getCurrent);
router.patch(
  '/current',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin'),
  orgController.updateCurrent
);
router.get('/members', requireAuth, requireOrg, orgController.listMembers);
router.post(
  '/members/invite',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin'),
  validate(inviteSchema),
  orgController.inviteMember
);
router.patch(
  '/members/:membershipId',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin'),
  validate(updateMemberSchema),
  orgController.updateMember
);
router.delete(
  '/members/:membershipId',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin'),
  orgController.removeMember
);

export default router;
