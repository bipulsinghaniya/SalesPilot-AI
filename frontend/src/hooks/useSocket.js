import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useSocket(handlers = {}) {
  const { accessToken, activeOrganizationId } = useAuthStore();
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken, organizationId: activeOrganizationId },
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    const events = [
      'call:incoming',
      'call:connected',
      'call:ended',
      'transcript:update',
      'sentiment:update',
      'lead:updated',
      'agent:status',
      'appointment:booked',
      'notification:new',
      'chat:message',
      'chat:typing',
    ];

    events.forEach((evt) => {
      socket.on(evt, (payload) => {
        handlersRef.current?.[evt]?.(payload);
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, activeOrganizationId]);

  return socketRef;
}
