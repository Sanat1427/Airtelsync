# Udyam One — Master Implementation Plan
## AI-Powered Digital Acquisition & Onboarding Platform for Indian MSMEs (YTL Hackathon 2026 | Track A)

---

## 1. Executive Summary & Architectural Philosophy

**Udyam One** replaces the fragmented, visit-heavy Indian MSME telecom and digital services acquisition journey (which historically averaged **7.36% conversion**, **17.62 days to activation**, **3.0 follow-up calls**, and **₹15,053 blended CAC** across 5,000 Q2 2026 leads) with a unified, self-serve + human-assisted enterprise platform.

### Core Governing Principle
> **AI understands the customer. Deterministic business logic validates the decision. Automation executes the workflow. Humans handle exceptions.**

---

## 2. Phased Implementation Sequence

### Phase 1: Repository Inspection, Dataset Analysis & Architecture
- Inspect `product_catalogue.csv` (25 products `P01`–`P25`), `smb_leads.csv` (5,000 leads `L00001`–`L05000`), `mock_gstin_registry.csv` (3,534 GSTIN records), `mock_udyam_registry.csv` (2,723 Udyam records), and `kyc_documents/` (47 specimen images across applicants `K01`–`K12`).
- Produce Data Dictionary (`docs/DATA_DICTIONARY.md`), Requirement Traceability Matrix (`docs/REQUIREMENT_TRACEABILITY.md`), and System Architecture (`docs/ARCHITECTURE.md`).

### Phase 2: Foundation, Database Models & Dataset Import
- Set up TypeScript monorepo (`backend/` Express + Mongoose + TypeScript, `frontend/` React 18 + Vite + Tailwind CSS + Recharts + Lucide).
- Create all 22 Mongoose models with strict schemas and unique indexes (`users`, `businesses`, `products`, `leads`, `gstRegistrations`, `udyamRegistrations`, `conversations`, `assessments`, `recommendations`, `quotes`, `kycApplications`, `kycDocuments`, `kycConsents`, `orders`, `orderStatusHistory`, `installations`, `notifications`, `partners`, `supportTickets`, `referrals`, `auditLogs`, `aiEvaluations`).
- Implement automatic MongoDB 8.3 connection and idempotent dataset seeding (`src/scripts/seed.ts`) with validation and error reporting.
- Implement JWT Authentication & Role-Based Access Control (`Customer`, `Sales Executive`, `Channel Partner`, `Admin`, `KYC Reviewer`) plus demo role-switching that authenticates real role tokens against backend middleware.

### Phase 3: Deterministic Core Business Logic Engines
- **Catalogue & Eligibility Engine**: Enforces `available_city_tiers`, `min_employees`, `min_sites`, `requires_gstin` (must be `Active` in registry when GSTIN is verified or declared), and pipe-separated companion product dependencies (`requires_one_of`, e.g., `P09`, `P10`, `P11`, `P12`, `P21`, `P22`, `P23`).
- **Bundle Recommendation & Explainability Engine**: Generates up to 3 tiered bundles (`Essential`, `Recommended`, `Advanced`) using a documented 100-point deterministic match-scoring formula (Requirement Coverage 40%, Budget Affordability 25%, Segment Suitability 20%, Operational & Dependency Compatibility 15%).
- **Pricing & Quotation Engine**: Handles `price_min_inr_per_month` / `price_max_inr_per_month` (contract-tier and standard catalogue unit pricing), `one_time_setup_inr`, unit quantities (`per site`, `per line`, `per IP`, `per channel`, `per number`, `per pack`, `per account`, `per user`, `per counter`, `per device`, `per camera`, `per vehicle`), and stores immutable price snapshots on generated/accepted quotes.

### Phase 4: Customer Experience — Discovery & Intelligence
- **Business Profile & Multi-Location Setup**: Captures segment, business type, employee count, site count, city & tier, GSTIN, Udyam number, current internet/spend, and preferred language.
- **Digital Readiness Assessment (P1 Differentiator)**: 11-point interactive diagnostic producing a deterministic 0–100 score across 5 categories (`Connectivity`, `Communication`, `Productivity`, `Security`, `Business Continuity`) with gap analysis and catalogue-validated product recommendations.
- **AI Business Advisor (Bilingual English & Hindi + Voice)**: Context-aware conversational consultant with adaptive questioning by vertical (Retail, Clinic, Multi-Site, Manufacturing), structured JSON requirement extraction, prompt-injection guardrails, and deterministic fallback when `GEMINI_API_KEY` is omitted.
- **Bundle Comparison & ROI/Savings Calculator (P1 Differentiator)**: Interactive 3-tier bundle configurator with add-on dependency checks and transparent current-vs-proposed expenditure comparison.

