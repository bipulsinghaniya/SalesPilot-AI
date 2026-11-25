import { asyncHandler } from '../../utils/asyncHandler.js';
import { recordAudit } from '../../middlewares/audit.js';
import * as orgService from './organizations.service.js';

export const create = asyncHandler(async (req, res) => {
  const org = await orgService.createOrganization({ userId: req.user._id, ...req.body });
  res.status(201).json({ success: true, data: org });
});

export const getCurrent = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { organization: req.organization, membership: req.membership } });
});

export const updateCurrent = asyncHandler(async (req, res) => {
  const org = await orgService.updateOrganization({
    organizationId: req.organization._id,
    updates: req.body,
  });
  await recordAudit({
    organizationId: req.organization._id,
    actorUserId: req.user._id,
    action: 'organization.updated',
    resourceType: 'Organization',
    resourceId: org._id,
    req,
  });
  res.json({ success: true, data: org });
});

export const listMembers = asyncHandler(async (req, res) => {
  const members = await orgService.listMembers(req.organization._id);
  res.json({ success: true, data: members });
});

export const inviteMember = asyncHandler(async (req, res) => {
  const member = await orgService.inviteMember({
    organizationId: req.organization._id,
    inviterId: req.user._id,
    ...req.body,
  });
  await recordAudit({
    organizationId: req.organization._id,
    actorUserId: req.user._id,
    action: 'organization.member_invited',
    resourceType: 'OrganizationMembership',
    resourceId: member._id,
    req,
  });
  res.status(201).json({ success: true, data: member });
});

export const updateMember = asyncHandler(async (req, res) => {
  const member = await orgService.updateMemberRole({
    organizationId: req.organization._id,
    membershipId: req.params.membershipId,
    ...req.body,
  });
  res.json({ success: true, data: member });
});

export const removeMember = asyncHandler(async (req, res) => {
  const result = await orgService.removeMember({
    organizationId: req.organization._id,
    membershipId: req.params.membershipId,
  });
  res.json({ success: true, data: result });
});
