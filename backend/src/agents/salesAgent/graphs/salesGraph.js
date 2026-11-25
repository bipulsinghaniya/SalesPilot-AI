import { StateGraph, MessagesAnnotation, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { env } from '../../../config/env.js';
import { searchKnowledge } from '../../../services/rag/ragService.js';
import { buildSalesSystemPrompt } from '../prompts/salesPrompts.js';
import { createSalesTools } from '../tools/salesTools.js';

export async function executeSalesLangGraph({
  organizationId,
  organization,
  agent,
  conversation,
  lead,
  history,
  userMessage,
  mode,
  emitEvent,
}) {
  // Retrieve initial RAG context for the user's message
  const ragMatches = await searchKnowledge({
    organizationId,
    query: userMessage,
    limit: 3,
  }).catch(() => []);

  const ragContext = ragMatches.length
    ? ragMatches
        .map((m) => `[Source: ${m.documentTitle} (${m.category})]\n${m.content}`)
        .join('\n\n')
    : '';

  const sources = ragMatches.map((m) => ({
    documentId: m.documentId,
    title: m.documentTitle,
    score: m.score || 0,
  }));

  // Fallback when OPENAI_API_KEY is not configured in local dev
  if (!env.openaiApiKey) {
    const snippet = ragMatches[0]?.content
      ? ` Based on our documentation (${ragMatches[0].documentTitle}): ${ragMatches[0].content.slice(0, 220)}...`
      : '';
    const reply = `Hi! I'm ${agent.name} from ${agent.companyName || organization.name}.${snippet} How can I help you evaluate our solution or schedule a quick demo?`;
    return { reply, toolCalls: [], sources };
  }

  const tools = createSalesTools({ organizationId, agent, conversation, emitEvent });
  const toolNode = new ToolNode(tools);

  const model = new ChatOpenAI({
    apiKey: env.openaiApiKey,
    model: env.openaiChatModel,
    temperature: 0.3,
  }).bindTools(tools);

  const systemPrompt = buildSalesSystemPrompt({
    agent,
    organization,
    lead,
    ragContext,
    mode,
  });

  async function callModel(state) {
    const response = await model.invoke([new SystemMessage(systemPrompt), ...state.messages]);
    return { messages: [response] };
  }

  function shouldContinue(state) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage?.tool_calls?.length > 0) {
      return 'tools';
    }
    return END;
  }

  const workflow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, ['tools', END])
    .addEdge('tools', 'agent');

  const app = workflow.compile();

  const lcMessages = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => (m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)));
  lcMessages.push(new HumanMessage(userMessage));

  const finalState = await app.invoke({ messages: lcMessages }, { recursionLimit: 10 });
  const outputMessages = finalState.messages;
  const lastAiMsg = [...outputMessages].reverse().find((m) => m._getType?.() === 'ai' && m.content);

  const executedToolCalls = outputMessages
    .filter((m) => m._getType?.() === 'ai' && m.tool_calls?.length)
    .flatMap((m) => m.tool_calls.map((tc) => ({ name: tc.name, args: tc.args })));

  return {
    reply: typeof lastAiMsg?.content === 'string' ? lastAiMsg.content : 'How else may I assist you today?',
    toolCalls: executedToolCalls,
    sources,
  };
}
