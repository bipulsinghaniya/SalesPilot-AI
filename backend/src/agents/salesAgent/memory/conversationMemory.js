import { Message, Lead, Agent, Organization } from '../../../models/index.js';

export async function loadConversationContext({ organizationId, conversation, limit = 16 }) {
  const [agent, organization, lead, recentMessages] = await Promise.all([
    Agent.findOne({ _id: conversation.agentId, organizationId, deletedAt: null }).lean(),
    Organization.findOne({ _id: organizationId, deletedAt: null }).lean(),
    conversation.leadId
      ? Lead.findOne({ _id: conversation.leadId, organizationId, deletedAt: null }).lean()
      : null,
    Message.find({ conversationId: conversation._id, organizationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  return {
    agent,
    organization,
    lead,
    history: recentMessages.reverse(),
  };
}
