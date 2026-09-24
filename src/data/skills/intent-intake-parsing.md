---
name: intent-intake-parsing
description: Semantically parse a user's request at intake, classify its intent, and map it to JEV (Justified-Evidence-Verification, per the Typesafe System One models framework) guidelines and spec constraints. Use when a user states a goal or request and it must be turned into a structured intent record that downstream JEV spec generation can consume.
---

# Intent Intake Parsing (JEV-aligned)

## Goal

Convert a free-form user request into a structured **Intent Record** that:
1. Captures what the user actually means (not just what they literally typed),
2. Maps cleanly onto JEV concepts so generated guidelines/specs stay faithful to the framework,
3. Is machine-readable (JSON) so an LLM harness can consume it without human mediation.

## Procedure

### Step 1 — Load the JEV knowledge base
Read canonical knowledge base. Never invent JEV terminology not present in the KB.

### Step 2 — Parse the raw request
Extract:
- **Goal**: what the user ultimately wants to exist or happen.
- **Constraints**: explicit limits (time, tools, output format, audience).
- **Ambiguities**: terms with multiple plausible readings.
- **Vocabulary signals**: phrases that echo or contradict JEV terms.

### Step 3 — Classify intent against JEV categories
Use schema:
```json
{
  "intent_id": "intent-001",
  "goal_type": "build | configure | integrate | analyze | other",
  "entities": ["..."],
  "ambiguities": ["..."],
  "required_artifacts": ["..."],
  "confidence": 0.95
}
```

### Step 4 — Emit dual-audience output
1. Machine version: `intent_parse.json`
2. Human version: `intent-summary.md`
