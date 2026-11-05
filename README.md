# Udyam One — AI-Powered Digital Acquisition & Onboarding Platform for Indian MSMEs
### YTL Hackathon 2026 | Enterprise Track A

**Udyam One** is an enterprise-grade, full-stack B2B digital acquisition, advisory, Smart KYC, and order orchestration platform built for Indian Micro, Small, and Medium Enterprises (MSMEs).

> **Core Product Philosophy**: *AI understands the customer. Deterministic business logic validates the decision. Automation executes the workflow. Humans handle exceptions.*

---

## 1. Key Capabilities & Hackathon Differentiators

1. **Bilingual AI Business Advisor (English + हिंदी + Voice + Simulated WhatsApp)**:
   - Conversational requirement discovery with real-time structured JSON extraction (`employees`, `numSites`, `cityTier`, `painPoints`, `budget`).
   - Built-in Web Speech API Voice STT/TTS, Simulated WhatsApp Business onboarding mirror, prompt-injection guardrails, and zero unsupported-product hallucination.
2. **Deterministic 25-Product Eligibility, Dependency & 3-Tier Bundle Engine**:
   - Evaluates all 25 products (`P01`–`P25`) from `product_catalogue.csv` against `available_city_tiers`, `min_employees`, `min_sites`, `requires_gstin` (must be `Active` in `mock_gstin_registry.csv`), and auto-injects `requires_one_of` companion prerequisites.
   - Generates **Essential**, **Growth (Recommended)**, and **Secure Scale** bundles with a transparent **100-Point Match Score Breakdown** and explicit ineligibility explanations.
3. **Interactive ROI & Savings Calculator + Network Feasibility Engine**:
   - Multi-unit pricing engine (`per_site_month`, `per_seat_month`, `per_camera_month`, `flat_month`) + 18% GST + interactive ROI payback calculator.
   - PIN-based fiber coverage check with automatic fallback to **`P04` Business 5G AirFiber (200 Mbps, 24h install)** where fiber is unavailable.
4. **Smart KYC (`K01`–`K12` Specimen Vault) + Registry Lookup + DPDP-2026-v1.2 Consent**:
   - Enforces explicit customer consent (`DPDP-2026-v1.2`) before any document upload or verification.
   - Validates 15-character GSTINs (accepting `X` as 4th PAN character + Modulo-36 checksum + positional `0`→`O` OCR normalization for `K02`) against `3,534` GSTIN records and `2,723` Udyam records (`00` district code).
   - Evaluates all 47 specimen images (`K01`–`K12`), enforcing the **90-day address proof recency rule against `2026-07-15`** (`K11` flagged at `257 days`), detecting `Cancelled` GSTINs (`K01`), tampered IDs (`K06`), name mismatches (`K07`, `K10`), missing Udyam docs (`K05`), and escalating low-confidence blurred scans (`K04` at `62%`) to `MANUAL_REVIEW`.
5. **Event-Driven Order & Installation Tracker + Post-Activation Suite**:
   - Authoritative 7-stage order state machine (`QUOTE_ACCEPTED` → `KYC_VERIFIED` → `PAYMENT_CONFIRMED` → `PROVISIONING_IN_PROGRESS` → `INSTALLATION_SCHEDULED` → `INSTALLED` → `SERVICE_ACTIVATED`), technician telemetry, AI Support Assistant, and MSME Referral program.
6. **Admin & Operations Portal (Historical vs Live Analytics + Leak-Free Propensity Scoring)**:
   - Strictly separates the `5,000` historical leads (`smb_leads.csv`, `7.36%` conversion, `17.62d` avg TAT, `₹15,053` blended CAC) from live prototype applications.
   - Time-aware, leak-free logistic propensity model (`0–100`), KYC Reviewer Queue, Channel Partner Portal, 25-Product Catalogue Inspector, Immutable Audit Logs, and a **12-Case Automated AI Quality & Evaluation Suite (`12/12 PASS`)**.

---

## 2. Project Structure & Documentation Deliverables

