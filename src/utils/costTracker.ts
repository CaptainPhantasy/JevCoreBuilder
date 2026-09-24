/**
 * Real-Time Cost & Token Accounting Utility
 * Tracks exact token usage, micro-dollar costs, and pre-build estimations for Gemini 3.8 Flash
 * Pricing reference:
 * - Gemini 3.8 Flash Input: $0.10 / 1,000,000 tokens ($0.0000001 / token)
 * - Gemini 3.8 Flash Output: $0.40 / 1,000,000 tokens ($0.0000004 / token)
 * - Local Deterministic Engine: $0.00 (Unlimited Free)
 */

export interface CostRecord {
  id: string;
  operation: 'synthesis' | 'cli' | 'chat' | 'full_solution' | 'simulation';
  title: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  model: string;
  timestamp: string;
}

export interface SessionCostSummary {
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalRequests: number;
  history: CostRecord[];
}

const STORAGE_KEY = 'jev_session_costs_v1';
const COST_PER_INPUT_TOKEN = 0.0000001; // $0.10 per 1M tokens
const COST_PER_OUTPUT_TOKEN = 0.0000004; // $0.40 per 1M tokens

type CostSubscriber = (summary: SessionCostSummary) => void;
const subscribers: Set<CostSubscriber> = new Set();

export function computeCostUsd(inputTokens: number, outputTokens: number): number {
  return Number((inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN).toFixed(7));
}

export function getSessionCosts(): SessionCostSummary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.totalCostUsd === 'number') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse session costs from localStorage:', err);
  }

  return {
    totalCostUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalRequests: 0,
    history: []
  };
}

function saveSessionCosts(summary: SessionCostSummary) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
  } catch (err) {
    console.warn('Failed to save session costs to localStorage:', err);
  }
  subscribers.forEach(cb => {
    try {
      cb(summary);
    } catch (e) {
      console.error('Error notifying cost subscriber:', e);
    }
  });
}

export function recordCost(data: {
  operation: CostRecord['operation'];
  title: string;
  inputTokens: number;
  outputTokens: number;
  model?: string;
}): CostRecord {
  const current = getSessionCosts();
  const cost = computeCostUsd(data.inputTokens, data.outputTokens);
  const totalTokens = data.inputTokens + data.outputTokens;

  const record: CostRecord = {
    id: 'cost_' + Math.random().toString(36).substring(2, 9),
    operation: data.operation,
    title: data.title,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    totalTokens,
    costUsd: cost,
    model: data.model || 'gemini-3.8-flash',
    timestamp: new Date().toLocaleTimeString()
  };

  const updated: SessionCostSummary = {
    totalCostUsd: Number((current.totalCostUsd + cost).toFixed(7)),
    totalInputTokens: current.totalInputTokens + data.inputTokens,
    totalOutputTokens: current.totalOutputTokens + data.outputTokens,
    totalTokens: current.totalTokens + totalTokens,
    totalRequests: current.totalRequests + 1,
    history: [record, ...current.history].slice(0, 50) // keep last 50 transactions
  };

  saveSessionCosts(updated);
  return record;
}

export function resetSessionCosts(): SessionCostSummary {
  const reset: SessionCostSummary = {
    totalCostUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalRequests: 0,
    history: []
  };
  saveSessionCosts(reset);
  return reset;
}

export function subscribeToCostChanges(callback: CostSubscriber): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Requirement Cost Estimation prior to building
 */
export interface RequirementCostEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  estimatedCostUsd: number;
  formattedCostUsd: string;
  estimatedLatencySec: number;
  pricingRateDisplay: string;
}

export function estimateRequirementsCost(
  userIntent: string,
  isFullSolution = false
): RequirementCostEstimate {
  // Approximate tokens: 1 token ~ 3.8 English characters
  const intentChars = (userIntent || '').trim().length;
  const intentTokens = Math.max(25, Math.ceil(intentChars / 3.8));
  
  // Base system prompt token overhead:
  // - JEV specification & rule instructions: ~480 tokens
  // - JEV full solution instructions (if full build): ~850 tokens
  const basePromptTokens = isFullSolution ? 850 : 480;
  const estimatedInputTokens = basePromptTokens + intentTokens;

  // Synthesized code volume:
  // - Standalone JEV Package: schema.ts, schema.py, evaluator.ts, evaluator.py, rules.json, rulebook.md, test-cases.json ~ 2,300 tokens
  // - Full Solution: adds gmail-orchestrator.ts, tax-classifier.ts, recommendation-engine.ts, trash-guard.ts ~ +1,600 tokens
  const estimatedOutputTokens = isFullSolution ? 3900 : 2300;
  const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;

  const estimatedCostUsd = computeCostUsd(estimatedInputTokens, estimatedOutputTokens);
  const formattedCostUsd =
    estimatedCostUsd < 0.01
      ? `$${estimatedCostUsd.toFixed(5)}`
      : `$${estimatedCostUsd.toFixed(4)}`;

  const estimatedLatencySec = isFullSolution ? 2.8 : 1.4;

  return {
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalTokens,
    estimatedCostUsd,
    formattedCostUsd,
    estimatedLatencySec,
    pricingRateDisplay: '$0.10 / 1M in · $0.40 / 1M out'
  };
}
