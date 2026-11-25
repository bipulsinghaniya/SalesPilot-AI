import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mic,
  MicOff,
  Send,
  MessageSquare,
  Phone,
  Bot,
  Sparkles,
  Volume2,
  Plus,
  Hash,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

const VOICE_WS_URL = import.meta.env.VITE_VOICE_WS_URL || 'ws://localhost:5000/ws/voice';

export default function ConversationsPage() {
  const qc = useQueryClient();
  const { accessToken, activeOrganizationId } = useAuthStore();
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [mode, setMode] = useState('text');
  const [inputText, setInputText] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => (await api.get('/agents')).data.data,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get('/conversations')).data.data,
  });

  const { data: activeConvData, refetch: refetchConv } = useQuery({
    queryKey: ['conversation', selectedConvId],
    enabled: Boolean(selectedConvId),
    queryFn: async () => (await api.get(`/conversations/${selectedConvId}`)).data.data,
  });

  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0]._id);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvData?.messages]);

  const startConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/conversations', { agentId: selectedAgentId, mode });
      return res.data.data;
    },
    onSuccess: (conv) => {
      setSelectedConvId(conv._id);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, msgMode }) => {
      const res = await api.post(`/conversations/${selectedConvId}/messages`, {
        content,
        mode: msgMode,
      });
      return res.data.data;
    },
    onSuccess: () => {
      setInputText('');
      refetchConv();
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleModeSwitch = async (nextMode) => {
    setMode(nextMode);
    if (selectedConvId) {
      await api.patch(`/conversations/${selectedConvId}/mode`, { mode: nextMode }).catch(() => {});
    }
    if (nextMode === 'text' && voiceActive) {
      stopVoiceSession();
    }
  };

  const startVoiceSession = async () => {
    if (!selectedConvId || !selectedAgentId) return;
    const ws = new WebSocket(
      `${VOICE_WS_URL}?token=${encodeURIComponent(accessToken)}&organizationId=${encodeURIComponent(
        activeOrganizationId
      )}&conversationId=${encodeURIComponent(selectedConvId)}&agentId=${encodeURIComponent(selectedAgentId)}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setVoiceActive(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (event) => {
          const last = event.results[event.results.length - 1];
          const text = last[0].transcript;
          setLiveTranscript(text);
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            ws.send(JSON.stringify({ type: 'barge_in' }));
          }
          if (last.isFinal && text.trim()) {
            ws.send(JSON.stringify({ type: 'utterance_text', text: text.trim() }));
            setLiveTranscript('');
          }
        };
        rec.start();
        recognitionRef.current = rec;
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'transcript') {
        refetchConv();
      } else if (data.type === 'audio' && data.data) {
        const audio = new Audio(`data:${data.mimeType};base64,${data.data}`);
        audioRef.current = audio;
        audio.play().catch(() => {});
      } else if (data.type === 'barge_in' && audioRef.current) {
        audioRef.current.pause();
      }
    };

    ws.onclose = () => {
      setVoiceActive(false);
    };
  };

  const stopVoiceSession = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    audioRef.current?.pause();
    setVoiceActive(false);
    setLiveTranscript('');
  };

  const messages = activeConvData?.messages || [];
  const conversation = activeConvData?.conversation;

  const sentimentColor = {
    positive: 'text-emerald-600',
    negative: 'text-red-500',
    neutral: 'text-slate-500',
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
      {/* Left Sidebar: Conversations */}
      <div className="lg:col-span-4 card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Conversations</h2>
            <span className="badge-slate">{conversations.length}</span>
          </div>
          <div className="flex gap-2">
            <select
              className="input-field text-xs flex-1"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              {agents.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.preferredLanguage})
                </option>
              ))}
            </select>
            <button
              onClick={() => startConversationMutation.mutate()}
              disabled={!selectedAgentId || startConversationMutation.isPending}
              className="btn-primary shrink-0 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedConvId(c._id)}
              className={`w-full text-left px-4 py-3.5 border-b border-slate-100/80 hover:bg-slate-50 transition-colors ${
                selectedConvId === c._id ? 'bg-indigo-50/60 border-l-2 border-l-indigo-600' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900 truncate">
                  {c.leadId?.name || c.agentId?.name || 'Sales Session'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                  c.channel === 'voice'
                    ? 'bg-violet-50 text-violet-700 border border-violet-200/60'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {c.channel}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {c.messageCount} messages · <span className={`capitalize ${sentimentColor[c.sentiment?.overall] || ''}`}>{c.sentiment?.overall || 'neutral'}</span>
              </p>
            </button>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">
              No conversations yet. Create one above.
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Shared Voice + Text Workspace */}
      <div className="lg:col-span-8 card flex flex-col overflow-hidden">
        {!selectedConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">Start or select a conversation</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md">
              Communicate with your AI Sales Agent via Text Chat or Real-Time Voice while keeping a single unified memory.
            </p>
          </div>
        ) : (
          <>
            {/* Header with Mode Switch */}
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {conversation?.agentId?.name || 'AI Sales Agent'}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Hash className="h-3 w-3" />{selectedConvId.slice(-8)}
                    <span>·</span>
                    <span className={`capitalize ${sentimentColor[conversation?.sentiment?.overall] || ''}`}>
                      {conversation?.sentiment?.overall || 'neutral'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
                <button
                  onClick={() => handleModeSwitch('text')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'text' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Text
                </button>
                <button
                  onClick={() => handleModeSwitch('voice')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'voice' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" /> Voice
                </button>
              </div>
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-slate-50/80 to-white">
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} ${
                    m.role === 'user' ? 'animate-chat-right' : 'animate-chat-left'
                  }`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-white border border-slate-200/80 text-slate-800 shadow-sm rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <div className={`mt-2 flex items-center gap-2 text-[10px] ${
                      m.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}>
                      <span className="uppercase font-medium">{m.mode}</span>
                      {m.toolCalls?.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/40">
                          <Sparkles className="h-2.5 w-2.5" />
                          {m.toolCalls.map((t) => t.name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {sendMessageMutation.isPending && (
                <div className="flex justify-start animate-chat-left">
                  <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-indigo-400 typing-dot-1" />
                      <div className="h-2 w-2 rounded-full bg-indigo-400 typing-dot-2" />
                      <div className="h-2 w-2 rounded-full bg-indigo-400 typing-dot-3" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            {mode === 'text' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!inputText.trim()) return;
                  sendMessageMutation.mutate({ content: inputText.trim(), msgMode: 'text' });
                }}
                className="p-4 border-t border-slate-200/80 bg-white flex gap-2"
              >
                <input
                  className="input-field"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                />
                <button
                  type="submit"
                  disabled={sendMessageMutation.isPending || !inputText.trim()}
                  className="btn-primary shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="p-5 border-t border-slate-200/80 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    voiceActive
                      ? 'bg-emerald-50 ring-2 ring-emerald-400/50'
                      : 'bg-slate-100'
                  }`}>
                    <Volume2 className={`h-5 w-5 ${voiceActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {voiceActive ? 'Listening...' : 'Voice Channel Ready'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm truncate">
                      {liveTranscript || (voiceActive ? 'Speak naturally — barge-in supported' : 'Click to start the voice session')}
                    </p>
                  </div>
                  {voiceActive && (
                    <div className="flex items-end gap-0.5 ml-2">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-emerald-500 rounded-full"
                          style={{
                            height: `${12 + Math.random() * 12}px`,
                            animation: `voice-wave 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {voiceActive ? (
                  <button onClick={stopVoiceSession} className="btn-danger">
                    <MicOff className="h-4 w-4" /> End Voice
                  </button>
                ) : (
                  <button onClick={startVoiceSession} className="btn-primary">
                    <Mic className="h-4 w-4" /> Start Voice
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