```text
airtel/
├── backend/                          # Node.js + Express + TypeScript + Mongoose Backend
│   ├── src/
│   │   ├── config/db.ts              # Auto-starting MongoDB 8.3 connection manager
│   │   ├── middleware/auth.ts        # JWT auth, RBAC (5 roles), audit logging, PII masking
│   │   ├── models/index.ts           # All 22 Mongoose schemas & collections
│   │   ├── services/                 # Deterministic engines (Catalogue, Pricing, Readiness,
│   │   │                             # Feasibility, Registry, KYC K01-K12, Advisor, Order,
│   │   │                             # Leak-Free Propensity, AI Eval Suite, Demo Seeder)
│   │   ├── routes/apiRoutes.ts       # Complete REST API endpoints
│   │   ├── scripts/seed.ts           # CSV importer & 8-scenario database seeder
│   │   └── tests/runTests.ts         # 14 automated end-to-end acceptance tests (T-01 to T-14)
├── frontend/                         # React 18 + TypeScript + Vite + Tailwind + Recharts SPA
│   └── src/
│       ├── components/Layout.tsx     # Demo Mode Bar, 8 Scenario Switcher, Guided Tour, Role Switcher
│       └── pages/                    # Customer Portal & Admin/Operations Portal screens
├── docs/
│   ├── IMPLEMENTATION_PLAN.md        # Architecture & engineering implementation plan
│   ├── REQUIREMENT_TRACEABILITY.md   # Complete PRD requirement-to-code traceability matrix
│   ├── DATA_DICTIONARY.md            # Schema & forensic analysis of all CSVs + K01-K12
│   ├── ARCHITECTURE.md               # Mermaid diagrams, 22 MongoDB models & REST API docs
│   ├── PRIVACY_AND_SECURITY_NOTE.md  # 1-Page DPDP Privacy Note + 10-Slide Business Case Deck
│   ├── TESTING_REPORT.md             # 14 Acceptance Tests + 12 AI Eval Benchmark results
│   └── DEMO_SCRIPT_3MIN.md           # 3-minute hackathon judge walkthrough script
├── kyc_documents/                    # 47 specimen KYC PNG images (K01-K12) served privately
├── product_catalogue.csv             # 25 enterprise products (P01-P25)
├── smb_leads.csv                     # 5,000 historical MSME leads (Apr-Jun 2026)
├── mock_gstin_registry.csv           # 3,534 mock GSTIN registry records
└── mock_udyam_registry.csv           # 2,723 mock Udyam registry records
```

