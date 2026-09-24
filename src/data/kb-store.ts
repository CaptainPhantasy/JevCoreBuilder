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

export interface JevLayerPreset {
  id: string;
  name: string;
  category: 'productivity' | 'security' | 'devops' | 'finance' | 'data' | 'ops';
  badge: string;
  tagline: string;
  description: string;
  intent: string;
  inputs_summary: string[];
  decision_summary: string;
  sample_state: Record<string, any>;
  jev_lab_url?: string;
}

export const JEV_LAB_BASE_URL = 'https://jev-lab.com/en/';

export const JEV_LAYER_PRESETS: JevLayerPreset[] = [
  {
    id: 'email_cleaner_tax_sorter',
    name: 'Gmail Cleaner & Tax Expense Sorter',
    category: 'productivity',
    badge: 'Email / Productivity',
    tagline: 'Cleans inbox, routes tech receipts to taxes, sorts by contact, trashes junk',
    description: 'Autonomous email triager that identifies tech purchases for tax deduction folders, filters non-spam into Friends/Family/Work, flags re-buy recommendations from receipts, and gates non-reversible trash deletion.',
    intent: 'Add a JEV safety gate to clean out our Gmail inbox: route all tech purchases into a 2026 tax expense folder, classify non-spam into Friends, Family, or Work, generate smart re-buy recommendations from past purchase receipts, and safely purge confirmed junk mail into the trash.',
    inputs_summary: ['sender_email (str)', 'email_subject (str)', 'body_snippet (str)', 'has_receipt_attachment (bool)', 'purchase_amount ($)', 'vendor_domain (str)', 'is_contact_in_address_book (bool)'],
    decision_summary: 'TAX_EXPENSE_FOLDER | FRIENDS_FAMILY | WORK_PRIORITY | REPURCHASE_RECOMMENDATION | SAFE_TRASH',
    sample_state: {
      sender_email: 'receipts@apple.com',
      email_subject: 'Your Apple Store receipt: MacBook Pro 16-inch M4 & USB-C Adapters',
      body_snippet: 'Order W89240182: 1x 16-inch MacBook Pro ($2,499.00), 2x Apple Thunderbolt 4 cables ($138.00). Total: $2,637.00. Billed to Business Card ending in 4012.',
      has_receipt_attachment: true,
      purchase_amount: 2637.0,
      vendor_domain: 'apple.com',
      is_contact_in_address_book: true
    },
    jev_lab_url: 'https://jev-lab.com/en/email-triage'
  },
  {
    id: 'refund_safety_gate',
    name: 'Financial / Refund Safety Gate',
    category: 'finance',
    badge: 'Finance / Agent',
    tagline: 'Autonomous customer refund decision gate',
    description: 'Enforces strict $200 ceiling, micro-refund fast path, 90d expiration, and 3-condition VIP exemption.',
    intent: 'Add a JEV safety gate to our autonomous customer support refund agent that prevents refunds over $200 unless 3 specific conditions are met (VIP tier, order under 30 days, zero disputes).',
    inputs_summary: ['order_id (str)', 'order_amount ($)', 'user_tier (free/standard/vip)', 'order_age_days (int)', 'active_dispute_count (int)'],
    decision_summary: 'APPROVED | REQUIRES_SUPERVISOR | REJECTED',
    sample_state: {
      order_id: 'ORD-98421',
      order_amount: 245.5,
      user_tier: 'vip',
      order_age_days: 14,
      active_dispute_count: 0,
      refund_reason: 'Item defective on arrival'
    },
    jev_lab_url: 'https://jev-lab.com/en/refund-gate'
  },
  {
    id: 'code_pr_screener',
    name: 'Code PR Risk Screener',
    category: 'devops',
    badge: 'DevOps / CI',
    tagline: 'PR merge screener for auth & test coverage',
    description: 'Evaluates GitHub/GitLab PRs for cryptographic modifications, database migrations, and coverage drop.',
    intent: 'Add a JEV code PR review layer that screens incoming pull requests for security risks, blocks merges with test coverage regression greater than 1%, and auto-approves low-risk PRs by senior engineers.',
    inputs_summary: ['pr_number (int)', 'lines_changed (int)', 'has_database_migration (bool)', 'modifies_auth_or_crypto (bool)', 'test_coverage_delta (%)'],
    decision_summary: 'AUTO_APPROVE | REQUIRE_SECURITY_AUDIT | BLOCK_PR',
    sample_state: {
      pr_number: 402,
      lines_changed: 128,
      has_database_migration: false,
      modifies_auth_or_crypto: true,
      test_coverage_delta: -0.4,
      author_seniority: 'mid'
    },
    jev_lab_url: 'https://jev-lab.com/en/pr-review'
  },
  {
    id: 'agent_tool_guardrail',
    name: 'Autonomous Agent Tool Guardrail',
    category: 'security',
    badge: 'Safety / LLM',
    tagline: 'Real-time interceptor for bash/SQL commands',
    description: 'Intercepts subagent tool calls before OS/DB execution, aborting destructive patterns and gating payments.',
    intent: 'Add a JEV tool execution guardrail for an autonomous coding agent that prevents destructive commands like rm -rf or DROP TABLE, prompts human-in-the-loop for payments or high impact, and auto-dispatches read-only queries.',
    inputs_summary: ['agent_id (str)', 'tool_name (bash/sql/http/payment)', 'target_resource (str)', 'command_string (str)', 'is_idempotent (bool)'],
    decision_summary: 'ALLOW_EXECUTION | PROMPT_HUMAN_IN_THE_LOOP | KILL_TASK',
    sample_state: {
      agent_id: 'coder-subagent-04',
      tool_name: 'bash',
      target_resource: '/var/data/export.csv',
      command_string: 'cat /var/data/export.csv | grep 2026',
      is_idempotent: true,
      estimated_impact: 'low'
    },
    jev_lab_url: 'https://jev-lab.com/en/agent-guardrail'
  },
  {
    id: 'support_ticket_sla',
    name: 'Support Ticket SLA & Routing',
    category: 'ops',
    badge: 'Operations / CRM',
    tagline: 'Priority queue router evaluating MRR & sentiment',
    description: 'Routes enterprise outages and enraged high-MRR customers to executive escalation, overdue tickets to Tier 2.',
    intent: 'Add a JEV customer support triage layer that routes service outages and enraged enterprise accounts ($5k+ MRR) directly to executive escalation, overdue tickets to Tier 2, and standard inquiries to Tier 1.',
    inputs_summary: ['ticket_id (str)', 'customer_sentiment (tone)', 'contract_mrr ($)', 'issue_category (domain)', 'first_response_overdue (bool)'],
    decision_summary: 'TIER_1 | TIER_2_SENIOR | EXECUTIVE_ESCALATION',
    sample_state: {
      ticket_id: 'TCK-5521',
      customer_sentiment: 'enraged',
      contract_mrr: 7500.0,
      issue_category: 'outage',
      first_response_overdue: true
    },
    jev_lab_url: 'https://jev-lab.com/en/ticket-triage'
  },
  {
    id: 'tax_receipt_classifier',
    name: 'Tax Deductible Tech Receipt Classifier',
    category: 'finance',
    badge: 'Finance / Tax',
    tagline: 'Categorizes business tech expenses for Schedule C',
    description: 'Verifies OCR scanned receipts, validates 1099/Schedule C software/hardware categories, and checks receipt retention thresholds.',
    intent: 'Add a JEV tax receipt classifier that validates technology business expenses over $75, flags non-deductible personal gadgets, and routes approved business hardware/software into tax deduction schedules.',
    inputs_summary: ['receipt_id (str)', 'amount ($)', 'merchant_name (str)', 'is_business_related (bool)', 'has_itemized_breakdown (bool)'],
    decision_summary: 'SCHEDULE_C_DEDUCTIBLE | MIXED_USE_SPLIT | NON_DEDUCTIBLE_PERSONAL',
    sample_state: {
      receipt_id: 'REC-2026-091',
      amount: 499.0,
      merchant_name: 'AWS Cloud Services',
      is_business_related: true,
      has_itemized_breakdown: true
    },
    jev_lab_url: 'https://jev-lab.com/en/expense-classifier'
  },
  {
    id: 'sql_injection_guardrail',
    name: 'SQL Query & Injection Guardrail',
    category: 'security',
    badge: 'Database / Security',
    tagline: 'Intercepts rogue SQL statements and schema modifications',
    description: 'Analyzes dynamically generated SQL queries from AI agents, blocking unrestricted DELETEs, DROP operations, and schema mutations.',
    intent: 'Add a JEV SQL execution guardrail that stops DROP TABLE, TRUNCATE, or unconstrained UPDATE/DELETE statements, allows parameterized SELECTs, and flags table scans.',
    inputs_summary: ['query_string (str)', 'target_table (str)', 'has_where_clause (bool)', 'statement_type (enum)', 'is_read_only (bool)'],
    decision_summary: 'EXECUTE_QUERY | REQUIRE_DBA_APPROVAL | REJECT_HAZARDOUS_SQL',
    sample_state: {
      query_string: 'SELECT user_id, email FROM users WHERE organization_id = ? LIMIT 50',
      target_table: 'users',
      has_where_clause: true,
      statement_type: 'SELECT',
      is_read_only: true
    },
    jev_lab_url: 'https://jev-lab.com/en/sql-guard'
  },
  {
    id: 'content_moderation_gate',
    name: 'Content Moderation & Safety Gate',
    category: 'security',
    badge: 'Safety / Content',
    tagline: 'Intercepts toxic outputs, PII leaks, and jailbreaks',
    description: 'Single-pass inspection of user prompts and AI responses for toxicity, personally identifiable information, and compliance violations.',
    intent: 'Add a JEV content moderation gate that screens AI model responses for social security numbers, credit cards, hate speech, or system prompt leaks before delivery to users.',
    inputs_summary: ['text_content (str)', 'pii_confidence (0-100)', 'toxicity_score (0-100)', 'channel_type (public/private)'],
    decision_summary: 'DELIVER_CLEAN | REDACT_PII | BLOCK_AND_LOG_VIOLATION',
    sample_state: {
      text_content: 'Here is your monthly invoice summary for account #9921.',
      pii_confidence: 2.0,
      toxicity_score: 0.1,
      channel_type: 'private'
    },
    jev_lab_url: 'https://jev-lab.com/en/moderation'
  },
  {
    id: 'devops_deploy_risk',
    name: 'Production Deployment Risk Gate',
    category: 'devops',
    badge: 'CI/CD / Release',
    tagline: 'Prevents high-risk releases on peak traffic windows',
    description: 'Evaluates rollout time windows (e.g., Friday afternoon freeze), canary health scores, and critical dependency vulnerabilities.',
    intent: 'Add a JEV production deployment gate that blocks deployments on Fridays after 2 PM, requires VP approval for deployments with critical CVEs, and auto-approves passing canary builds.',
    inputs_summary: ['deploy_hour_utc (int)', 'day_of_week (str)', 'critical_cve_count (int)', 'canary_error_rate (%)', 'rollout_percentage (int)'],
    decision_summary: 'PROCEED_ROLLOUT | PAUSE_FOR_VERIFICATION | ABORT_RELEASE',
    sample_state: {
      deploy_hour_utc: 14,
      day_of_week: 'Tuesday',
      critical_cve_count: 0,
      canary_error_rate: 0.02,
      rollout_percentage: 10
    },
    jev_lab_url: 'https://jev-lab.com/en/devops-risk'
  },
  {
    id: 'api_rate_limiter_abuse',
    name: 'API Rate Limiter & Abuse Filter',
    category: 'security',
    badge: 'API / Gateway',
    tagline: 'Dynamically throttles scrapers and credential stuffing',
    description: 'Calculates request velocity, ASN risk, and endpoint sensitivity to dynamically enforce rate limits or issue challenge captchas.',
    intent: 'Add a JEV rate limiting gate for our authentication endpoint that passes normal users, triggers Cloudflare challenges for rapid attempts, and bans repeat abusive IPs.',
    inputs_summary: ['ip_address (str)', 'requests_per_minute (int)', 'asn_reputation_score (0-100)', 'endpoint (str)', 'failed_auth_count (int)'],
    decision_summary: 'PASS_THROUGH | ISSUE_CHALLENGE | HARD_BAN',
    sample_state: {
      ip_address: '198.51.100.42',
      requests_per_minute: 14,
      asn_reputation_score: 95.0,
      endpoint: '/api/v1/auth/login',
      failed_auth_count: 0
    },
    jev_lab_url: 'https://jev-lab.com/en/rate-limit'
  },
  {
    id: 'customer_churn_interceptor',
    name: 'Customer Churn & Retention Gate',
    category: 'ops',
    badge: 'Growth / CRM',
    tagline: 'Evaluates cancellation requests to offer tailored retention credits',
    description: 'Inspects account lifetime value, feature utilization drops, and cancellation survey reasons to gate discretionary discount credits.',
    intent: 'Add a JEV customer churn interceptor that auto-approves 50% discount offers for accounts with >$1k LTV, connects at-risk accounts to live managers, and processes standard cancellations.',
    inputs_summary: ['account_ltv ($)', 'active_seats (int)', 'cancellation_reason (str)', 'months_active (int)', 'nps_score (0-10)'],
    decision_summary: 'OFFER_RETENTION_DISCOUNT | ROUTE_TO_EXECUTIVE | PROCESS_CANCELLATION',
    sample_state: {
      account_ltv: 1450.0,
      active_seats: 8,
      cancellation_reason: 'Too expensive for current stage',
      months_active: 14,
      nps_score: 7
    },
    jev_lab_url: 'https://jev-lab.com/en/churn-gate'
  },
  {
    id: 'hipaa_phi_redactor',
    name: 'Healthcare HIPAA PHI Redaction Gate',
    category: 'data',
    badge: 'Healthcare / Compliance',
    tagline: 'Guarantees medical records strip 18 HIPAA Safe Harbor identifiers',
    description: 'Inspects clinical clinical notes and telemedicine transcripts before indexing in public search clusters or external LLM APIs.',
    intent: 'Add a JEV HIPAA compliance gate that verifies clinical notes have all 18 PHI identifiers redacted, blocking any document containing unmasked medical record numbers or dates of birth.',
    inputs_summary: ['document_type (str)', 'detected_phi_tokens (int)', 'has_patient_consent (bool)', 'target_storage (hipaa_compliant/general)'],
    decision_summary: 'PHI_CLEAR | REDACTION_REQUIRED | REJECT_UNENCRYPTED_PHR',
    sample_state: {
      document_type: 'clinical_summary',
      detected_phi_tokens: 0,
      has_patient_consent: true,
      target_storage: 'hipaa_compliant'
    },
    jev_lab_url: 'https://jev-lab.com/en/hipaa-gate'
  },
  {
    id: 'autonomous_shopping_gate',
    name: 'Autonomous E-Commerce Purchasing Gate',
    category: 'finance',
    badge: 'Commerce / Agent',
    tagline: 'Autonomous purchasing assistant budget and vendor whitelist gate',
    description: 'Enforces hard procurement ceilings, checks verified merchant trust ratings, and blocks dynamic price surges.',
    intent: 'Add a JEV purchasing safety gate for an autonomous procurement bot that auto-buys office supplies under $100 from approved merchants, but halts purchases if price exceeds 10% of historical average.',
    inputs_summary: ['item_price ($)', 'historical_avg_price ($)', 'is_whitelisted_merchant (bool)', 'merchant_rating (0-5)', 'total_monthly_spend ($)'],
    decision_summary: 'AUTO_PURCHASE | REQUIRE_BUYER_CONFIRMATION | REJECT_UNAUTHORIZED_VENDOR',
    sample_state: {
      item_price: 64.99,
      historical_avg_price: 62.0,
      is_whitelisted_merchant: true,
      merchant_rating: 4.8,
      total_monthly_spend: 340.0
    },
    jev_lab_url: 'https://jev-lab.com/en/shopping-gate'
  },
  {
    id: 'rbac_privilege_escalation',
    name: 'Break-Glass RBAC Privilege Escalation',
    category: 'security',
    badge: 'IAM / Security',
    tagline: 'Time-bounded root access gate during production incidents',
    description: 'Evaluates PagerDuty incident severity, on-call engineer shifts, and dual-authorization requirements for emergency SSH/AWS root access.',
    intent: 'Add a JEV privilege elevation gate that grants temporary 1-hour root access only during active SEV-1 incidents with two engineer approvals, rejecting all casual elevation requests.',
    inputs_summary: ['engineer_email (str)', 'incident_severity (sev1/sev2/sev3)', 'is_primary_on_call (bool)', 'secondary_approver_email (str)', 'requested_duration_hours (int)'],
    decision_summary: 'GRANT_TIME_BOUNDED_ACCESS | REQUIRE_SECONDARY_SIGN_OFF | DENY_ELEVATION',
    sample_state: {
      engineer_email: 'sarah.dev@company.com',
      incident_severity: 'sev1',
      is_primary_on_call: true,
      secondary_approver_email: 'alex.lead@company.com',
      requested_duration_hours: 1
    },
    jev_lab_url: 'https://jev-lab.com/en/rbac-gate'
  },
  {
    id: 'fraud_login_detector',
    name: 'Anomalous Login & Impossible Travel',
    category: 'security',
    badge: 'Auth / Security',
    tagline: 'Detects impossible travel speed and credential stuffing',
    description: 'Compares geographic coordinates between consecutive logins against calculated flight speeds, triggering step-up MFA for anomalies.',
    intent: 'Add a JEV login verification gate that allows familiar device logins, triggers hardware MFA if login location jumped >500 miles in <1 hour, and locks accounts under brute-force attacks.',
    inputs_summary: ['user_id (str)', 'distance_from_last_login_miles (int)', 'hours_since_last_login (float)', 'is_known_device (bool)', 'failed_attempts_in_window (int)'],
    decision_summary: 'ALLOW_LOGIN | STEP_UP_MFA | LOCK_ACCOUNT_FRAUD',
    sample_state: {
      user_id: 'USR-8821',
      distance_from_last_login_miles: 12,
      hours_since_last_login: 4.5,
      is_known_device: true,
      failed_attempts_in_window: 0
    },
    jev_lab_url: 'https://jev-lab.com/en/fraud-login'
  },
  {
    id: 'contract_sla_predictor',
    name: 'Enterprise Contract SLA Penalty Predictor',
    category: 'ops',
    badge: 'Legal / Operations',
    tagline: 'Predicts uptime SLA breaches and calculates penalty exposure',
    description: 'Tracks monthly cumulative downtime minutes against contractual tiers (99.9% vs 99.99%) to trigger preemptive incident alerts.',
    intent: 'Add a JEV SLA tracking gate that warns teams when monthly downtime reaches 75% of contract threshold and flags credits owed to enterprise accounts before billing cycles.',
    inputs_summary: ['current_monthly_downtime_minutes (float)', 'guaranteed_sla_tier (str)', 'enterprise_contract_value ($)', 'days_remaining_in_month (int)'],
    decision_summary: 'SLA_HEALTHY | PREEMPTIVE_SLA_WARNING | LIQUIDATED_DAMAGES_TRIGGERED',
    sample_state: {
      current_monthly_downtime_minutes: 4.2,
      guaranteed_sla_tier: '99.95%',
      enterprise_contract_value: 45000.0,
      days_remaining_in_month: 12
    },
    jev_lab_url: 'https://jev-lab.com/en/sla-gate'
  },
  {
    id: 'travel_expense_approver',
    name: 'Corporate Travel Policy & Expense Approver',
    category: 'finance',
    badge: 'Finance / HR',
    tagline: 'Checks flight class, per-diem meals, and hotel rate caps',
    description: 'Enforces corporate travel guidelines, blocking luxury car rentals and first-class domestic tickets without VP authorization.',
    intent: 'Add a JEV travel expense gate that auto-approves hotel rates under $250/night and coach flights booked 14 days in advance, while routing out-of-policy bookings to executive finance.',
    inputs_summary: ['traveler_level (str)', 'flight_cabin_class (coach/business/first)', 'hotel_nightly_rate ($)', 'booking_lead_time_days (int)', 'exceeds_per_diem (bool)'],
    decision_summary: 'AUTO_APPROVE_EXPENSE | ROUTE_TO_FINANCE_VP | REJECT_OUT_OF_POLICY',
    sample_state: {
      traveler_level: 'director',
      flight_cabin_class: 'coach',
      hotel_nightly_rate: 210.0,
      booking_lead_time_days: 18,
      exceeds_per_diem: false
    },
    jev_lab_url: 'https://jev-lab.com/en/travel-policy'
  },
  {
    id: 'kyc_sanctions_screener',
    name: 'Fintech KYC & Sanctions List Screener',
    category: 'finance',
    badge: 'Compliance / Fintech',
    tagline: 'Screens OFAC and PEP databases before opening financial accounts',
    description: 'Performs fuzzy-match scoring against global sanctions lists, checking identity document legitimacy and politically exposed person status.',
    intent: 'Add a JEV compliance gate that clears applicants with zero sanctions matches, holds partial name matches for compliance officer review, and immediately denies verified OFAC matches.',
    inputs_summary: ['applicant_name (str)', 'country_code (str)', 'ofac_match_score (0-100)', 'is_pep_flagged (bool)', 'id_document_verified (bool)'],
    decision_summary: 'CLEAR_KYC | HOLD_MANUAL_COMPLIANCE | DENY_SANCTION_MATCH',
    sample_state: {
      applicant_name: 'David K. Miller',
      country_code: 'US',
      ofac_match_score: 0.0,
      is_pep_flagged: false,
      id_document_verified: true
    },
    jev_lab_url: 'https://jev-lab.com/en/kyc-gate'
  },
  {
    id: 'lead_crm_qualifier',
    name: 'Inbound B2B Lead Scoring & Routing',
    category: 'ops',
    badge: 'Sales / CRM',
    tagline: 'Routes enterprise target leads directly to senior account executives',
    description: 'Enriches inbound leads with company headcounts, Alexa traffic rank, and business email domains to bypass SDR qualification queues.',
    intent: 'Add a JEV lead qualification gate that assigns Fortune 500 domains to Enterprise AEs, Mid-Market companies to standard reps, and personal Gmail/Hotmail addresses to self-service nurture.',
    inputs_summary: ['work_email (str)', 'estimated_headcount (int)', 'annual_tech_budget ($)', 'is_free_email_domain (bool)', 'demo_request_intent (str)'],
    decision_summary: 'ENTERPRISE_AE_CALENDAR | MID_MARKET_SALES | SELF_SERVICE_NURTURE',
    sample_state: {
      work_email: 'cto@northwindtraders.com',
      estimated_headcount: 850,
      annual_tech_budget: 120000.0,
      is_free_email_domain: false,
      demo_request_intent: 'Replacing legacy infrastructure'
    },
    jev_lab_url: 'https://jev-lab.com/en/lead-scoring'
  },
  {
    id: 'gdpr_rtbf_deletion_gate',
    name: 'GDPR Right-to-be-Forgotten Deletion Gate',
    category: 'data',
    badge: 'Privacy / Legal',
    tagline: 'Validates statutory retention holds before permanent user data purge',
    description: 'Checks financial record retention mandates (e.g. IRS 7-year audit requirements) and active subscriptions before executing destructive database anonymization.',
    intent: 'Add a JEV GDPR data deletion safety gate that permits full anonymization for churned accounts with no pending transactions, while rejecting deletion of records under active legal hold.',
    inputs_summary: ['user_id (str)', 'active_subscription (bool)', 'has_pending_transactions (bool)', 'legal_hold_flag (bool)', 'account_closure_age_days (int)'],
    decision_summary: 'PERMIT_FULL_PURGE | ANONYMIZE_PII_RETAIN_LEDGER | REJECT_LEGAL_HOLD',
    sample_state: {
      user_id: 'USR-2940',
      active_subscription: false,
      has_pending_transactions: false,
      legal_hold_flag: false,
      account_closure_age_days: 120
    },
    jev_lab_url: 'https://jev-lab.com/en/gdpr-gate'
  }
];
