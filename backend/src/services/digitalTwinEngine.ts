import {
  BusinessModel,
  AssessmentModel,
  ConversationModel,
  ProductModel,
  OrderModel,
} from '../models';
import { calculateDigitalReadinessScore, ReadinessAnswers } from './assessmentEngine';
import {
  checkSingleProductEligibility,
  determineDefaultQuantity,
  getUnitMonthlyPrice,
  generateCatalogueRecommendations,
} from './catalogueEngine';

export interface DigitalTwinSimulationInput {
  businessId?: string;
  targetTier?: 'Essential' | 'Recommended' | 'Advanced';
  customProductIds?: string[];
  answersOverride?: Partial<ReadinessAnswers>;
  profileOverride?: Record<string, any>;
}

export interface OperationalGapDetail {
  id: string;
  dimension: 'Connectivity' | 'Communication' | 'Productivity' | 'Security' | 'Business Continuity';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  gapTitle: string;
  currentState: string;
  operationalConsequence: string;
  recommendedProductId: string;
  recommendedProductName: string;
  monthlyCostInr: number;
}

export async function generateBusinessDigitalTwin(input: DigitalTwinSimulationInput) {
  const bId = input.businessId || 'BIZ-SCEN-01';
  const [bizDoc, assessDoc, convDoc, orderDoc, allProducts] = await Promise.all([
    BusinessModel.findOne({ businessId: bId }).lean(),
    AssessmentModel.findOne({ businessId: bId }).lean(),
    ConversationModel.findOne({ businessId: bId }).lean(),
    OrderModel.findOne({ businessId: bId }).sort({ createdAt: -1 }).lean(),
    ProductModel.find().sort({ productId: 1 }),
  ]);

  const prodMap = new Map(allProducts.map((p) => [p.productId, p]));

  const biz = {
    businessId: bId,
    businessName: input.profileOverride?.businessName || bizDoc?.businessName || 'MSME Enterprise',
    businessType: input.profileOverride?.businessType || bizDoc?.businessType || 'Retail shop',
    segment: input.profileOverride?.segment || bizDoc?.segment || 'Micro retail & services',
    city: input.profileOverride?.city || bizDoc?.city || 'Mumbai',
    state: input.profileOverride?.state || bizDoc?.state || 'Maharashtra',
    cityTier: Number(input.profileOverride?.cityTier ?? bizDoc?.cityTier ?? 1),
    employeeCount: Number(input.profileOverride?.employeeCount ?? bizDoc?.employeeCount ?? 5),
    numSites: Number(input.profileOverride?.numSites ?? bizDoc?.numSites ?? 1),
    hasGstin: Boolean(input.profileOverride?.hasGstin ?? bizDoc?.hasGstin ?? true),
    gstinStatus: input.profileOverride?.gstinVerifiedStatus || bizDoc?.gstinVerifiedStatus || 'ACTIVE',
    hasUdyam: Boolean(input.profileOverride?.hasUdyam ?? bizDoc?.hasUdyam ?? false),
    currentInternet: input.profileOverride?.currentInternet || bizDoc?.currentInternet || 'Home broadband',
    currentProvider: input.profileOverride?.currentProvider || bizDoc?.currentProvider || 'Local ISP',
    monthlyTelecomSpendInr: Number(
      input.profileOverride?.monthlyTelecomSpendInr ?? bizDoc?.monthlyTelecomSpendInr ?? 2500
    ),
  };

  // Infer baseline readiness answers from saved assessment + business profile
  const savedAnswers: Partial<ReadinessAnswers> = {
    internetReliability:
      biz.currentInternet.toLowerCase().includes('leased')
        ? 'dedicated_leased_line'
        : biz.currentInternet.toLowerCase().includes('business')
        ? 'business_broadband'
        : biz.currentInternet.toLowerCase().includes('hotspot')
        ? 'none_or_hotspot'
        : 'home_broadband',
    multiSiteManagement: biz.numSites > 1 ? 'independent_site_links' : 'single_site',
    upiAndPayments: 'basic_qr',
    posAndBilling: 'basic_excel',
    businessEmail: 'personal_gmail',
    whatsappBusiness: 'whatsapp_business_app',
    cloudBackup: 'local_pc_only',
    cybersecurity: 'free_antivirus',
    cctvAndPhysicalSecurity: 'local_dvr_cctv',
    backupConnectivity: 'no_backup',
    digitalRecords: 'partial_digital',
    ...(assessDoc?.answers || {}),
    ...(input.answersOverride || {}),
  };

  const eligibilityContext = {
    cityTier: biz.cityTier,
    employeeCount: biz.employeeCount,
    numSites: biz.numSites,
    hasGstin: biz.hasGstin,
    gstinStatus: biz.gstinStatus,
    segment: biz.segment,
  };

  // 1. Current Digital Readiness Score (reusing assessmentEngine)
  const currentReadiness = await calculateDigitalReadinessScore(savedAnswers, eligibilityContext);

  // Merge requirements from Advisor Conversation + Assessment
  const advisorReqs = convDoc?.extractedRequirements?.requirements || [];
  const recBundleResult = await generateCatalogueRecommendations({
    ...eligibilityContext,
    businessType: biz.businessType,
    requirements: advisorReqs,
    budgetInr: convDoc?.extractedRequirements?.budget || biz.monthlyTelecomSpendInr,
  });

  // Select target simulation bundle or custom products
  const targetTier = input.targetTier || 'Recommended';
  const selectedBundle =
    recBundleResult.bundles.find((b) => b.tier === targetTier) || recBundleResult.bundles[1];

  const simulatedProductIds =
    input.customProductIds && input.customProductIds.length > 0
      ? input.customProductIds
      : selectedBundle.products.map((p) => p.productId);

  const simulatedIdSet = new Set(simulatedProductIds);

  // 2. Build Business-Specific Operational Gaps & Consequences (strictly grounded in actual profile/answers)
  const operationalGaps: OperationalGapDetail[] = [];

  const addGap = (
    id: string,
    dimension: OperationalGapDetail['dimension'],
    severity: OperationalGapDetail['severity'],
    gapTitle: string,
    currentState: string,
    operationalConsequence: string,
    candidateIds: string[]
  ) => {
    const eligibleProd = candidateIds
      .map((pid) => prodMap.get(pid))
      .find((p) => p && checkSingleProductEligibility(p, eligibilityContext).eligible);
    const chosenProd = eligibleProd || prodMap.get(candidateIds[0])!;
    const qty = determineDefaultQuantity(chosenProd, {
      ...eligibilityContext,
      requirements: advisorReqs,
    });
    operationalGaps.push({
      id,
      dimension,
      severity,
      gapTitle,
      currentState,
      operationalConsequence,
      recommendedProductId: chosenProd.productId,
      recommendedProductName: chosenProd.productName,
      monthlyCostInr: getUnitMonthlyPrice(chosenProd) * qty,
    });
  };

  // Check multi-site / connectivity gaps
  if (biz.numSites > 1 && savedAnswers.multiSiteManagement !== 'central_sdwan') {
    addGap(
      'GAP-MULTISITE',
      'Connectivity',
      'HIGH',
      `Uncoordinated Connectivity Across ${biz.numSites} Locations`,
      `${biz.numSites} sites operating on separate ${biz.currentInternet.toLowerCase()} links (${biz.currentProvider})`,
      `Each outlet manages internet independently with no centralized traffic prioritisation, unified firewall policy, or cross-branch visibility.`,
      ['P10', 'P02', 'P09']
    );
  } else if (currentReadiness.categoryScores.connectivity < 78) {
    addGap(
      'GAP-PRIMARY-LINK',
      'Connectivity',
      'HIGH',
      'Consumer-Grade Primary Internet Bottleneck',
      `Relying on ${biz.currentInternet} via ${biz.currentProvider}`,
      `Best-effort consumer broadband lacks business SLA guarantees, causing slow UPI/POS checkout and cloud application lag during peak business hours.`,
      ['P02', 'P01', 'P04']
    );
  }

  // Check backup connectivity / continuity
  if (savedAnswers.backupConnectivity === 'no_backup' || savedAnswers.backupConnectivity === 'manual_mobile_hotspot') {
    addGap(
      'GAP-FAILOVER',
      'Business Continuity',
      'HIGH',
      'No Automated Link Failover During Fibre Cuts',
      savedAnswers.backupConnectivity === 'no_backup'
        ? 'Zero backup internet link at business premises'
        : 'Manual staff mobile hotspot tethering during outages',
      `Any last-mile cable cut halts counter billing, UPI reconciliation, and cloud software access across ${biz.numSites} location(s) until physical repair.`,
      ['P09', 'P04']
    );
  }

  // Check cloud data backup
  if (savedAnswers.cloudBackup !== 'automated_cloud_backup') {
    addGap(
      'GAP-CLOUD-BACKUP',
      'Business Continuity',
      'MEDIUM',
      'Local-Only Business & Accounting Data Storage',
      'Critical invoices and customer records stored on local PCs or manual drives',
      `Hardware failure, theft, or ransomware on local billing PCs risks permanent loss of GST records and customer history.`,
      ['P17', 'P16']
    );
  }

  // Check customer communication
  if (savedAnswers.whatsappBusiness !== 'verified_whatsapp_api' || savedAnswers.businessEmail === 'personal_gmail') {
    addGap(
      'GAP-COMM',
      'Communication',
      'MEDIUM',
      'Fragmented & Unverified Customer Communication',
      `Using personal Gmail or unverified staff WhatsApp across ${biz.employeeCount} staff members`,
      `Customer inquiries are tied to individual employee phones with no centralized templates, automated order alerts, or verified business identity.`,
      ['P15', 'P16', 'P12']
    );
  }

  // Check productivity / POS
  if (savedAnswers.posAndBilling !== 'cloud_gst_pos') {
    addGap(
      'GAP-PRODUCTIVITY',
      'Productivity',
      'MEDIUM',
      'Manual or Disconnected Billing & Inventory Workflow',
      'Spreadsheets or paper-based billing without real-time GST & stock sync',
      `Increases checkout wait times, manual GST filing reconciliation effort, and stock-out blind spots.`,
      ['P19', 'P16']
    );
  }

  // Check security
  if (savedAnswers.cybersecurity !== 'managed_endpoint_and_firewall') {
    addGap(
      'GAP-SECURITY',
      'Security',
      'HIGH',
      'Unprotected Endpoints & Premises Network',
      `Endpoints for ${biz.employeeCount} employees lack managed EDR/firewall protection`,
      `Exposes payment terminals, accounting PCs, and guest Wi-Fi networks to phishing, malware, and unauthorized access.`,
      ['P20', 'P21', 'P23']
    );
  }

  // 3. Simulate Post-Deployment Readiness Answers based on Simulated Products
  const projectedAnswers: Partial<ReadinessAnswers> = { ...savedAnswers };

  if (simulatedIdSet.has('P05') || simulatedIdSet.has('P06')) {
    projectedAnswers.internetReliability = 'dedicated_leased_line';
  } else if (
    simulatedIdSet.has('P01') ||
    simulatedIdSet.has('P02') ||
    simulatedIdSet.has('P03') ||
    simulatedIdSet.has('P04')
  ) {
    projectedAnswers.internetReliability = 'business_broadband';
  }

  if (simulatedIdSet.has('P10')) {
    projectedAnswers.multiSiteManagement = 'central_sdwan';
  }
  if (simulatedIdSet.has('P09') || simulatedIdSet.has('P04')) {
    projectedAnswers.backupConnectivity = 'auto_4g_5g_failover';
  }
  if (simulatedIdSet.has('P17')) {
    projectedAnswers.cloudBackup = 'automated_cloud_backup';
  }
  if (simulatedIdSet.has('P15') || simulatedIdSet.has('P12')) {
    projectedAnswers.whatsappBusiness = 'verified_whatsapp_api';
  }
  if (simulatedIdSet.has('P16')) {
    projectedAnswers.businessEmail = 'full_cloud_office_suite';
  }
  if (simulatedIdSet.has('P19')) {
    projectedAnswers.posAndBilling = 'cloud_gst_pos';
    projectedAnswers.upiAndPayments = 'integrated_pos';
    projectedAnswers.digitalRecords = 'fully_cloud_erp_crm';
  }
  if (simulatedIdSet.has('P20') || simulatedIdSet.has('P21')) {
    projectedAnswers.cybersecurity = 'managed_endpoint_and_firewall';
  }
  if (simulatedIdSet.has('P23') || simulatedIdSet.has('P24')) {
    projectedAnswers.cctvAndPhysicalSecurity = 'cloud_cctv_and_iot';
  }

  const projectedReadiness = await calculateDigitalReadinessScore(projectedAnswers, eligibilityContext);

  // Build itemized services for the simulation
  const simulatedServices = Array.from(simulatedIdSet)
    .map((pid) => prodMap.get(pid))
    .filter(Boolean)
    .map((prod) => {
      const p = prod!;
      const qty = determineDefaultQuantity(p, {
        ...eligibilityContext,
        requirements: advisorReqs,
      });
      const unitMonthly = getUnitMonthlyPrice(p);
      return {
        productId: p.productId,
        productName: p.productName,
        category: p.category,
        unit: p.unit,
        quantity: qty,
        unitMonthlyInr: unitMonthly,
        lineMonthlyTotalInr: unitMonthly * qty,
        lineSetupTotalInr: p.oneTimeSetupInr * qty,
        capabilityUnlocked: p.description,
      };
    });

  const simulatedMonthlyInvestmentInr = simulatedServices.reduce(
    (s, i) => s + i.lineMonthlyTotalInr,
    0
  );
  const simulatedSetupInvestmentInr = simulatedServices.reduce(
    (s, i) => s + i.lineSetupTotalInr,
    0
  );

  // Segment benchmark scores (derived from Q2 2026 activated segment profiles)
  const segmentBenchmarks: Record<string, number> = {
    'Micro retail & services': 68,
    'Professional offices': 76,
    'Small multi-site businesses': 81,
    'Small manufacturers': 84,
  };
  const peerBenchmark = segmentBenchmarks[biz.segment] || 72;

  const radarChartData = [
    {
      dimension: 'Connectivity',
      currentScore: currentReadiness.categoryScores.connectivity,
      projectedScore: projectedReadiness.categoryScores.connectivity,
      peerBenchmark: peerBenchmark + 4,
    },
    {
      dimension: 'Communication',
      currentScore: currentReadiness.categoryScores.communication,
      projectedScore: projectedReadiness.categoryScores.communication,
      peerBenchmark: peerBenchmark,
    },
    {
      dimension: 'Productivity',
      currentScore: currentReadiness.categoryScores.productivity,
      projectedScore: projectedReadiness.categoryScores.productivity,
      peerBenchmark: peerBenchmark + 2,
    },
    {
      dimension: 'Security',
      currentScore: currentReadiness.categoryScores.security,
      projectedScore: projectedReadiness.categoryScores.security,
      peerBenchmark: peerBenchmark - 4,
    },
    {
      dimension: 'Continuity',
      currentScore: currentReadiness.categoryScores.businessContinuity,
      projectedScore: projectedReadiness.categoryScores.businessContinuity,
      peerBenchmark: peerBenchmark - 2,
    },
  ];

  return {
    twinId: `TWIN-${bId}`,
    generatedAt: new Date().toISOString(),
    simulationDisclaimer:
      'SIMULATION NOTICE: Projected digital maturity scores and capability gains are deterministic simulations based on catalogue specifications, not guaranteed commercial outcomes.',
    businessProfile: {
      ...biz,
      activeOrderStatus: orderDoc?.status || 'NONE',
      statedRequirements:
        advisorReqs.length > 0 ? advisorReqs : ['reliable_internet', 'upi_pos', 'whatsapp_business'],
      currentToolsSummary: {
        connectivity: `${biz.currentInternet} (${biz.currentProvider})`,
        communication:
          savedAnswers.whatsappBusiness === 'verified_whatsapp_api'
            ? 'Verified WhatsApp API & Domain Email'
            : 'Personal WhatsApp / Standard Email',
        productivity:
          savedAnswers.posAndBilling === 'cloud_gst_pos'
            ? 'Cloud GST POS & Digital Records'
            : 'Manual / Spreadsheet Billing',
        security:
          savedAnswers.cybersecurity === 'managed_endpoint_and_firewall'
            ? 'Managed Endpoint & Firewall'
            : 'Basic / Unmanaged Endpoints',
        continuity:
          savedAnswers.backupConnectivity === 'auto_4g_5g_failover'
            ? 'Automated 4G/5G Failover + Cloud Backup'
            : 'Single Link / Local PC Storage',
      },
    },
    currentMaturity: {
      overallScore: currentReadiness.overallScore,
      maturityBand: currentReadiness.maturityBand,
      categoryScores: currentReadiness.categoryScores,
      strengths: currentReadiness.strengths,
      weaknesses: currentReadiness.weaknesses,
    },
    projectedMaturity: {
      simulatedTier: targetTier,
      simulatedBundleName: selectedBundle.bundleName,
      overallScore: projectedReadiness.overallScore,
      scoreDelta: Math.max(0, projectedReadiness.overallScore - currentReadiness.overallScore),
      maturityBand: projectedReadiness.maturityBand,
      categoryScores: projectedReadiness.categoryScores,
    },
    radarChartData,
    operationalGaps,
    improvementRoadmap: [
      {
        phase: 'Phase 1 — Foundation & Uptime (Days 1–3)',
        focus: 'Eliminate primary connectivity bottlenecks and POS/UPI drop-offs',
        services: simulatedServices.filter((s) =>
          ['Connectivity', 'Voice & Messaging'].includes(s.category)
        ),
      },
      {
        phase: 'Phase 2 — Cloud Productivity & Security (Days 3–7)',
        focus: 'Protect business records, endpoints, and automate customer engagement',
        services: simulatedServices.filter(
          (s) => !['Connectivity', 'Voice & Messaging'].includes(s.category)
        ),
      },
    ],
    investmentSummary: {
      monthlyRecurringInr: simulatedMonthlyInvestmentInr,
      monthlyGstInclInr: Math.round(simulatedMonthlyInvestmentInr * 1.18),
      oneTimeSetupInr: simulatedSetupInvestmentInr,
      currentMonthlySpendInr: biz.monthlyTelecomSpendInr,
      servicesIncluded: simulatedServices,
    },
  };
}
