import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  FolderCheck,
  CheckCircle2,
  Terminal,
  HelpCircle,
  Play,
  RotateCcw,
  Layers,
  Trash2
} from 'lucide-react';
import { recordCost } from '../utils/costTracker';

interface ChatMessage {
  id: string;
  sender: 'user' | 'jev';
  text: string;
  voice_text?: string;
  actions_taken?: any[];
  modules_generated?: string[];
  timestamp: string;
}

interface JevVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteAction: (actionType: string, payload?: any) => Promise<any> | void;
  onOpenDesktopCommanderGuide: () => void;
}

const STORAGE_KEY_VOICE = 'jev_voice_chat_messages_v1';

const INITIAL_WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  sender: 'jev',
  text: `Hello! I am **JEV**, your voice and text System One Decision Architect. You can speak to me or type instructions. Tell me: *"Hey JEV, I need a Jev that can clean out my gmail box, put all tech purchases in a folder for this year's tax expenses, identify all non SPAM or JUNKMAIL and organize it by friends, family, work. Then identify the items I might consider buying based on the receipts of past purchases, and the rest in the trash."* and I will generate the complete multi-module operational solution for you.`,
  voice_text: `Hello! I am JEV. I can generate any decision layer or complete multi-module pipeline for you. Speak to me or type a request.`,
  timestamp: new Date().toLocaleTimeString()
};

