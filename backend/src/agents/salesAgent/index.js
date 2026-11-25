import { Conversation, Message } from '../../models/index.js';
import { AppError } from '../../utils/AppError.js';
import { loadConversationContext } from './memory/conversationMemory.js';
import { executeSalesLangGraph } from './graphs/salesGraph.js';

export async function runSalesAgentTurn({
  organizationId,
  conversationId,
  userMessage,
  mode = 'text',
  emitEvent = null,
}) {
  const startedAt = Date.now();
  const conversation = await Conversation.findOne({
    _id: conversationId,
    organizationId,
    deletedAt: null,
  });

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  const { agent, organization, lead, history } = await loadConversationContext({
    organizationId,
    conversation,
  });

  if (!agent) {
    throw new AppError('Assigned AI Agent not found', 404, 'AGENT_NOT_FOUND');
  }

  // Persist customer message immediately
  const userMsgDoc = await Message.create({
    organizationId,
    conversationId: conversation._id,
    role: 'user',
    mode,
    content: userMessage,
  });

  // Execute LangGraph autonomous sales workflow
  const { reply, toolCalls, sources } = await executeSalesLangGraph({
    organizationId,
    organization,
    agent,
    conversation,
    lead,
    history,
    userMessage,
    mode,
    emitEvent,
  });

  const latencyMs = Date.now() - startedAt;

  // Persist AI assistant message
  const assistantMsgDoc = await Message.create({
    organizationId,
    conversationId: conversation._id,
    role: 'assistant',
    mode,
    content: reply,
    toolCalls,
    sources,
    latencyMs,
  });

  // Update shared conversation state (supports seamless voice <-> text switching)
  conversation.activeMode = mode;
  if (conversation.channel !== mode && conversation.channel !== 'hybrid') {
    conversation.channel = 'hybrid';
  }
  conversation.messageCount = (conversation.messageCount || 0) + 2;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  emitEvent?.('chat:message', {
    conversationId: String(conversation._id),
    message: assistantMsgDoc,
  });

  return {
    conversationId: String(conversation._id),
    userMessage: userMsgDoc,
    assistantMessage: assistantMsgDoc,
    reply,
    toolCalls,
    sources,
    latencyMs,
  };
}
