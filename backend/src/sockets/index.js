import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { OrganizationMembership } from '../models/index.js';

let ioInstance = null;

export function initSocketIO(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      const orgId = socket.handshake.auth?.organizationId || socket.handshake.headers?.['x-organization-id'];
      if (!token) return next(new Error('Authentication required'));

      const payload = jwt.verify(token, env.jwtSecret);
      socket.userId = payload.sub;

      if (orgId) {
        const membership = await OrganizationMembership.findOne({
          organizationId: orgId,
          userId: payload.sub,
          status: 'active',
        }).lean();

        if (!membership && !payload.isSuperAdmin) {
          return next(new Error('Organization access denied'));
        }
        socket.organizationId = orgId;
      }
      next();
    } catch {
      next(new Error('Invalid socket token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    if (socket.organizationId) {
      socket.join(`org:${socket.organizationId}`);
    }

    socket.on('join:organization', async (orgId) => {
      if (!orgId) return;
      const membership = await OrganizationMembership.findOne({
        organizationId: orgId,
        userId: socket.userId,
        status: 'active',
      }).lean();
      if (membership) {
        if (socket.organizationId) socket.leave(`org:${socket.organizationId}`);
        socket.organizationId = orgId;
        socket.join(`org:${orgId}`);
      }
    });

    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      if (socket.organizationId) {
        socket.to(`org:${socket.organizationId}`).emit('chat:typing', {
          conversationId,
          isTyping: Boolean(isTyping),
          userId: socket.userId,
        });
      }
    });
  });

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}

export function emitToOrg(organizationId, event, payload) {
  if (!ioInstance || !organizationId) return;
  ioInstance.to(`org:${String(organizationId)}`).emit(event, {
    ...payload,
    _eventId: `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  });
}
