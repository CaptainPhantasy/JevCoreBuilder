import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, HelpCircle, Sparkles, RefreshCw } from 'lucide-react';
import { recordCost } from '../utils/costTracker';

interface CliHistoryItem {
  id: string;
  command: string;
  output: string;
  exit_code: number;
  timestamp: string;
}

interface GeminiCliTerminalProps {
  onRunAction?: (actionType: string, payload?: any) => void;
  onOpenDesktopCommander?: () => void;
}

const STORAGE_KEY_CLI = 'jev_cli_history_v1';

export default function GeminiCliTerminal({ onRunAction, onOpenDesktopCommander }: GeminiCliTerminalProps) {
  const [inputCmd, setInputCmd] = useState('');
  const [history, setHistory] = useState<CliHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLI);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse CLI history from localStorage:', e);
    }
    return [
      {
        id: 'init-0',
        command: 'jev --version',
        output: 'JEV Core Builder CLI v1.3.0 (Powered by Gemini API & Typesafe System One)\nType "jev help" or "help" for a list of available commands.',
        exit_code: 0,
        timestamp: new Date().toLocaleTimeString()
      }
    ];
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-persist CLI history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CLI, JSON.stringify(history.slice(-50)));
    } catch (e) {
      console.warn('Failed to save CLI history to localStorage:', e);
    }
  }, [history]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = async (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    if (trimmed === 'clear') {
      setHistory([]);
      try {
        localStorage.removeItem(STORAGE_KEY_CLI);
      } catch {}
      setInputCmd('');
      return;
    }

    setIsExecuting(true);
    setInputCmd('');
    setHistoryIndex(-1);

    try {
      const res = await fetch('/api/gemini/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed })
      });
      const data = await res.json();

      if (data.usage) {
        recordCost({
          operation: 'cli',
          title: `CLI: ${trimmed.slice(0, 32)}`,
          inputTokens: data.usage.prompt_tokens || 0,
          outputTokens: data.usage.candidates_tokens || 0
        });
      }

      setHistory(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          output: data.output || 'Done.',
          exit_code: data.exit_code ?? 0,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // If user typed: jev diff or jev test, dispatch action to UI if handler provided
      if (trimmed === 'jev diff' && onRunAction) onRunAction('open_diff');
      if (trimmed === 'jev test' && onRunAction) onRunAction('run_batch_tests');
      if ((trimmed === 'desktopcommander' || trimmed === 'jev commander' || trimmed === 'commander') && onOpenDesktopCommander) {
        onOpenDesktopCommander();
      }
      if (trimmed.startsWith('jev use ') && onRunAction) {
        const presetId = trimmed.slice(8).trim();
        onRunAction('set_preset', presetId);
      }
    } catch (err: any) {
      setHistory(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          output: `Command execution failed: ${err?.message}`,
          exit_code: 1,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputCmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex + 1 < history.length ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIdx);
        setInputCmd(history[history.length - 1 - nextIdx]?.command || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCmd(history[history.length - 1 - nextIdx]?.command || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCmd('');
      }
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[520px] font-mono text-xs shadow-xl">
      {/* Terminal Title Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-zinc-200">JEV Gemini CLI Shell</span>
          <span className="text-[10px] text-zinc-500">v1.3 · gemini-3.8-flash</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Quick Command Buttons */}
          <button
            onClick={() => executeCommand('jev help')}
            className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[11px] transition-colors cursor-pointer"
          >
            help
          </button>
          <button
            onClick={() => executeCommand('jev list')}
            className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[11px] transition-colors cursor-pointer"
          >
            presets
          </button>
          <button
            onClick={() => executeCommand('gemini "write a Python FastAPI backend implementing JEV refund guardrails"')}
            className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-900/60 text-emerald-300 rounded text-[11px] transition-colors cursor-pointer font-mono"
            title="Generate standard Python application with JEV standards"
          >
            Python + JEV
          </button>
          <button
            onClick={() => executeCommand('gemini "write a Go Gin microservice with JEV authentication gate"')}
            className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-900/60 text-emerald-300 rounded text-[11px] transition-colors cursor-pointer font-mono"
            title="Generate standard Go microservice with JEV standards"
          >
            Go + JEV
          </button>
          <button
            onClick={() => executeCommand('gemini "write a Rust CLI tool with deterministic JEV safety gate"')}
            className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-900/60 text-emerald-300 rounded text-[11px] transition-colors cursor-pointer font-mono"
            title="Generate standard Rust CLI tool with JEV standards"
          >
            Rust + JEV
          </button>
          <button
            onClick={() => executeCommand('jev test')}
            className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[11px] transition-colors cursor-pointer"
          >
            tests
          </button>
          <button
            onClick={() => executeCommand('jev audit')}
            className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[11px] transition-colors cursor-pointer"
          >
            audit
          </button>
          <button
            onClick={() => setHistory([])}
            title="Clear terminal"
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 overflow-auto p-4 space-y-3 bg-zinc-950/90 leading-relaxed">
        {history.map(item => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-emerald-400 font-bold">jev&gt;</span>
              <span className="text-zinc-100 font-semibold">{item.command}</span>
              <span className="text-[10px] text-zinc-600 ml-auto">{item.timestamp}</span>
            </div>
            <pre className={`whitespace-pre-wrap pl-4 text-[11px] leading-5 ${item.exit_code !== 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
              {item.output}
            </pre>
          </div>
        ))}
        {isExecuting && (
          <div className="flex items-center gap-2 text-emerald-400 pl-4 py-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="text-[11px]">Executing command with Gemini...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Terminal Input Bar */}
      <div className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex items-center gap-2">
        <span className="text-emerald-400 font-bold pl-1">jev&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={inputCmd}
          onChange={e => setInputCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command (e.g., jev test, jev list, gemini 'explain VIP exemption rule')..."
          className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden font-mono"
        />
        <button
          onClick={() => executeCommand(inputCmd)}
          disabled={!inputCmd.trim() || isExecuting}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs transition-colors flex items-center gap-1 cursor-pointer font-medium"
        >
          <Send className="w-3 h-3" />
          <span>Run</span>
        </button>
      </div>
    </div>
  );
}
