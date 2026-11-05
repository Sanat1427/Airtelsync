# Udyam One — Privacy, Security & Executive Business Case Note
## YTL Hackathon 2026 | Enterprise Track A

---

# PART A: One-Page Privacy & Security Architecture Note (DPDP Act 2023 Aligned)

## 1. Customer Consent Before Document Upload (`DPDP-2026-v1.2`)
- **Strict Technical Enforcement**: The backend endpoint `POST /api/kyc/verify-specimen` and `POST /api/kyc/upload` reject any KYC submission with HTTP `400 CONSENT_REQUIRED` unless a valid, non-revoked `KycConsent` record (`consentVersion: "DPDP-2026-v1.2"`) is linked to the `businessId`.
- **Transparent Notice**: Before uploading GST, Udyam, PAN, Aadhaar, or Utility Bill documents, the customer is presented with an itemized notice specifying the data fiduciary (Udyam One Enterprise Onboarding), exact fields collected, verification purpose, and retention timeline.

## 2. Purpose Limitation
- **Scoped Processing**: Uploaded KYC documents and registry lookups (`mock_gstin_registry.csv` and `mock_udyam_registry.csv`) are processed exclusively for:
  1. Verifying legal entity existence and active tax status (`Active` vs `Cancelled`/`Suspended`) for B2B products requiring GSTIN (`P01`, `P07`, `P10`, `P12`, `P14`, `P16`, `P20`, `P21`, `P23`, `P24`).
  2. Validating authorized signatory authority and installation premise address recency (≤90 days from reference date `2026-07-15`).
- **Zero Secondary Use**: Customer KYC documents and PII are never used for advertising, third-party data brokerage, or external LLM training.

## 3. Data Minimization & PII Masking
- **Minimal Field Extraction**: Only essential verification attributes (`gstin`, `udyamNumber`, `legalName`, `signatoryName`, `billDate`, `address`) are extracted into structured MongoDB fields.
- **Automatic Masking (`maskSensitiveId`)**:
  - Aadhaar numbers are masked at extraction and storage time as `XXXX-XXXX-1234` (only last 4 digits retained).
  - PAN numbers are masked in logs and non-reviewer views as `ABXXXX1234F`.
  - Phone numbers are masked in audit trails as `XXXXXX3210`.

## 4. Access Control & Private Document Storage
- **No Public Static Exposure**: The `kyc_documents/` folder (`K01`–`K12` PNG specimens) and `uploads/` directory are **not** mounted as public static folders.
- **Authenticated Streaming (`GET /api/kyc/documents/:docId/file`)**: Every document view request requires a valid Bearer JWT and verifies role permissions (`CUSTOMER` owning the application, `KYC_REVIEWER`, or `ADMIN`).
- **Role-Based Access Control (RBAC)**: Enforced on every sensitive backend route via `requireRole(...)`. Switching roles in the Demo Switcher mints a role-specific JWT and records an immutable entry in `AuditLogModel`.

## 5. 180-Day Retention Policy & Automated Purge Lifecycle
- **Retention Schedule**: Every `KycConsent` record binds raw document retention to **180 days** (`retentionDays: 180`) post-onboarding or rejection, after which raw images are scheduled for cryptographic erasure while retaining only the hash and verification status flag for telecom regulatory compliance.

## 6. AI Safety & Guardrails
- **Prompt Injection Defense**: `advisorEngine.ts` blocks attempts to override system instructions, reveal system prompts, force 99% discounts, or bypass KYC verification (`T-11` / `EVAL-10`).
- **Zero Unsupported Product Hallucination**: Requests for consumer IPTV, DTH, home entertainment, or hardware laptops (`EVAL-09`) are politely declined and redirected to the 25 verified B2B catalogue products (`P01`–`P25`).
- **Human-in-the-Loop Escalation**: Any KYC document with OCR confidence `<70%` (such as `K04_gst_certificate.png` at `62%` due to Gaussian blur) is automatically blocked from auto-approval and routed to `MANUAL_REVIEW` in the KYC Reviewer Queue (`T-09` / `EVAL-11`).

