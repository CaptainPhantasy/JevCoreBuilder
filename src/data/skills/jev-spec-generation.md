---
name: jev-spec-generation
description: Generates JEV-aligned guidelines and specifications from a parsed user intent record, producing dual-audience artifacts (human-readable guideline docs and machine-readable JSON specs) and writing them to a folder on the user's Desktop. Invoke when a parsed JEV intent record exists and deliverable specs are needed, or when asked to "generate JEV specs" or "emit JEV guidelines."
---

# JEV Spec Generation

## Goal

Convert a structured intent record into JEV-faithful guidelines and specifications in two parallel formats:
1. **Human-readable** — clean, user-centric Markdown (`guidelines.md`).
2. **Machine-readable** — strict JSON (`jev-spec.json`) and AI entrypoint (`ai_entrypoint.md`).

Both are written to `~/Desktop/jev-output/` (never the clipboard) with a SHA256 digest `manifest.json`.

## Rules of Translation
- Every guideline must trace back to a specific intent element (`trace` field).
- Every guideline must reference the JEV concept it operationalizes (`jev_concept` field).
- Must adhere to positive framing (what to do, not what to avoid).
- Quote-Before-Answer grounding: extract verbatim quotes from canonical source.
