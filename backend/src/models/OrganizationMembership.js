import mongoose from 'mongoose';

export const ORG_ROLES = [
  'super_admin',
  'org_owner',
  'org_admin',
  'sales_manager',
  'sales_rep',
];

const organizationMembershipSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ORG_ROLES,
      default: 'sales_rep',
      required: true,
    },
    status: {
      type: String,
      enum: ['invited', 'active', 'suspended'],
      default: 'active',
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inviteTokenHash: { type: String, select: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

organizationMembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const OrganizationMembership = mongoose.model(
  'OrganizationMembership',
  organizationMembershipSchema
);
