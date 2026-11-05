import { LeadModel } from '../models';

export interface SegmentIntelligenceMetric {
  segment: string;
  leadVolume: number;
  leadSharePct: number;
  contactRatePct: number;
  needsAssessmentRatePct: number;
  quoteAcceptanceRatePct: number;
  kycCompletionRatePct: number;
  activationRatePct: number;
  activatedCount: number;
  avgMonthlyBundleValueInr: number;
  avgContractMonths: number;
  avgLtvInr: number;
  avgCacInr: number;
  ltvToCacRatio: number;
  churn6MonthRatePct: number;
  avgNpsScore: number;
  avgDaysLeadToActivation: number;
  leadSourceBreakdown: Array<{
    source: string;
    leads: number;
    activated: number;
    conversionRatePct: number;
    avgCacInr: number;
  }>;
  prioritisationScore: number;
  prioritisationTier: 'TIER_1_PRIMARY_GROWTH' | 'TIER_2_HIGH_ARPU_SELECTIVE' | 'TIER_3_AUTOMATE_SELF_SERVE';
  scoreComponents: {
    conversionEfficiencyScore: number; // 0-25
    unitEconomicsLtvCacScore: number;  // 0-30
    retentionNpsScore: number;         // 0-25
    scalableVolumeScore: number;       // 0-20
  };
  strategicRationale: string;
  recommendedPrimaryBundle: {
    tier: 'Essential' | 'Growth' | 'Secure Scale';
    bundleName: string;
    typicalProducts: string[];
    expectedArpuRangeInr: string;
  };
  bestAcquisitionChannel: {
    channel: string;
    conversionRatePct: number;
    avgCacInr: number;
    whyBestFit: string;
  };
}

const SEGMENT_STRATEGY_META: Record<
  string,
  {
    recommendedPrimaryBundle: {
      tier: 'Essential' | 'Growth' | 'Secure Scale';
      bundleName: string;
      typicalProducts: string[];
      expectedArpuRangeInr: string;
    };
  }
> = {
  'Micro retail & services': {
    recommendedPrimaryBundle: {
      tier: 'Essential',
      bundleName: 'Essential Shop & Retail Pack',
      typicalProducts: ['P01 Biz Fibre 100', 'P04 4G Backup Dongle', 'P15 WhatsApp Business Pack', 'P16 Cloud Storage 1TB'],
      expectedArpuRangeInr: '₹1,499 – ₹2,799 / mo',
    },
  },
  'Professional offices': {
    recommendedPrimaryBundle: {
      tier: 'Growth',
      bundleName: 'Growth Productivity & Collaboration Suite',
      typicalProducts: ['P02 Biz Fibre 300', 'P12 Cloud PBX (10 ext)', 'P17 Microsoft 365 Business Basic', 'P18 Endpoint Security'],
      expectedArpuRangeInr: '₹3,999 – ₹6,899 / mo',
    },
  },
  'Small multi-site businesses': {
    recommendedPrimaryBundle: {
      tier: 'Secure Scale',
      bundleName: 'Secure Scale Multi-Branch Wan Pack',
      typicalProducts: ['P02/P03 Biz Fibre', 'P09 Site-to-Site VPN / P10 SD-WAN', 'P11 Static IP Pack', 'P19 Cloud Firewall'],
      expectedArpuRangeInr: '₹6,499 – ₹14,500 / mo',
    },
  },
  'Small manufacturers': {
    recommendedPrimaryBundle: {
      tier: 'Secure Scale',
      bundleName: 'Industrial Plant Connectivity & Security Suite',
      typicalProducts: ['P02 Biz Fibre 300 / P06 Leased Line', 'P05 5G FWA Backup', 'P22 Managed CCTV Cloud', 'P23 IoT Asset Sim Pack'],
      expectedArpuRangeInr: '₹5,499 – ₹12,999 / mo',
    },
  },
};

