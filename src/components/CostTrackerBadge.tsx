import React, { useState, useEffect } from 'react';
import {
  Coins,
  TrendingDown,
  RotateCcw,
  Download,
  Info,
  ChevronDown,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import {
  getSessionCosts,
  resetSessionCosts,
  subscribeToCostChanges,
  SessionCostSummary
} from '../utils/costTracker';

export default function CostTrackerBadge() {
  const [summary, setSummary] = useState<SessionCostSummary>(getSessionCosts());
  const [isOpen, setIsOpen] = useState(false);
  const [copiedReset, setCopiedReset] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCostChanges(newSummary => {
      setSummary({ ...newSummary });
    });
    return () => unsubscribe();
  }, []);

  const handleReset = () => {
    const cleared = resetSessionCosts();
    setSummary(cleared);
    setCopiedReset(true);
    setTimeout(() => setCopiedReset(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(summary, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `jev-session-cost-audit-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formattedCost =
    summary.totalCostUsd < 0.01
      ? `$${summary.totalCostUsd.toFixed(4)}`
      : `$${summary.totalCostUsd.toFixed(3)}`;

  return (
    <>
      {/* Live Sticky Header Cost Display Badge */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs group"
        title="View Real-Time LLM Token & Cost Accounting"
      >
        <Coins className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
        <span className="font-semibold">{formattedCost}</span>
        <span className="text-[10px] text-zinc-500 hidden sm:inline">
          · {summary.totalRequests} req{summary.totalRequests === 1 ? '' : 's'}
        </span>
        <ChevronDown className="w-3 h-3 text-emerald-400/70" />
      </button>

      {/* Detailed Cost Accounting Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                    <span>Live Token & Cost Accounting</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      Real-Time
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Transparent, continuous billing metrics for Gemini 3.8 Flash API operations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <div className="text-[10px] uppercase font-mono text-zinc-500 mb-0.5">Total Cost</div>
                  <div className="text-lg font-bold text-emerald-300 font-mono">
                    {formattedCost}
                  </div>
                  <div className="text-[10px] text-zinc-400">USD accumulated</div>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <div className="text-[10px] uppercase font-mono text-zinc-500 mb-0.5">Total Tokens</div>
                  <div className="text-lg font-bold text-zinc-100 font-mono">
                    {summary.totalTokens.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400">In + Out combined</div>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <div className="text-[10px] uppercase font-mono text-zinc-500 mb-0.5">Input Tokens</div>
                  <div className="text-lg font-bold text-zinc-200 font-mono">
                    {summary.totalInputTokens.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400">Prompts & Context</div>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <div className="text-[10px] uppercase font-mono text-zinc-500 mb-0.5">Output Tokens</div>
                  <div className="text-lg font-bold text-zinc-200 font-mono">
                    {summary.totalOutputTokens.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400">Synthesized Code</div>
                </div>
              </div>

              {/* JEV System One Efficiency Value Callout */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-zinc-900 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div className="text-xs text-zinc-300 space-y-1">
                  <div className="font-semibold text-emerald-300">
                    Why JEV Decision Layers Save ~99.4% on Ongoing Operating Costs
                  </div>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    Once synthesized, JEV System One modules run <strong>pure deterministic code locally on the client or server</strong> in &lt;5ms at <strong>$0.00 per decision</strong>, eliminating the need to burn expensive LLM tokens on every transactional gate.
                  </p>
                </div>
              </div>

              {/* Pricing Disclosure Table */}
              <div className="bg-zinc-950/80 rounded-xl border border-zinc-800/80 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-zinc-400 font-medium text-[11px] pb-1 border-b border-zinc-800">
                  <span>Engine / Provider</span>
                  <span>Input Token Rate</span>
                  <span>Output Token Rate</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300 font-mono text-[11px]">
                  <span className="text-emerald-400 font-medium font-sans">Gemini 3.8 Flash (Active)</span>
                  <span>$0.10 / 1M ($0.0000001)</span>
                  <span>$0.40 / 1M ($0.0000004)</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px]">
                  <span className="font-sans">JEV Local Engine (Sandbox)</span>
                  <span className="text-emerald-400">$0.00 (Free)</span>
                  <span className="text-emerald-400">$0.00 (Free)</span>
                </div>
              </div>

              {/* Recent Transaction Log */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Recent Operations ({summary.history.length})
                  </h4>
                  {summary.history.length > 0 && (
                    <button
                      onClick={handleExportJson}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export Audit JSON</span>
                    </button>
                  )}
                </div>

                {summary.history.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                    No API calls logged in this session yet. Execute a synthesis, voice command, or CLI operation to see live cost tracking.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {summary.history.map(item => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-zinc-200 font-medium truncate text-[11px]">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                            <span>{item.timestamp}</span>
                            <span>·</span>
                            <span>{item.inputTokens} in / {item.outputTokens} out</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-emerald-400 font-semibold text-[11px]">
                            +${item.costUsd < 0.0001 ? item.costUsd.toFixed(5) : item.costUsd.toFixed(4)}
                          </div>
                          <div className="text-[9px] text-zinc-500 uppercase">{item.operation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copiedReset ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Reset Complete</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Session Costs</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
