import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import bcrypt from 'bcryptjs';
import {
  UserModel,
  BusinessModel,
  ProductModel,
  LeadModel,
  GstRegistrationModel,
  UdyamRegistrationModel,
  ConversationModel,
  AssessmentModel,
  RecommendationModel,
  QuoteModel,
  KycConsentModel,
  KycDocumentModel,
  KycApplicationModel,
  OrderModel,
  OrderStatusHistoryModel,
  InstallationModel,
  NotificationModel,
  PartnerModel,
  SupportTicketModel,
  ReferralModel,
  AuditLogModel,
  AiEvaluationModel,
} from '../models';
import { calculateLeadPropensity } from './propensityEngine';
import { runComprehensiveKycValidation } from './kycEngine';
import { runAiEvaluationSuite } from './aiEvalEngine';
import { calculateDigitalReadinessScore } from './assessmentEngine';
import { generateCatalogueRecommendations } from './catalogueEngine';

export interface ScenarioDefinition {
  scenarioId: string;
  number: number;
  title: string;
  subtitle: string;
  badge: string;
  businessId: string;
  recommendedStepRoute: string;
  highlights: string[];
}

export const DEMO_SCENARIOS: ScenarioDefinition[] = [
  {
    scenarioId: 'SCENARIO_1',
    number: 1,
    title: 'Scenario 1: Micro Retail Shop',
    subtitle: 'Saffron Bakers (Ludhiana, Tier 2 • 4 Staff • 1 Site)',
    badge: 'End-to-End Retail Journey',
    businessId: 'BIZ-SCEN-01',
    recommendedStepRoute: '/advisor',
    highlights: [
      'Needs reliable internet (P01), UPI Cloud POS (P19) & WhatsApp API (P15)',
      'Active GSTIN 03PJNXS4821G1ZB from mock_gstin_registry.csv',
      'Full Readiness -> Advisor -> Bundle Compare -> ROI -> Quote -> KYC -> Order flow',
    ],
  },
  {
    scenarioId: 'SCENARIO_2',
    number: 2,
    title: 'Scenario 2: Professional Clinic',
    subtitle: 'Harmony Dental Care (Kolkata, Tier 1 • 12 Staff • 1 Site)',
    badge: 'Clinic Cloud & Security',
    businessId: 'BIZ-SCEN-02',
    recommendedStepRoute: '/recommendations',
    highlights: [
      'Requires Biz Fibre 300 (P02), Business Email (P16), 1TB Cloud Backup (P17) & Endpoint Security (P20)',
      'Active GSTIN 19EOGXH4115Y1ZL & Udyam UDYAM-WB-00-5053330 (Specimen K02)',
      'Demonstrates OCR deskew & 0-to-O positional GSTIN normalization',
    ],
  },
  {
    scenarioId: 'SCENARIO_3',
    number: 3,
    title: 'Scenario 3: Multi-Site Restaurant',
    subtitle: 'Blue Lotus Kitchens Pvt Ltd (Kolkata, Tier 1 • 28 Staff • 4 Sites)',
    badge: 'Multi-Site SD-WAN & Failover',
    businessId: 'BIZ-SCEN-03',
    recommendedStepRoute: '/bundles',
    highlights: [
      '4 restaurant outlets qualifying for Managed SD-WAN (P10 >=3 sites, >=10 staff)',
      'Automatic 4G/5G Failover (P09) + Cloud POS (P19) across all 4 branches',
      'Active GSTIN 19JENXB8672I1ZA & Udyam UDYAM-WB-00-1029713',
    ],
  },
  {
    scenarioId: 'SCENARIO_4',
    number: 4,
    title: 'Scenario 4: Manufacturing Business',
    subtitle: 'Royal Auto Components (Ludhiana, Tier 2 • 42 Staff • 2 Sites)',
    badge: 'Complex SLA & Human Handoff',
    businessId: 'BIZ-SCEN-04',
    recommendedStepRoute: '/recommendations',
    highlights: [
      'Eligible for Dedicated 100 Mbps Leased Line (P06), Managed Firewall (P21) & Machine IoT (P24)',
      'Demonstrates deterministic rejection of P03 (Tier-1 only) and P10 SD-WAN (requires >=3 sites, has 2)',
      'Includes structured Human Handoff escalation to Sales Executive',
    ],
  },
  {
    scenarioId: 'SCENARIO_5',
    number: 5,
    title: 'Scenario 5: Invalid / Cancelled GSTIN',
    subtitle: 'Vindhya Tours & Travels (Visakhapatnam • Specimen K01 & K06)',
    badge: 'Registry Error & Correction',
    businessId: 'BIZ-SCEN-05',
    recommendedStepRoute: '/kyc',
    highlights: [
      'Uses Specimen K01: GSTIN 37IHKXV5167L1ZS is CANCELLED in mock_gstin_registry.csv',
      'Blocks GST-required products & flags blank Udyam number on K01_udyam_certificate.png',
      'Customer correction workflow allows updating to an Active GSTIN or non-GST bundle',
    ],
  },
  {
    scenarioId: 'SCENARIO_6',
    number: 6,
    title: 'Scenario 6: KYC Manual Review Queue',
    subtitle: 'Saffron Dental Care LLP (Nagpur • Specimen K04, K07, K10, K11)',
    badge: 'AI Safety & Human Review',
    businessId: 'BIZ-SCEN-06',
    recommendedStepRoute: '/kyc',
    highlights: [
      'Specimen K04 has Gaussian-blurred GST certificate (62% OCR confidence < 80% threshold)',
      'AI is blocked from auto-approving; routes to KYC Reviewer Queue (with K07, K10, K11 cases)',
      'Switch role to KYC Reviewer to inspect specimen images and Approve/Reject with audit trail',
    ],
  },
  {
    scenarioId: 'SCENARIO_7',
    number: 7,
    title: 'Scenario 7: Network Unavailable',
    subtitle: 'Himalayan Agro Processing (Remote Industrial Zone • PIN 999001)',
    badge: 'Feasibility Checkout Guard',
    businessId: 'BIZ-SCEN-07',
    recommendedStepRoute: '/feasibility',
    highlights: [
      'PIN 999001 returns NOT_AVAILABLE (or PIN ending in 88 returns FIELD_SURVEY_REQUIRED)',
      'Prevents final connectivity order confirmation when fixed-line coverage is unavailable',
      'Automatically creates a Field Operations expansion lead in Admin Portal',
    ],
  },
  {
    scenarioId: 'SCENARIO_8',
    number: 8,
    title: 'Scenario 8: Post-Activation Support',
    subtitle: 'Star Electronics (Visakhapatnam • Specimen K12 • Active Order)',
    badge: 'Lifecycle & Support Assistant',
    businessId: 'BIZ-SCEN-08',
    recommendedStepRoute: '/active-services',
    highlights: [
      'Completed KYC (Specimen K12 Golden Record) & Activated Order ORD-SCEN-08',
      'Active subscriptions dashboard, billing summary & renewal tracker',
      'Post-Activation AI Support Assistant for bandwidth upgrades, extra SIMs & support tickets',
    ],
  },
];

export async function ensureSeeded(): Promise<void> {
  const existingProducts = await ProductModel.countDocuments();
  if (existingProducts > 0) {
    console.log('[Seed] Database already contains seeded data. Skipping CSV re-import.');
    return;
  }
  await runFullDatasetImportAndSeed();
}

