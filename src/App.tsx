/**
 * JEV Core Builder
 * Typesafe System One Models & JEV Intake Operator
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Terminal,
  Folder,
  Download,
  RefreshCw,
  Play,
  Layers,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  FileText,
  ExternalLink,
  Cpu,
  Key,
  Copy,
  Check,
  Search,
  Sparkles,
  Info
} from 'lucide-react';
import {
  CANONICAL_KB,
  JEV_SKILLS,
  JEV_PROMPTS,
  PRESET_INTENTS,
  KbLayer
} from './data/kb-store.ts';

interface EnvDiagnostics {
  env_local_exists: boolean;
  env_local_keys: string[];
  scoped_jev_api_configured: boolean;
  scoped_jev_api_preview: string;
  gemini_api_configured: boolean;
  desktop_path: string;
  desktop_writable: boolean;
  system_status: string;
  timestamp: string;
}

interface TestResultItem {
  id: string;
  title: string;
  pass: boolean;
  duration_ms: number;
  details: string;
}

interface TestSuiteSummary {
  total: number;
  passed: number;
  all_core_passed: boolean;
}

interface PipelineFile {
  name: string;
  content: string;
  bytes: number;
  sha256: string;
}

interface PipelineResponse {
  status: 'success' | 'refused' | 'partial' | 'write_failed';
  missing?: string[];
  knowledge_base_unavailable?: boolean;
  output_directory: string;
  intent_parse?: {
    goal_type: string;
    entities: string[];
    ambiguities: string[];
    required_artifacts: string[];
    confidence: number;
  };
  files: PipelineFile[];
  manifest?: Record<string, { bytes: number; sha256: string }>;
  manifest_digest?: string;
  review?: {
    criteria_results: { criterion: string; pass: boolean; note: string }[];
    revision_applied: boolean;
    residual_failures: string[];
    assumptions_to_verify: string[];
  };
  error?: string;
}

export default function App() {
  const [userIntent, setUserIntent] = useState(
    'Set up JEV guidelines for our support team so intake tickets get triaged per the framework.'
  );
  const [outputDir, setOutputDir] = useState('~/Desktop/jev-output');
  const [forceEmptyKb, setForceEmptyKb] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResponse | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<string>('guidelines.md');

  // Diagnostics & Tests
  const [envStatus, setEnvStatus] = useState<EnvDiagnostics | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{ summary: TestSuiteSummary; results: TestResultItem[] } | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showKbModal, setShowKbModal] = useState(false);
  const [showHarnessModal, setShowHarnessModal] = useState(false);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [desktopFiles, setDesktopFiles] = useState<any[]>([]);

  // Fetch status on mount
  useEffect(() => {
    fetchEnvStatus();
    fetchDesktopFiles();
  }, []);

  const fetchEnvStatus = async () => {
    try {
      const res = await fetch('/api/jev/status');
      if (res.ok) {
        const data = await res.json();
        setEnvStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchDesktopFiles = async () => {
    try {
      const res = await fetch('/api/jev/artifacts');
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          setDesktopFiles(data.files);
        }
      }
    } catch (err) {
      console.error('Failed to fetch desktop files:', err);
    }
  };

  const runPipeline = async () => {
    if (!userIntent.trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/jev/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_intent: userIntent,
          output_directory: outputDir,
          force_empty_kb: forceEmptyKb
        })
      });
      const data: PipelineResponse = await res.json();
      setPipelineResult(data);
      // set active tab to default deliverable
      if (data.files && data.files.length > 0) {
        if (data.files.some(f => f.name === 'guidelines.md')) {
          setActiveOutputTab('guidelines.md');
        } else if (data.files.some(f => f.name === 'intake_scaffold.md')) {
          setActiveOutputTab('intake_scaffold.md');
        } else if (data.files.some(f => f.name === 'clarification_request.md')) {
          setActiveOutputTab('clarification_request.md');
        } else {
          setActiveOutputTab(data.files[0].name);
        }
      }
      fetchDesktopFiles();
      fetchEnvStatus();
    } catch (err) {
      console.error('Pipeline error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const runTestSuite = async () => {
    setIsRunningTests(true);
    setShowTestModal(true);
    try {
      const res = await fetch('/api/jev/test', { method: 'POST' });
      const data = await res.json();
      setTestResults(data);
      fetchEnvStatus();
      fetchDesktopFiles();
    } catch (err) {
      console.error('Test suite error:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const downloadZip = async () => {
    if (!pipelineResult || !pipelineResult.files) return;
    try {
      const res = await fetch('/api/jev/export-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: pipelineResult.files })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jev-desktop-package.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeFile = pipelineResult?.files.find(f => f.name === activeOutputTab);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm tracking-tight">
            JEV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-zinc-100">
                JEV Core Builder
              </h1>
              <span className="text-xs text-zinc-400 font-mono">v1.0.0</span>
              <span className="text-zinc-600">·</span>
              <span className="text-xs text-zinc-400">
                TypeSafe System One Intake Operator
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Grounded in TypeSafe JEV Doctrine · Quote-Before-Answer · Byte-Stable Desktop Manifests
            </p>
          </div>
        </div>

        {/* Right Status Badges & Quick Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Environment Status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs">
            <span className="text-zinc-400">API Mode:</span>
            {envStatus?.scoped_jev_api_configured ? (
              <span className="text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Scoped JEV API ({envStatus.scoped_jev_api_preview})
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Deterministic JEV Engine
              </span>
            )}
          </div>

          {/* Desktop Write Status */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-300">
            <Folder className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-400">Target:</span>
            <span className="font-mono text-zinc-200 truncate max-w-[140px]" title={envStatus?.desktop_path}>
              ~/Desktop/jev-output
            </span>
            {envStatus?.desktop_writable && (
              <span title="Filesystem Writable">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            )}
          </div>

          {/* Action: Knowledge Base Explorer */}
          <button
            onClick={() => setShowKbModal(true)}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-md text-xs font-medium text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            12 Deep Layers & KB
          </button>

          {/* Action: AI Harness Hub */}
          <button
            onClick={() => setShowHarnessModal(true)}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-md text-xs font-medium text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            AI Harness API
          </button>

          {/* Action: Run Tests */}
          <button
            onClick={runTestSuite}
            disabled={isRunningTests}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shadow-emerald-950"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isRunningTests ? 'Testing...' : 'Audit Test Suite'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Intake Workspace & Presets (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Intake Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
                  Intake Contract
                </h2>
              </div>
              <span className="text-xs text-zinc-500 font-mono">Stage 1 of 3</span>
            </div>

            {/* Presets Quick Selector */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Test Case Presets (Anchored Exemplars)
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESET_INTENTS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setUserIntent(preset.text);
                      setForceEmptyKb(!!preset.forceEmptyKb);
                    }}
                    className={`text-left px-3 py-2 rounded-lg text-xs transition-colors border cursor-pointer ${
                      userIntent === preset.text
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-zinc-950/60 border-zinc-800/60 hover:bg-zinc-800/50 text-zinc-300'
                    }`}
                  >
                    <div className="font-semibold">{preset.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Free-text user intent input */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  User Stated Intent <span className="text-emerald-400 font-mono">*REQUIRED</span>
                </label>
                <span className="text-[11px] text-zinc-500">Free-text input</span>
              </div>
              <textarea
                value={userIntent}
                onChange={e => setUserIntent(e.target.value)}
                placeholder="State your operational goal, e.g. Set up JEV guidelines for our support team so intake tickets get triaged per the framework..."
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/40 font-mono resize-y"
              />
            </div>

            {/* Target Output Directory */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Target Output Directory
                </label>
                <span className="text-[11px] text-zinc-500">Filesystem (Never clipboard)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={outputDir}
                    onChange={e => setOutputDir(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-3 pr-8 text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-emerald-500"
                  />
                  <Folder className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-2.5" />
                </div>
                <button
                  type="button"
                  onClick={() => setOutputDir('~/Desktop/jev-output')}
                  className="px-2.5 py-2 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-xs rounded-lg transition-colors cursor-pointer"
                  title="Reset to default Desktop output"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Knowledge Base Mode Toggle */}
            <div className="mb-5 flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg">
              <div>
                <div className="text-xs font-medium text-zinc-300">Knowledge Base Grounding</div>
                <div className="text-[11px] text-zinc-500">
                  {forceEmptyKb
                    ? 'Empty KB (Abstention Rule triggered)'
                    : 'Canonical TypeSafe JEV KB active'}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceEmptyKb}
                  onChange={e => setForceEmptyKb(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Execute Button */}
            <button
              onClick={runPipeline}
              disabled={isProcessing || !userIntent.trim()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Chained JEV Pipeline...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Execute JEV Intake Pipeline (Write to Desktop)
                </>
              )}
            </button>
          </div>

          {/* Hard Constraints & Operator Contract Reference */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-xs">
            <h3 className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Operator Hard Invariants
            </h3>
            <ul className="space-y-1.5 text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">1.</span>
                <span>All file outputs land on local filesystem (<code className="text-zinc-200">~/Desktop</code>). Clipboard strictly prohibited.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">2.</span>
                <span>Byte-stable packaging: alphabetical JSON keys, trailing newline, SHA-256 digest in <code className="text-zinc-200">manifest.json</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">3.</span>
                <span>Dual usability: human-readable Markdown paired with isomorphic machine JSON specs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">4.</span>
                <span>Quote-Before-Answer: zero fabricated JEV concepts; all claims cite canonical TypeSafe source quotes.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Pipeline Execution & Deliverable Inspector (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Pipeline Stage Visualizer */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
                  Pipeline Execution State
                </h2>
              </div>
              {pipelineResult && (
                <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${
                  pipelineResult.status === 'success'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    : pipelineResult.status === 'partial'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                    : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                }`}>
                  STATUS: {pipelineResult.status.toUpperCase()}
                </span>
              )}
            </div>

            {/* Stage Cards */}
            <div className="grid grid-cols-3 gap-3">
              {/* Stage 1 */}
              <div className={`p-3 rounded-lg border text-xs ${
                pipelineResult?.intent_parse
                  ? 'bg-zinc-950 border-emerald-500/40 text-zinc-200'
                  : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500'
              }`}>
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span>1. Intent Parse</span>
                  {pipelineResult?.intent_parse && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {pipelineResult?.intent_parse ? (
                    <>
                      <div className="capitalize font-mono text-emerald-400">
                        Goal: {pipelineResult.intent_parse.goal_type}
                      </div>
                      <div>Conf: {(pipelineResult.intent_parse.confidence * 100).toFixed(0)}%</div>
                    </>
                  ) : (
                    'Waiting for intake...'
                  )}
                </div>
              </div>

              {/* Stage 2 */}
              <div className={`p-3 rounded-lg border text-xs ${
                pipelineResult?.files.some(f => f.name === 'guidelines.md' || f.name === 'intake_scaffold.md' || f.name === 'clarification_request.md')
                  ? 'bg-zinc-950 border-emerald-500/40 text-zinc-200'
                  : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500'
              }`}>
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span>2. QBA Spec Gen</span>
                  {pipelineResult?.files.length ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {pipelineResult?.files.length ? (
                    <div>{pipelineResult.files.length} artifacts generated</div>
                  ) : (
                    'Waiting for parse...'
                  )}
                </div>
              </div>

              {/* Stage 3 */}
              <div className={`p-3 rounded-lg border text-xs ${
                pipelineResult?.review
                  ? 'bg-zinc-950 border-emerald-500/40 text-zinc-200'
                  : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500'
              }`}>
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span>3. Output Review</span>
                  {pipelineResult?.review && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {pipelineResult?.review ? (
                    <div className="text-emerald-400 font-medium">Criteria (a)-(e) Audited</div>
                  ) : (
                    'Waiting for review...'
                  )}
                </div>
              </div>
            </div>

            {/* Clarification Alert if confidence < 0.5 */}
            {pipelineResult?.intent_parse && pipelineResult.intent_parse.confidence < 0.5 && (
              <div className="mt-4 p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Low Confidence Intent (Below 0.50 Threshold)</div>
                  <div className="text-[11px] text-amber-400/80 mt-0.5">
                    Ambiguities detected. System withheld speculative specs and generated <code className="bg-amber-900/40 px-1 py-0.5 rounded">clarification_request.md</code> directly on Desktop.
                  </div>
                </div>
              </div>
            )}

            {/* Abstention Alert if KB unavailable */}
            {pipelineResult?.knowledge_base_unavailable && (
              <div className="mt-4 p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-lg text-xs text-cyan-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Abstention Rule Enforced</div>
                  <div className="text-[11px] text-cyan-400/80 mt-0.5">
                    Knowledge base was absent or empty. Emitted generic intake scaffold (<code className="bg-cyan-900/40 px-1 py-0.5 rounded">intake_scaffold.md</code>) with <code className="font-mono">knowledge_base_unavailable=true</code>.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deliverables Inspector & Tabs */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-sm flex-1 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
                  Deliverable Artifacts Inspector
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {pipelineResult?.manifest_digest && (
                  <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline" title={pipelineResult.manifest_digest}>
                    SHA-256: {pipelineResult.manifest_digest.slice(0, 12)}...
                  </span>
                )}
                <button
                  onClick={downloadZip}
                  disabled={!pipelineResult?.files?.length}
                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download ZIP
                </button>
              </div>
            </div>

            {/* File Tabs */}
            {pipelineResult && pipelineResult.files && pipelineResult.files.length > 0 ? (
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-zinc-800/60 mb-3">
                  {pipelineResult.files.map(f => (
                    <button
                      key={f.name}
                      onClick={() => setActiveOutputTab(f.name)}
                      className={`px-3 py-1.5 rounded-t-md text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        activeOutputTab === f.name
                          ? 'bg-zinc-950 text-emerald-400 border-t border-x border-zinc-700'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950/40'
                      }`}
                    >
                      {f.name.endsWith('.json') ? (
                        <FileCode className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <FileText className="w-3 h-3 text-emerald-400" />
                      )}
                      <span>{f.name}</span>
                      <span className="text-[10px] text-zinc-500">({f.bytes}B)</span>
                    </button>
                  ))}
                </div>

                {/* File Content Preview */}
                {activeFile ? (
                  <div className="flex-1 flex flex-col min-h-[360px]">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-2 font-mono">
                      <span>Target: {outputDir}/{activeFile.name}</span>
                      <button
                        onClick={() => copyToClipboard(activeFile.content, activeFile.name)}
                        className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        {copiedKey === activeFile.name ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Content</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-200 overflow-auto whitespace-pre-wrap leading-relaxed max-h-[480px]">
                      {activeFile.content}
                    </pre>
                  </div>
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    Select a tab above to inspect deliverable content.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-950/30">
                <Folder className="w-10 h-10 text-zinc-700 mb-3" />
                <h3 className="text-sm font-medium text-zinc-300">No Deliverables Generated Yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
                  Select a preset on the left or type a custom user intent, then click "Execute JEV Intake Pipeline" to write files to your Desktop.
                </p>
                <button
                  onClick={runPipeline}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors cursor-pointer"
                >
                  Run Sample Intake (T1)
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Audit Test Suite Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    JEV Verification Audit Suite (T1 – T5 & Scoped API)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Deterministic verification matrix per TypeSafe JEV specifications
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-zinc-500 hover:text-zinc-200 text-xs px-2 py-1 rounded bg-zinc-800/60 cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Scoped API Notice Box */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-emerald-400" />
                    Scoped JEV API & .env.local Status
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    envStatus?.scoped_jev_api_configured
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {envStatus?.scoped_jev_api_configured ? 'ACTIVE' : 'AWAITING OPERATOR KEY'}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed mb-2">
                  The user prompt specifies: <em className="text-zinc-300">"I will add a scoped JEV API to the .env.local files for testing prior to your claiming completion which is REQUIRED."</em>
                </p>
                <div className="bg-zinc-900 p-2.5 rounded font-mono text-[11px] text-zinc-300 border border-zinc-800">
                  <div># In .env.local:</div>
                  <div>SCOPED_JEV_API="https://api.typesafe.ai/v1"</div>
                  <div>JEV_API_KEY="your-scoped-token"</div>
                </div>
              </div>

              {/* Test Results List */}
              {testResults ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 pb-1">
                    <span>Test Cases</span>
                    <span className="font-mono">
                      {testResults.summary.passed} / {testResults.summary.total} Passed
                    </span>
                  </div>

                  {testResults.results.map(t => (
                    <div
                      key={t.id}
                      className={`p-3 rounded-lg border text-xs ${
                        t.pass
                          ? 'bg-zinc-950/80 border-emerald-500/30'
                          : t.id === 'SCOPE-API'
                          ? 'bg-zinc-950/80 border-amber-500/30'
                          : 'bg-zinc-950/80 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                            t.pass
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : t.id === 'SCOPE-API'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {t.id}
                          </span>
                          <span className="font-medium text-zinc-200">{t.title}</span>
                        </div>
                        <span className="text-zinc-500 font-mono text-[11px]">{t.duration_ms}ms</span>
                      </div>
                      <p className="text-zinc-400 text-[11px] leading-relaxed mt-1 pl-7">
                        {t.details}
                      </p>
                    </div>
                  ))}
                </div>
              ) : isRunningTests ? (
                <div className="p-12 text-center text-zinc-400 text-xs">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-2" />
                  Executing automated test harness...
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  Click below to execute the full JEV test harness.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-mono">
                Last checked: {envStatus?.timestamp || 'Just now'}
              </span>
              <button
                onClick={runTestSuite}
                disabled={isRunningTests}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                Re-Run All Tests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12 Layers & Knowledge Base Modal */}
      {showKbModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    JEV 12-Deep Layer Architecture & Canonical KB
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Typesafe System One models & JEV specification hierarchy
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKbModal(false)}
                className="text-zinc-500 hover:text-zinc-200 text-xs px-2 py-1 rounded bg-zinc-800/60 cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Layers List */}
              <div className="md:col-span-4 border-r border-zinc-800 pr-4 space-y-1">
                <div className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-2">
                  12 Layers Hierarchy
                </div>
                {CANONICAL_KB.layers.map((layer: KbLayer, idx: number) => (
                  <button
                    key={layer.layer}
                    onClick={() => setSelectedLayerIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      selectedLayerIndex === idx
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                        : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-mono font-bold text-zinc-500 mr-2">{layer.layer}</span>
                    <span className="truncate flex-1 font-medium">{layer.name}</span>
                  </button>
                ))}

                <div className="pt-4 mt-4 border-t border-zinc-800">
                  <div className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-2">
                    Package Skills
                  </div>
                  {JEV_SKILLS.map(skill => (
                    <div key={skill.name} className="text-xs text-zinc-400 py-1 font-mono">
                      • {skill.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Layer Detail */}
              <div className="md:col-span-8 flex flex-col">
                {CANONICAL_KB.layers[selectedLayerIndex] && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-xs font-bold">
                        {CANONICAL_KB.layers[selectedLayerIndex].layer}
                      </span>
                      <h4 className="text-sm font-semibold text-zinc-100">
                        {CANONICAL_KB.layers[selectedLayerIndex].name}
                      </h4>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Operational Description
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                        {CANONICAL_KB.layers[selectedLayerIndex].description}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Verbatim Canonical Quote (QBA Grounding)
                      </div>
                      <blockquote className="text-xs italic text-emerald-300 leading-relaxed bg-emerald-950/20 p-3 rounded-lg border border-emerald-500/30">
                        "{CANONICAL_KB.layers[selectedLayerIndex].quote}"
                      </blockquote>
                      <div className="text-[11px] text-zinc-500 mt-1 font-mono">
                        Ref: {CANONICAL_KB.layers[selectedLayerIndex].ref}
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-400 space-y-1">
                      <div className="font-semibold text-zinc-300">TypeSafe Jev Specifications</div>
                      <div>• Source: <a href={CANONICAL_KB.source_url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">{CANONICAL_KB.source_url}</a></div>
                      <div>• Speed: {CANONICAL_KB.typesafe_jev_specifications.speed}</div>
                      <div>• Cost: {CANONICAL_KB.typesafe_jev_specifications.cost}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Harness API Hub Modal */}
      {showHarnessModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    AI Harness & LLM Assistant Integration Protocol
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Machine entrypoints for LangChain, AutoGen, Cursor, Claude Desktop, and CLI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHarnessModal(false)}
                className="text-zinc-500 hover:text-zinc-200 text-xs px-2 py-1 rounded bg-zinc-800/60 cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">1. Direct HTTP / REST API Intake</h4>
                <p className="text-zinc-400 mb-2">
                  Any LLM assistant or automated script can invoke the JEV intake operator via standard JSON HTTP POST:
                </p>
                <div className="relative">
                  <pre className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-zinc-300 text-[11px] overflow-x-auto">
{`curl -X POST http://localhost:3000/api/jev/intake \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_intent": "Set up JEV guidelines for data ingestion engine",
    "output_directory": "~/Desktop/jev-output"
  }'`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`curl -X POST http://localhost:3000/api/jev/intake -H "Content-Type: application/json" -d '{"user_intent":"Set up JEV guidelines for data ingestion engine","output_directory":"~/Desktop/jev-output"}'`, 'curl')}
                    className="absolute right-2 top-2 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-mono cursor-pointer"
                  >
                    {copiedKey === 'curl' ? 'Copied' : 'Copy curl'}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">2. Node.js / TypeScript SDK Contract</h4>
                <div className="relative">
                  <pre className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-zinc-300 text-[11px] overflow-x-auto">
{`import { executeJevPipeline } from './src/server/jev-engine.ts';

const result = await executeJevPipeline({
  user_intent: "Wire JEV intake tool into agent harness",
  output_directory: "~/Desktop/jev-output"
});

console.log("Status:", result.status);
console.log("Manifest SHA-256:", result.manifest_digest);`}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">3. Deterministic Verification Contract</h4>
                <ul className="space-y-1.5 text-zinc-400">
                  <li>• Inputs must declare <code className="text-zinc-200">user_intent</code>; missing intent yields <code className="text-rose-400">status: "refused"</code>.</li>
                  <li>• Outputs are guaranteed byte-stable at seed 42 with verified SHA-256 manifest.</li>
                  <li>• Machine consumers should inspect <code className="text-zinc-200">jev-spec.json</code> for structured execution rules.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 px-6 py-4 text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-4">
        <div>
          JEV Core Builder · Typesafe System One Models & JEV Intake Operator · Canonical Knowledge Base Grounded
        </div>
        <div className="flex items-center gap-4">
          <span>Target Host: {envStatus?.desktop_path}</span>
          <span>·</span>
          <span>Status: {envStatus?.system_status}</span>
        </div>
      </footer>
    </div>
  );
}
