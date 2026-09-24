---
name: jev-knowledge-ingest
description: Fetch and internalize the Typesafe "System One Models and JEV" blog post (https://typesafe.ai/blog/introducing-system-one-models-and-je), extracting the JEV model, terminology, and intended usage into a structured knowledge base stored on the user's Desktop. Use this skill when a task requires grounding in JEV concepts, or as the first step before intent parsing and JEV spec generation.
---

# JEV Knowledge Ingest

## Goal

Produce a structured, self-contained knowledge base of the JEV framework (from the Typesafe "System One Models and JEV" post) so downstream skills (intent parsing, spec generation) can rely on a single canonical `jev-knowledge-base.json` plus a human-readable summary. All outputs go to the user's Desktop — never the clipboard.

## Canonical Source

Primary URL (treat as canonical):
- https://typesafe.ai/blog/introducing-system-one-models-and-je

If this URL or its path 404s, try plausible variants (e.g. `/blog/introducing-system-one-models-and-jev`, site search for "JEV", "System One models") and record which URL actually supplied the content. Do not invent JEV doctrine: anything not verifiable from the fetched source must be marked `"source": "inferred"` in the knowledge base.

## Procedure

### 1. Fetch the source
```bash
curl -sL "https://typesafe.ai/blog/introducing-system-one-models-and-je" -o /tmp/jev-source.html
```

### 2. Extract and structure the content
Extract:
- **Model**: what JEV is, its relationship to "System One" models, and the problem it solves.
- **Terminology**: every defined term, with the post's own definition quoted or tightly paraphrased.
- **Intended usage**: how the creators say JEV should be used, including workflow steps, roles, and any anti-patterns or misuse warnings.
- **Constraints**: explicit do/don't rules that downstream specs must honor.

### 3. Write the knowledge base to Desktop
```bash
DESKTOP="$HOME/Desktop"; mkdir -p "$DESKTOP/jev-knowledge-base"
```
Write `jev-knowledge-base.json` and `jev-knowledge-base.md`.

### 4. Validate fidelity
- Every term in `intended_usage` or `constraints` appears in `terminology`.
- No `hard` constraint was softened or dropped.
- Nothing was written to the clipboard.