## 7. Items Requiring Formal Legal Review Before Production Launch
1. **Licensed TSP / DoT KYC Compliance**: Integration with licensed NSDL/Protean PAN APIs, UIDAI Offline e-KYC / DigiLocker APIs, and DoT Unified License subscriber verification norms.
2. **DPDP Act 2023 Consent Manager Integration**: Registration with a Consent Manager framework and multilingual notice translation across all 22 Eighth Schedule languages.
3. **SOC 2 Type II & ISO 27001 Key Management**: Migrating JWT secrets and document encryption keys to hardware KMS (AWS KMS / GCP Cloud KMS) with envelope encryption at rest.

---

# PART B: 10-Slide Executive Business Case Deck Summary

| Slide | Title | Core Executive Takeaways & Dataset Evidence |
|---|---|---|
| **Slide 1** | **The Indian MSME Digital Acquisition Bottleneck** | Out of `5,000` historical MSME leads in `smb_leads.csv`, only **`368` (`7.36%`)** convert to active service, taking an average of **`17.62 days`** with a **`15.22%` 6-month churn rate**. |
| **Slide 2** | **Where We Lose 92.6% of Leads (Funnel Forensics)** | Steepest drops occur at **Needs Assessed → Quote Accepted (`43.6%` conversion, `-1,113` leads)** due to `Price too high` (`1,106`) and `No follow-up` (`719`), and at **Quote → KYC (`68.3%`)** due to `KYC failed` (`428`). |
| **Slide 3** | **Introducing Udyam One: AI + Deterministic Core** | Unified MSME acquisition platform: Bilingual AI Business Advisor (English/Hindi + Voice + WhatsApp) paired with a deterministic 25-product eligibility, dependency, pricing, and Smart KYC engine. |
| **Slide 4** | **Solving Quote Drop-Off: Transparent 3-Tier Bundles & ROI** | Replaces opaque sales quotes with instant **Essential**, **Growth (Recommended)**, and **Secure Scale** bundles, itemized 100-point match scores, and an interactive ROI calculator showing net monthly productivity + security savings. |
| **Slide 5** | **Solving `No Follow-Up`: Leak-Free Propensity & Instant Handoff** | Time-aware logistic propensity scoring (`propensityEngine.ts`) ranks leads (`HIGH`/`MEDIUM`/`LOW`) using only pre-conversion attributes so Sales Executives prioritize high-intent MSMEs immediately. |
| **Slide 6** | **Solving `KYC Failed`: Smart OCR + Registry Cross-Verification** | Automated pre-screening catches `Cancelled` GSTINs (`K01`), tampered IDs (`K06`), expired utility bills >90 days (`K11`), and missing Udyam docs (`K05`) in seconds while auto-normalizing `0`↔`O` OCR errors (`K02`). |
| **Slide 7** | **Solving `No Fiber Coverage`: Automated 5G AirFiber Fallback** | When `feasibilityEngine.ts` detects semi-urban/tier-3 fiber gaps (`486` historical drops), it automatically substitutes **`P04` Business 5G AirFiber (200 Mbps, 24-hour setup)** to save the order. |
| **Slide 8** | **Channel Economics & Partner Multiplier** | `Digital Self-Serve` delivers the lowest CAC (`₹4,832`) vs `Direct Field Sales` (`₹22,140`). Udyam One shifts discovery and KYC to self-serve while empowering `Channel Partners` via a dedicated Partner Portal. |
| **Slide 9** | **Projected Business Impact (12-Month Target)** | **Funnel Conversion**: `7.36%` → **`14.8%`** (+2x) \| **Onboarding TAT**: `17.62 days` → **`4.2 days`** (-76%) \| **Blended CAC**: `₹15,053` → **`₹8,400`** (-44%) \| **6-Month Churn**: `15.22%` → **`9.5%`**. |
| **Slide 10** | **90-Day Production Rollout Roadmap** | **Days 1–30**: Live GSTN/Udyam API & WhatsApp Business BSP integration. **Days 31–60**: Pilot in Tier-1/Tier-2 clusters with 50 Channel Partners. **Days 61–90**: Full OSS/BSS provisioning & billing integration. |
