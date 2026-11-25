import { AuditLog } from '../models/index.js';

export async function recordAudit({
  organizationId = null,
  actorUserId = null,
  actorType = 'user',
  action,
  resourceType,
  resourceId = '',
  req = null,
  metadata = {},
}) {
  try {
    await AuditLog.create({
      organizationId,
      actorUserId,
      actorType,
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : '',
      ipAddress: req?.ip || '',
      userAgent: req?.headers?.['user-agent'] || '',
      metadata,
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to write audit entry:', err.message);
  }
}
