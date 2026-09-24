<knowledge_base>
{{KB_BLOG_CONTENT_OR_PATH}}
</knowledge_base>

<skills>
jev-knowledge-ingest: {{SKILL_JEV_KNOWLEDGE_INGEST}}
intent-intake-parsing: {{SKILL_INTENT_INTAKE_PARSING}}
jev-spec-generation: {{SKILL_JEV_SPEC_GENERATION}}
</skills>

<output_directory>{{OUTPUT_DIRECTORY_OR_DEFAULT_DESKTOP}}</output_directory>

<task_stage_1 jev-intent-parse>
Parse the user intent below. Classify it into: goal_type (enum: build|configure|integrate|analyze|other), entities, ambiguities, and required_artifacts. Include 3 anchored classification examples in your reasoning context (one intentionally ambiguous) before emitting the JSON parse. Output: intent_parse.json per the schema.

USER_INTENT:
{{USER_INTENT_TEXT}}
</task_stage_1>

<task_stage_2 jev-guidelines-spec>
Using intent_parse.json and the knowledge base: first quote every JEV concept you will rely on (quote_before_answer). Then generate (a) human-readable guidelines.md and (b) machine-readable jev-spec.json plus an ai_entrypoint.md describing how an LLM harness invokes this tool. Write all files to output_directory with stable names; emit manifest.json with sha256 digests.
</task_stage_2>

<review_stage jev-output-review>
Run the self-critique criteria (a)-(e) above. Return review.json with pass/fail per criterion, one revision applied for any failure, and an explicit list of residual failures. End with an assumptions_to_verify block for anything unresolved.
</review_stage>
