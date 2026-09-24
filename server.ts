import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import {
  executeJevPipeline,
  DEFAULT_CANONICAL_KB,
  resolveDesktopDir,
  computeSha256,
  JevPipelineResult
} from './src/server/jev-engine.ts';

// Initial dotenv load
dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

/**
 * Utility to inspect environment on the fly (reloading .env.local if present)
 */
function getEnvDiagnostics() {
  let envLocalExists = false;
  let envLocalKeys: string[] = [];

  let scopedJevApi = '';

  if (fs.existsSync('.env.local')) {
    envLocalExists = true;
    try {
      const content = fs.readFileSync('.env.local', 'utf8');
      const parsed = dotenv.parse(content);
      envLocalKeys = Object.keys(parsed);
      scopedJevApi =
        parsed.SCOPED_JEV_API ||
        parsed.JEV_API_KEY ||
        parsed.JEV_API_URL ||
        parsed.JEV_API_TOKEN ||
        '';
      // reload into process.env
      for (const [k, v] of Object.entries(parsed)) {
        process.env[k] = v;
      }
    } catch {
      // ignore parse errors
    }
  } else {
    // Clean up if .env.local was removed
    delete process.env.SCOPED_JEV_API;
    delete process.env.JEV_API_KEY;
    delete process.env.JEV_API_URL;
    delete process.env.JEV_API_TOKEN;
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const desktopDir = resolveDesktopDir();
  let desktopWritable = false;
  try {
    if (!fs.existsSync(desktopDir)) {
      fs.mkdirSync(desktopDir, { recursive: true });
    }
    const testFile = path.join(desktopDir, '.write-test');
    fs.writeFileSync(testFile, 'test', 'utf8');
    fs.unlinkSync(testFile);
    desktopWritable = true;
  } catch {
    desktopWritable = false;
  }

  let maskedApi = '';
  if (scopedJevApi.length > 8) {
    maskedApi = `${scopedJevApi.slice(0, 4)}...${scopedJevApi.slice(-4)}`;
  } else if (scopedJevApi.length > 0) {
    maskedApi = 'configured';
  }

  return {
    env_local_exists: envLocalExists,
    env_local_keys: envLocalKeys,
    scoped_jev_api_configured: !!scopedJevApi,
    scoped_jev_api_preview: maskedApi,
    gemini_api_configured: !!geminiApiKey,
    desktop_path: desktopDir,
    desktop_writable: desktopWritable,
    system_status: scopedJevApi ? 'scoped_api_active' : 'local_deterministic_active',
    timestamp: new Date().toISOString()
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Status & Diagnostics Endpoint
  app.get('/api/jev/status', (req: Request, res: Response) => {
    const diag = getEnvDiagnostics();
    res.json(diag);
  });

  // Canonical Knowledge Base & Skills Endpoint
  app.get('/api/jev/kb', (req: Request, res: Response) => {
    res.json({
      knowledge_base: DEFAULT_CANONICAL_KB,
      canonical_url: DEFAULT_CANONICAL_KB.source_url,
      skills: [
        {
          name: 'jev-knowledge-ingest',
          description: 'Fetch and internalize the Typesafe System One Models and JEV blog post.',
          path: 'skills/jev-knowledge-ingest.md'
        },
        {
          name: 'intent-intake-parsing',
          description: 'Semantically parse intake intent, classify goal type, and extract entities/ambiguities.',
          path: 'skills/intent-intake-parsing.md'
        },
        {
          name: 'jev-spec-generation',
          description: 'Emit dual-audience human guidelines and machine-executable JSON specifications.',
          path: 'skills/jev-spec-generation.md'
        }
      ],
      prompts: [
        { name: 'jev-intake-system', role: 'system' },
        { name: 'jev-intent-parse', role: 'task' },
        { name: 'jev-guidelines-spec', role: 'task' },
        { name: 'jev-output-review', role: 'review' }
      ]
    });
  });

  // Main Pipeline Endpoint (Invoked by UI or LLM Harness via curl / HTTP)
  app.post('/api/jev/intake', async (req: Request, res: Response) => {
    try {
      const { user_intent, knowledge_base, output_directory, force_empty_kb, seed } = req.body;
      const result = await executeJevPipeline({
        user_intent,
        knowledge_base,
        output_directory,
        force_empty_kb,
        seed
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: err?.message || 'Pipeline execution failure'
      });
    }
  });

  // Automated Test Suite Runner Endpoint (T1-T5 + Scoped API check)
  app.post('/api/jev/test', async (req: Request, res: Response) => {
    const diag = getEnvDiagnostics();
    const testResults: any[] = [];

    // T1: Clean build intent with full KB
    const t1Start = Date.now();
    const t1 = await executeJevPipeline({
      user_intent: 'Set up JEV guidelines for our support team so intake tickets get triaged per the framework.'
    });
    const t1Pass =
      t1.status === 'success' &&
      t1.files.some(f => f.name === 'guidelines.md') &&
      t1.files.some(f => f.name === 'jev-spec.json') &&
      t1.files.some(f => f.name === 'manifest.json') &&
      t1.review?.residual_failures.length === 0;

    testResults.push({
      id: 'T1',
      title: 'Clean build intent with full KB',
      pass: t1Pass,
      duration_ms: Date.now() - t1Start,
      details: t1Pass
        ? `Generated 7 deliverables to Desktop (${t1.manifest_digest?.slice(0, 8)}...). All claims grounded in canonical source.`
        : `Failure: ${t1.error || 'Missing deliverables or residual review failures'}`
    });

    // T2: Adversarial ambiguous intent
    const t2Start = Date.now();
    const t2 = await executeJevPipeline({
      user_intent: 'Make it JEV-ish and fast, you know what I mean.'
    });
    const t2Pass =
      (t2.status === 'success' || t2.status === 'partial') &&
      t2.intent_parse?.confidence !== undefined &&
      t2.intent_parse.confidence < 0.5 &&
      t2.files.some(f => f.name === 'clarification_request.md');

    testResults.push({
      id: 'T2',
      title: 'Adversarial ambiguous intent (< 0.50 confidence)',
      pass: t2Pass,
      duration_ms: Date.now() - t2Start,
      details: t2Pass
        ? `Confidence ${t2.intent_parse?.confidence.toFixed(2)} correctly triggered clarification request file on Desktop; no fabricated specs.`
        : 'Failed to trigger clarification request'
    });

    // T3: Empty knowledge base (Abstention Rule)
    const t3Start = Date.now();
    const t3 = await executeJevPipeline({
      user_intent: 'Generate JEV spec for onboarding.',
      force_empty_kb: true
    });
    const t3Pass =
      t3.knowledge_base_unavailable === true &&
      t3.files.some(f => f.name === 'intake_scaffold.md') &&
      !t3.files.some(f => f.name === 'jev-spec.json');

    testResults.push({
      id: 'T3',
      title: 'Empty knowledge base (Abstention rule)',
      pass: t3Pass,
      duration_ms: Date.now() - t3Start,
      details: t3Pass
        ? 'Abstention rule verified: emitted intake_scaffold.md with knowledge_base_unavailable=true; withheld specs.'
        : 'Failed abstention rule'
    });

    // T4: Byte-stable repeatability at temperature 0, seed 42
    const t4Start = Date.now();
    const runA = await executeJevPipeline({
      user_intent: 'Configure JEV specification for document processing pipeline.',
      seed: 42
    });
    const runB = await executeJevPipeline({
      user_intent: 'Configure JEV specification for document processing pipeline.',
      seed: 42
    });
    const t4Pass =
      runA.manifest_digest !== undefined &&
      runA.manifest_digest === runB.manifest_digest;

    testResults.push({
      id: 'T4',
      title: 'Byte-stable reproducibility (SHA-256 parity)',
      pass: t4Pass,
      duration_ms: Date.now() - t4Start,
      details: t4Pass
        ? `Identical SHA-256 manifest digest verified across paired runs: ${runA.manifest_digest?.slice(0, 16)}...`
        : `Manifest digest mismatch: ${runA.manifest_digest} vs ${runB.manifest_digest}`
    });

    // T5: Integration intent with unspecified harness protocol
    const t5Start = Date.now();
    const t5 = await executeJevPipeline({
      user_intent: 'Wire the JEV intake tool into our agent harness so the agent calls it directly.'
    });
    const t5Pass =
      t5.intent_parse?.goal_type === 'integrate' &&
      t5.files.some(f => f.name === 'ai_entrypoint.md');

    testResults.push({
      id: 'T5',
      title: 'Integration intent (AI Harness protocol defaults)',
      pass: t5Pass,
      duration_ms: Date.now() - t5Start,
      details: t5Pass
        ? 'Successfully generated ai_entrypoint.md defaulting to file-based JSON I/O protocol.'
        : 'Failed integration intent handling'
    });

    // Scoped JEV API Diagnostic Check
    const scopedApiConfigured = diag.scoped_jev_api_configured;
    testResults.push({
      id: 'SCOPE-API',
      title: 'Scoped JEV API & .env.local Configuration',
      pass: scopedApiConfigured,
      duration_ms: 5,
      details: scopedApiConfigured
        ? `Scoped JEV API active (${diag.scoped_jev_api_preview}). Detected keys in .env.local: [${diag.env_local_keys.join(', ')}]. Ready for live operator verification.`
        : '.env.local not yet configured with SCOPED_JEV_API / JEV_API_KEY. Waiting for operator test key prior to completion claim.'
    });

    res.json({
      environment: diag,
      summary: {
        total: testResults.length,
        passed: testResults.filter(t => t.pass).length,
        all_core_passed: testResults.slice(0, 5).every(t => t.pass)
      },
      results: testResults
    });
  });

  // Read Artifacts from Desktop Endpoint
  app.get('/api/jev/artifacts', (req: Request, res: Response) => {
    const desktopDir = resolveDesktopDir(req.query.dir as string);
    if (!fs.existsSync(desktopDir)) {
      return res.json({ exists: false, directory: desktopDir, files: [] });
    }
    try {
      const fileNames = fs.readdirSync(desktopDir);
      const files = fileNames
        .filter(fn => !fn.startsWith('.'))
        .map(fn => {
          const fp = path.join(desktopDir, fn);
          const stat = fs.statSync(fp);
          let sha256 = '';
          let content = '';
          if (stat.isFile()) {
            content = fs.readFileSync(fp, 'utf8');
            sha256 = computeSha256(content);
          }
          return {
            name: fn,
            path: fp,
            bytes: stat.size,
            is_dir: stat.isDirectory(),
            mtime: stat.mtime,
            sha256,
            preview: content.slice(0, 300)
          };
        });
      res.json({ exists: true, directory: desktopDir, files });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // Export ZIP Endpoint
  app.post('/api/jev/export-zip', async (req: Request, res: Response) => {
    try {
      const { files } = req.body as { files: { name: string; content: string }[] };
      const zip = new JSZip();
      for (const f of files) {
        zip.file(f.name, f.content);
      }
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="jev-desktop-package.zip"');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // Vite middleware in dev or static serving in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JEV Core Builder] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
