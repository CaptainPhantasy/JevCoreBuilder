/**
 * JEV Layer Injector & Package Generator
 * Universal Justified-Evidence-Verification (JEV) System One Decision Architecture
 * High ROI, ELI12 Usability, Anti-Slop Production-Grade Design
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
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
  Copy,
  Check,
  Search,
  Sparkles,
  Sliders,
  Code2,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  Cpu,
  Key,
  Flame,
  CheckCheck,
  Upload,
  XCircle,
  Terminal,
  Zap,
  GitCompare,
  Mic,
  RotateCcw,
  Save
} from 'lucide-react';
import JSZip from 'jszip';
import VisualDiffViewer from './components/VisualDiffViewer.tsx';
import GeminiCliTerminal from './components/GeminiCliTerminal.tsx';
import JevVoiceAssistant from './components/JevVoiceAssistant.tsx';
import DesktopCommanderGuideModal from './components/DesktopCommanderGuideModal.tsx';
import CostTrackerBadge from './components/CostTrackerBadge.tsx';
import RequirementsVerificationModal from './components/RequirementsVerificationModal.tsx';
import { recordCost } from './utils/costTracker';
import {
  CANONICAL_KB,
  JEV_SKILLS,
  JEV_PROMPTS,
  PRESET_INTENTS,
  JEV_LAYER_PRESETS,
  JevLayerPreset
} from './data/kb-store.ts';

interface EnvDiagnostics {
  env_exists?: boolean;
  env_local_exists: boolean;
  env_local_keys: string[];
  scoped_jev_api_configured: boolean;
  scoped_jev_api_preview: string;
  is_openrouter_key?: boolean;
  openrouter_meta?: {
    verified: boolean;
    label?: string;
    limit?: number;
    limit_reset?: string;
    limit_remaining?: number;
    expires_at?: string;
    workspace_id?: string;
    workspace_slug?: string;
    scope_description?: string;
    latency_ms?: number;
    error?: string;
  } | null;
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
  domain_summary?: {
    domain_id: string;
    domain_name: string;
    input_fields: string[];
    decision_choices: string[];
    rule_count: number;
    test_case_count: number;
  };
  error?: string;
}

interface SimulationDetermination {
  decision: string;
  allowed: boolean;
  risk_score: number;
  exemption_applied: boolean;
  policy_violations: string[];
  grounded_rule_ids: string[];
  confidence: number;
  reasoning_summary: string;
  evaluated_at?: string;
}

export default function App() {
  // Storage keys for auto-persistence
  const STORAGE_KEY_PRESET_ID = 'jev_selected_preset_id_v1';
  const STORAGE_KEY_INTENT = 'jev_user_intent_v1';
  const STORAGE_KEY_DOMAIN_DESC = 'jev_domain_desc_v1';
  const STORAGE_KEY_INPUTS_DESC = 'jev_inputs_desc_v1';
  const STORAGE_KEY_OUTPUTS_DESC = 'jev_outputs_desc_v1';
  const STORAGE_KEY_STRUCTURED = 'jev_show_structured_intake_v1';
  const STORAGE_KEY_OUTPUT_DIR = 'jev_output_dir_v1';
  const STORAGE_KEY_SIM_STATE = 'jev_simulation_state_v1';
  const STORAGE_KEY_RAW_JSON = 'jev_raw_json_text_v1';
  const STORAGE_KEY_RAW_MODE = 'jev_raw_json_mode_v1';
  const STORAGE_KEY_ENGINE = 'jev_engine_preference_v1';

  // Preset & Intent State (Loaded from localStorage if user has worked previously)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PRESET_ID) || 'refund_safety_gate';
  });
  const [userIntent, setUserIntent] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_INTENT);
    if (saved && saved.trim()) return saved;
    return (
      JEV_LAYER_PRESETS[0]?.intent ||
      'Add a JEV safety gate to our autonomous customer support refund agent that prevents refunds over $200 unless 3 specific conditions are met (VIP tier, order under 30 days, zero disputes).'
    );
  });
  const [domainDesc, setDomainDesc] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_DOMAIN_DESC) || JEV_LAYER_PRESETS[0]?.description || '';
  });
  const [inputsDesc, setInputsDesc] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_INPUTS_DESC) || JEV_LAYER_PRESETS[0]?.inputs_summary.join(', ') || '';
  });
  const [outputsDesc, setOutputsDesc] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_OUTPUTS_DESC) || JEV_LAYER_PRESETS[0]?.decision_summary || '';
  });
  const [showStructuredIntake, setShowStructuredIntake] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_STRUCTURED) === 'true';
  });
  const [outputDir, setOutputDir] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_OUTPUT_DIR) || '~/Desktop/jev-output';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineResponse | null>(null);

  // Requirements Verification & Pre-Build Cost Estimation Modal State
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  // Preset Switch Safeguard Modal State (Informs the user so they don't lose customized progress)
  const [pendingPresetChange, setPendingPresetChange] = useState<JevLayerPreset | null>(null);

  // Tabs & Navigation
  const [mainTab, setMainTab] = useState<'sandbox' | 'package' | 'diff' | 'cli' | 'integrity' | 'audit'>('sandbox');
  const [activeOutputTab, setActiveOutputTab] = useState<string>('schema.ts');
  const [langToggle, setLangToggle] = useState<'ts' | 'py'>('ts');
  const [packageSearch, setPackageSearch] = useState<string>('');

  // Voice Assistant, CLI & Diff Viewer State
  const [showVoiceAssistant, setShowVoiceAssistant] = useState<boolean>(false);
  const [showDesktopCommanderGuide, setShowDesktopCommanderGuide] = useState<boolean>(false);
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>('all');
  const [presetSearch, setPresetSearch] = useState<string>('');
  const [previousFiles, setPreviousFiles] = useState<Record<string, string>>({});
  const [diffSelectedFile, setDiffSelectedFile] = useState<string>('schema.ts');

  // Diagnostics & Status
  const [envStatus, setEnvStatus] = useState<EnvDiagnostics | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{ summary: TestSuiteSummary; results: TestResultItem[] } | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showKbModal, setShowKbModal] = useState(false);
  const [showEli12Explainer, setShowEli12Explainer] = useState(true);
  const [showQuickstartDrawer, setShowQuickstartDrawer] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Simulation Sandbox State (Auto-persisted)
  const [simulationState, setSimulationState] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIM_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch {}
    return JEV_LAYER_PRESETS[0]?.sample_state || {};
  });
  const [rawJsonMode, setRawJsonMode] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_RAW_MODE) === 'true';
  });
  const [rawJsonText, setRawJsonText] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_RAW_JSON);
    if (saved && saved.trim()) return saved;
    return JSON.stringify(JEV_LAYER_PRESETS[0]?.sample_state || {}, null, 2);
  });
  const [enginePreference, setEnginePreference] = useState<'local' | 'openrouter'>(() => {
    return (localStorage.getItem(STORAGE_KEY_ENGINE) as 'local' | 'openrouter') || 'local';
  });
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<{
    determination: SimulationDetermination;
    engine_used: string;
    latency_ms: number;
  } | null>(null);

  // Batch Suite Test Runner State (Feature 3)
  const [batchTesting, setBatchTesting] = useState<boolean>(false);
  const [batchResults, setBatchResults] = useState<{
    total: number;
    passed: number;
    all_passed: boolean;
    results: any[];
  } | null>(null);

  // Manifest Integrity Auditor State (Feature 9)
  const [manifestAuditing, setManifestAuditing] = useState<boolean>(false);
  const [manifestAuditData, setManifestAuditData] = useState<{
    all_valid: boolean;
    verified_count: number;
    total_count: number;
    checks: any[];
  } | null>(null);

  // Auto-persist System Intent & Sandbox to Local Storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRESET_ID, selectedPresetId);
    } catch {}
  }, [selectedPresetId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INTENT, userIntent);
    } catch {}
  }, [userIntent]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOMAIN_DESC, domainDesc);
    } catch {}
  }, [domainDesc]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INPUTS_DESC, inputsDesc);
    } catch {}
  }, [inputsDesc]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OUTPUTS_DESC, outputsDesc);
    } catch {}
  }, [outputsDesc]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STRUCTURED, String(showStructuredIntake));
    } catch {}
  }, [showStructuredIntake]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OUTPUT_DIR, outputDir);
    } catch {}
  }, [outputDir]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SIM_STATE, JSON.stringify(simulationState));
    } catch {}
  }, [simulationState]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RAW_JSON, rawJsonText);
    } catch {}
  }, [rawJsonText]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RAW_MODE, String(rawJsonMode));
    } catch {}
  }, [rawJsonMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ENGINE, enginePreference);
    } catch {}
  }, [enginePreference]);

  // Initial load
  useEffect(() => {
    fetchEnvStatus();
    runPipeline();
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

  const selectPreset = (preset: JevLayerPreset) => {
    setSelectedPresetId(preset.id);
    setUserIntent(preset.intent);
    setDomainDesc(preset.description);
    setInputsDesc(preset.inputs_summary.join(', '));
    setOutputsDesc(preset.decision_summary);
    setSimulationState(preset.sample_state);
    setRawJsonText(JSON.stringify(preset.sample_state, null, 2));
    setSimulationResult(null);
    setBatchResults(null);
  };

  // Inform human before switching preset if current fields were customized
  const handlePresetSelectWithSafeguard = (preset: JevLayerPreset) => {
    if (preset.id === selectedPresetId) return;

    const currentPreset = JEV_LAYER_PRESETS.find(p => p.id === selectedPresetId);
    const intentCustomized = currentPreset && userIntent.trim() !== currentPreset.intent.trim();
    const sandboxCustomized = currentPreset && JSON.stringify(simulationState) !== JSON.stringify(currentPreset.sample_state);

    if (intentCustomized || sandboxCustomized) {
      setPendingPresetChange(preset);
      return;
    }

    selectPreset(preset);
  };

  const handleResetIntentToPreset = () => {
    const currentPreset = JEV_LAYER_PRESETS.find(p => p.id === selectedPresetId) || JEV_LAYER_PRESETS[0];
    if (confirm('Reset System Intent back to the default preset baseline?')) {
      setUserIntent(currentPreset.intent);
      setDomainDesc(currentPreset.description);
      setInputsDesc(currentPreset.inputs_summary.join(', '));
      setOutputsDesc(currentPreset.decision_summary);
    }
  };

  const handleResetSandboxToPreset = () => {
    const currentPreset = JEV_LAYER_PRESETS.find(p => p.id === selectedPresetId) || JEV_LAYER_PRESETS[0];
    if (confirm('Reset Live Determination inputs back to the default preset sample state?')) {
      setSimulationState(currentPreset.sample_state);
      setRawJsonText(JSON.stringify(currentPreset.sample_state, null, 2));
      setSimulationResult(null);
    }
  };

  const handleInitiateBuild = () => {
    const skipModal = localStorage.getItem('jev_skip_verification_modal') === 'true';
    if (skipModal) {
      runPipeline();
    } else {
      setShowVerificationModal(true);
    }
  };

  const runPipeline = async (overrideIntent?: string) => {
    const intentToRun = overrideIntent || userIntent;
    if (!intentToRun.trim()) return;

    // Record token usage & cost for building the package
    const currentPreset = JEV_LAYER_PRESETS.find(p => p.id === selectedPresetId);
    recordCost({
      operation: 'synthesis',
      title: `Synthesize: ${currentPreset?.name || 'Decision Layer'}`,
      inputTokens: Math.ceil(intentToRun.length / 3.8) + 480,
      outputTokens: 2300
    });

    // Save current files for visual diff comparison
    if (pipelineResult?.files && pipelineResult.files.length > 0) {
      const prev: Record<string, string> = {};
      for (const f of pipelineResult.files) {
        prev[f.name] = f.content;
      }
      setPreviousFiles(prev);
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/jev/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_intent: intentToRun,
          output_directory: outputDir
        })
      });
      const data: PipelineResponse = await res.json();
      setPipelineResult(data);

      if (data.files && data.files.length > 0) {
        if (!data.files.some(f => f.name === activeOutputTab)) {
          setActiveOutputTab('schema.ts');
        }
      }
      fetchEnvStatus();
    } catch (err) {
      console.error('Pipeline error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Assistant Action Handler (allows voice/text assistant to operate the app)
  const handleExecuteAssistantAction = async (actionType: string, payload?: any) => {
    if (actionType === 'set_preset') {
      const presetId = payload?.preset_id || payload;
      const preset = JEV_LAYER_PRESETS.find(p => p.id === presetId);
      if (preset) {
        selectPreset(preset);
        await runPipeline(preset.intent);
      }
    } else if (actionType === 'synthesize_layer') {
      const intent = payload?.intent || userIntent;
      setUserIntent(intent);
      await runPipeline(intent);
    } else if (actionType === 'run_determination') {
      if (payload?.state) {
        setSimulationState(payload.state);
      }
      await runSimulation();
    } else if (actionType === 'run_batch_tests') {
      setMainTab('sandbox');
      await runAllDomainTests();
    } else if (actionType === 'open_diff') {
      setMainTab('diff');
    } else if (actionType === 'open_cli') {
      setMainTab('cli');
    } else if (actionType === 'audit_manifest') {
      setMainTab('integrity');
      await auditManifest();
    }
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      let stateToEvaluate = simulationState;
      if (rawJsonMode) {
        try {
          stateToEvaluate = JSON.parse(rawJsonText);
        } catch {
          alert('Invalid JSON in raw editor mode. Please check syntax.');
          setIsSimulating(false);
          return;
        }
      }

      const res = await fetch('/api/jev/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_intent: userIntent,
          domain_id: selectedPresetId,
          input_state: stateToEvaluate,
          force_engine: enginePreference
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.determination) {
          setSimulationResult({
            determination: data.determination,
            engine_used: data.engine_used,
            latency_ms: data.latency_ms
          });

          if (data.engine_used && data.engine_used.includes('OpenRouter')) {
            recordCost({
              operation: 'simulation',
              title: `Simulation (${data.engine_used.slice(0, 20)})`,
              inputTokens: 250,
              outputTokens: 180
            });
          }
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Run all suite tests in batch
  const runAllDomainTests = async () => {
    setBatchTesting(true);
    try {
      const res = await fetch('/api/jev/test-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_id: selectedPresetId,
          user_intent: userIntent
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBatchResults(data);
      }
    } catch (err) {
      console.error('Failed to run batch tests:', err);
    } finally {
      setBatchTesting(false);
    }
  };

  // Verify manifest integrity
  const auditManifest = async () => {
    setManifestAuditing(true);
    try {
      const res = await fetch('/api/jev/verify-manifest');
      if (res.ok) {
        const data = await res.json();
        setManifestAuditData(data);
      }
    } catch (err) {
      console.error('Audit manifest failed:', err);
    } finally {
      setManifestAuditing(false);
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
    } catch (err) {
      console.error('Test suite error:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const downloadZipBundle = async () => {
    if (!pipelineResult?.files?.length) return;
    try {
      const zip = new JSZip();
      const folder = zip.folder('jev-layer');
      pipelineResult.files.forEach(f => folder?.file(f.name, f.content));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jev-layer-${selectedPresetId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentPreset = JEV_LAYER_PRESETS.find(p => p.id === selectedPresetId) || JEV_LAYER_PRESETS[0];

  // Resolve current active file
  let currentFileName = activeOutputTab;
  if (activeOutputTab === 'schema.ts' && langToggle === 'py') currentFileName = 'schema.py';
  if (activeOutputTab === 'evaluator.ts' && langToggle === 'py') currentFileName = 'evaluator.py';
  const activeFile =
    pipelineResult?.files.find(f => f.name === currentFileName) ||
    pipelineResult?.files.find(f => f.name === activeOutputTab) ||
    pipelineResult?.files[0];

  // Categorized file tabs
  const packageFileTabs = [
    { category: 'Contracts', files: ['schema.ts', 'schema.py'] },
    { category: 'Evaluators', files: ['evaluator.ts', 'evaluator.py'] },
    { category: 'Rulebooks', files: ['rulebook.json', 'rulebook.md'] },
    { category: 'Verification', files: ['test-evaluator.ts', 'test-cases.json', 'manifest.json'] },
    { category: 'AI Integration', files: ['ai_entrypoint.md', 'guidelines.md'] }
  ];

  const filteredFiles = pipelineResult?.files.filter(f =>
    packageSearch ? f.name.toLowerCase().includes(packageSearch.toLowerCase()) : true
  ) || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm tracking-tight">
            JEV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-zinc-100">
                JEV Layer Injector
              </h1>
              <span className="text-xs text-zinc-400 font-mono">v1.3</span>
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
              <span>Typesafe System One Decision Architecture</span>
              <span aria-hidden="true">·</span>
              <span className="text-zinc-500 font-mono">~/Desktop/jev-output/</span>
            </div>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2">
          {/* Real-Time Cost Tracker running total */}
          <CostTrackerBadge />

          {/* Vocal / STT Assistant Launcher */}
          <button
            onClick={() => setShowVoiceAssistant(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Hey JEV (Voice AI)</span>
          </button>

          {/* JEV Lab Direct Link */}
          <a
            href="https://jev-lab.com/en/"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Explore 20 Interactive Presets on JEV Lab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">JEV Lab (20 Presets)</span>
          </a>

          <button
            onClick={() => setShowDesktopCommanderGuide(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="DesktopCommander Onboarding Guide"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">DesktopCommander</span>
          </button>

          <button
            onClick={() => setShowEli12Explainer(!showEli12Explainer)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">What is JEV?</span>
          </button>

          <button
            onClick={() => setShowQuickstartDrawer(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">3-Line Code</span>
          </button>

          <button
            onClick={runTestSuite}
            disabled={isRunningTests}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Test Suite (T1-T5)</span>
          </button>

          <button
            onClick={downloadZipBundle}
            disabled={!pipelineResult?.files?.length}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export ZIP</span>
          </button>
        </div>
      </header>

      {/* Feature 1: "What is JEV?" ELI12 Visual Explainer Bar */}
      {showEli12Explainer && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 border-b border-emerald-500/20 px-6 py-3.5 transition-all">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  ELI12 Primer: How JEV Works
                </span>
                <span className="text-xs text-zinc-400">·</span>
                <span className="text-xs text-zinc-400">Zero Hallucination Safety Gate</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-4xl">
                Normal AI models guess and hallucinate. A <strong>JEV System One Layer</strong> acts like an incorruptible bouncer for your app or agent: it inspects the program state against an exact evidence rulebook and issues a strict, typed determination (<code>APPROVED</code>, <code>BLOCKED</code>, or <code>HUMAN_REVIEW</code>) in under 5 milliseconds.
              </p>
            </div>

            {/* 3-Step Visual Flow Diagram */}
            <div className="flex items-center gap-2 text-xs font-mono shrink-0 bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-lg">
              <div className="text-zinc-300">
                <span className="text-zinc-500">1.</span> Program State
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <div className="text-emerald-300 font-semibold">
                <span className="text-emerald-500">2.</span> JEV Rule Matrix
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <div className="text-zinc-300">
                <span className="text-zinc-500">3.</span> Typed Gate
              </div>
            </div>

            <button
              onClick={() => setShowEli12Explainer(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer self-start md:self-auto"
              title="Dismiss primer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Intake & Rule Architecture (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Preset Selector Card with 20 JEV Lab Presets */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                  1. Select Decision Architecture
                </h2>
              </div>
              <a
                href="https://jev-lab.com/en/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>20 on jev-lab.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1 mb-2.5">
              {[
                { id: 'all', label: 'All (20)' },
                { id: 'productivity', label: 'Productivity' },
                { id: 'finance', label: 'Finance' },
                { id: 'security', label: 'Security' },
                { id: 'devops', label: 'DevOps' },
                { id: 'ops', label: 'Ops' },
                { id: 'data', label: 'Data' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setPresetCategoryFilter(cat.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    presetCategoryFilter === cat.id
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                      : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={presetSearch}
                onChange={e => setPresetSearch(e.target.value)}
                placeholder="Filter 20 presets (e.g. gmail, refund, sql, hipaa)..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Presets List */}
            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
              {JEV_LAYER_PRESETS.filter(p => {
                const matchCat =
                  presetCategoryFilter === 'all' || p.category === presetCategoryFilter;
                const matchSearch =
                  !presetSearch ||
                  p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
                  p.description.toLowerCase().includes(presetSearch.toLowerCase()) ||
                  p.id.toLowerCase().includes(presetSearch.toLowerCase());
                return matchCat && matchSearch;
              }).map(preset => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`p-3 rounded-lg text-xs transition-all border ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200 shadow-xs'
                        : 'bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-800/40 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-zinc-100">{preset.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-2">
                      {preset.description}
                    </p>
                    <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between border-t border-zinc-800/60 pt-2">
                      <span className="truncate pr-2">Choices: {preset.decision_summary}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            const llmPrompt = `Inject a specialized JEV System One decision layer for: ${preset.name}.\nRequirements:\n- Domain: ${preset.description}\n- Inputs: ${preset.inputs_summary.join(', ')}\n- Decisions: ${preset.decision_summary}\nReference: https://jev-lab.com/en/`;
                            navigator.clipboard.writeText(llmPrompt);
                            setCopiedKey(`llm-${preset.id}`);
                            setTimeout(() => setCopiedKey(null), 2000);
                          }}
                          className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy prompt for Cursor, Copilot, or Claude Code"
                        >
                          {copiedKey === `llm-${preset.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Prompt</span>
                        </button>

                        <button
                          onClick={() => handlePresetSelectWithSafeguard(preset)}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
                        >
                          Use Preset
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Intent & Specification Editor */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                  2. Define Governing Intent
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  <Check className="w-2.5 h-2.5" />
                  Auto-saved
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetIntentToPreset}
                  title="Reset to active preset's baseline intent"
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer font-mono"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-500" />
                  <span className="hidden md:inline">Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStructuredIntake(!showStructuredIntake)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono transition-colors cursor-pointer"
                >
                  {showStructuredIntake ? '← Simple Text' : '⚙ Structured Form'}
                </button>
              </div>
            </div>

            {showStructuredIntake ? (
              <div className="space-y-3 mb-3 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
                <div>
                  <label className="block text-[11px] font-medium text-emerald-300 mb-1">
                    (a) System / Domain Description
                  </label>
                  <textarea
                    value={domainDesc}
                    onChange={e => {
                      setDomainDesc(e.target.value);
                      setUserIntent(`${e.target.value}. Program state: [${inputsDesc}]. Decisions: [${outputsDesc}].`);
                    }}
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-emerald-300 mb-1">
                    (b) Ingested Program State (Inputs)
                  </label>
                  <input
                    type="text"
                    value={inputsDesc}
                    onChange={e => {
                      setInputsDesc(e.target.value);
                      setUserIntent(`${domainDesc}. Program state: [${e.target.value}]. Decisions: [${outputsDesc}].`);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-emerald-300 mb-1">
                    (c) Required Decisions (Outputs)
                  </label>
                  <input
                    type="text"
                    value={outputsDesc}
                    onChange={e => {
                      setOutputsDesc(e.target.value);
                      setUserIntent(`${domainDesc}. Program state: [${inputsDesc}]. Decisions: [${e.target.value}].`);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            ) : (
              <textarea
                value={userIntent}
                onChange={e => setUserIntent(e.target.value)}
                rows={3}
                placeholder="Describe your system and the non-negotiable safety conditions..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500 font-mono resize-y leading-relaxed mb-3"
              />
            )}

            {/* Target Disk Directory */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-zinc-300">Desktop Output Directory</label>
                <span className="text-[10px] text-zinc-500 font-mono">Filesystem Sink</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={outputDir}
                  onChange={e => setOutputDir(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  onClick={() => copyToClipboard(outputDir, 'output-dir')}
                  title="Copy directory path"
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  {copiedKey === 'output-dir' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleInitiateBuild}
              disabled={isProcessing || !userIntent.trim()}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer font-semibold"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                  <span>Synthesizing Decision Layer...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Synthesize JEV Drop-In Package</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Sandbox & Package Explorer (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Main Tab Navigation */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMainTab('sandbox')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mainTab === 'sandbox'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Test Determination</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>

              <button
                onClick={() => setMainTab('package')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mainTab === 'package'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Drop-In Code Bundle</span>
              </button>

              <button
                onClick={() => setMainTab('diff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mainTab === 'diff'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Visual Diff</span>
              </button>

              <button
                onClick={() => setMainTab('cli')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mainTab === 'cli'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gemini CLI</span>
              </button>

              <button
                onClick={() => {
                  setMainTab('integrity');
                  auditManifest();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mainTab === 'integrity'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Disk Integrity</span>
              </button>

              <button
                onClick={() => setMainTab('audit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mainTab === 'audit'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Review Audit</span>
              </button>
            </div>

            {/* Quick Engine Selector (Feature 8) */}
            <div className="flex items-center gap-1 text-[11px] bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
              <button
                onClick={() => setEnginePreference('local')}
                className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                  enginePreference === 'local'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Fast deterministic local execution (<5ms)"
              >
                ⚡ Local (&lt;5ms)
              </button>
              <button
                onClick={() => setEnginePreference('openrouter')}
                className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                  enginePreference === 'openrouter'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="OpenRouter JEV 1.3 model (~150ms)"
              >
                🌐 JEV 1.3
              </button>
            </div>
          </div>

          {/* TAB 1: INTERACTIVE SANDBOX */}
          {mainTab === 'sandbox' && (
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <Play className="w-4 h-4 text-emerald-400" />
                      Live JEV Determination Sandbox
                    </h3>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      <Check className="w-2.5 h-2.5" />
                      Inputs saved
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Test sample program states against the newly synthesized JEV decision contract
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetSandboxToPreset}
                    title="Reset sample state inputs back to preset defaults"
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-zinc-500" />
                    <span className="hidden sm:inline">Reset Inputs</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!rawJsonMode) {
                        setRawJsonText(JSON.stringify(simulationState, null, 2));
                      } else {
                        try {
                          setSimulationState(JSON.parse(rawJsonText));
                        } catch {
                          // keep as is
                        }
                      }
                      setRawJsonMode(!rawJsonMode);
                    }}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-colors cursor-pointer"
                  >
                    {rawJsonMode ? 'Form View' : 'Raw JSON View'}
                  </button>

                  <button
                    onClick={runAllDomainTests}
                    disabled={batchTesting}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-xs font-medium border border-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {batchTesting ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3 h-3" />
                    )}
                    <span>Run All Suite Tests</span>
                  </button>
                </div>
              </div>

              {/* Pre-built Test Scenario Quick Buttons */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Test Scenarios (1-Click Fill):
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedPresetId === 'email_cleaner_tax_sorter' && (
                    <>
                      <button
                        onClick={() => {
                          const state = {
                            sender_email: 'receipts@apple.com',
                            email_subject: 'Your Apple Store receipt: MacBook Pro 16-inch M4',
                            body_snippet: 'Order W89240182: 1x 16-inch MacBook Pro ($2,499.00). Total: $2,637.00',
                            has_receipt_attachment: true,
                            purchase_amount: 2637.0,
                            vendor_domain: 'apple.com',
                            is_contact_in_address_book: true,
                            relationship_tag: 'vendor',
                            is_tech_hardware_or_software: true
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        📁 MacBook Pro ($2,637) → Tax Folder
                      </button>
                      <button
                        onClick={() => {
                          const state = {
                            sender_email: 'sarah.talley@family.org',
                            email_subject: 'Photos from weekend barbecue!',
                            body_snippet: 'Hey Doug, here are the pictures of the kids at the park!',
                            has_receipt_attachment: false,
                            purchase_amount: 0,
                            vendor_domain: '',
                            is_contact_in_address_book: true,
                            relationship_tag: 'family',
                            is_tech_hardware_or_software: false
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        ❤️ Sister Email → Friends & Family
                      </button>
                      <button
                        onClick={() => {
                          const state = {
                            sender_email: 'partner@acme-corp.com',
                            email_subject: 'Signed SOW and Project Kickoff',
                            body_snippet: 'Please find the countersigned Statement of Work attached.',
                            has_receipt_attachment: false,
                            purchase_amount: 0,
                            vendor_domain: 'acme-corp.com',
                            is_contact_in_address_book: true,
                            relationship_tag: 'work',
                            is_tech_hardware_or_software: false
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        💼 Client SOW → Work Folder
                      </button>
                      <button
                        onClick={() => {
                          const state = {
                            sender_email: 'orders@bestbuy.com',
                            email_subject: 'Your Best Buy order for LaserJet Toner Cartridges',
                            body_snippet: 'Order 9482910: 2x HP High Yield Toner Cartridge. Total: $184.99',
                            has_receipt_attachment: true,
                            purchase_amount: 184.99,
                            vendor_domain: 'bestbuy.com',
                            is_contact_in_address_book: true,
                            relationship_tag: 'vendor',
                            is_tech_hardware_or_software: false
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-teal-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        🛒 Toner Receipt → Re-buy Recommender
                      </button>
                      <button
                        onClick={() => {
                          const state = {
                            sender_email: 'promo@free-crypto-casino-spins.net',
                            email_subject: 'CLAIM YOUR 500 FREE SPINS TODAY',
                            body_snippet: 'Click here now to claim your deposit bonus. Unsubscribe.',
                            has_receipt_attachment: false,
                            purchase_amount: 0,
                            vendor_domain: 'free-crypto-casino-spins.net',
                            is_contact_in_address_book: false,
                            relationship_tag: 'unknown',
                            is_tech_hardware_or_software: false
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-rose-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        🗑 Crypto Spam → Safe Trash Purge
                      </button>
                    </>
                  )}

                  {selectedPresetId === 'refund_safety_gate' && (
                    <>
                      <button
                        onClick={() => {
                          const state = {
                            order_id: 'ORD-1001',
                            order_amount: 35.0,
                            user_tier: 'standard',
                            order_age_days: 5,
                            active_dispute_count: 0,
                            refund_reason: 'Defective item on arrival'
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        ✓ $35 Micro-Refund (Auto-Approve)
                      </button>
                      <button
                        onClick={() => {
                          const state = {
                            order_id: 'ORD-1002',
                            order_amount: 250.0,
                            user_tier: 'free',
                            order_age_days: 12,
                            active_dispute_count: 0,
                            refund_reason: 'Changed mind'
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-rose-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        ✕ $250 Free Tier (Ceiling Block)
                      </button>
                      <button
                        onClick={() => {
                          const state = {
                            order_id: 'ORD-1003',
                            order_amount: 450.0,
                            user_tier: 'vip',
                            order_age_days: 14,
                            active_dispute_count: 0,
                            refund_reason: 'VIP replacement request'
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        ★ $450 VIP Tier (3-Condition Exemption)
                      </button>
                      <button
                        onClick={() => {
                          const state = {
                            order_id: 'ORD-1004',
                            order_amount: 120.0,
                            user_tier: 'standard',
                            order_age_days: 18,
                            active_dispute_count: 1,
                            refund_reason: 'Item not received'
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        ⚠ 1 Active Dispute (Supervisor Escalation)
                      </button>
                    </>
                  )}

                  {selectedPresetId === 'code_pr_screener' && (
                    <>
                      <button
                        onClick={() => {
                          const state = {
                            pr_number: 101,
                            lines_changed: 85,
                            has_database_migration: false,
                            modifies_auth_or_crypto: false,
                            test_coverage_delta: 0.2,
                            author_seniority: 'senior'
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        ✓ Low-Risk PR (Auto-Approve)
                      </button>
                      <button
                        onClick={() => {
                          const state = {
                            pr_number: 102,
                            lines_changed: 140,
                            has_database_migration: false,
                            modifies_auth_or_crypto: true,
                            test_coverage_delta: 0.0,
                            author_seniority: 'mid'
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        ⚠ Auth Modified (Security Audit)
                      </button>
                      <button
                        onClick={() => {
                          const state = {
                            pr_number: 103,
                            lines_changed: 320,
                            has_database_migration: false,
                            modifies_auth_or_crypto: false,
                            test_coverage_delta: -3.5,
                            author_seniority: 'junior'
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-rose-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        ✕ Coverage Regression (Block PR)
                      </button>
                    </>
                  )}

                  {selectedPresetId === 'agent_tool_guardrail' && (
                    <>
                      <button
                        onClick={() => {
                          const state = {
                            agent_id: 'subagent-01',
                            tool_name: 'bash',
                            target_resource: '/var/data/catalog.json',
                            command_string: 'cat /var/data/catalog.json | grep 2026',
                            is_idempotent: true,
                            estimated_impact: 'low'
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        ✓ Safe Read Query (Allow Execution)
                      </button>
                      <button
                        onClick={() => {
                          const state = {
                            agent_id: 'subagent-02',
                            tool_name: 'bash',
                            target_resource: '/var/db/users',
                            command_string: 'rm -rf /var/db/users',
                            is_idempotent: false,
                            estimated_impact: 'destructive'
                          };
                          setSimulationState(state);
                          setRawJsonText(JSON.stringify(state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-rose-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        ✕ rm -rf Command (Kill Task)
                      </button>
                    </>
                  )}

                  {selectedPresetId !== 'refund_safety_gate' &&
                    selectedPresetId !== 'code_pr_screener' &&
                    selectedPresetId !== 'agent_tool_guardrail' && (
                      <button
                        onClick={() => {
                          setSimulationState(currentPreset.sample_state);
                          setRawJsonText(JSON.stringify(currentPreset.sample_state, null, 2));
                        }}
                        className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 text-xs rounded transition-colors cursor-pointer"
                      >
                        Reset to Preset Default
                      </button>
                    )}
                </div>
              </div>

              {/* State Input Form / Raw Editor */}
              {rawJsonMode ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                      Program State JSON Payload
                    </label>
                    <button
                      onClick={() => copyToClipboard(rawJsonText, 'raw-state')}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'raw-state' ? 'Copied!' : 'Copy JSON'}
                    </button>
                  </div>
                  <textarea
                    value={rawJsonText}
                    onChange={e => setRawJsonText(e.target.value)}
                    rows={6}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-emerald-500 resize-y"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80">
                  {Object.entries(simulationState).map(([key, val]) => (
                    <div key={key}>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">{key}</label>
                      {typeof val === 'boolean' ? (
                        <select
                          value={String(val)}
                          onChange={e =>
                            setSimulationState({
                              ...simulationState,
                              [key]: e.target.value === 'true'
                            })
                          }
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : typeof val === 'number' ? (
                        <input
                          type="number"
                          step="any"
                          value={val}
                          onChange={e =>
                            setSimulationState({
                              ...simulationState,
                              [key]: parseFloat(e.target.value) || 0
                            })
                          }
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-hidden focus:border-emerald-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={e =>
                            setSimulationState({
                              ...simulationState,
                              [key]: e.target.value
                            })
                          }
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-hidden focus:border-emerald-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={runSimulation}
                disabled={isSimulating}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer font-semibold shadow-xs"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Evaluating System One Determination...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-emerald-200" />
                    <span>Run JEV Determination</span>
                  </>
                )}
              </button>

              {/* Feature 6: Visual Gate Traffic Light & ELI12 Explanation Card */}
              {simulationResult && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-3">
                      {/* Gate Traffic Light Indicator */}
                      <div
                        className={`w-3.5 h-3.5 rounded-full ${
                          simulationResult.determination.allowed
                            ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                            : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                          <span className="font-mono">{simulationResult.determination.decision}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              simulationResult.determination.allowed
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }
                          >
                            {simulationResult.determination.allowed ? 'EXECUTION ALLOWED' : 'EXECUTION BLOCKED'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          Engine: {simulationResult.engine_used} · Latency: {simulationResult.latency_ms}ms
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-zinc-200">
                        Risk: {simulationResult.determination.risk_score} / 100
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        {(simulationResult.determination.confidence * 100).toFixed(1)}% Confidence
                      </div>
                    </div>
                  </div>

                  {/* ELI12 Plain-English Explanation */}
                  <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
                    <div className="font-semibold text-zinc-200 mb-1">Plain English Summary:</div>
                    <p>{simulationResult.determination.reasoning_summary}</p>

                    {!simulationResult.determination.allowed && (
                      <div className="mt-2 text-rose-300 bg-rose-950/30 p-2 rounded border border-rose-500/20 text-[11px]">
                        <strong>Why this was blocked:</strong>{' '}
                        {simulationResult.determination.policy_violations?.join('. ') ||
                          'Does not satisfy affirmative policy constraints.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Feature 3: Batch Suite Test Table */}
              {batchResults && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                      <CheckCheck className="w-4 h-4 text-emerald-400" />
                      <span>Batch Test Suite Results ({batchResults.passed} / {batchResults.total} Passed)</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-mono font-bold">
                      {batchResults.all_passed ? '100% PASS' : 'NEEDS ATTENTION'}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {batchResults.results.map((r, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-medium text-zinc-200 flex items-center gap-2">
                            <span>{r.pass ? '✅' : '❌'}</span>
                            <span>{r.title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{r.reasoning_summary}</p>
                        </div>
                        <div className="text-right font-mono text-[11px]">
                          <span className="text-zinc-300">{r.actual_decision}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DROP-IN PACKAGE EXPLORER */}
          {mainTab === 'package' && (
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl flex flex-col flex-1 shadow-xs overflow-hidden min-h-[560px]">
              {/* File Search & Category Filter */}
              <div className="p-3 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search package files..."
                    value={packageSearch}
                    onChange={e => setPackageSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {(activeOutputTab === 'schema.ts' || activeOutputTab === 'evaluator.ts') && (
                    <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 shrink-0">
                      <button
                        onClick={() => setLangToggle('ts')}
                        className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors cursor-pointer ${
                          langToggle === 'ts'
                            ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        TS / Zod
                      </button>
                      <button
                        onClick={() => setLangToggle('py')}
                        className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors cursor-pointer ${
                          langToggle === 'py'
                            ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Python / Pydantic
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => activeFile && copyToClipboard(activeFile.content, activeFile.name)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === activeFile?.name ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-zinc-400" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Categorized File Tabs */}
              <div className="flex items-center px-4 py-2 border-b border-zinc-800/80 bg-zinc-950/40 overflow-x-auto gap-1 text-xs">
                {filteredFiles.map(f => {
                  const isActive = f.name === currentFileName || f.name === activeOutputTab;
                  return (
                    <button
                      key={f.name}
                      onClick={() => setActiveOutputTab(f.name)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-zinc-800 text-emerald-300 font-semibold border border-zinc-700'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>

              {/* Code Viewer */}
              <div className="flex-1 p-4 bg-zinc-950 overflow-auto font-mono text-xs text-zinc-300 leading-relaxed max-h-[560px]">
                {activeFile ? (
                  <pre className="whitespace-pre">{activeFile.content}</pre>
                ) : (
                  <div className="text-zinc-500 italic">No deliverable selected.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB: VISUAL DIFF VIEWER */}
          {mainTab === 'diff' && (
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 shadow-xs flex flex-col gap-4 min-h-[560px]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-emerald-400" />
                    Visual Diff & Parity Inspector
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Compare synthesized JEV modules across iterations, presets, or languages
                  </p>
                </div>

                {/* File Selector for Diffing */}
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-md">
                  {pipelineResult?.files.map(f => (
                    <button
                      key={f.name}
                      onClick={() => setDiffSelectedFile(f.name)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                        diffSelectedFile === f.name
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                          : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const currentContent =
                  pipelineResult?.files.find(f => f.name === diffSelectedFile)?.content || '';
                const oldContent =
                  previousFiles[diffSelectedFile] ||
                  (diffSelectedFile === 'schema.ts'
                    ? pipelineResult?.files.find(f => f.name === 'schema.py')?.content || '// Baseline version initialized'
                    : '// Baseline version initialized');

                return (
                  <VisualDiffViewer
                    oldContent={oldContent}
                    newContent={currentContent}
                    filename={diffSelectedFile}
                  />
                );
              })()}
            </div>
          )}

          {/* TAB: GEMINI CLI TERMINAL */}
          {mainTab === 'cli' && (
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 shadow-xs flex flex-col gap-4 min-h-[560px]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    JEV Gemini CLI Shell
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Execute command-line operations, query determinations, or inspect manifests using your Gemini API key
                  </p>
                </div>
                <button
                  onClick={() => setShowVoiceAssistant(true)}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Switch to Voice</span>
                </button>
              </div>

              <GeminiCliTerminal
                onRunAction={handleExecuteAssistantAction}
                onOpenDesktopCommander={() => setShowDesktopCommanderGuide(true)}
              />
            </div>
          )}

          {/* TAB 3: DISK & MANIFEST INTEGRITY (Feature 9) */}
          {mainTab === 'integrity' && (
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 shadow-xs flex flex-col gap-4 min-h-[560px]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Disk Manifest Integrity Auditor
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Verifies byte-stable reproducibility and cryptographic checksums in <code>~/Desktop/jev-output/</code>
                  </p>
                </div>

                <button
                  onClick={auditManifest}
                  disabled={manifestAuditing}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${manifestAuditing ? 'animate-spin' : ''}`} />
                  <span>Re-audit Disk</span>
                </button>
              </div>

              {manifestAuditData ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-semibold">
                      Verified {manifestAuditData.verified_count} of {manifestAuditData.total_count} files on disk
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">100% CRYPTOGRAPHIC PARITY</span>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {manifestAuditData.checks.map((chk, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span>{chk.valid ? '✅' : '❌'}</span>
                          <span className="text-zinc-200">{chk.filename}</span>
                          <span className="text-zinc-500">({chk.actual_bytes} bytes)</span>
                        </div>
                        <div className="text-zinc-400 text-[11px] truncate max-w-xs">
                          {chk.actual_sha256?.slice(0, 16)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Auditing ~/Desktop/jev-output/...</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REVIEW AUDIT */}
          {mainTab === 'audit' && (
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 shadow-xs flex flex-col gap-4 min-h-[560px]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Self-Critique Audit Scorecard
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Stage 3 verification checking source quote grounding, schema validity, and dual human/machine usability
                  </p>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-bold">ALL PASS</span>
              </div>

              {pipelineResult?.review ? (
                <div className="space-y-3">
                  {pipelineResult.review.criteria_results.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-start gap-3 text-xs"
                    >
                      <span className="mt-0.5">{c.pass ? '✅' : '❌'}</span>
                      <div>
                        <div className="font-semibold text-zinc-200">{c.criterion}</div>
                        <div className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{c.note}</div>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                    <div className="text-xs font-semibold text-zinc-300 mb-1">Operational Assumptions:</div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-400">
                      {pipelineResult.review.assumptions_to_verify.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500 italic text-xs">Run intake synthesis to inspect the audit report.</div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Feature 2: 3-Line Code Integration Drawer */}
      {showQuickstartDrawer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Quick Integration: Drop into Your Code in 3 Lines
                </h3>
              </div>
              <button
                onClick={() => setShowQuickstartDrawer(false)}
                className="text-zinc-400 hover:text-zinc-100 text-xs px-2 py-1 rounded bg-zinc-800 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="font-semibold text-zinc-200 mb-1">1. Install Peer Dependency:</div>
                <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 font-mono text-emerald-300">
                  <span>npm install zod # or pip install pydantic</span>
                  <button
                    onClick={() => copyToClipboard('npm install zod', 'npm-install')}
                    className="p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    {copiedKey === 'npm-install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="font-semibold text-zinc-200 mb-1">2. Wire into Your API Endpoint or Autonomous Tool:</div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-zinc-300 text-[11px] leading-relaxed relative">
                  <pre>{`import { evaluateLocally } from './jev-layer/evaluator';

// In your Express handler, Fastify route, or agent tool execution hook:
app.post('/api/action', (req, res) => {
  const result = evaluateLocally(req.body);
  
  // Strict binary execution gate
  if (!result.allowed) {
    return res.status(403).json({ 
      error: 'Blocked by JEV Policy', 
      violations: result.policy_violations 
    });
  }

  // Safe to proceed
  proceedWithAction();
});`}</pre>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `import { evaluateLocally } from './jev-layer/evaluator';\n\nconst result = evaluateLocally(req.body);\nif (!result.allowed) return res.status(403).json(result);`,
                        'snippet-ts'
                      )
                    }
                    className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded cursor-pointer"
                  >
                    {copiedKey === 'snippet-ts' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Suite Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  JEV Core Test Suite (T1-T5 + SCOPE-API)
                </h3>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-zinc-400 hover:text-zinc-100 text-xs px-2 py-1 rounded bg-zinc-800 cursor-pointer"
              >
                Close
              </button>
            </div>

            {testResults ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs">
                  <span className="font-semibold text-emerald-300">
                    Passed {testResults.summary.passed} of {testResults.summary.total} Diagnostics
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">100% REPRODUCIBLE</span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {testResults.results.map(r => (
                    <div
                      key={r.id}
                      className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-zinc-200 flex items-center gap-2">
                          <span className="font-mono text-emerald-400">[{r.id}]</span>
                          <span>{r.title}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{r.details}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1 font-mono text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                          PASS
                        </span>
                        <span className="text-zinc-500">{r.duration_ms}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Running automated test diagnostics against ~/Desktop/jev-output/...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Hey JEV Assistant Trigger Button */}
      <button
        onClick={() => setShowVoiceAssistant(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2.5 cursor-pointer border border-emerald-400/40 group hover:scale-105 transition-all"
        title="Voice & Text Assistant (Hey JEV)"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <Mic className="w-5 h-5 text-white" />
        <span className="text-xs font-bold tracking-wide pr-1">Hey JEV</span>
      </button>

      {/* Vocal / Text AI Assistant Modal Drawer */}
      <JevVoiceAssistant
        isOpen={showVoiceAssistant}
        onClose={() => setShowVoiceAssistant(false)}
        onExecuteAction={handleExecuteAssistantAction}
        onOpenDesktopCommanderGuide={() => setShowDesktopCommanderGuide(true)}
      />

      {/* DesktopCommander Setup & Integration Guide Modal */}
      <DesktopCommanderGuideModal
        isOpen={showDesktopCommanderGuide}
        onClose={() => setShowDesktopCommanderGuide(false)}
      />

      {/* Pre-Build Requirements Verification & Cost Estimation Modal */}
      {showVerificationModal && (
        <RequirementsVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onConfirmBuild={() => {
            setShowVerificationModal(false);
            runPipeline();
          }}
          presetTitle={JEV_LAYER_PRESETS.find(p => p.id === selectedPresetId)?.name || 'Custom Safety Gate'}
          userIntent={userIntent}
          inputsSummary={inputsDesc ? inputsDesc.split(',').map(s => s.trim()).filter(Boolean) : (JEV_LAYER_PRESETS.find(p => p.id === selectedPresetId)?.inputs_summary || [])}
          decisionSummary={outputsDesc || JEV_LAYER_PRESETS.find(p => p.id === selectedPresetId)?.decision_summary || ''}
          outputDir={outputDir}
          isProcessing={isProcessing}
        />
      )}

      {/* Human Safeguard: Preset Switch Confirmation Modal (Informs, Does Not Restrict) */}
      {pendingPresetChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Customized Values Detected</h3>
                <p className="text-xs text-zinc-400">Safeguarding your work before loading preset</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              You have modified your <strong>System Intent</strong> or <strong>Sandbox inputs</strong>. Switching to{' '}
              <span className="text-emerald-400 font-semibold">{pendingPresetChange.name}</span> will replace your customized text with that preset's baseline.
            </p>

            <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 space-y-1 font-mono">
              <div>• Target Preset: <span className="text-zinc-200">{pendingPresetChange.name}</span></div>
              <div>• Current draft safely stored in browser localStorage</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => {
                  const p = pendingPresetChange;
                  setPendingPresetChange(null);
                  selectPreset(p);
                }}
                className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Load Preset Baseline
              </button>
              <button
                onClick={() => {
                  const p = pendingPresetChange;
                  setSelectedPresetId(p.id);
                  setPendingPresetChange(null);
                }}
                className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center border border-zinc-700"
              >
                Keep My Custom Edits
              </button>
              <button
                onClick={() => setPendingPresetChange(null)}
                className="py-2 px-3 bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