export async function runFullDatasetImportAndSeed(): Promise<{
  productsImported: number;
  gstImported: number;
  udyamImported: number;
  leadsImported: number;
}> {
  const rootDir = path.resolve(__dirname, '../../../');
  console.log(`[Seed] Starting full dataset import from ${rootDir}...`);

  // 1. Import product_catalogue.csv (25 products)
  const productCsvPath = path.join(rootDir, 'product_catalogue.csv');
  const productRows = parse(fs.readFileSync(productCsvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  await ProductModel.deleteMany({});
  const productDocs = productRows.map((r) => ({
    productId: r.product_id,
    category: r.category,
    productName: r.product_name,
    description: r.description,
    unit: r.unit,
    priceMinInrPerMonth: Number(r.price_min_inr_per_month),
    priceMaxInrPerMonth: Number(r.price_max_inr_per_month),
    oneTimeSetupInr: Number(r.one_time_setup_inr),
    minContractMonths: Number(r.min_contract_months),
    availableCityTiers: (r.available_city_tiers || '1;2')
      .split(';')
      .map((t: string) => Number(t.trim()))
      .filter(Boolean),
    minEmployees: Number(r.min_employees || 1),
    minSites: Number(r.min_sites || 1),
    requiresGstin: r.requires_gstin === 'Y',
    requiresOneOf: r.requires_one_of
      ? r.requires_one_of.split('|').map((s: string) => s.trim()).filter(Boolean)
      : [],
    typicalInstallDays: Number(r.typical_install_days || 3),
    targetSegments: (r.target_segments || '')
      .split(';')
      .map((s: string) => s.trim())
      .filter(Boolean),
  }));
  await ProductModel.insertMany(productDocs);
  console.log(`[Seed] Imported ${productDocs.length} products from product_catalogue.csv`);

  // 2. Import mock_gstin_registry.csv (3,534 records)
  const gstCsvPath = path.join(rootDir, 'mock_gstin_registry.csv');
  const gstRows = parse(fs.readFileSync(gstCsvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  await GstRegistrationModel.deleteMany({});
  const gstDocs = gstRows.map((r) => ({
    gstin: r.gstin,
    legalName: r.legal_name,
    tradeName: r.trade_name,
    constitution: r.constitution,
    principalPlaceOfBusiness: r.principal_place_of_business,
    state: r.state,
    registrationDate: r.registration_date,
    status: r.status,
  }));
  await GstRegistrationModel.insertMany(gstDocs, { ordered: false });
  console.log(`[Seed] Imported ${gstDocs.length} GSTIN records from mock_gstin_registry.csv`);

  // 3. Import mock_udyam_registry.csv (2,723 records)
  const udyamCsvPath = path.join(rootDir, 'mock_udyam_registry.csv');
  const udyamRows = parse(fs.readFileSync(udyamCsvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  await UdyamRegistrationModel.deleteMany({});
  const udyamDocs = udyamRows.map((r) => ({
    udyamNumber: r.udyam_number,
    enterpriseName: r.enterprise_name,
    enterpriseType: r.enterprise_type,
    majorActivity: r.major_activity,
    nicDescription: r.nic_description,
    state: r.state,
    city: r.city,
    dateOfRegistration: r.date_of_registration,
  }));
  await UdyamRegistrationModel.insertMany(udyamDocs, { ordered: false });
  console.log(`[Seed] Imported ${udyamDocs.length} Udyam records from mock_udyam_registry.csv`);

  // 4. Import smb_leads.csv (5,000 historical records)
  const leadsCsvPath = path.join(rootDir, 'smb_leads.csv');
  const leadRows = parse(fs.readFileSync(leadsCsvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  await LeadModel.deleteMany({});
  const leadDocs = leadRows.map((r, idx) => {
    const hasGstin = r.has_gstin === 'Y';
    const hasUdyam = r.has_udyam === 'Y';
    const employeeCount = Number(r.employee_count || 1);
    const numSites = Number(r.num_sites || 1);
    const cityTier = Number(r.city_tier || 1);
    const monthlySpend = Number(r.monthly_telecom_spend_inr || 0);
    const poi = r.products_of_interest
      ? r.products_of_interest.split(';').map((s: string) => s.trim()).filter(Boolean)
      : [];

    // Compute leak-free propensity score for first 250 leads and non-activated leads
    const prop =
      idx < 300
        ? calculateLeadPropensity({
            leadSource: r.lead_source,
            segment: r.segment,
            cityTier,
            employeeCount,
            numSites,
            hasGstin,
            hasUdyam,
            currentInternet: r.current_internet,
            currentProvider: r.current_provider,
            monthlyTelecomSpendInr: monthlySpend,
            preferredLanguage: r.preferred_language,
            productsOfInterestCount: poi.length,
          })
        : undefined;

    return {
      leadId: r.lead_id,
      isHistorical: true,
      createdDate: r.created_date,
      leadSource: r.lead_source,
      businessName: r.business_name,
      businessType: r.business_type,
      segment: r.segment,
      city: r.city,
      cityTier,
      state: r.state,
      preferredLanguage: r.preferred_language,
      employeeCount,
      numSites,
      annualTurnoverBand: r.annual_turnover_band,
      hasGstin,
      gstin: r.gstin || undefined,
      hasUdyam,
      udyamNumber: r.udyam_number || undefined,
      currentInternet: r.current_internet,
      currentProvider: r.current_provider,
      monthlyTelecomSpendInr: monthlySpend,
      productsOfInterest: poi,
      contactName: r.contact_name,
      contactRole: r.contact_role,
      stageReached: r.stage_reached,
      outcome: r.outcome,
      dropReason: r.drop_reason || undefined,
      contactedDate: r.contacted_date || undefined,
      needsAssessedDate: r.needs_assessed_date || undefined,
      quoteAcceptedDate: r.quote_accepted_date || undefined,
      kycCompleteDate: r.kyc_complete_date || undefined,
      activatedDate: r.activated_date || undefined,
      daysLeadToActivation: r.days_lead_to_activation ? Number(r.days_lead_to_activation) : undefined,
      customerFollowUpCalls: Number(r.customer_follow_up_calls || 0),
      bundleProducts: r.bundle_products || undefined,
      monthlyBundleValueInr: r.monthly_bundle_value_inr ? Number(r.monthly_bundle_value_inr) : undefined,
      oneTimeSetupInr: r.one_time_setup_inr ? Number(r.one_time_setup_inr) : undefined,
      contractMonths: r.contract_months ? Number(r.contract_months) : undefined,
      churnedWithin6Months: r.churned_within_6_months || undefined,
      npsScore: r.nps_score ? Number(r.nps_score) : undefined,
      acquisitionCostInr: Number(r.acquisition_cost_inr || 0),
      propensityScore: prop?.conversionProbabilityPct,
      propensityPriority: prop?.priority,
      propensityReasons: prop?.reasons,
      suggestedNextAction: prop?.suggestedNextAction,
    };
  });

  // Insert in chunks of 1000 for speed
  for (let i = 0; i < leadDocs.length; i += 1000) {
    await LeadModel.insertMany(leadDocs.slice(i, i + 1000), { ordered: false });
  }
  console.log(`[Seed] Imported ${leadDocs.length} historical leads from smb_leads.csv`);

  // 5. Seed Demo Users for all 5 Roles
  await UserModel.deleteMany({});
  const passwordHash = await bcrypt.hash('demo123', 10);
  await UserModel.insertMany([
    {
      email: 'customer@udyamone.in',
      phone: '+91 98765 43210',
      name: 'Sneha Rao (MSME Owner)',
      passwordHash,
      role: 'Customer',
      preferredLanguage: 'English',
    },
    {
      email: 'sales@udyamone.in',
      phone: '+91 98111 22334',
      name: 'Rohan Deshmukh (Enterprise Sales Exec)',
      passwordHash,
      role: 'Sales Executive',
      assignedTerritory: 'North & West India',
      preferredLanguage: 'English',
    },
    {
      email: 'partner@udyamone.in',
      phone: '+91 98222 33445',
      name: 'Apex Digital Solutions (Channel Partner)',
      passwordHash,
      role: 'Channel Partner',
      assignedTerritory: 'Tier-2 MSME Cluster',
      partnerCode: 'PRT-APEX-01',
      preferredLanguage: 'Hindi',
    },
    {
      email: 'kyc@udyamone.in',
      phone: '+91 98333 44556',
      name: 'Priya Nair (Senior KYC Compliance Officer)',
      passwordHash,
      role: 'KYC Reviewer',
      preferredLanguage: 'English',
    },
    {
      email: 'admin@udyamone.in',
      phone: '+91 98444 55667',
      name: 'Vikramaditya Sen (Platform Operations Admin)',
      passwordHash,
      role: 'Admin',
      preferredLanguage: 'English',
    },
  ]);

  // 6. Seed Partners
  await PartnerModel.deleteMany({});
  await PartnerModel.insertMany([
    {
      partnerId: 'EXEC-01',
      partnerName: 'Rohan Deshmukh (Enterprise Sales)',
      partnerType: 'Sales Executive',
      city: 'Mumbai',
      state: 'Maharashtra',
      assignedLeadsCount: 18,
      convertedLeadsCount: 7,
      totalCommissionInr: 42000,
    },
    {
      partnerId: 'EXEC-02',
      partnerName: 'Ananya Sharma (Field Specialist)',
      partnerType: 'Sales Executive',
      city: 'Delhi',
      state: 'Delhi',
      assignedLeadsCount: 14,
      convertedLeadsCount: 5,
      totalCommissionInr: 31500,
    },
    {
      partnerId: 'PARTNER-01',
      partnerName: 'Apex Digital Solutions (PRT-APEX-01)',
      partnerType: 'Channel Partner',
      city: 'Ludhiana',
      state: 'Punjab',
      assignedLeadsCount: 24,
      convertedLeadsCount: 9,
      totalCommissionInr: 54000,
    },
    {
      partnerId: 'PARTNER-02',
      partnerName: 'Bharat MSME Connect LLP',
      partnerType: 'Channel Partner',
      city: 'Kolkata',
      state: 'West Bengal',
      assignedLeadsCount: 19,
      convertedLeadsCount: 6,
      totalCommissionInr: 36000,
    },
  ]);

  // 7. Seed All 8 Demo Scenarios
  await seedAllEightDemoScenarios();

  // 8. Run initial AI Evaluation Suite and persist result
  await AiEvaluationModel.deleteMany({});
  const evalResult = await runAiEvaluationSuite();
  await AiEvaluationModel.create({
    evalRunId: `EVAL-RUN-INITIAL`,
    ...evalResult,
    runAt: new Date('2026-07-15T10:00:00Z'),
  });

  console.log('[Seed] All datasets and 8 demo scenarios seeded successfully.');
  return {
    productsImported: productDocs.length,
    gstImported: gstDocs.length,
    udyamImported: udyamDocs.length,
    leadsImported: leadDocs.length,
  };
}

export async function seedAllEightDemoScenarios(): Promise<void> {
  await BusinessModel.deleteMany({ businessId: /^BIZ-SCEN-/ });
  await AssessmentModel.deleteMany({ businessId: /^BIZ-SCEN-/ });
  await RecommendationModel.deleteMany({ businessId: /^BIZ-SCEN-/ });
  await QuoteModel.deleteMany({ businessId: /^BIZ-SCEN-/ });
  await KycConsentModel.deleteMany({ businessId: /^BIZ-SCEN-/ });
  await KycDocumentModel.deleteMany({ businessId: /^BIZ-SCEN-/ });
  await KycApplicationModel.deleteMany({ businessId: /^BIZ-SCEN-/ });
  await OrderModel.deleteMany({ businessId: /^BIZ-SCEN-/ });
  await OrderStatusHistoryModel.deleteMany({ orderId: /^ORD-SCEN-/ });
  await InstallationModel.deleteMany({ orderId: /^ORD-SCEN-/ });
  await SupportTicketModel.deleteMany({ businessId: /^BIZ-SCEN-/ });
  await NotificationModel.deleteMany({ businessId: /^BIZ-SCEN-/ });
  await LeadModel.deleteMany({ isHistorical: false });

  const businesses = [
    // Scenario 1: Micro Retail Shop (Saffron Bakers, Ludhiana)
    {
      businessId: 'BIZ-SCEN-01',
      businessName: 'Saffron Bakers',
      legalName: 'Sneha Rao (Prop. Saffron Bakers)',
      businessType: 'Bakery',
      segment: 'Micro retail & services',
      address: 'Shop/Unit 83, Market Yard, Ludhiana, Punjab - 416059',
      city: 'Ludhiana',
      state: 'Punjab',
      pinCode: '416059',
      cityTier: 2,
      employeeCount: 4,
      numSites: 1,
      locations: [
        {
          siteName: 'Main Bakery Counter - Market Yard',
          address: 'Shop/Unit 83, Market Yard, Ludhiana, Punjab - 416059',
          city: 'Ludhiana',
          state: 'Punjab',
          pinCode: '416059',
          cityTier: 2,
          isPrimary: true,
        },
      ],
      annualTurnoverBand: '40 lakh - 1.5 cr',
      hasGstin: true,
      gstin: '03PJNXS4821G1ZB',
      gstinVerifiedStatus: 'ACTIVE',
      hasUdyam: true,
      udyamNumber: 'UDYAM-MH-00-9516696',
      udyamVerifiedStatus: 'VERIFIED',
      contactName: 'Sneha Rao',
      contactRole: 'Owner',
      contactPhone: '+91 98765 43210',
      contactEmail: 'sneha@saffronbakers.in',
      preferredLanguage: 'English',
      currentInternet: 'Mobile hotspot',
      currentProvider: 'Competitor B',
      monthlyTelecomSpendInr: 3450,
      profileCompletionPct: 100,
      scenarioTag: 'SCENARIO_1',
    },
    // Scenario 2: Professional Clinic (Harmony Dental Care, Kolkata - Specimen K02)
    {
      businessId: 'BIZ-SCEN-02',
      businessName: 'Harmony Dental Care',
      legalName: 'Joseph Shah (Prop. Harmony Dental Care)',
      businessType: 'Dental clinic',
      segment: 'Professional offices',
      address: 'Shop/Unit 199, Station Road, Kolkata, West Bengal - 347550',
      city: 'Kolkata',
      state: 'West Bengal',
      pinCode: '347550',
      cityTier: 1,
      employeeCount: 12,
      numSites: 1,
      locations: [
        {
          siteName: 'Station Road Clinic',
          address: 'Shop/Unit 199, Station Road, Kolkata, West Bengal - 347550',
          city: 'Kolkata',
          state: 'West Bengal',
          pinCode: '347550',
          cityTier: 1,
          isPrimary: true,
        },
      ],
      annualTurnoverBand: '1.5 - 5 cr',
      hasGstin: true,
      gstin: '19EOGXH4115Y1ZL',
      gstinVerifiedStatus: 'ACTIVE',
      hasUdyam: true,
      udyamNumber: 'UDYAM-WB-00-5053330',
      udyamVerifiedStatus: 'VERIFIED',
      contactName: 'Joseph Shah',
      contactRole: 'Manager',
      contactPhone: '+91 98301 11223',
      contactEmail: 'joseph@harmonydental.in',
      preferredLanguage: 'English',
      currentInternet: 'Home broadband',
      currentProvider: 'Competitor A',
      monthlyTelecomSpendInr: 5800,
      profileCompletionPct: 100,
      scenarioTag: 'SCENARIO_2',
    },
    // Scenario 3: Multi-Site Restaurant (Blue Lotus Kitchens Pvt Ltd, Kolkata - 4 Sites)
    {
      businessId: 'BIZ-SCEN-03',
      businessName: 'Blue Lotus Kitchens Pvt Ltd',
      legalName: 'Blue Lotus Kitchens Pvt Ltd',
      businessType: 'Restaurant chain',
      segment: 'Small multi-site businesses',
      address: 'Shop/Unit 140, Ring Road, Kolkata, West Bengal - 528391',
      city: 'Kolkata',
      state: 'West Bengal',
      pinCode: '528391',
      cityTier: 1,
      employeeCount: 28,
      numSites: 4,
      locations: [
        {
          siteName: 'HQ & Flagship Outlet - Ring Road',
          address: 'Shop/Unit 140, Ring Road, Kolkata, West Bengal - 528391',
          city: 'Kolkata',
          state: 'West Bengal',
          pinCode: '528391',
          cityTier: 1,
          isPrimary: true,
        },
        {
          siteName: 'Outlet #2 - Salt Lake Sector V',
          address: 'Plot 14, Sector V, Kolkata, West Bengal - 700091',
          city: 'Kolkata',
          state: 'West Bengal',
          pinCode: '700091',
          cityTier: 1,
          isPrimary: false,
        },
        {
          siteName: 'Outlet #3 - Park Street',
          address: 'Unit 8, Park Street, Kolkata, West Bengal - 700016',
          city: 'Kolkata',
          state: 'West Bengal',
          pinCode: '700016',
          cityTier: 1,
          isPrimary: false,
        },
        {
          siteName: 'Outlet #4 - New Town Action Area',
          address: 'Block B, New Town, Kolkata, West Bengal - 700156',
          city: 'Kolkata',
          state: 'West Bengal',
          pinCode: '700156',
          cityTier: 1,
          isPrimary: false,
        },
      ],
      annualTurnoverBand: '5 - 25 cr',
      hasGstin: true,
      gstin: '19JENXB8672I1ZA',
      gstinVerifiedStatus: 'ACTIVE',
      hasUdyam: true,
      udyamNumber: 'UDYAM-WB-00-1029713',
      udyamVerifiedStatus: 'VERIFIED',
      contactName: 'Arjun Chatterjee',
      contactRole: 'Owner',
      contactPhone: '+91 98310 44556',
      contactEmail: 'arjun@bluelotuskitchens.in',
      preferredLanguage: 'English',
      currentInternet: 'Mixed per site',
      currentProvider: 'Competitor A',
      monthlyTelecomSpendInr: 26500,
      profileCompletionPct: 100,
      scenarioTag: 'SCENARIO_3',
    },
    // Scenario 4: Manufacturing Business (Royal Auto Components, Ludhiana - 42 Staff, 2 Sites)
    {
      businessId: 'BIZ-SCEN-04',
      businessName: 'Royal Auto Components',
      legalName: 'Naveen Gupta (Prop. Royal Auto Components)',
      businessType: 'Auto-parts unit',
      segment: 'Small manufacturers',
      address: 'Shop/Unit 107, Ring Road, Ludhiana, Punjab - 581165',
      city: 'Ludhiana',
      state: 'Punjab',
      pinCode: '581165',
      cityTier: 2,
      employeeCount: 42,
      numSites: 2,
      locations: [
        {
          siteName: 'Plant 1 - Ring Road CNC & ERP Hub',
          address: 'Shop/Unit 107, Ring Road, Ludhiana, Punjab - 581165',
          city: 'Ludhiana',
          state: 'Punjab',
          pinCode: '581165',
          cityTier: 2,
          isPrimary: true,
        },
        {
          siteName: 'Plant 2 - Focal Point Warehouse',
          address: 'Plot 44, Phase 4 Industrial Area, Ludhiana, Punjab - 581166',
          city: 'Ludhiana',
          state: 'Punjab',
          pinCode: '581166',
          cityTier: 2,
          isPrimary: false,
        },
      ],
      annualTurnoverBand: '5 - 25 cr',
      hasGstin: true,
      gstin: '03JEUXR9399M1ZI',
      gstinVerifiedStatus: 'ACTIVE',
      hasUdyam: false,
      udyamNumber: '',
      udyamVerifiedStatus: 'UNVERIFIED',
      contactName: 'Naveen Gupta',
      contactRole: 'Owner',
      contactPhone: '+91 98140 77889',
      contactEmail: 'naveen@royalautocomp.in',
      preferredLanguage: 'English',
      currentInternet: 'Leased line',
      currentProvider: 'Competitor B',
      monthlyTelecomSpendInr: 44000,
      profileCompletionPct: 95,
      scenarioTag: 'SCENARIO_4',
    },
    // Scenario 5: Invalid / Cancelled GSTIN (Vindhya Tours & Travels - Specimen K01)
    {
      businessId: 'BIZ-SCEN-05',
      businessName: 'Vindhya Tours & Travels',
      legalName: 'Neha Kaur (Prop. Vindhya Tours & Travels)',
      businessType: 'Travel agency',
      segment: 'Professional offices',
      address: 'Shop/Unit 1, Tech Park Road, Visakhapatnam, Andhra Pradesh - 118383',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      pinCode: '118383',
      cityTier: 2,
      employeeCount: 8,
      numSites: 1,
      locations: [
        {
          siteName: 'Tech Park Road Office',
          address: 'Shop/Unit 1, Tech Park Road, Visakhapatnam, Andhra Pradesh - 118383',
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          pinCode: '118383',
          cityTier: 2,
          isPrimary: true,
        },
      ],
      annualTurnoverBand: '40 lakh - 1.5 cr',
      hasGstin: true,
      gstin: '37IHKXV5167L1ZS', // CANCELLED in mock_gstin_registry.csv!
      gstinVerifiedStatus: 'CANCELLED',
      hasUdyam: false,
      udyamNumber: '',
      udyamVerifiedStatus: 'NOT_PROVIDED',
      contactName: 'Neha Kaur',
      contactRole: 'Office admin',
      contactPhone: '+91 98480 22334',
      contactEmail: 'neha@vindhyatours.in',
      preferredLanguage: 'English',
      currentInternet: 'Home broadband',
      currentProvider: 'Local ISP',
      monthlyTelecomSpendInr: 2800,
      profileCompletionPct: 85,
      scenarioTag: 'SCENARIO_5',
    },
    // Scenario 6: KYC Manual Review (Saffron Dental Care LLP - Specimen K04 Blurry GST)
    {
      businessId: 'BIZ-SCEN-06',
      businessName: 'Saffron Dental Care LLP',
      legalName: 'Saffron Dental Care LLP',
      businessType: 'Dental clinic',
      segment: 'Professional offices',
      address: 'Shop/Unit 75, Lake View Colony, Nagpur, Maharashtra - 137452',
      city: 'Nagpur',
      state: 'Maharashtra',
      pinCode: '137452',
      cityTier: 2,
      employeeCount: 14,
      numSites: 1,
      locations: [
        {
          siteName: 'Lake View Colony Clinic',
          address: 'Shop/Unit 75, Lake View Colony, Nagpur, Maharashtra - 137452',
          city: 'Nagpur',
          state: 'Maharashtra',
          pinCode: '137452',
          cityTier: 2,
          isPrimary: true,
        },
      ],
      annualTurnoverBand: '1.5 - 5 cr',
      hasGstin: true,
      gstin: '27PZSXS1936O1ZH',
      gstinVerifiedStatus: 'ACTIVE',
      hasUdyam: true,
      udyamNumber: 'UDYAM-MH-00-6131836',
      udyamVerifiedStatus: 'VERIFIED',
      contactName: 'Fatima Pillai',
      contactRole: 'Partner',
      contactPhone: '+91 98230 55667',
      contactEmail: 'fatima@saffrondental.in',
      preferredLanguage: 'Hindi',
      currentInternet: 'Business broadband',
      currentProvider: 'Competitor A',
      monthlyTelecomSpendInr: 4900,
      profileCompletionPct: 100,
      scenarioTag: 'SCENARIO_6',
    },
    // Scenario 7: Network Unavailable (Himalayan Agro Processing - PIN 999001)
    {
      businessId: 'BIZ-SCEN-07',
      businessName: 'Himalayan Agro Processing',
      legalName: 'Rajवीर Chauhan (Prop. Himalayan Agro Processing)',
      businessType: 'Food processing unit',
      segment: 'Small manufacturers',
      address: 'Plot 9, Remote Hills Industrial Estate, Nashik Outer - 999001',
      city: 'Nashik',
      state: 'Maharashtra',
      pinCode: '999001',
      cityTier: 2,
      employeeCount: 16,
      numSites: 1,
      locations: [
        {
          siteName: 'Remote Hills Processing Unit',
          address: 'Plot 9, Remote Hills Industrial Estate, Nashik Outer - 999001',
          city: 'Nashik',
          state: 'Maharashtra',
          pinCode: '999001',
          cityTier: 2,
          isPrimary: true,
        },
      ],
      annualTurnoverBand: '1.5 - 5 cr',
      hasGstin: true,
      gstin: '27QTBXZ1995X1Z9',
      gstinVerifiedStatus: 'ACTIVE',
      hasUdyam: true,
      udyamNumber: 'UDYAM-MH-00-7656096',
      udyamVerifiedStatus: 'VERIFIED',
      contactName: 'Rajveer Chauhan',
      contactRole: 'Owner',
      contactPhone: '+91 98220 99001',
      contactEmail: 'rajveer@himalayanagro.in',
      preferredLanguage: 'Hindi',
      currentInternet: 'Mobile hotspot',
      currentProvider: 'Local ISP',
      monthlyTelecomSpendInr: 3200,
      profileCompletionPct: 95,
      scenarioTag: 'SCENARIO_7',
    },
    // Scenario 8: Post-Activation Support (Star Electronics, Visakhapatnam - Specimen K12)
    {
      businessId: 'BIZ-SCEN-08',
      businessName: 'Star Electronics',
      legalName: 'Pooja Agarwal (Prop. Star Electronics)',
      businessType: 'Electronics retail chain',
      segment: 'Small multi-site businesses',
      address: 'Shop/Unit 216, Nehru Nagar, Visakhapatnam, Andhra Pradesh - 762071',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      pinCode: '762071',
      cityTier: 2,
      employeeCount: 18,
      numSites: 2,
      locations: [
        {
          siteName: 'Nehru Nagar Showroom #1',
          address: 'Shop/Unit 216, Nehru Nagar, Visakhapatnam, Andhra Pradesh - 762071',
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          pinCode: '762071',
          cityTier: 2,
          isPrimary: true,
        },
        {
          siteName: 'Dwaraka Nagar Showroom #2',
          address: 'Shop/Unit 42, Dwaraka Nagar, Visakhapatnam, Andhra Pradesh - 762072',
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          pinCode: '762072',
          cityTier: 2,
          isPrimary: false,
        },
      ],
      annualTurnoverBand: '1.5 - 5 cr',
      hasGstin: true,
      gstin: '37NBLXS1145E1ZU',
      gstinVerifiedStatus: 'ACTIVE',
      hasUdyam: true,
      udyamNumber: 'UDYAM-AP-00-5186772',
      udyamVerifiedStatus: 'VERIFIED',
      contactName: 'Pooja Agarwal',
      contactRole: 'Owner',
      contactPhone: '+91 98490 88776',
      contactEmail: 'pooja@starelectronics.in',
      preferredLanguage: 'English',
      currentInternet: 'Business broadband',
      currentProvider: 'Accel',
      monthlyTelecomSpendInr: 8900,
      profileCompletionPct: 100,
      scenarioTag: 'SCENARIO_8',
    },
  ];

  await BusinessModel.insertMany(businesses);

  // Pre-compute Readiness Assessments & Recommendations for all 8 Scenario Businesses
  for (const biz of businesses) {
    const scoreData = await calculateDigitalReadinessScore(
      {
        internetReliability: biz.currentInternet === 'Leased line' ? 'dedicated_leased_line' : biz.currentInternet === 'Business broadband' ? 'business_broadband' : 'none_or_hotspot',
        upiAndPayments: 'basic_qr',
        posAndBilling: 'basic_excel',
        businessEmail: biz.segment === 'Professional offices' ? 'custom_domain_email' : 'personal_gmail',
        cloudBackup: 'local_pc_only',
        whatsappBusiness: 'whatsapp_business_app',
        cctvAndPhysicalSecurity: 'local_dvr_cctv',
        cybersecurity: 'free_antivirus',
        backupConnectivity: 'no_backup',
        digitalRecords: 'partial_digital',
        multiSiteManagement: biz.numSites > 1 ? 'independent_site_links' : 'single_site',
      },
      {
        cityTier: biz.cityTier,
        employeeCount: biz.employeeCount,
        numSites: biz.numSites,
        hasGstin: biz.hasGstin,
        gstinStatus: biz.gstinVerifiedStatus,
        segment: biz.segment,
      }
    );

    await AssessmentModel.create({
      assessmentId: `ASSESS-${biz.businessId}`,
      businessId: biz.businessId,
      answers: {
        internetReliability: 'home_broadband',
        upiAndPayments: 'basic_qr',
        posAndBilling: 'basic_excel',
        businessEmail: 'personal_gmail',
        cloudBackup: 'local_pc_only',
        whatsappBusiness: 'whatsapp_business_app',
        cctvAndPhysicalSecurity: 'local_dvr_cctv',
        cybersecurity: 'free_antivirus',
        backupConnectivity: 'no_backup',
        digitalRecords: 'partial_digital',
        multiSiteManagement: biz.numSites > 1 ? 'independent_site_links' : 'single_site',
      },
      ...scoreData,
    });

    const recData = await generateCatalogueRecommendations({
      cityTier: biz.cityTier,
      employeeCount: biz.employeeCount,
      numSites: biz.numSites,
      hasGstin: biz.hasGstin,
      gstinStatus: biz.gstinVerifiedStatus,
      segment: biz.segment,
      businessType: biz.businessType,
      requirements: [],
      budgetInr: biz.monthlyTelecomSpendInr,
    });

    await RecommendationModel.create({
      recommendationId: `REC-${biz.businessId}`,
      businessId: biz.businessId,
      ...recData,
    });

    // Also create a generated/accepted Quote for Scenarios 1, 2, 3, 5, 6, 8
    const recBundle = recData.bundles[1] || recData.bundles[0];
    if (recBundle) {
      const isAccepted = ['BIZ-SCEN-01', 'BIZ-SCEN-06', 'BIZ-SCEN-08'].includes(biz.businessId);
      await QuoteModel.create({
        quoteId: `QT-${biz.businessId}`,
        businessId: biz.businessId,
        bundleName: recBundle.bundleName,
        tier: recBundle.tier,
        items: recBundle.products.map((p) => ({
          productId: p.productId,
          productName: p.productName,
          category: p.category,
          unit: p.unit,
          quantity: p.quantity,
          snapshotUnitMonthlyPriceInr: p.unitMonthlyPriceInr,
          snapshotUnitSetupFeeInr: p.unitSetupFeeInr,
          lineMonthlyTotalInr: p.lineMonthlyTotalInr,
          lineSetupTotalInr: p.lineSetupTotalInr,
          minContractMonths: p.minContractMonths,
          typicalInstallDays: p.typicalInstallDays,
        })),
        monthlyTotalInr: recBundle.monthlyTotalInr,
        setupTotalInr: recBundle.setupTotalInr,
        contractMonths: recBundle.contractMonths,
        contractTotalValueInr: recBundle.contractTotalValueInr,
        estimatedInstallDays: recBundle.estimatedInstallDays,
        feasibilityStatus: biz.businessId === 'BIZ-SCEN-07' ? 'NOT_AVAILABLE' : 'AVAILABLE',
        status: isAccepted ? 'ACCEPTED' : 'GENERATED',
        acceptedAt: isAccepted ? new Date('2026-07-10T10:00:00Z') : undefined,
        immutablePriceSnapshot: true,
      });
    }
  }

  // Seed KYC Applications for Scenarios 1 (K03 Clean), 5 (K01 Cancelled GSTIN), 6 (K04 Blurry Manual Review + K07, K10, K11 in queue), 8 (K12 Clean)
  const kycSeeds = [
    { bizId: 'BIZ-SCEN-01', spec: 'K03', bName: 'Ganesh Woodcraft / Saffron Bakers' },
    { bizId: 'BIZ-SCEN-02', spec: 'K02', bName: 'Harmony Dental Care' },
    { bizId: 'BIZ-SCEN-05', spec: 'K01', bName: 'Vindhya Tours & Travels' },
    { bizId: 'BIZ-SCEN-06', spec: 'K04', bName: 'Saffron Dental Care LLP' },
    { bizId: 'BIZ-SCEN-08', spec: 'K12', bName: 'Star Electronics' },
    // Additional review queue cases so KYC Reviewer Queue is rich and realistic
    { bizId: 'BIZ-QUEUE-K05', spec: 'K05', bName: 'Balaji Realty LLP' },
    { bizId: 'BIZ-QUEUE-K06', spec: 'K06', bName: 'Saffron Unisex Salon' },
    { bizId: 'BIZ-QUEUE-K07', spec: 'K07', bName: 'Neelgiri Physio Clinic' },
    { bizId: 'BIZ-QUEUE-K10', spec: 'K10', bName: 'Kaveri Stays LLP' },
    { bizId: 'BIZ-QUEUE-K11', spec: 'K11', bName: 'Trinity Bake House Pvt Ltd' },
  ];

  for (const ks of kycSeeds) {
    const consentId = `CNS-${ks.spec}`;
    await KycConsentModel.create({
      consentId,
      businessId: ks.bizId,
      policyVersion: 'DPDP-2026-v1.2',
      consentGiven: true,
      purposesAccepted: [
        'GSTIN & Udyam Verification against Official Registry',
        'OCR & Cross-Document Identity & Address Validation',
        '180-Day Encrypted Audit Retention',
      ],
      retentionDays: 180,
      timestamp: new Date('2026-07-12T09:30:00Z'),
    });

    const val = await runComprehensiveKycValidation({
      specimenCode: ks.spec,
      businessName: ks.bName,
    });

    const kycId = `KYC-${ks.bizId}`;
    const docIds: string[] = [];

    for (const [docType, docInfo] of Object.entries(val.extractedDocuments)) {
      if (!docInfo) continue;
      const dId = `DOC-${ks.spec}-${docType}`;
      docIds.push(dId);
      await KycDocumentModel.create({
        documentId: dId,
        kycId,
        businessId: ks.bizId,
        documentType: docType as any,
        fileName: (docInfo as any).fileName,
        specimenCode: ks.spec,
        mimeType: 'image/png',
        fileSizeBytes: 145000,
        storagePath: `/api/kyc/specimen-image/${(docInfo as any).fileName}`,
        extractedFields: docInfo,
        fieldConfidence: { overall: (docInfo as any).confidence || 0.95 },
        overallConfidence: (docInfo as any).confidence || 0.95,
        qualityFlags: (docInfo as any).qualityFlags || [],
      });
    }

    await KycApplicationModel.create({
      kycId,
      businessId: ks.bizId,
      quoteId: `QT-${ks.bizId}`,
      specimenCode: ks.spec,
      consentId,
      status: val.determinedStatus,
      documents: docIds,
      gstinVerification: val.gstinVerification,
      udyamVerification: val.udyamVerification,
      crossValidationIssues: val.crossValidationIssues,
      addressProofAgeDays: val.addressProofAgeDays,
      referenceDateUsed: val.referenceDateUsed,
    });
  }

  // Seed Orders for Scenario 1 (INSTALLATION_SCHEDULED), Scenario 6 (KYC_PENDING), and Scenario 8 (ACTIVATED)
  const q1 = await QuoteModel.findOne({ quoteId: 'QT-BIZ-SCEN-01' });
  if (q1) {
    await OrderModel.create({
      orderId: 'ORD-SCEN-01',
      businessId: 'BIZ-SCEN-01',
      quoteId: q1.quoteId,
      kycId: 'KYC-BIZ-SCEN-01',
      status: 'INSTALLATION_SCHEDULED',
      products: q1.items,
      monthlyTotalInr: q1.monthlyTotalInr,
      setupTotalInr: q1.setupTotalInr,
      contractMonths: q1.contractMonths,
      overallInstallDays: q1.estimatedInstallDays,
      expectedInstallationDate: '2026-07-18',
      scheduledSlot: '2026-07-18 (10:00 AM - 01:00 PM)',
      pendingActions: ['Keep server/router power point ready at Market Yard shop counter'],
      processedEventKeys: ['EVT-INIT-01'],
    });

    await OrderStatusHistoryModel.insertMany([
      {
        orderId: 'ORD-SCEN-01',
        eventType: 'QUOTE_ACCEPTED',
        previousStatus: 'NONE',
        newStatus: 'QUOTE_ACCEPTED',
        actor: 'Sneha Rao',
        actorRole: 'Customer',
        reason: 'Customer accepted Quote QT-BIZ-SCEN-01',
        timestamp: new Date('2026-07-12T10:00:00Z'),
      },
      {
        orderId: 'ORD-SCEN-01',
        eventType: 'KYC_VERIFIED',
        previousStatus: 'QUOTE_ACCEPTED',
        newStatus: 'KYC_VERIFIED',
        actor: 'Smart KYC Engine',
        actorRole: 'System',
        reason: 'GSTIN, Udyam & Address Proof verified cleanly',
        timestamp: new Date('2026-07-12T10:15:00Z'),
      },
      {
        orderId: 'ORD-SCEN-01',
        eventType: 'INSTALLATION_SCHEDULED',
        previousStatus: 'KYC_VERIFIED',
        newStatus: 'INSTALLATION_SCHEDULED',
        actor: 'Provisioning Engine',
        actorRole: 'System',
        reason: 'Field engineer Ramesh Verma assigned for 2026-07-18 morning slot',
        timestamp: new Date('2026-07-12T10:30:00Z'),
      },
    ]);

    await InstallationModel.create({
      installationId: 'INST-SCEN-01',
      orderId: 'ORD-SCEN-01',
      businessId: 'BIZ-SCEN-01',
      siteAddress: 'Shop/Unit 83, Market Yard, Ludhiana, Punjab - 416059',
      city: 'Ludhiana',
      pinCode: '416059',
      technicianName: 'Ramesh Verma (Field Eng #408)',
      technicianPhone: '+91 98112 23344',
      scheduledDate: '2026-07-18',
      slotWindow: '10:00 AM - 01:00 PM',
      status: 'SCHEDULED',
      productTimelines: q1.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        typicalInstallDays: i.typicalInstallDays,
        status: 'SCHEDULED',
      })),
    });
  }

  const q8 = await QuoteModel.findOne({ quoteId: 'QT-BIZ-SCEN-08' });
  if (q8) {
    await OrderModel.create({
      orderId: 'ORD-SCEN-08',
      businessId: 'BIZ-SCEN-08',
      quoteId: q8.quoteId,
      kycId: 'KYC-BIZ-SCEN-08',
      status: 'ACTIVATED',
      products: q8.items,
      monthlyTotalInr: q8.monthlyTotalInr,
      setupTotalInr: q8.setupTotalInr,
      contractMonths: q8.contractMonths,
      overallInstallDays: q8.estimatedInstallDays,
      expectedInstallationDate: '2026-07-09',
      actualActivationDate: '2026-07-08',
      scheduledSlot: '2026-07-08 (Completed)',
      pendingActions: [],
      processedEventKeys: ['EVT-INIT-08'],
    });

    await OrderStatusHistoryModel.insertMany([
      {
        orderId: 'ORD-SCEN-08',
        eventType: 'QUOTE_ACCEPTED',
        previousStatus: 'NONE',
        newStatus: 'QUOTE_ACCEPTED',
        actor: 'Pooja Agarwal',
        actorRole: 'Customer',
        reason: 'Accepted multi-site retail bundle quote',
        timestamp: new Date('2026-07-04T11:00:00Z'),
      },
      {
        orderId: 'ORD-SCEN-08',
        eventType: 'KYC_VERIFIED',
        previousStatus: 'QUOTE_ACCEPTED',
        newStatus: 'KYC_VERIFIED',
        actor: 'Smart KYC Engine',
        actorRole: 'System',
        reason: 'Specimen K12 verified with 98% confidence',
        timestamp: new Date('2026-07-04T11:10:00Z'),
      },
      {
        orderId: 'ORD-SCEN-08',
        eventType: 'INSTALLATION_SCHEDULED',
        previousStatus: 'KYC_VERIFIED',
        newStatus: 'INSTALLATION_SCHEDULED',
        actor: 'Provisioning Engine',
        actorRole: 'System',
        reason: 'Scheduled fibre + POS installation across 2 Visakhapatnam sites',
        timestamp: new Date('2026-07-05T09:00:00Z'),
      },
      {
        orderId: 'ORD-SCEN-08',
        eventType: 'INSTALLATION_STARTED',
        previousStatus: 'INSTALLATION_SCHEDULED',
        newStatus: 'INSTALLATION_IN_PROGRESS',
        actor: 'Suresh Babu (Field Eng #219)',
        actorRole: 'Admin',
        reason: 'ONT termination & POS counter configuration in progress',
        timestamp: new Date('2026-07-08T10:30:00Z'),
      },
      {
        orderId: 'ORD-SCEN-08',
        eventType: 'SERVICE_ACTIVATED',
        previousStatus: 'INSTALLATION_IN_PROGRESS',
        newStatus: 'ACTIVATED',
        actor: 'Provisioning Engine',
        actorRole: 'System',
        reason: 'All links tested and activated 1 day ahead of SLA',
        timestamp: new Date('2026-07-08T16:45:00Z'),
      },
    ]);
  }

  // Seed Live Handoff Leads for Scenario 4 (Manufacturing) and Scenario 7 (Feasibility Not Available)
  await LeadModel.insertMany([
    {
      leadId: 'HND-LIVE-01',
      isHistorical: false,
      createdDate: '2026-07-15',
      leadSource: 'Website form',
      businessName: 'Royal Auto Components',
      businessType: 'Auto-parts unit',
      segment: 'Small manufacturers',
      city: 'Ludhiana',
      cityTier: 2,
      state: 'Punjab',
      preferredLanguage: 'English',
      employeeCount: 42,
      numSites: 2,
      annualTurnoverBand: '5 - 25 cr',
      hasGstin: true,
      gstin: '03JEUXR9399M1ZI',
      hasUdyam: false,
      currentInternet: 'Leased line',
      currentProvider: 'Competitor B',
      monthlyTelecomSpendInr: 44000,
      productsOfInterest: ['P06', 'P21', 'P24', 'P10'],
      contactName: 'Naveen Gupta',
      contactRole: 'Owner',
      stageReached: 'Needs assessed',
      outcome: 'Active Handoff',
      assignedToUserId: 'EXEC-01',
      assignedToName: 'Rohan Deshmukh (Enterprise Sales)',
      assignedRole: 'Sales Executive',
      handoffReason: 'Customer requested Managed SD-WAN (P10) with 2 sites (requires >=3 sites) + custom 100 Mbps Leased Line SLA architecture.',
      handoffStatus: 'ASSIGNED',
      conversationSummary:
        'Manufacturing unit in Ludhiana (42 staff, 2 plants) requires 100 Mbps Dedicated ILL (P06), Managed Firewall (P21) and Machine Monitoring IoT (P24). Inquired about P10 SD-WAN and P03 1G Fibre which were blocked by deterministic eligibility rules (2 sites < 3 min_sites; Ludhiana is Tier 2).',
      unresolvedQuestions: [
        'Can a 3rd warehouse site in Jalandhar be added next month to qualify for P10 Managed SD-WAN?',
        'Custom dual-fibre path diversity for Plant 1 ERP server room.',
      ],
      recommendedProductsAttempted: ['P06', 'P21', 'P24', 'P11'],
      propensityScore: 84,
      propensityPriority: 'HIGH',
      propensityReasons: [
        'Active GSTIN available for enterprise product eligibility',
        'Existing telecom spend (₹44,000/mo) supports bundle affordability',
        'High-intent digital advisor consultation completed',
      ],
      suggestedNextAction: 'Schedule joint Solution Architect call for Plant 1 & Plant 2 ILL + Firewall deployment.',
      followUpNotes: [
        {
          author: 'AI Business Advisor',
          note: 'Auto-escalated with structured context summary so customer does not repeat firmographics.',
          timestamp: new Date('2026-07-15T09:15:00Z'),
        },
      ],
      acquisitionCostInr: 450,
    },
    {
      leadId: 'HND-LIVE-02',
      isHistorical: false,
      createdDate: '2026-07-15',
      leadSource: 'Website form',
      businessName: 'Himalayan Agro Processing',
      businessType: 'Food processing unit',
      segment: 'Small manufacturers',
      city: 'Nashik',
      cityTier: 2,
      state: 'Maharashtra',
      preferredLanguage: 'Hindi',
      employeeCount: 16,
      numSites: 1,
      annualTurnoverBand: '1.5 - 5 cr',
      hasGstin: true,
      gstin: '27QTBXZ1995X1Z9',
      hasUdyam: true,
      udyamNumber: 'UDYAM-MH-00-7656096',
      currentInternet: 'Mobile hotspot',
      currentProvider: 'Local ISP',
      monthlyTelecomSpendInr: 3200,
      productsOfInterest: ['P02', 'P04', 'P07'],
      contactName: 'Rajveer Chauhan',
      contactRole: 'Owner',
      stageReached: 'Needs assessed',
      outcome: 'Active Handoff',
      assignedToUserId: 'PARTNER-01',
      assignedToName: 'Apex Digital Solutions (Channel Partner)',
      assignedRole: 'Channel Partner',
      handoffReason: 'Network Feasibility returned NOT_AVAILABLE at PIN 999001 (Remote Hills Industrial Estate). Checkout restricted; Field Ops survey required.',
      handoffStatus: 'AWAITING_ASSIGNMENT',
      conversationSummary:
        'Food processing unit at PIN 999001 failed automated fibre/AirFiber serviceability check. Customer requires interim multi-SIM Business Postpaid 599 (P08) + physical microwave/fibre feasibility survey.',
      unresolvedQuestions: ['Distance from nearest highway optical splice closure to Plot 9.'],
      recommendedProductsAttempted: ['P02', 'P04'],
      propensityScore: 68,
      propensityPriority: 'HIGH',
      propensityReasons: [
        'Both GSTIN and Udyam registrations available',
        'Currently on Mobile hotspot — strong upgrade pain point',
      ],
      suggestedNextAction: 'Dispatch Field Operations engineer for physical line-of-sight RF survey.',
      followUpNotes: [],
      acquisitionCostInr: 250,
    },
  ]);

  // Seed Support Tickets for Scenario 8
  await SupportTicketModel.insertMany([
    {
      ticketId: 'TKT-SCEN-801',
      businessId: 'BIZ-SCEN-08',
      orderId: 'ORD-SCEN-08',
      category: 'ADDITIONAL_SIM',
      subject: 'Add 3 Business Postpaid 299 (P07) SIMs for delivery staff',
      description: 'We need 3 additional corporate mobile connections under our existing Star Electronics account for Visakhapatnam delivery executives.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      statusHistory: [
        {
          status: 'OPEN',
          note: 'Created via Post-Activation Service Assistant',
          actor: 'Pooja Agarwal',
          timestamp: new Date('2026-07-14T14:20:00Z'),
        },
        {
          status: 'IN_PROGRESS',
          note: 'KYC pre-verified from Order ORD-SCEN-08; SIM dispatch scheduled.',
          actor: 'Enterprise Service Desk',
          timestamp: new Date('2026-07-14T16:00:00Z'),
        },
      ],
    },
  ]);

  // Seed Referrals
  await ReferralModel.deleteMany({});
  await ReferralModel.insertMany([
    {
      referralCode: 'UDYAM-STAR-100',
      referrerBusinessId: 'BIZ-SCEN-08',
      referrerName: 'Star Electronics (Pooja Agarwal)',
      referredBusinessName: 'Vizag Digital Printers',
      referredContactPhone: '+91 98491 12233',
      city: 'Visakhapatnam',
      status: 'ACTIVATED',
      rewardAmountInr: 1500,
    },
    {
      referralCode: 'UDYAM-SAFFRON-200',
      referrerBusinessId: 'BIZ-SCEN-01',
      referrerName: 'Saffron Bakers (Sneha Rao)',
      referredBusinessName: 'Ludhiana Sweet House',
      referredContactPhone: '+91 98142 33445',
      city: 'Ludhiana',
      status: 'QUOTE_ACCEPTED',
      rewardAmountInr: 1000,
    },
  ]);

  // Seed Notifications
  await NotificationModel.insertMany([
    {
      notificationId: 'NOTIF-01',
      businessId: 'BIZ-SCEN-01',
      type: 'INSTALLATION_SCHEDULED',
      title: 'Installation Scheduled for 18 July 2026',
      message: 'Field Engineer Ramesh Verma (+91 98112 23344) is scheduled to install Biz Fibre 100 & Cloud POS on 2026-07-18 (10:00 AM - 01:00 PM).',
      channelSimulated: 'WHATSAPP_SIMULATED',
      isRead: false,
      createdAt: new Date('2026-07-12T10:31:00Z'),
    },
    {
      notificationId: 'NOTIF-05',
      businessId: 'BIZ-SCEN-05',
      type: 'KYC_CORRECTION',
      title: 'Action Required: GSTIN Cancelled in Registry',
      message: 'Your uploaded GST Certificate (37IHKXV5167L1ZS) returned status CANCELLED in the GST registry and Udyam number is blank. Please provide an active GSTIN or select a non-GST bundle.',
      channelSimulated: 'IN_APP',
      isRead: false,
      createdAt: new Date('2026-07-14T11:00:00Z'),
    },
    {
      notificationId: 'NOTIF-06',
      businessId: 'BIZ-SCEN-06',
      type: 'KYC_MANUAL_REVIEW',
      title: 'KYC Application Routed to Compliance Specialist',
      message: 'Your GST Certificate image (K04) had low OCR sharpness (62%). A human KYC Reviewer has been assigned to verify your document within 2 hours.',
      channelSimulated: 'SMS_SIMULATED',
      isRead: false,
      createdAt: new Date('2026-07-14T12:15:00Z'),
    },
    {
      notificationId: 'NOTIF-08',
      businessId: 'BIZ-SCEN-08',
      type: 'SERVICE_ACTIVATED',
      title: 'All Services Activated — Welcome to Udyam One!',
      message: 'Order ORD-SCEN-08 is now ACTIVE across 2 Visakhapatnam sites. Access your Post-Activation Service Assistant anytime.',
      channelSimulated: 'WHATSAPP_SIMULATED',
      isRead: true,
      createdAt: new Date('2026-07-08T16:46:00Z'),
    },
  ]);
}
