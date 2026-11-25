import bcrypt from 'bcryptjs';
import { Organization, OrganizationMembership, User } from '../../models/index.js';
import { AppError } from '../../utils/AppError.js';
import { generateRandomToken, hashToken } from '../../utils/crypto.js';

function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6)
  );
}

export async function createOrganization({ userId, name, industry, website, timezone, defaultLanguage }) {
  const org = await Organization.create({
    name,
    slug: slugify(name),
    industry: industry || 'SaaS & Technology',
    website: website || '',
    timezone: timezone || 'Asia/Kolkata',
    defaultLanguage: defaultLanguage || 'en',
    ownerId: userId,
  });

  await OrganizationMembership.create({
    organizationId: org._id,
    userId,
    role: 'org_owner',
    status: 'active',
  });

  return org;
}

export async function updateOrganization({ organizationId, updates }) {
  const org = await Organization.findOneAndUpdate(
    { _id: organizationId, deletedAt: null },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!org) throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
  return org;
}

export async function listMembers(organizationId) {
  return OrganizationMembership.find({ organizationId })
    .populate('userId', 'name email avatarUrl isEmailVerified lastLoginAt')
    .sort({ createdAt: 1 })
    .lean();
}

export async function inviteMember({ organizationId, inviterId, name, email, role }) {
  let user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) {
    const tempPassword = generateRandomToken(12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    user = await User.create({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      passwordHash,
      isEmailVerified: false,
    });
  }

  const existing = await OrganizationMembership.findOne({ organizationId, userId: user._id });
  if (existing && existing.status === 'active') {
    throw new AppError('User is already a member of this organization', 409, 'ALREADY_MEMBER');
  }

  const inviteToken = generateRandomToken(20);
  const membership = await OrganizationMembership.findOneAndUpdate(
    { organizationId, userId: user._id },
    {
      $set: {
        role,
        status: 'active',
        invitedBy: inviterId,
        inviteTokenHash: hashToken(inviteToken),
        joinedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  ).populate('userId', 'name email avatarUrl');

  return membership;
}

export async function updateMemberRole({ organizationId, membershipId, role, status }) {
  const update = {};
  if (role) update.role = role;
  if (status) update.status = status;

  const membership = await OrganizationMembership.findOneAndUpdate(
    { _id: membershipId, organizationId },
    { $set: update },
    { new: true }
  ).populate('userId', 'name email avatarUrl');

  if (!membership) throw new AppError('Membership not found', 404, 'MEMBERSHIP_NOT_FOUND');
  return membership;
}

export async function removeMember({ organizationId, membershipId }) {
  const membership = await OrganizationMembership.findOne({ _id: membershipId, organizationId });
  if (!membership) throw new AppError('Membership not found', 404, 'MEMBERSHIP_NOT_FOUND');
  if (membership.role === 'org_owner') {
    throw new AppError('Cannot remove organization owner', 400, 'CANNOT_REMOVE_OWNER');
  }
  await membership.deleteOne();
  return { removed: true };
}
