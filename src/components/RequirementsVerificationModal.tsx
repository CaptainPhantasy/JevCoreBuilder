import React, { useState } from 'react';
import {
  ShieldCheck,
  Coins,
  Sparkles,
  Clock,
  ArrowRight,
  Folder,
  Layers,
  FileCode,
  CheckCircle2,
  X,
  AlertTriangle
} from 'lucide-react';
import { estimateRequirementsCost, RequirementCostEstimate } from '../utils/costTracker';

interface RequirementsVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmBuild: () => void;
  userIntent: string;
  presetTitle: string;
  outputDir: string;
  isFullSolution?: boolean;
  inputsSummary?: string[];
  decisionSummary?: string;
  isProcessing?: boolean;
}

export default function RequirementsVerificationModal({
  isOpen,
  onClose,
  onConfirmBuild,
  userIntent,
  presetTitle,
  outputDir,
  isFullSolution = false,
  inputsSummary = [],
  decisionSummary = '',
  isProcessing = false
}: RequirementsVerificationModalProps) {
  const [skipFutureConfirmation, setSkipFutureConfirmation] = useState<boolean>(() => {
    return localStorage.getItem('jev_skip_verification_modal') === 'true';
  });

  if (!isOpen) return null;

  const estimate: RequirementCostEstimate = estimateRequirementsCost(userIntent, isFullSolution);

  const handleConfirm = () => {
    if (skipFutureConfirmation) {
      localStorage.setItem('jev_skip_verification_modal', 'true');
    } else {
      localStorage.removeItem('jev_skip_verification_modal');
    }
    onConfirmBuild();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>Verify Application Requirements & Cost</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  Pre-Flight Check
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Review your governing parameters and estimated token costs before synthesis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Section 1: Estimated Cost & Resource Callout */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-zinc-900 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-400" />
                Estimated Execution Cost
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Rate: {estimate.pricingRateDisplay}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center my-3">
              <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Estimated Cost</div>
                <div className="text-base font-bold text-emerald-300 font-mono mt-0.5">
                  {estimate.formattedCostUsd}
                </div>
                <div className="text-[9px] text-zinc-400">~0.1¢ USD (Negligible)</div>
              </div>

              <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Prompt Tokens</div>
                <div className="text-base font-bold text-zinc-200 font-mono mt-0.5">
                  ~{estimate.estimatedInputTokens}
                </div>
                <div className="text-[9px] text-zinc-400">Intent & Guidelines</div>
              </div>

              <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Output Tokens</div>
                <div className="text-base font-bold text-zinc-200 font-mono mt-0.5">
                  ~{estimate.estimatedOutputTokens}
                </div>
                <div className="text-[9px] text-zinc-400">Synthesized Code</div>
              </div>

              <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Estimated Time</div>
                <div className="text-base font-bold text-teal-300 font-mono mt-0.5 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{estimate.estimatedLatencySec}s</span>
                </div>
                <div className="text-[9px] text-zinc-400">Fast Sub-3s Build</div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Hidden Charges:</strong> This operation consumes standard tokens billed directly through your Gemini API key. Once compiled, your JEV System One package runs <strong>100% locally and free forever</strong> without recurring costs.
              </span>
            </div>
          </div>

          {/* Section 2: Verified Requirements Summary */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Verified Application Specifications
            </h4>

            {/* Architecture / Preset */}
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 space-y-1">
              <div className="text-[10px] uppercase font-mono text-zinc-500">Selected Architecture</div>
              <div className="text-xs font-semibold text-zinc-200">{presetTitle}</div>
            </div>

            {/* Governing Intent */}
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 space-y-1">
              <div className="text-[10px] uppercase font-mono text-zinc-500">Governing Intent</div>
              <div className="text-xs text-zinc-300 font-mono bg-zinc-900/90 p-2 rounded border border-zinc-800 leading-relaxed">
                {userIntent}
              </div>
            </div>

            {/* Ingested State & Decision Summary (if available) */}
            {(inputsSummary.length > 0 || decisionSummary) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {inputsSummary.length > 0 && (
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <div className="text-[10px] uppercase font-mono text-zinc-500 mb-1">
                      Inputs Inspected
                    </div>
                    <div className="text-xs text-zinc-300 font-mono">
                      {inputsSummary.slice(0, 4).join(', ')}
                      {inputsSummary.length > 4 ? ` (+${inputsSummary.length - 4} more)` : ''}
                    </div>
                  </div>
                )}
                {decisionSummary && (
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <div className="text-[10px] uppercase font-mono text-zinc-500 mb-1">
                      Decision Policies
                    </div>
                    <div className="text-xs text-zinc-300 font-mono truncate">
                      {decisionSummary}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Output Destination & Deliverable Files */}
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Folder className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Target Filesystem Sink:</span>
                </div>
                <span className="font-mono text-emerald-300 text-xs bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {outputDir}
                </span>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between flex-wrap gap-1">
                <span className="flex items-center gap-1">
                  <FileCode className="w-3 h-3 text-emerald-400" />
                  <span>Generates:</span>
                </span>
                <span className="font-mono text-zinc-300">
                  schema.ts, evaluator.ts, rules.json, test-cases.json, manifest.json
                  {isFullSolution ? ', host-orchestrator.ts, sub-modules' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* User Safeguard Toggle: Skip future confirmations */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-200">
              <input
                type="checkbox"
                checked={skipFutureConfirmation}
                onChange={e => setSkipFutureConfirmation(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span>Remember preference (skip verification modal for future 1-click builds)</span>
            </label>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
          >
            ← Edit Requirements
          </button>

          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Confirm & Proceed to Build</span>
          </button>
        </div>
      </div>
    </div>
  );
}
