import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import orgRoutes from '../modules/organizations/organizations.routes.js';
import agentRoutes from '../modules/agents/agents.routes.js';
import conversationRoutes from '../modules/conversations/conversations.routes.js';
import leadRoutes from '../modules/leads/leads.routes.js';
import knowledgeRoutes from '../modules/knowledge/knowledge.routes.js';
import appointmentRoutes from '../modules/appointments/appointments.routes.js';
import callRoutes from '../modules/calls/calls.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import integrationRoutes from '../modules/integrations/integrations.routes.js';
import userRoutes from '../modules/users/users.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, service: 'SalesPilot AI API', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/organizations', orgRoutes);
router.use('/agents', agentRoutes);
router.use('/conversations', conversationRoutes);
router.use('/leads', leadRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/calls', callRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/integrations', integrationRoutes);
router.use('/users', userRoutes);

export default router;