export default function JevVoiceAssistant({
  isOpen,
  onClose,
  onExecuteAction,
  onOpenDesktopCommanderGuide
}: JevVoiceAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VOICE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse voice messages from localStorage:', e);
    }
    return [INITIAL_WELCOME_MSG];
  });
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-persist voice messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VOICE, JSON.stringify(messages.slice(-40)));
    } catch (e) {
      console.warn('Failed to save voice messages to localStorage:', e);
    }
  }, [messages]);

  const clearMessages = () => {
    setMessages([INITIAL_WELCOME_MSG]);
    try {
      localStorage.removeItem(STORAGE_KEY_VOICE);
    } catch {}
  };

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // TTS speak function
  const speakText = (textToSpeak: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const cleanText = textToSpeak.replace(/[*#`_]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        alert('Web Speech API is not supported in this browser. Please type your message.');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Mic start error:', err);
      }
    }
  };

  const sendMessage = async (overrideMsg?: string) => {
    const msgToSend = overrideMsg || inputText;
    if (!msgToSend.trim() || isProcessing) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text: msgToSend,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      // 1. Call Gemini Assistant endpoint
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgToSend })
      });
      const data = await res.json();

      if (data.usage) {
        recordCost({
          operation: 'chat',
          title: `Hey JEV: ${msgToSend.slice(0, 32)}`,
          inputTokens: data.usage.prompt_tokens || 0,
          outputTokens: data.usage.candidates_tokens || 0
        });
      }

      let assistantText = data.reply || 'Acknowledged.';
      const actionsTaken: any[] = [];
      let modulesGenerated: string[] = [];

      // Execute returned actions on the app
      if (Array.isArray(data.actions)) {
        for (const act of data.actions) {
          actionsTaken.push(act);
          if (act.type === 'generate_full_solution') {
            // Call generate-full-solution endpoint
            const solRes = await fetch('/api/gemini/generate-full-solution', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: act.prompt || msgToSend })
            });
            if (solRes.ok) {
              const solData = await solRes.json();
              recordCost({
                operation: 'full_solution',
                title: `Full Solution: ${msgToSend.slice(0, 30)}`,
                inputTokens: 650,
                outputTokens: 3200
              });
              modulesGenerated = solData.modules_generated || [];
              assistantText += `\n\n**Generated Deliverables:**\n` +
                modulesGenerated.map(m => `- ${m}`).join('\n') +
                `\n\n*Files written to \`${solData.output_directory}\` with SHA-256 manifest.*`;
            }
          } else {
            await onExecuteAction(act.type, act);
          }
        }
      }

      const jevMessage: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        sender: 'jev',
        text: assistantText,
        voice_text: data.voice_reply,
        actions_taken: actionsTaken,
        modules_generated: modulesGenerated,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, jevMessage]);

      // Speak TTS voice response
      if (data.voice_reply) {
        speakText(data.voice_reply);
      } else {
        speakText(assistantText.slice(0, 150));
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          sender: 'jev',
          text: `Error communicating with Gemini: ${err?.message}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const promptGmailScenario = () => {
    const prompt =
      'Hey JEV, I need a Jev that can clean out my gmail box, put all tech purchases in a folder for this years tax expenses, identify all non SPAM or JUNKMAIL and organize it by friends, family, work. Then identify the items I might consider buying based on the reciepts of past purchases, and the rest in the trash.';
    setInputText(prompt);
    sendMessage(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl font-sans">
      {/* Assistant Header */}
      <div className="p-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-mono font-bold text-sm shadow-md">
            JEV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">JEV Voice & AI Assistant</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                System One
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span>Full Bi-directional Voice & App Control</span>
              {isSpeaking && (
                <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Speaking
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? 'Mute vocal output' : 'Enable vocal output'}
            className="p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          <button
            onClick={clearMessages}
            title="Clear Chat History (Reset draft)"
            className="p-2 text-zinc-400 hover:text-rose-300 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenDesktopCommanderGuide}
            title="DesktopCommander Onboarding Guide"
            className="p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Quick Action Suggestion Banner */}
      <div className="bg-emerald-950/30 border-b border-emerald-500/20 px-4 py-2 flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-emerald-300 text-[11px] font-medium">Quick Prompts (Click or Speak naturally):</span>
          <span className="text-[10px] text-zinc-500 font-mono">Hands-Free STT/TTS Active</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={promptGmailScenario}
            className="shrink-0 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Zap className="w-3 h-3" />
            <span>Gmail + Taxes + Rebuy (Full App)</span>
          </button>
          <button
            onClick={() => sendMessage('Write a Python FastAPI service with JEV refund gate')}
            className="shrink-0 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] transition-colors cursor-pointer font-mono"
          >
            Python + JEV App
          </button>
          <button
            onClick={() => sendMessage('Write a Go Gin microservice with JEV authentication gate')}
            className="shrink-0 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] transition-colors cursor-pointer font-mono"
          >
            Go + JEV App
          </button>
          <button
            onClick={() => sendMessage('Run all unit tests in the domain')}
            className="shrink-0 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] transition-colors cursor-pointer"
          >
            Run Tests
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[11px] text-zinc-500 font-mono">
              {m.sender === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">JEV Assistant</span>
                </>
              )}
              <span>· {m.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-[90%] ${
                m.sender === 'user'
                  ? 'bg-emerald-600 text-white shadow-xs rounded-tr-xs'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-xs rounded-tl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>

              {/* Modules Generated Badges */}
              {m.modules_generated && m.modules_generated.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active Modules Synthesized</span>
                  </div>
                  <div className="space-y-1">
                    {m.modules_generated.map((mod, idx) => (
                      <div key={idx} className="text-[11px] text-zinc-300 font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>{mod}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs pl-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>JEV is synthesizing decision architecture and code...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Input & Text Input Bar */}
      <div className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex flex-col gap-2">
        {isListening && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-rose-950/40 border border-rose-500/30 rounded-lg text-rose-300 text-xs animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Listening to your voice... Speak your request</span>
            </div>
            <button
              onClick={toggleMic}
              className="text-[10px] text-rose-400 hover:text-rose-200 font-mono underline cursor-pointer"
            >
              Stop
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMic}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white border-rose-500 shadow-md animate-pulse'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice input (Speech-to-text)'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Tell JEV what decision layer or pipeline you need..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
          />

          <button
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || isProcessing}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer font-medium"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