### Phase 5: Commerce & Network Feasibility
- **Network Feasibility Checker (P1 Differentiator)**: Evaluates PIN code, city, and address to return `AVAILABLE`, `ALTERNATIVE_AVAILABLE` (e.g., recommending `P04 Biz 5G AirFiber 100` where fibre is unavailable), `FIELD_SURVEY_REQUIRED`, or `NOT_AVAILABLE` (blocking final connectivity checkout and creating a field-operations handoff lead).
- **Quote & Checkout**: Immutable quotation snapshots, status transitions (`DRAFT`, `GENERATED`, `ACCEPTED`, `REJECTED`, `EXPIRED`), and dependency re-validation prior to acceptance.

### Phase 6: Smart KYC, Registry Verification & Cross-Document Validation
- **Explicit Consent Management**: Captures policy version, purpose limitation, retention terms, and timestamp prior to upload.
- **OCR / Vision Document Extraction**: Supports uploaded images and seeded specimen sets (`K01`–`K12`), returning field-level confidence scores.
- **Mock Registry Verification**:
  - **GSTIN Validator**: Validates 15-character structure accepting `X` as the 4th PAN character (`^[0-9]{2}[A-Z]{3}[ABCFGHLJPTFX][A-Z][0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`) + Modulo-36 checksum + lookup against 3,534 records in `mock_gstin_registry.csv` (`ACTIVE`, `CANCELLED`, `Suspended` -> `SUSPENDED`, `NOT_FOUND`, `INVALID_FORMAT`).
  - **Udyam Validator**: Validates `^UDYAM-[A-Z]{2}-(00|[0-9]{2})-[0-9]{7}$` accepting district code `00` + lookup against 2,723 records in `mock_udyam_registry.csv`.
- **Cross-Document Validation Engine**: Checks name consistency, address consistency, signatory match, GSTIN active status, missing Udyam certificate (e.g. `K05`), blurry/low-confidence extraction, and the **90-day address proof freshness rule** relative to dataset reference date **`2026-07-15`** (cutoff `2026-04-16`). Routes uncertain or mismatched cases to `MANUAL_REVIEW` or `NEEDS_CORRECTION` — AI never auto-approves uncertain KYC.

### Phase 7: Event-Driven Order Lifecycle, Installation Tracker & Human Handoff
- **Event-Driven Order State Machine**: Enforces valid transitions (`QUOTE_ACCEPTED` -> `KYC_PENDING` -> `KYC_VERIFIED` -> `ORDER_CONFIRMED` -> `INSTALLATION_SCHEDULED` -> `INSTALLATION_IN_PROGRESS` -> `ACTIVATED`, plus exception states `ON_HOLD`, `NEEDS_CUSTOMER_ACTION`, `CANCELLED`, `FAILED`), records append-only `orderStatusHistory`, and triggers in-app notifications.
- **Intelligent Human Handoff**: Structured escalation summary with lead assignment to Sales Executives and Channel Partners.

### Phase 8: Operations, Historical Analytics, Lead Propensity, Post-Activation & AI Governance
- **Historical vs. Live Analytics Dashboard**: Analyses all 5,000 records from `smb_leads.csv` (funnel conversion, 20 drop reasons, city/segment/language splits, CAC, churn, NPS) clearly separated from live prototype metrics.
- **Lead Propensity Scoring Engine**: Time-aware logistic propensity scorer (trained on April–May 2026 leads, evaluated on June 2026 leads using strictly pre-activation features to prevent data leakage).
- **Post-Activation Service Assistant**: Active service management, upgrade requests, and traceable support tickets.
- **AI Quality & Evaluation Dashboard**: Versioned 16-case benchmark suite testing Hindi/English extraction, prompt-injection resistance, catalogue hallucination prevention, eligibility enforcement, and OCR accuracy.

### Phase 9: 8 Repeatable Demo Scenarios & Automated Verification
- Implement one-click **Guided Demo Mode** with all 8 required scenarios (`Scenario 1` through `Scenario 8`) and run comprehensive automated acceptance tests covering all PRD criteria.