export async function computeSegmentIntelligence(): Promise<{
  scoringFormulaExplanation: string;
  totalHistoricalLeads: number;
  overallActivationRatePct: number;
  segments: SegmentIntelligenceMetric[];
}> {
  const leads = await LeadModel.find({ isHistorical: true }).lean();
  const totalLeads = leads.length || 1;

  const bySegment = new Map<string, typeof leads>();
  for (const l of leads) {
    const seg = l.segment || 'Micro retail & services';
    if (!bySegment.has(seg)) bySegment.set(seg, []);
    bySegment.get(seg)!.push(l);
  }

  const segments: SegmentIntelligenceMetric[] = [];

  for (const [segment, segLeads] of bySegment.entries()) {
    const count = segLeads.length;
    const contacted = segLeads.filter((l) => Boolean(l.contactedDate) || l.stageReached !== 'New Lead').length;
    const assessed = segLeads.filter(
      (l) =>
        Boolean(l.needsAssessedDate) ||
        ['Needs Assessed', 'Quote Sent', 'Quote Accepted', 'KYC Submitted', 'KYC Approved', 'Activated'].includes(l.stageReached)
    ).length;
    const quoteAccepted = segLeads.filter(
      (l) =>
        Boolean(l.quoteAcceptedDate) ||
        ['Quote Accepted', 'KYC Submitted', 'KYC Approved', 'Activated'].includes(l.stageReached)
    ).length;
    const kycCompleted = segLeads.filter(
      (l) => Boolean(l.kycCompleteDate) || ['KYC Approved', 'Activated'].includes(l.stageReached)
    ).length;
    const activatedLeads = segLeads.filter((l) => l.outcome === 'Activated');
    const activatedCount = activatedLeads.length;

    const contactRatePct = Number(((contacted / count) * 100).toFixed(1));
    const needsAssessmentRatePct = Number(((assessed / count) * 100).toFixed(1));
    const quoteAcceptanceRatePct = Number(((quoteAccepted / count) * 100).toFixed(1));
    const kycCompletionRatePct = Number(((kycCompleted / count) * 100).toFixed(1));
    const activationRatePct = Number(((activatedCount / count) * 100).toFixed(2));

    const avgMonthlyBundleValueInr =
      activatedCount > 0
        ? Math.round(activatedLeads.reduce((s, l) => s + (l.monthlyBundleValueInr || 2800), 0) / activatedCount)
        : 2800;

    const avgContractMonths =
      activatedCount > 0
        ? Number((activatedLeads.reduce((s, l) => s + (l.contractMonths || 12), 0) / activatedCount).toFixed(1))
        : 12;

    const avgCacInr = Math.round(segLeads.reduce((s, l) => s + (l.acquisitionCostInr || 0), 0) / count);

    const churnedCount = activatedLeads.filter((l) => l.churnedWithin6Months === 'Yes').length;
    const churn6MonthRatePct =
      activatedCount > 0 ? Number(((churnedCount / activatedCount) * 100).toFixed(1)) : 0;

    const npsLeads = activatedLeads.filter((l) => typeof l.npsScore === 'number');
    const avgNpsScore =
      npsLeads.length > 0
        ? Number((npsLeads.reduce((s, l) => s + (l.npsScore || 0), 0) / npsLeads.length).toFixed(1))
        : 45;

    const daysLeads = activatedLeads.filter((l) => typeof l.daysLeadToActivation === 'number');
    const avgDaysLeadToActivation =
      daysLeads.length > 0
        ? Number((daysLeads.reduce((s, l) => s + (l.daysLeadToActivation || 14), 0) / daysLeads.length).toFixed(1))
        : 14;

    // LTV estimate = Monthly ARPU * Effective Retention Months (adjusted by 6m churn)
    const retentionMultiplier = Math.max(8, avgContractMonths * (1 - churn6MonthRatePct / 200));
    const avgLtvInr = Math.round(avgMonthlyBundleValueInr * retentionMultiplier);
    const ltvToCacRatio = avgCacInr > 0 ? Number((avgLtvInr / avgCacInr).toFixed(1)) : 10;

    // Lead source breakdown within segment
    const srcMap = new Map<string, { leads: number; activated: number; cacSum: number }>();
    for (const l of segLeads) {
      const src = l.leadSource || 'Website form';
      if (!srcMap.has(src)) srcMap.set(src, { leads: 0, activated: 0, cacSum: 0 });
      const entry = srcMap.get(src)!;
      entry.leads += 1;
      if (l.outcome === 'Activated') entry.activated += 1;
      entry.cacSum += l.acquisitionCostInr || 0;
    }

    const leadSourceBreakdown = Array.from(srcMap.entries())
      .map(([source, v]) => ({
        source,
        leads: v.leads,
        activated: v.activated,
        conversionRatePct: Number(((v.activated / v.leads) * 100).toFixed(2)),
        avgCacInr: Math.round(v.cacSum / v.leads),
      }))
      .sort((a, b) => b.conversionRatePct - a.conversionRatePct);

    const bestSource = leadSourceBreakdown[0] || {
      source: 'Existing customer referral',
      conversionRatePct: activationRatePct,
      avgCacInr,
    };

    // Transparent 4-pillar Segment Prioritisation Score (0–100):
    // 1. Conversion Efficiency (0-25): normalized around 10% top activation rate
    const conversionEfficiencyScore = Math.min(25, Math.round((activationRatePct / 10.5) * 25));
    // 2. Unit Economics LTV:CAC (0-30): normalized around 18x LTV:CAC
    const unitEconomicsLtvCacScore = Math.min(30, Math.round((ltvToCacRatio / 18) * 30));
    // 3. Retention & NPS (0-25): lower 6m churn + higher NPS
    const retentionNpsScore = Math.min(
      25,
      Math.max(5, Math.round((1 - churn6MonthRatePct / 35) * 15 + (avgNpsScore / 70) * 10))
    );
    // 4. Scalable Addressable Volume (0-20): share of MSME funnel
    const leadSharePct = Number(((count / totalLeads) * 100).toFixed(1));
    const scalableVolumeScore = Math.min(20, Math.round((leadSharePct / 40) * 20) + 4);

    const prioritisationScore =
      conversionEfficiencyScore + unitEconomicsLtvCacScore + retentionNpsScore + scalableVolumeScore;

    let prioritisationTier: SegmentIntelligenceMetric['prioritisationTier'] = 'TIER_2_HIGH_ARPU_SELECTIVE';
    let strategicRationale = '';

    if (prioritisationScore >= 72) {
      prioritisationTier = 'TIER_1_PRIMARY_GROWTH';
      strategicRationale = `Highest strategic priority (${prioritisationScore}/100): Combines strong activation conversion (${activationRatePct}%), healthy LTV:CAC (${ltvToCacRatio}x), and low 6-month churn (${churn6MonthRatePct}%). Ideal for AI-guided consultative bundling + fast-track KYC.`;
    } else if (avgMonthlyBundleValueInr >= 4200) {
      prioritisationTier = 'TIER_2_HIGH_ARPU_SELECTIVE';
      strategicRationale = `High-ARPU selective growth (${prioritisationScore}/100): Generates ₹${avgMonthlyBundleValueInr.toLocaleString('en-IN')}/mo average bundle value (${ltvToCacRatio}x LTV:CAC), but requires feasibility pre-check and specialist handoff to prevent mid-funnel drop-off.`;
    } else {
      prioritisationTier = 'TIER_3_AUTOMATE_SELF_SERVE';
      strategicRationale = `High-volume self-serve automation target (${prioritisationScore}/100): Represents ${leadSharePct}% of total lead volume (${count.toLocaleString()} leads), but suffers ${churn6MonthRatePct}% 6m churn and high manual CAC (₹${avgCacInr.toLocaleString('en-IN')}). Must be served via zero-touch digital onboarding rather than field sales visits.`;
    }

    const meta = SEGMENT_STRATEGY_META[segment] || SEGMENT_STRATEGY_META['Micro retail & services'];

    segments.push({
      segment,
      leadVolume: count,
      leadSharePct,
      contactRatePct,
      needsAssessmentRatePct,
      quoteAcceptanceRatePct,
      kycCompletionRatePct,
      activationRatePct,
      activatedCount,
      avgMonthlyBundleValueInr,
      avgContractMonths,
      avgLtvInr,
      avgCacInr,
      ltvToCacRatio,
      churn6MonthRatePct,
      avgNpsScore,
      avgDaysLeadToActivation,
      leadSourceBreakdown,
      prioritisationScore,
      prioritisationTier,
      scoreComponents: {
        conversionEfficiencyScore,
        unitEconomicsLtvCacScore,
        retentionNpsScore,
        scalableVolumeScore,
      },
      strategicRationale,
      recommendedPrimaryBundle: meta.recommendedPrimaryBundle,
      bestAcquisitionChannel: {
        channel: bestSource.source,
        conversionRatePct: bestSource.conversionRatePct,
        avgCacInr: bestSource.avgCacInr,
        whyBestFit: `${bestSource.source} achieves ${bestSource.conversionRatePct}% activation in ${segment} at ₹${bestSource.avgCacInr.toLocaleString('en-IN')} average CAC.`,
      },
    });
  }

  segments.sort((a, b) => b.prioritisationScore - a.prioritisationScore);

  const totalActivated = leads.filter((l) => l.outcome === 'Activated').length;

  return {
    scoringFormulaExplanation:
      'Prioritisation Score (0–100) = Conversion Efficiency (0–25 pts) + LTV:CAC Unit Economics (0–30 pts) + 6-Month Retention & NPS (0–25 pts) + Addressable Volume Scale (0–20 pts)',
    totalHistoricalLeads: leads.length,
    overallActivationRatePct: Number(((totalActivated / totalLeads) * 100).toFixed(2)),
    segments,
  };
}
