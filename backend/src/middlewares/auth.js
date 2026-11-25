import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User, Organization, OrganizationMembership } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Invalid or expired access token', 401, 'TOKEN_EXPIRED');
  }

  const user = await User.findOne({ _id: payload.sub, deletedAt: null }).lean();
  if (!user) {
    throw new AppError('User account not found', 401, 'UNAUTHORIZED');
  }

  req.user = user;
  next();
});

export const requireOrg = asyncHandler(async (req, _res, next) => {
  const orgId = req.headers['x-organization-id'] || req.params.organizationId || req.body?.organizationId;
  if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
    throw new AppError('Valid x-organization-id header is required', 400, 'MISSING_ORGANIZATION');
  }

  const org = await Organization.findOne({ _id: orgId, deletedAt: null }).lean();
  if (!org) {
    throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
  }

  if (req.user.isSuperAdmin) {
    req.organization = org;
    req.membership = { role: 'super_admin', status: 'active', organizationId: org._id, userId: req.user._id };
    return next();
  }

  const membership = await OrganizationMembership.findOne({
    organizationId: org._id,
    userId: req.user._id,
    status: 'active',
  }).lean();

  if (!membership) {
    throw new AppError('Access denied to this organization', 403, 'FORBIDDEN_ORGANIZATION');
  }

  req.organization = org;
  req.membership = membership;
  next();
});

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.membership) {
      return next(new AppError('Organization context required', 403, 'FORBIDDEN'));
    }
    if (req.user?.isSuperAdmin || req.membership.role === 'super_admin') {
      return next();
    }
    if (!allowedRoles.includes(req.membership.role)) {
      return next(new AppError('Insufficient role permissions', 403, 'FORBIDDEN_ROLE'));
    }
    next();
  };
}
