import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { User, Organization, OrganizationMembership } from '../../models/index.js';
import { AppError } from '../../utils/AppError.js';
import { generateRandomToken, hashToken } from '../../utils/crypto.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../services/email/emailService.js';

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email, isSuperAdmin: !!user.isSuperAdmin },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: String(user._id), type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

function parseRefreshExpiryDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

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

export async function getUserOrganizations(userId) {
  const memberships = await OrganizationMembership.find({ userId, status: 'active' })
    .populate('organizationId')
    .lean();

  return memberships
    .filter((m) => m.organizationId && !m.organizationId.deletedAt)
    .map((m) => ({
      organization: m.organizationId,
      role: m.role,
      membershipId: m._id,
    }));
}

export async function registerUser({ name, email, password, organizationName, userAgent = '', ipAddress = '' }) {
  const existing = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = generateRandomToken(24);
  const verificationTokenHash = hashToken(verificationToken);

  const session = await mongoose.startSession();
  let createdUser;
  let createdOrg = null;

  try {
    await session.withTransaction(async () => {
      const [user] = await User.create(
        [
          {
            name,
            email: email.toLowerCase(),
            passwordHash,
            emailVerificationTokenHash: verificationTokenHash,
            emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isEmailVerified: false,
            lastLoginAt: new Date(),
          },
        ],
        { session }
      );
      createdUser = user;

      if (organizationName) {
        const [org] = await Organization.create(
          [
            {
              name: organizationName,
              slug: slugify(organizationName),
              ownerId: user._id,
            },
          ],
          { session }
        );
        createdOrg = org;

        await OrganizationMembership.create(
          [
            {
              organizationId: org._id,
              userId: user._id,
              role: 'org_owner',
              status: 'active',
            },
          ],
          { session }
        );
      }
    });
  } catch (err) {
    // Fallback if MongoDB standalone (no replica set) does not support transactions
    if (err.message?.includes('Transaction numbers are only allowed on a replica set')) {
      createdUser = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        emailVerificationTokenHash: verificationTokenHash,
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isEmailVerified: false,
        lastLoginAt: new Date(),
      });
      if (organizationName) {
        createdOrg = await Organization.create({
          name: organizationName,
          slug: slugify(organizationName),
          ownerId: createdUser._id,
        });
        await OrganizationMembership.create({
          organizationId: createdOrg._id,
          userId: createdUser._id,
          role: 'org_owner',
          status: 'active',
        });
      }
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  const accessToken = signAccessToken(createdUser);
  const refreshToken = signRefreshToken(createdUser);

  await User.findByIdAndUpdate(createdUser._id, {
    $push: {
      refreshTokens: {
        tokenHash: hashToken(refreshToken),
        expiresAt: parseRefreshExpiryDate(),
        userAgent,
        ipAddress,
      },
    },
  });

  await sendVerificationEmail({ to: createdUser.email, name: createdUser.name, token: verificationToken }).catch(() => {});

  const organizations = await getUserOrganizations(createdUser._id);

  return {
    user: {
      _id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
      isEmailVerified: createdUser.isEmailVerified,
      isSuperAdmin: createdUser.isSuperAdmin,
    },
    organizations,
    accessToken,
    refreshToken,
  };
}

export async function loginUser({ email, password, userAgent = '', ipAddress = '' }) {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null }).select('+passwordHash +refreshTokens');
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const activeTokens = (user.refreshTokens || []).filter((t) => t.expiresAt > new Date()).slice(-4);
  activeTokens.push({
    tokenHash: hashToken(refreshToken),
    expiresAt: parseRefreshExpiryDate(),
    userAgent,
    ipAddress,
  });

  user.refreshTokens = activeTokens;
  user.lastLoginAt = new Date();
  await user.save();

  const organizations = await getUserOrganizations(user._id);

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      isSuperAdmin: user.isSuperAdmin,
      avatarUrl: user.avatarUrl,
    },
    organizations,
    accessToken,
    refreshToken,
  };
}

export async function rotateRefreshToken({ incomingRefreshToken, userAgent = '', ipAddress = '' }) {
  if (!incomingRefreshToken) {
    throw new AppError('Refresh token missing', 401, 'REFRESH_TOKEN_MISSING');
  }

  let payload;
  try {
    payload = jwt.verify(incomingRefreshToken, env.jwtRefreshSecret);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'REFRESH_TOKEN_INVALID');
  }

  const user = await User.findOne({ _id: payload.sub, deletedAt: null }).select('+refreshTokens');
  if (!user) {
    throw new AppError('User not found', 401, 'UNAUTHORIZED');
  }

  const incomingHash = hashToken(incomingRefreshToken);
  const tokenIdx = (user.refreshTokens || []).findIndex(
    (t) => t.tokenHash === incomingHash && t.expiresAt > new Date()
  );

  if (tokenIdx === -1) {
    // Possible token reuse attack: revoke all sessions
    user.refreshTokens = [];
    await user.save();
    throw new AppError('Refresh token revoked or reused', 401, 'REFRESH_TOKEN_REVOKED');
  }

  // Rotate: remove old token and issue a new one
  user.refreshTokens.splice(tokenIdx, 1);
  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  user.refreshTokens.push({
    tokenHash: hashToken(newRefreshToken),
    expiresAt: parseRefreshExpiryDate(),
    userAgent,
    ipAddress,
  });
  await user.save();

  const organizations = await getUserOrganizations(user._id);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      isSuperAdmin: user.isSuperAdmin,
    },
    organizations,
  };
}

export async function logoutUser({ userId, incomingRefreshToken }) {
  if (!userId) return;
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;
  if (incomingRefreshToken) {
    const incomingHash = hashToken(incomingRefreshToken);
    user.refreshTokens = (user.refreshTokens || []).filter((t) => t.tokenHash !== incomingHash);
  } else {
    user.refreshTokens = [];
  }
  await user.save();
}

export async function revokeAllSessions(userId) {
  await User.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
}

export async function verifyEmailToken(token) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() },
    deletedAt: null,
  });

  if (!user) {
    throw new AppError('Verification token is invalid or expired', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();
  return { verified: true };
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
  if (!user) {
    // Do not leak email existence
    return { sent: true };
  }

  const resetToken = generateRandomToken(24);
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  await sendPasswordResetEmail({ to: user.email, name: user.name, token: resetToken }).catch(() => {});
  return { sent: true };
}

export async function resetPassword({ token, newPassword }) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
    deletedAt: null,
  }).select('+refreshTokens');

  if (!user) {
    throw new AppError('Password reset token is invalid or expired', 400, 'INVALID_RESET_TOKEN');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.refreshTokens = []; // Revoke all existing sessions on password change
  await user.save();

  return { reset: true };
}
