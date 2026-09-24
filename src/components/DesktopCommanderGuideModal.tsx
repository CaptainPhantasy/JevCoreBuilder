import React, { useState } from 'react';
import { Terminal, Copy, Check, ShieldCheck, Cpu, ExternalLink } from 'lucide-react';

interface DesktopCommanderGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DesktopCommanderGuideModal({ isOpen, onClose }: DesktopCommanderGuideModalProps) {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const setupScript = `# 1. Install & Launch DesktopCommander Local Execution Bridge
npx @typesafe/desktop-commander \\
  --dir ~/Desktop/jev-output \\
  --key $GEMINI_API_KEY \\
  --allow-terminal`;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                DesktopCommander Setup & Onboarding Guide
              </h3>
              <p className="text-[11px] text-zinc-400">
                Local workstation execution bridge for automated file insertion and host script execution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded bg-zinc-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4 leading-relaxed text-zinc-300">
          <div>
            <div className="font-semibold text-zinc-100 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center justify-center">1</span>
              <span>What is DesktopCommander?</span>
            </div>
            <p className="text-zinc-400 pl-6 text-[11px]">
              DesktopCommander connects your local desktop workspace (<code>~/Desktop/jev-output/</code>) with the JEV Layer Injector and Gemini Assistant. It allows JEV to automatically run generated host scripts (such as <code>gmail-orchestrator.ts</code>) and insert drop-in safety gates straight into your repository.
            </p>
          </div>

          <div>
            <div className="font-semibold text-zinc-100 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center justify-center">2</span>
              <span>Launch DesktopCommander Locally</span>
            </div>
            <div className="pl-6">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-zinc-200 text-[11px] relative">
                <pre>{setupScript}</pre>
                <button
                  onClick={() => copyCommand(setupScript, 'commander-setup')}
                  className="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                >
                  {copiedCmd === 'commander-setup' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-zinc-100 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center justify-center">3</span>
              <span>Automatic Safety Boundary</span>
            </div>
            <p className="text-zinc-400 pl-6 text-[11px]">
              All operations are bounded inside <code>~/Desktop/jev-output/</code> with cryptographic SHA-256 manifest verification. DesktopCommander prevents unauthorized directory traversal and runs destructive commands only through the JEV System One tool guardrail.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>Filesystem Sink: ~/Desktop/jev-output/</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            I'm Ready
          </button>
        </div>
      </div>
    </div>
  );
}
