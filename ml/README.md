# Udyam One — Machine Learning Lead Propensity Pipeline (`ml/`)

## 1. Overview & Purpose
This directory contains the reproducible training and evaluation pipeline for the **Udyam One Lead Propensity Model**, trained directly on the 5,000 historical MSME leads in `smb_leads.csv`.

The propensity score is designed as an **operational prioritisation aid** for sales and channel teams—not a definitive credit or commercial judgment about a business.

---

## 2. Strict Target Leakage Prevention
Only firmographic, registration, and acquisition channel features known **at the moment a lead enters the funnel** are used as model inputs (`21` pre-acquisition features).

The following post-funnel and post-activation columns are **strictly excluded**:
- `stage_reached`, `outcome`, `drop_reason`
- `contacted_date`, `needs_assessed_date`, `quote_accepted_date`, `kyc_complete_date`, `activated_date`
- `days_lead_to_activation`, `customer_follow_up_calls`
- `bundle_products`, `monthly_bundle_value_inr`, `one_time_setup_inr`, `contract_months`
- `churned_within_6_months`, `nps_score`, `acquisition_cost_inr`

---

## 3. Time-Based Train / Holdout Split
- **Training Split**: Leads created between `2026-04-01` and `2026-05-31` (`3,335` leads)
- **Out-of-Time Holdout Split**: Leads created between `2026-06-01` and `2026-06-30` (`1,665` leads)

---

## 4. Reproducing Training & Evaluation

```bash
# 1. Train L2-regularized Logistic Regression & export ml/model_artifacts.json
python ml/train_propensity.py

# 2. Run out-of-time holdout evaluation & compare against Heuristic Baseline
python ml/evaluate_propensity.py
```

The backend (`backend/src/services/propensityEngine.ts`) automatically loads `ml/model_artifacts.json` to score leads and provide positive/negative factor attributions alongside the heuristic baseline.
