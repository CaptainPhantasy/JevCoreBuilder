import canonicalKbJson from './canonical-kb.json';
import bundleJson from './prompts/bundle.json';

export interface KbLayer {
  layer: string;
  name: string;
  description: string;
  quote: string;
  ref: string;
}

export interface PackageSkill {
  name: string;
  path: string;
  purpose: string;
  content?: string;
}

export const CANONICAL_KB = canonicalKbJson;
export const BUNDLE_DATA = bundleJson;

export const JEV_SKILLS: PackageSkill[] = [
  {
    name: 'jev-knowledge-ingest',
    path: 'skills/jev-knowledge-ingest.md',
    purpose: 'Fetch and internalize the Typesafe System One Models and Jev blog post, extracting the Jev model, terminology, and intended usage into a structured knowledge base on Desktop.'
  },
  {
    name: 'intent-intake-parsing',
    path: 'skills/intent-intake-parsing.md',
    purpose: 'Semantically parse a user\'s request at intake, classify intent, and map to JEV guidelines and spec constraints with few-shot calibration.'
  },
  {
    name: 'jev-spec-generation',
    path: 'skills/jev-spec-generation.md',
    purpose: 'Emit JEV-aligned guidelines/specs as dual-audience artifacts (human Markdown guidelines.md + machine JSON jev-spec.json + ai_entrypoint.md) written to ~/Desktop with manifest.json.'
  }
];

export const JEV_PROMPTS = [
  {
    name: 'jev-intake-system',
    role: 'system',
    path: 'prompts/system-prompt.md',
    purpose: 'System prompt establishing the agent as a JEV intake tool: dual human/AI usability, knowledge base grounding, desktop output convention.'
  },
  {
    name: 'jev-intent-parse',
    role: 'task',
    path: 'prompts/user-message-template.md#stage_1',
    purpose: 'Task prompt for semantically parsing user intent at intake into structured intent records mapped to JEV concepts.'
  },
  {
    name: 'jev-guidelines-spec',
    role: 'task',
    path: 'prompts/user-message-template.md#stage_2',
    purpose: 'Task prompt for generating JEV usage guidelines and specs (human + machine versions) from parsed intent.'
  },
  {
    name: 'jev-output-review',
    role: 'review',
    path: 'prompts/user-message-template.md#stage_3',
    purpose: 'Review prompt checking outputs are JEV-faithful, human-legible, and AI-consumable before writing to Desktop.'
  }
];

export const PRESET_INTENTS = [
  {
    id: 'T1',
    label: 'T1: Clean Build Intent (Ticket Triage)',
    text: 'Set up JEV guidelines for our support team so intake tickets get triaged per the framework.',
    description: 'Generates full dual-audience specs, 100% grounded in canonical KB with sha256 manifest.'
  },
  {
    id: 'T2',
    label: 'T2: Adversarial Ambiguous Intent',
    text: 'Make it JEV-ish and fast, you know what I mean.',
    description: 'Tests calibration (<0.5 confidence). Emits clarification request; withholds specs.'
  },
  {
    id: 'T3',
    label: 'T3: Empty Knowledge Base (Abstention Rule)',
    text: 'Generate JEV spec for onboarding.',
    description: 'Simulates missing KB. Sets knowledge_base_unavailable=true and produces only scaffold.',
    forceEmptyKb: true
  },
  {
    id: 'T4',
    label: 'T4: Document Pipeline (Repeatability)',
    text: 'Configure JEV specification for document processing pipeline.',
    description: 'Tests byte-stable sha256 digest parity across repeated executions at seed 42.'
  },
  {
    id: 'T5',
    label: 'T5: Agent Harness Integration',
    text: 'Wire the JEV intake tool into our agent harness so the agent calls it directly.',
    description: 'Generates ai_entrypoint.md defaulting to file-based JSON I/O protocol.'
  }
];