- **Implementation Plan**: [docs/IMPLEMENTATION_PLAN.md](file:///c:/Users/TANNU/OneDrive/Desktop/airtel/docs/IMPLEMENTATION_PLAN.md)
- **Requirement Traceability Matrix**: [docs/REQUIREMENT_TRACEABILITY.md](file:///c:/Users/TANNU/OneDrive/Desktop/airtel/docs/REQUIREMENT_TRACEABILITY.md)
- **Data Dictionary & Dataset Forensics**: [docs/DATA_DICTIONARY.md](file:///c:/Users/TANNU/OneDrive/Desktop/airtel/docs/DATA_DICTIONARY.md)
- **System Architecture, 22-Model DB Schema & API Docs**: [docs/ARCHITECTURE.md](file:///c:/Users/TANNU/OneDrive/Desktop/airtel/docs/ARCHITECTURE.md)
- **1-Page Privacy & Security Note + 10-Slide Business Case**: [docs/PRIVACY_AND_SECURITY_NOTE.md](file:///c:/Users/TANNU/OneDrive/Desktop/airtel/docs/PRIVACY_AND_SECURITY_NOTE.md)
- **Testing & AI Evaluation Report (`14/14` & `12/12`)**: [docs/TESTING_REPORT.md](file:///c:/Users/TANNU/OneDrive/Desktop/airtel/docs/TESTING_REPORT.md)
- **3-Minute Judge Demo Script**: [docs/DEMO_SCRIPT_3MIN.md](file:///c:/Users/TANNU/OneDrive/Desktop/airtel/docs/DEMO_SCRIPT_3MIN.md)

---

## 3. Quick Start & Installation Instructions

### Prerequisites
- **Node.js** `v18+` (tested with `v24.13.1`)
- **MongoDB** `v7.0+` or `v8.3` installed locally (the backend automatically starts local `mongod.exe` on port `27017` using `.mongodb-data/` if it is not already running).

### Step 1: Environment Configuration
Copy `.env.example` to `.env` in `backend/` and `frontend/` (optional—sensible local defaults are pre-configured):
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
*(Optional)* Set `GEMINI_API_KEY` in `backend/.env` to enable live Gemini 2.5 Flash conversational generation; when omitted, the deterministic bilingual advisor fallback runs seamlessly.

### Step 2: Install Dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Step 3: Seed the Datasets & 8 Demo Scenarios
```bash
cd backend
npm run seed
```
This imports `25` products, `3,534` GSTIN records, `2,723` Udyam records, `5,000` historical leads, 5 role accounts, and all 8 repeatable demo scenarios (`SCENARIO_1`–`SCENARIO_8`).

### Step 4: Start Backend and Frontend Servers
- **Terminal 1 (Backend API on port `5000`)**:
  ```bash
  cd backend
  npm run dev
  ```
- **Terminal 2 (Frontend Vite SPA on port `5173`)**:
  ```bash
  cd frontend
  npm run dev
  ```
Open **`http://localhost:5173`** in your browser.

### Step 5: Run Automated Acceptance Tests (`14/14`)
```bash
cd backend
npm test
```

---

## 4. Seeded Demo Roles & 8 Repeatable Demo Scenarios

### Role Switcher Accounts (Top Navigation Bar)
| Role | Email | Password | Capabilities |
|---|---|---|---|
| **Customer (`CUSTOMER`)** | `owner@jaipurcraft.in` | `Demo@123` | Full MSME Onboarding, Readiness, Advisor, Bundles, KYC, Order & Active Services |
| **Sales Executive (`SALES_EXECUTIVE`)** | `rohan.sharma@udyamone.in` | `Demo@123` | Lead Queue, Propensity Scores, Human Handoff Summaries, Quote Assistance |
| **Channel Partner (`CHANNEL_PARTNER`)** | `partner@westconnect.in` | `Demo@123` | Assigned Territory Leads, Conversions, Commission Tracking |
| **KYC Reviewer (`KYC_REVIEWER`)** | `ananya.iyer@udyamone.in` | `Demo@123` | KYC Manual Review Queue (`K04` blur, `K01`/`K06`/`K11` discrepancies), Document Viewer, Audit Log |
| **Admin (`ADMIN`)** | `admin@udyamone.in` | `Demo@123` | Historical vs Live Funnel Analytics, All Queues, Order Ops, Catalogue, 12-Case AI Eval Suite |

### 8 One-Click Demo Scenarios (Top Demo Mode Bar)
1. **`SCENARIO_1` — Retail Store in Jaipur (`K03` Valid)**: 2 outlets, 14 staff, POS + Wi-Fi + Cloud CCTV (`P02`, `P06`, `P10`, `P18`).
2. **`SCENARIO_2` — Healthcare Clinic in Pune (`K02` Rotated GST + Hindi)**: 18 staff, Hindi advisor conversation, `0`→`O` OCR normalization on rotated GST certificate (`19EOGXH4115Y1ZL`).
3. **`SCENARIO_3` — Multi-Site Logistics & Warehouse (`K09`)**: 3 sites, 45 employees, Dedicated ILL (`P03`), SD-WAN (`P05`), Next-Gen Firewall (`P16`).
4. **`SCENARIO_4` — Semi-Urban MSME without Fiber (`K12`)**: PIN `303001` fiber gap automatically resolved via **`P04` Business 5G AirFiber (200 Mbps)**.
5. **`SCENARIO_5` — KYC Discrepancy (`K01` Cancelled GSTIN + Missing Udyam)**: Deterministic rejection of `37IHKXV5167L1ZS` (`Cancelled`).
6. **`SCENARIO_6` — KYC Manual Review (`K04` Blurred GST + `K11` 257-Day Old Bill)**: Low OCR confidence (`62%`) routed to `MANUAL_REVIEW` + expired address proof caught.
7. **`SCENARIO_7` — Activated MSME (`K08`)**: Order in `SERVICE_ACTIVATED` with optical power `-18.4 dBm`, speed test `312 Mbps`, AI Support Ticket, and ₹1,500 Referral credit.
8. **`SCENARIO_8` — Admin Executive Analytics & AI Quality Benchmark**: Direct jump to the 5,000-lead historical funnel vs live metrics and 12-case AI Evaluation Suite.

---

## 5. Original Dataset Reference (Track A: Project Udyam Digital)

All businesses, people, identifiers, documents and figures in this pack are **fictional** and generated for the Accel YTL Hackathon. They do not describe any real company or customer.

### What's in the pack

| File | Rows | What it is |
| --- | --- | --- |
| `product_catalogue.csv` | 25 | Accel Business products with price range, setup fee, contract, eligibility rules and dependencies. Use it to power the advisor and the quote. |
| `smb_leads.csv` | 5,000 | One quarter (Apr-Jun 2026) of small-business leads with profile, funnel stage reached, drop reason, dates, and - for activated leads - bundle bought, value, churn and NPS. |
| `mock_gstin_registry.csv` | 3,534 | Mock GST registry. Back your "GSTIN lookup" API with this file. |
| `mock_udyam_registry.csv` | 2,723 | Mock Udyam registry. Back your "Udyam lookup" API with this file. |
| `kyc_documents/` | 47 images | Specimen KYC documents for 12 applicants (K01-K12): business registration, Udyam certificate, signatory ID and address proof. Some have problems your Smart KYC should catch. |

### Notes on identifiers & validation rules
- **GSTINs**: Follow the real 15-character structure with a valid checksum; the 4th character of the embedded PAN is always `X`.
- **Udyam numbers**: Use district code `00` (`UDYAM-XX-00-XXXXXXX`).
- **Reference Date**: Uses `2026-07-15` as "today" for any date-based check (address proof must be no older than 90 days).
