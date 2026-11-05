# Udyam One — Master Data Dictionary & Dataset Verification Report

All supplied datasets in `C:\Users\TANNU\OneDrive\Desktop\airtel\` have been inspected, parsed, and integrated without alteration of product IDs or registry identifiers.

---

## 1. `product_catalogue.csv` (25 Rows, 16 Columns)

**Collection Mapped**: `products` (`ProductModel`)

| Column Name | Data Type | Nullable | Description & Business Rule |
|---|---|---|---|
| `product_id` | String (PK) | No | Unique Product Identifier (`P01` through `P25`). Indexed unique. |
| `category` | String | No | `Connectivity` (11), `Communication` (4), `Cloud & Productivity` (4), `Security` (3), `IoT & Physical` (3). |
| `product_name` | String | No | Commercial product title (e.g., `Biz Fibre 100`, `Managed SD-WAN`). |
| `description` | String | No | Functional specification of the service. |
| `unit` | String | No | Billing unit (`per site`, `per line`, `per IP`, `per channel`, `per number`, `per pack`, `per account`, `per user`, `per counter`, `per device`, `per camera`, `per vehicle`). |
| `price_min_inr_per_month` | Integer | No | Minimum monthly unit recurring price in INR (`99` to `25000`). |
| `price_max_inr_per_month` | Integer | No | Maximum monthly unit recurring price in INR (`149` to `35000`). |
| `one_time_setup_inr` | Integer | No | One-time installation/setup charge per unit in INR (`0` to `15000`). |
| `min_contract_months` | Integer | No | Minimum commitment period (`1`, `3`, `6`, `12`, or `24` months). |
| `available_city_tiers` | Semicolon-list | No | `1;2` for 24 products; `1` only for `P03` (`Biz Fibre 1G`). |
| `min_employees` | Integer | No | Minimum employee count required (`1`, `3`, `5`, `10`, or `25`). |
| `min_sites` | Integer | No | Minimum site count required (`1` for 24 products; `3` for `P10 Managed SD-WAN`). |
| `requires_gstin` | Char (`Y`/`N`) | No | `Y` for 10 products (`P03, P05, P06, P10, P12, P13, P14, P15, P21, P24`). Requires an **Active** GSTIN. |
| `requires_one_of` | Pipe-list | Yes | Companion dependency rule (`|`-separated):<br>- `P09, P10, P21` require `P01\|P02\|P03\|P05\|P06`<br>- `P11` requires `P01\|P02\|P03`<br>- `P12, P23` require `P01\|P02\|P03\|P04\|P05\|P06`<br>- `P22` requires `P01\|P02\|P03\|P04` |
| `typical_install_days` | Integer | No | Expected provisioning SLA (`1` to `30` days). Used for order tracker timeline. |
| `target_segments` | Semicolon-list | No | Segment codes: `micro`, `prof`, `multi`, `mfg`. |

---

## 2. `smb_leads.csv` (5,000 Rows, 40 Columns)

**Collection Mapped**: `leads` (`LeadModel` with `isHistorical: true` to separate from live prototype leads)

| Column Name | Data Type | Non-Null Count | Values & Summary Statistics |
|---|---|---|---|
| `lead_id` | String (PK) | 5,000 | `L00001` – `L05000` (Unique). |
| `created_date` | ISO Date | 5,000 | `2026-04-01` to `2026-06-30` (Q2 2026). |
| `lead_source` | String | 5,000 | `Field sales` (1,720), `Channel partner` (1,010), `Website form` (995), `Inbound call` (504), `Referral` (413), `WhatsApp campaign` (358). |
| `business_name` | String | 5,000 | Fictional MSME trade name. |
| `business_type` | String | 5,000 | 35 distinct verticals across 4 segments. |
| `segment` | String | 5,000 | `Micro retail & services` (2,709), `Professional offices` (1,247), `Small multi-site businesses` (755), `Small manufacturers` (289). |
| `city`, `city_tier`, `state` | String / Int | 5,000 | 22 cities across 14 states. Tier 1: 2,578 leads (8 cities); Tier 2: 2,422 leads (14 cities). |
| `preferred_language` | String | 5,000 | `Hindi` (2,137), `English` (1,168), `Marathi` (505), `Kannada` (253), `Gujarati` (233), `Telugu` (207), `Tamil` (207), `Bengali` (111), `Punjabi` (96), `Malayalam` (83). |
| `employee_count` | Integer | 5,000 | Range `1`–`150`, Mean `20.47`. |
| `num_sites` | Integer | 5,000 | Range `1`–`12`, Mean `2.04` (`1` site: 4,001 leads). |
| `annual_turnover_band` | String | 5,000 | `< 40 lakh` (1,497), `40 lakh - 1.5 cr` (1,537), `1.5 - 5 cr` (1,012), `5 - 25 cr` (731), `25 - 100 cr` (223). |
| `has_gstin`, `gstin` | Bool / String | 5,000 / 3,534 | `Y`: 3,534 (100% match `mock_gstin_registry.csv`), `N`: 1,466. |
| `has_udyam`, `udyam_number` | Bool / String | 5,000 / 2,723 | `Y`: 2,723 (100% match `mock_udyam_registry.csv`), `N`: 2,277. |
| `current_internet` | String | 5,000 | `Mobile hotspot` (1,799), `Business broadband` (1,433), `Home broadband` (1,250), `Mixed per site` (221), `Leased line` (173), `None` (124). |
| `current_provider` | String | 5,000 | `Accel (mobile only)` (1,505), `Competitor A` (1,200), `Local ISP` (1,042), `Competitor B` (744), `Accel` (385), `None` (124). |
| `monthly_telecom_spend_inr` | Integer | 5,000 | Range `₹200`–`₹27,750`, Mean `₹3,317.93`. |
| `products_of_interest` | Semicolon-list | 5,000 | Requested product IDs (e.g., `P02;P12`). |
| `contact_name`, `contact_role` | String | 5,000 | `Owner` (2,071), `Manager` (1,025), `Office admin` (959), `Partner` (945). |
| `stage_reached` | String | 5,000 | Terminal stage: `Lead` (1,594), `Contacted` (1,432), `Needs assessed` (1,113), `Quote accepted` (273), `KYC complete` (220), `Activated` (368).<br>Cumulative Funnel: **5,000 -> 3,406 (68.1%) -> 1,974 (58.0%) -> 861 (43.6%) -> 588 (68.3%) -> 368 (62.6%)**. |
| `outcome`, `drop_reason` | String | 5,000 / 4,632 | `Activated` (368 — 7.36%), `Dropped` (4,632 across 20 distinct drop reasons). |
| `days_lead_to_activation` | Integer | 368 | Range `7`–`31` days, Mean **`17.62` days**. |
| `customer_follow_up_calls` | Integer | 5,000 | Range `0`–`5` calls (Activated customers average **3.0 calls**). |
| `bundle_products` | String | 368 | Purchased items formatted as `P01x1;P07x2`. |
| `monthly_bundle_value_inr` | Integer | 368 | Range `₹1,290`–`₹72,950`, Mean **`₹12,350.52`**. |
| `one_time_setup_inr` | Integer | 368 | Range `₹0`–`₹1,23,100`, Mean `₹13,879.08`. |
| `contract_months` | Integer | 368 | `12` (304), `24` (61), `6` (3). |
| `churned_within_6_months` | Char (`Y`/`N`) | 368 | `Y`: 56 (**15.22%** churn), `N`: 312. |
| `nps_score` | Integer | 368 | Range `2`–`10`, Mean **`6.86`**. |
| `acquisition_cost_inr` | Integer | 5,000 | Total spend `₹55,39,640` / 368 activated = **`₹15,053.37` blended CAC**. |

---

## 3. `mock_gstin_registry.csv` (3,534 Rows, 8 Columns)

**Collection Mapped**: `gstRegistrations` (`GstRegistrationModel`)

- **Format Rule**: 15-character structure `^[0-9]{2}[A-Z]{3}[ABCFGHLJPTFX][A-Z][0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$` with valid Modulo-36 checksum. 4th character of embedded PAN (index 5) is always `X`.
- **Statuses**: `Active` (3,266), `Cancelled` (167), `Suspended` (101).
- **Constitutions**: `Proprietorship` (2,443), `Private Limited Company` (631), `Limited Liability Partnership` (460).

---

## 4. `mock_udyam_registry.csv` (2,723 Rows, 8 Columns)

**Collection Mapped**: `udyamRegistrations` (`UdyamRegistrationModel`)

- **Format Rule**: `^UDYAM-[A-Z]{2}-(00|[0-9]{2})-[0-9]{7}$` (uses synthetic district code `00`).
- **Enterprise Types**: `Micro` (1,833), `Small` (737), `Medium` (153).
- **Major Activities**: `Trading` (1,678), `Services` (787), `Manufacturing` (258).

---

## 5. `kyc_documents/` (47 Specimen PNG Images across `K01`–`K12`)

**Reference Date for Recency Validation**: **`2026-07-15`** (Address Proof `Bill date` must be `<= 90 days` old, i.e., on or after `2026-04-16`).

| Specimen ID | Linked Lead ID | Business Name | GSTIN on Certificate | Registry Status | Udyam on Certificate | Bill Date (Age vs `2026-07-15`) | Ground-Truth Anomalies & Expected KYC Outcome |
|---|---|---|---|---|---|---|---|
| **K01** | `L00045` | Vindhya Tours & Travels | `37IHKXV5167L1ZS` | **Cancelled** | *(Blank on document)* | `2026-06-26` (19d) | **CRITICAL**: GSTIN is `Cancelled`; Udyam number is blank on certificate -> `NEEDS_CORRECTION` / `REJECTED` |
| **K02** | `L01287` | Harmony Dental Care | `19EOGXH4115Y1ZL` | Active | `UDYAM-WB-00-5053330` | `2026-05-22` (54d) | **WARNING**: GST certificate rotated ~7° clockwise + `O`/`0` glyph ambiguity -> `MANUAL_REVIEW` or `VERIFIED` after OCR normalization |
| **K03** | `L03571` | Ganesh Woodcraft | `27XUIXG0767D1ZP` | Active | `UDYAM-MH-00-9516696` | `2026-05-30` (46d) | **CLEAN**: All 4 documents sharp, active, and consistent -> `VERIFIED` |
| **K04** | `L01014` | Saffron Dental Care LLP | `27PZSXS1936O1ZH` | Active | `UDYAM-MH-00-6131836` | `2026-05-28` (48d) | **WARNING**: GST certificate heavily Gaussian blurred (low OCR confidence 0.62) -> **Must route to `MANUAL_REVIEW`** |
| **K05** | `L04014` | Balaji Realty LLP | `32TZAXB5481U1Z1` | Active | *(File Missing)* | `2026-06-11` (34d) | **WARNING/ERROR**: `K05_udyam_certificate.png` is missing from upload packet -> `NEEDS_CORRECTION` |
| **K06** | `L00115` | Saffron Unisex Salon | `08YKZXS8189L1Z0` | **Not Found** | `UDYAM-RJ-00-6577157` | `2026-06-11` (34d) | **CRITICAL**: GSTIN `08YKZXS8189L1Z0` has altered digit (`8` instead of `5` vs registry `08YKZXS5189L1ZO`), fails checksum & registry lookup -> `NEEDS_CORRECTION` |
| **K07** | `L03349` | Neelgiri Physio Clinic | `07CPCXN0398P1ZT` | Active | `UDYAM-DL-00-9565547` | `2026-07-05` (10d) | **CRITICAL**: Legal Name mismatch on GST Certificate (`Prop. Shri Physio Clinic` vs registry/trade name `Neelgiri Physio Clinic`) -> `MANUAL_REVIEW` / `NEEDS_CORRECTION` |
| **K08** | `L03473` | Green Leaf Legal Associates | `24XORXG9365M1Z3` | Active | `UDYAM-GJ-00-8477445` | `2026-05-26` (50d) | **CLEAN**: All 4 documents active and consistent -> `VERIFIED` |
| **K09** | `L04779` | Kaveri Insurance Advisors | `37LDYXK0296F1ZB` | Active | `UDYAM-AP-00-9751562` | `2026-07-10` (5d) | **CLEAN**: All 4 documents active and consistent -> `VERIFIED` |
| **K10** | `L04525` | Kaveri Stays LLP | `27QHJXK0658U1ZL` | Active | `UDYAM-MH-00-7183141` | `2026-06-18` (27d) | **WARNING**: Signatory ID name (`Nisha Arora`) does not match primary application contact (`Fatima Menon`) -> `MANUAL_REVIEW` |
| **K11** | `L03485` | Trinity Bake House Pvt Ltd | `03KGZXT1320R1ZZ` | Active | `UDYAM-PB-00-9719478` | **`2025-10-31` (257d)** | **CRITICAL**: Address proof is **257 days old** (exceeds 90-day limit relative to `2026-07-15`) -> `NEEDS_CORRECTION` |
| **K12** | `L03558` | Star Electronics | `37NBLXS1145E1ZU` | Active | `UDYAM-AP-00-5186772` | `2026-07-06` (9d) | **CLEAN**: All 4 documents active and consistent -> `VERIFIED` |
