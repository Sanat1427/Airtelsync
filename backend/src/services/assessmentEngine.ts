import { ProductModel } from '../models';
import { checkSingleProductEligibility, EligibilityCheckInput } from './catalogueEngine';

export interface ReadinessAnswers {
  internetReliability: 'none_or_hotspot' | 'home_broadband' | 'business_broadband' | 'dedicated_leased_line';
  upiAndPayments: 'cash_only' | 'basic_qr' | 'integrated_pos';
  posAndBilling: 'paper_manual' | 'basic_excel' | 'cloud_gst_pos';
  businessEmail: 'personal_gmail' | 'custom_domain_email' | 'full_cloud_office_suite';
  cloudBackup: 'local_pc_only' | 'manual_external_drive' | 'automated_cloud_backup';
  whatsappBusiness: 'personal_whatsapp' | 'whatsapp_business_app' | 'verified_whatsapp_api';
  cctvAndPhysicalSecurity: 'none' | 'local_dvr_cctv' | 'cloud_cctv_and_iot';
  cybersecurity: 'none' | 'free_antivirus' | 'managed_endpoint_and_firewall';
  backupConnectivity: 'no_backup' | 'manual_mobile_hotspot' | 'auto_4g_5g_failover';
  digitalRecords: 'mostly_paper' | 'partial_digital' | 'fully_cloud_erp_crm';
  multiSiteManagement: 'single_site' | 'independent_site_links' | 'central_sdwan';
}

