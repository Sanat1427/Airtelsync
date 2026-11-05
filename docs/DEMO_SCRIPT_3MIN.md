# Udyam One — 3-Minute Hackathon Judge Demonstration Script
## YTL Hackathon 2026 | Enterprise Track A

---

## Pre-Demo Checklist (10 Seconds)
1. Ensure Backend (`http://localhost:5000`) and Frontend (`http://localhost:5173`) are running.
2. In the top **Demo Mode Bar**, click **Scenario 1: Retail Store (Jaipur)** or **Start Guided Tour**.

---

## Minute 0:00 – 0:45 | Problem Framing, Readiness Assessment & Bilingual AI Advisor
- **Narrative**: *"Across 5,000 historical MSME leads in our dataset, 92.6% drop off before activation—primarily at Quote Acceptance (43.6% conversion) and KYC Verification—taking 17.6 days on average. Udyam One solves this with an AI-First acquisition platform governed by a deterministic commercial and KYC engine."*
- **Action 1 (Readiness Score)**: Click **Readiness Score** in the left sidebar.
  - Show the **Digital Readiness Score (`64/100` — Developing)** across Connectivity, Communication, Productivity, Security, and Business Continuity, plus actionable product gap badges (`P02`, `P06`, `P10`, `P18`).
- **Action 2 (Bilingual AI Advisor + Voice + WhatsApp)**: Click **AI Advisor**.
  - Toggle **English / हिंदी (Hindi)** or click **WhatsApp Sim** to show the WhatsApp Business onboarding mirror.
  - Click a Hindi quick chip or type: `"मेरी जयपुर में 2 रिटेल दुकानें हैं, 14 कर्मचारी हैं, मुझे तेज़ इंटरनेट, CCTV और बिलिंग सुरक्षा चाहिए"` (or test the **Guardrail** by asking for *"home DTH TV"*).
  - Highlight the right-hand **Live Requirement JSON Extraction** panel updating in real time and the **Request Human Sales Callback** button.

---

## Minute 0:45 – 1:30 | Deterministic 3-Tier Bundles, Companion Dependencies & ROI Calculator
- **Narrative**: *"Notice that AI never invents prices or bundles. Our deterministic Catalogue Engine evaluates all 25 products (`P01`–`P25`) against city tier, employee count, site count, active GSTIN status, and `requires_one_of` dependencies."*
- **Action 1 (Bundles & Match Score)**: Click **Bundles & ROI**.
  - Show the **Essential**, **Growth (Recommended — 95/100 Match Score)**, and **Secure Scale** cards.
  - Point out the **100-Point Match Score Breakdown** (`Vertical Fit 30/30`, `Scale Fit 20/20`, `Pain Point Coverage 25/25`, `Budget Fit 10/15`, `Readiness Impact 10/10`) and **Auto-Included Companion Prerequisites** (e.g., `P06` Managed Wi-Fi auto-paired with `P02` Fiber 300 Mbps).
  - Scroll down to the **Excluded / Ineligible Products** accordion to show why `P05` SD-WAN (`requires 3 sites & 30 employees`) or `P03` (`1 Gbps`) were deterministically filtered out.
- **Action 2 (Interactive ROI & Feasibility)**:
  - Drag the **Current Monthly Spend** slider in the ROI Calculator to demonstrate live net monthly savings and payback period.
  - Click **Select Bundle & Check Feasibility** → enter PIN `302001` (Fiber Available) or `303001` (shows automatic fallback to **`P04` Business 5G AirFiber**) → click **Generate Formal Quote** and **Accept Quote**.

---

## Minute 1:30 – 2:15 | Smart KYC (`K01`–`K12`), Registry Verification & Edge-Case Handling
- **Narrative**: *"Next is Smart KYC—enforcing DPDP-2026-v1.2 consent before any upload, validating against 3,534 GSTINs and 2,723 Udyam registrations, and checking 90-day utility bill recency against reference date July 15, 2026."*
- **Action 1 (Consent & Golden Specimen `K03` / `K02`)**: On **Smart KYC (`K01`–`K12`)**, check the **DPDP Consent** box and click **Grant DPDP Consent**.
  - Select **`K02` — Harmony Dental Care** and click **Run OCR & Registry Verification**.
  - Point out how the engine detects **7° clockwise rotation**, auto-normalizes OCR character **`0` → `O`** in `19E0GXH4115Y1ZL` → `19EOGXH4115Y1ZL`, and verifies **Active** GSTIN + Udyam status!
  - Click any document thumbnail to open the **Authenticated Private Specimen Image Viewer**.
- **Action 2 (Edge Cases `K01`, `K04`, `K11`)**:
  - In the top **Demo Mode Bar**, switch to **Scenario 5 (`K01` Cancelled GSTIN)** or **Scenario 6 (`K04` Blurred GST + `K11` Expired Bill)** to show instant deterministic detection of `Cancelled` GSTINs, `<70%` OCR confidence routing to `MANUAL_REVIEW`, and `257-day-old` utility bills (`>90 days`).

---

## Minute 2:15 – 3:00 | Order Tracker, Active Services & Admin Operations Portal
- **Action 1 (Order & Installation Tracker)**: Click **Order & Install** (or load **Scenario 7: Activated MSME (`K08`)**).
  - Show the 7-stage **Order Lifecycle Stepper**, Technician dispatch (`Vikram Singh`), optical power (`-18.4 dBm`), speed test (`312 Mbps`), and **Active Services & Support** (AI Support Diagnostics + ₹1,500 Referral Engine).
- **Action 2 (Admin & Operations Portal)**: Click **Admin & Ops Portal** in the sidebar (or switch role to **Admin** / **KYC Reviewer** in the top bar).
  - **Historical vs Live Funnel (`smb_leads.csv`)**: Show the exact `5,000 → 3,406 → 1,974 → 861 → 588 → 368 (7.36%)` funnel, drop-off reasons (`Price too high: 1,106`), and CAC vs LTV by channel.
  - **Leads & Propensity Scoring**: Show the **Leak-Free Propensity Score (`0–100`)** and human handoff queue.
  - **KYC Review Queue**: Approve or reject `K04` (`MANUAL_REVIEW`) with a mandatory audit note.
  - **AI Quality & Eval (`12/12`)**: Click **Re-Run All 12 Benchmark Cases** to show `100%` pass rate across prompt injection, Hindi extraction, dependency validation, and KYC edge cases.
