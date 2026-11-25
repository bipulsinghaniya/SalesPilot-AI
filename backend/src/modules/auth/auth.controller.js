import { env } from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { recordAudit } from '../../middlewares/audit.js';
import * as authService from './auth.service.js';

function setRefreshCookie(res, refreshToken) {
  res.cookie('sp_refresh_token', refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, organizationName } = req.body;
  const result = await authService.registerUser({
    name,
    email,
    password,
    organizationName,
    userAgent: req.headers['user-agent'] || '',
    ipAddress: req.ip || '',
  });

  setRefreshCookie(res, result.refreshToken);
  await recordAudit({
    actorUserId: result.user._id,
    action: 'user.registered',
    resourceType: 'User',
    resourceId: result.user._id,
    req,
  });

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      organizations: result.organizations,
      accessToken: result.accessToken,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({
    email,
    password,
    userAgent: req.headers['user-agent'] || '',
    ipAddress: req.ip || '',
  });

  setRefreshCookie(res, result.refreshToken);
  await recordAudit({
    actorUserId: result.user._id,
    action: 'user.login',
    resourceType: 'User',
    resourceId: result.user._id,
    req,
  });

  res.json({
    success: true,
    data: {
      user: result.user,
      organizations: result.organizations,
      accessToken: result.accessToken,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.sp_refresh_token;
  const result = await authService.rotateRefreshToken({
    incomingRefreshToken,
    userAgent: req.headers['user-agent'] || '',
    ipAddress: req.ip || '',
  });

  setRefreshCookie(res, result.refreshToken);
  res.json({
    success: true,
    data: {
      user: result.user,
      organizations: result.organizations,
      accessToken: result.accessToken,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.sp_refresh_token;
  await authService.logoutUser({ userId: req.user?._id, incomingRefreshToken });
  res.clearCookie('sp_refresh_token', { path: '/api/auth' });
  res.json({ success: true, message: 'Logged out successfully' });
});

export const revokeSessions = asyncHandler(async (req, res) => {
  await authService.revokeAllSessions(req.user._id);
  res.clearCookie('sp_refresh_token', { path: '/api/auth' });
  res.json({ success: true, message: 'All sessions revoked' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.body.token || req.query.token;
  const result = await authService.verifyEmailToken(token);
  res.json({ success: true, data: result });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json({ success: true, data: result, message: 'If that email exists, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword({
    token: req.body.token,
    newPassword: req.body.password,
  });
  res.json({ success: true, data: result, message: 'Password updated successfully' });
});

export const me = asyncHandler(async (req, res) => {
  const organizations = await authService.getUserOrganizations(req.user._id);
  res.json({
    success: true,
    data: {
      user: req.user,
      organizations,
    },
  });
});