export async function calculateDigitalReadinessScore(
  answers: Partial<ReadinessAnswers>,
  eligibilityContext: EligibilityCheckInput
) {
  // Deterministic 100-Point Scoring Rubric across 5 Categories (each normalized 0-100, weighted equally at 20%):
  // 1. Connectivity (0-100)
  const connMap: Record<string, number> = {
    none_or_hotspot: 25,
    home_broadband: 50,
    business_broadband: 82,
    dedicated_leased_line: 98,
  };
  const multiMap: Record<string, number> = {
    single_site: 75,
    independent_site_links: 55,
    central_sdwan: 98,
  };
  const connectivityScore = Math.round(
    (connMap[answers.internetReliability || 'home_broadband'] || 50) * 0.75 +
      (multiMap[answers.multiSiteManagement || 'single_site'] || 75) * 0.25
  );

  // 2. Communication (0-100)
  const waMap: Record<string, number> = {
    personal_whatsapp: 30,
    whatsapp_business_app: 65,
    verified_whatsapp_api: 96,
  };
  const emailMap: Record<string, number> = {
    personal_gmail: 30,
    custom_domain_email: 75,
    full_cloud_office_suite: 96,
  };
  const communicationScore = Math.round(
    (waMap[answers.whatsappBusiness || 'whatsapp_business_app'] || 65) * 0.55 +
      (emailMap[answers.businessEmail || 'personal_gmail'] || 30) * 0.45
  );

  // 3. Productivity (0-100)
  const posMap: Record<string, number> = {
    paper_manual: 20,
    basic_excel: 55,
    cloud_gst_pos: 95,
  };
  const upiMap: Record<string, number> = {
    cash_only: 20,
    basic_qr: 65,
    integrated_pos: 95,
  };
  const recMap: Record<string, number> = {
    mostly_paper: 25,
    partial_digital: 60,
    fully_cloud_erp_crm: 95,
  };
  const productivityScore = Math.round(
    (posMap[answers.posAndBilling || 'basic_excel'] || 55) * 0.4 +
      (upiMap[answers.upiAndPayments || 'basic_qr'] || 65) * 0.3 +
      (recMap[answers.digitalRecords || 'partial_digital'] || 60) * 0.3
  );

  // 4. Security (0-100)
  const cyberMap: Record<string, number> = {
    none: 15,
    free_antivirus: 50,
    managed_endpoint_and_firewall: 96,
  };
  const cctvMap: Record<string, number> = {
    none: 20,
    local_dvr_cctv: 60,
    cloud_cctv_and_iot: 95,
  };
  const securityScore = Math.round(
    (cyberMap[answers.cybersecurity || 'none'] || 15) * 0.55 +
      (cctvMap[answers.cctvAndPhysicalSecurity || 'local_dvr_cctv'] || 60) * 0.45
  );

  // 5. Business Continuity (0-100)
  const failoverMap: Record<string, number> = {
    no_backup: 20,
    manual_mobile_hotspot: 50,
    auto_4g_5g_failover: 96,
  };
  const backupMap: Record<string, number> = {
    local_pc_only: 20,
    manual_external_drive: 55,
    automated_cloud_backup: 96,
  };
  const businessContinuityScore = Math.round(
    (failoverMap[answers.backupConnectivity || 'no_backup'] || 20) * 0.55 +
      (backupMap[answers.cloudBackup || 'local_pc_only'] || 20) * 0.45
  );

  const overallScore = Math.round(
    (connectivityScore +
      communicationScore +
      productivityScore +
      securityScore +
      businessContinuityScore) /
      5
  );

  let maturityBand = 'Emerging Digital Beginner';
  if (overallScore >= 80) maturityBand = 'Digital Leader (Enterprise Ready)';
  else if (overallScore >= 60) maturityBand = 'Growing Digital Adopter';
  else if (overallScore >= 40) maturityBand = 'Foundational Digital Stage';

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const identifiedGaps: string[] = [];
  const candidateProductRecs: Array<{
    productId: string;
    title: string;
    gapAddressed: string;
    impact: string;
  }> = [];

  if (connectivityScore >= 75) {
    strengths.push('Business-grade primary internet connectivity is established.');
  } else {
    weaknesses.push('Reliance on consumer broadband or mobile hotspot creates UPI/POS downtime risk.');
    identifiedGaps.push('Lack of dedicated business fibre broadband with guaranteed uptime.');
    candidateProductRecs.push({
      productId: eligibilityContext.employeeCount >= 10 ? 'P02' : 'P01',
      title: 'Upgrade to Business Fibre Broadband',
      gapAddressed: 'Unreliable consumer internet / hotspot dependency',
      impact: 'Eliminates payment & billing drop-offs during peak hours with unlimited enterprise bandwidth.',
    });
  }

  if (communicationScore >= 75) {
    strengths.push('Professional customer communication channels are active.');
  } else {
    weaknesses.push('Customer engagement uses personal email or unverified messaging.');
    identifiedGaps.push('No verified business communication identity or domain email.');
    candidateProductRecs.push({
      productId: eligibilityContext.hasGstin ? 'P15' : 'P16',
      title: eligibilityContext.hasGstin
        ? 'Activate Verified WhatsApp Business API'
        : 'Deploy Custom Domain Cloud Email & Office Suite',
      gapAddressed: 'Unverified customer communication and lack of professional identity',
      impact: 'Increases customer trust and automates order/appointment notifications.',
    });
  }

  if (productivityScore >= 75) {
    strengths.push('Digitized GST billing and payment collection workflows.');
  } else {
    weaknesses.push('Manual or fragmented billing and inventory tracking.');
    identifiedGaps.push('Need integrated GST-ready POS billing or cloud productivity suite.');
    candidateProductRecs.push({
      productId: 'P19',
      title: 'Adopt Cloud POS & GST Billing',
      gapAddressed: 'Manual billing and unintegrated UPI/card counter operations',
      impact: 'Automates GST invoicing, stock alerts, and instant UPI reconciliation.',
    });
  }

  if (securityScore >= 75) {
    strengths.push('Proactive cyber and physical security posture.');
  } else {
    weaknesses.push('Endpoints and premises lack managed ransomware protection or cloud surveillance.');
    identifiedGaps.push('Vulnerability to ransomware, data theft, or unmonitored physical premises.');
    candidateProductRecs.push({
      productId: 'P20',
      title: 'Deploy Managed Endpoint Security',
      gapAddressed: 'Unprotected PCs/devices exposed to phishing and ransomware',
      impact: 'Protects billing counters and financial records from malware.',
    });
  }

  if (businessContinuityScore >= 75) {
    strengths.push('Automated link failover and cloud data backup protect against outages.');
  } else {
    weaknesses.push('Single point of failure for both internet link and local PC records.');
    identifiedGaps.push('No automatic 4G/5G failover link or automated 1 TB cloud backup.');
    candidateProductRecs.push({
      productId: 'P17',
      title: 'Enable Automated 1 TB Cloud Backup',
      gapAddressed: 'Risk of permanent accounting/customer data loss from hardware failure',
      impact: 'Continuous off-site backup for all business PCs and mobile devices.',
    });
    candidateProductRecs.push({
      productId: 'P09',
      title: 'Add Automatic 4G/5G Failover Router',
      gapAddressed: 'Zero backup connectivity when primary fibre line experiences a cut',
      impact: 'Keeps POS, UPI, and cloud apps online automatically during fibre outages.',
    });
  }

  // Ensure at least 3 actionable catalogue-validated product recommendations
  const allProducts = await ProductModel.find();
  const prodMap = new Map(allProducts.map((p) => [p.productId, p]));

  const actionableRecommendations: Array<{
    title: string;
    gapAddressed: string;
    impact: string;
    productId: string;
    productName: string;
    monthlyPriceInr: number;
  }> = [];

  for (const rec of candidateProductRecs) {
    const prod = prodMap.get(rec.productId);
    if (!prod) continue;
    const elig = checkSingleProductEligibility(prod, eligibilityContext);
    if (elig.eligible) {
      actionableRecommendations.push({
        title: rec.title,
        gapAddressed: rec.gapAddressed,
        impact: rec.impact,
        productId: prod.productId,
        productName: prod.productName,
        monthlyPriceInr: prod.priceMinInrPerMonth,
      });
    }
  }

  // Fallback additions if fewer than 3 recommendations were added (e.g., for high scorers)
  const fallbackIds = ['P01', 'P16', 'P17', 'P20', 'P18', 'P07'];
  for (const fid of fallbackIds) {
    if (actionableRecommendations.length >= 4) break;
    if (actionableRecommendations.some((r) => r.productId === fid)) continue;
    const prod = prodMap.get(fid);
    if (prod && checkSingleProductEligibility(prod, eligibilityContext).eligible) {
      actionableRecommendations.push({
        title: `Enhance Operations with ${prod.productName}`,
        gapAddressed: 'Continuous digital maturity optimization',
        impact: prod.description,
        productId: prod.productId,
        productName: prod.productName,
        monthlyPriceInr: prod.priceMinInrPerMonth,
      });
    }
  }

  if (strengths.length === 0) {
    strengths.push('Active intent to modernize business infrastructure and customer experience.');
  }

  return {
    scoringRuleVersion: 'v1.0-deterministic',
    disclaimer:
      'INTERNAL ADVISORY METRIC: This Digital Readiness Score is a deterministic diagnostic tool to identify MSME technology gaps. It is NOT a government certification or financial credit rating.',
    overallScore,
    maturityBand,
    categoryScores: {
      connectivity: connectivityScore,
      communication: communicationScore,
      productivity: productivityScore,
      security: securityScore,
      businessContinuity: businessContinuityScore,
    },
    strengths,
    weaknesses,
    identifiedGaps,
    actionableRecommendations,
  };
}
