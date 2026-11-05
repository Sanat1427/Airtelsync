import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  PricingCard,
  ProductRow,
  StatusBadge,
} from '../components/ui';
import {
  CheckCircle2,
  XCircle,
  Calculator,
  ShieldCheck,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  Lock,
} from 'lucide-react';

const PLAN_TIER_META: Record<
  number,
  { planTitle: string; bestSuitedFor: string; benefits: string[] }
> = {
  0: {
    planTitle: 'Essential',
    bestSuitedFor: 'Single-site shops, micro-offices & startups getting online quickly',
    benefits: [
      'Commercial-grade primary connectivity with priority support',
      'Essential customer billing or communication tools included',
      'Lowest monthly commitment with predictable setup costs',
    ],
  },
  1: {
    planTitle: 'Growth',
    bestSuitedFor: 'Growing clinics, retail outlets & offices needing high uptime & cloud tools',
    benefits: [
      'Balanced connectivity, productivity & digital billing stack',
      '100% companion dependency & city-tier eligibility verified',
      'Single consolidated monthly GST invoice across all tools',
    ],
  },
  2: {
    planTitle: 'Secure Scale',
    bestSuitedFor: 'Multi-site businesses, warehouses & regulated operations requiring SLA & security',
    benefits: [
      'Maximum resilience with wireless failover or dedicated SLA bandwidth',
      'Advanced cybersecurity, endpoint protection & cloud backup',
      'Dedicated enterprise account support & multi-branch readiness',
    ],
  },
};

export const BundleComparisonPage: React.FC = () => {
  const {
    activeBusiness,
    activeRecommendation,
    setActiveQuote,
    products,
    showToast,
  } = useApp();
  const navigate = useNavigate();

  const [selectedTierIdx, setSelectedTierIdx] = useState<number>(1);
  const [customItems, setCustomItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [contractMonths, setContractMonths] = useState<number>(12);
  const [bundleValidation, setBundleValidation] = useState<any | null>(null);
  const [roiResult, setRoiResult] = useState<any | null>(null);
  const [generatingQuote, setGeneratingQuote] = useState<boolean>(false);
  const [showIneligiblePanel, setShowIneligiblePanel] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [compareFromTier, setCompareFromTier] = useState<string>('Recommended');
  const [compareToTier, setCompareToTier] = useState<string>('Essential');
  const [counterfactualData, setCounterfactualData] = useState<any | null>(null);

  useEffect(() => {
    const bId = activeBusiness?.businessId || 'BIZ-SCEN-01';
    api
      .post('/products/recommend/counterfactual', {
        businessId: bId,
        fromTier: compareFromTier,
        toTier: compareToTier,
      })
      .then((res) => setCounterfactualData(res.data))
      .catch(() => {});
  }, [activeBusiness?.businessId, compareFromTier, compareToTier]);

  const [currentSpend, setCurrentSpend] = useState({
    broadbandAndInternetInr: 1600,
    mobileAndSimsInr: 1200,
    posAndBillingSoftwareInr: 900,
    cloudAndEmailToolsInr: 600,
    cctvAndSecurityInr: 500,
    whatsappAndMarketingInr: 700,
    downtimeHoursPerMonth: 4,
    estimatedRevenueLossPerHourInr: 600,
  });

  useEffect(() => {
    if (activeRecommendation?.bundles?.length) {
      const targetBundle =
        activeRecommendation.bundles[selectedTierIdx] || activeRecommendation.bundles[0];
      if (targetBundle) {
        setCustomItems(
          targetBundle.products.map((p: any) => ({
            productId: p.productId,
            quantity: p.quantity,
          }))
        );
        setContractMonths(targetBundle.contractMonths || 12);
      }
    }
  }, [activeRecommendation, selectedTierIdx]);

  useEffect(() => {
    if (customItems.length === 0) return;
    (async () => {
      try {
        const [eligRes, roiRes] = await Promise.all([
          api.post('/products/eligibility', {
            productIds: customItems.map((i) => i.productId),
            cityTier: activeBusiness?.cityTier || 1,
            employeeCount: activeBusiness?.employeeCount || 4,
            numSites: activeBusiness?.numSites || 1,
            hasGstin: activeBusiness?.hasGstin ?? true,
            gstinStatus: activeBusiness?.gstinVerifiedStatus || 'ACTIVE',
          }),
          api.post('/roi/calculate', {
            currentExpenditures: currentSpend,
            items: customItems,
            contractMonths,
          }),
        ]);
        setBundleValidation(eligRes.data);
        setRoiResult(roiRes.data);
      } catch {
        // ignore
      }
    })();
  }, [customItems, contractMonths, currentSpend, activeBusiness]);

  const handleUpdateQty = (productId: string, delta: number) => {
    setCustomItems((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleToggleAddon = (productId: string) => {
    const exists = customItems.some((i) => i.productId === productId);
    if (exists) {
      if (customItems.length <= 1) {
        showToast('warning', 'Minimum 1 Service Required', 'Your plan must include at least one service.');
        return;
      }
      setCustomItems(customItems.filter((i) => i.productId !== productId));
    } else {
      setCustomItems([...customItems, { productId, quantity: 1 }]);
    }
  };

  const handleGenerateQuoteAndProceed = async () => {
    setGeneratingQuote(true);
    try {
      const selectedBundle = activeRecommendation?.bundles?.[selectedTierIdx];
      const tierMeta = PLAN_TIER_META[selectedTierIdx] || PLAN_TIER_META[1];
      const res = await api.post('/quotes', {
        businessId: activeBusiness?.businessId || 'BIZ-SCEN-01',
        bundleName: selectedBundle?.bundleName || `${tierMeta.planTitle} Business Plan`,
        tier: selectedBundle?.tier || 'Recommended',
        items: customItems,
        contractMonths,
        eligibilityContext: {
          cityTier: activeBusiness?.cityTier || 1,
          employeeCount: activeBusiness?.employeeCount || 4,
          numSites: activeBusiness?.numSites || 1,
          hasGstin: activeBusiness?.hasGstin ?? true,
          gstinStatus: activeBusiness?.gstinVerifiedStatus || 'ACTIVE',
        },
      });
      setActiveQuote(res.data.quote);
      showToast(
        'success',
        `Quote ${res.data.quote.quoteId} Generated`,
        `Monthly total: ₹${res.data.quote.monthlyTotalInr.toLocaleString('en-IN')}/mo (+18% GST)`
      );
      navigate('/feasibility');
    } catch (err: any) {
      const valErrors = err.response?.data?.validationErrors;
      showToast(
        'error',
        'Plan Configuration Requires Adjustment',
        valErrors ? valErrors.join(' | ') : err.response?.data?.error || err.message
      );
    } finally {
      setGeneratingQuote(false);
    }
  };

  const bundles = activeRecommendation?.bundles || [];
  const ineligibleProducts = activeRecommendation?.ineligibleProducts || [];
  const productMap = new Map(products.map((p: any) => [p.productId, p]));

  const categories = ['ALL', ...Array.from(new Set(products.map((p: any) => p.category)))];
  const filteredCatalogueProducts =
    selectedCategory === 'ALL'
      ? products
      : products.filter((p: any) => p.category === selectedCategory);

  const proposedMonthlyExclGst = roiResult?.proposedMonthlyRecurringInr || 0;
  const proposedMonthlyGst = Math.round(proposedMonthlyExclGst * 0.18);
  const proposedMonthlyInclGst = proposedMonthlyExclGst + proposedMonthlyGst;

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: 'Plans & Pricing' }]}
        title="Plans & Bundle Comparison"
        subtitle={`Tailored connectivity, communication, and cloud bundles for ${
          activeBusiness?.businessName || 'your business'
        } (${activeBusiness?.employeeCount || 4} staff, ${activeBusiness?.numSites || 1} site(s) in ${
          activeBusiness?.city || 'Ludhiana'
        }).`}
        actions={
          <PrimaryButton
            onClick={handleGenerateQuoteAndProceed}
            loading={generatingQuote}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Continue to Coverage & Checkout
          </PrimaryButton>
        }
      />

      {/* ====================================================================
          3-TIER PRICING CARDS: ESSENTIAL, GROWTH, SECURE SCALE
      ==================================================================== */}
      <div className="grid lg:grid-cols-3 gap-6 pt-2">
        {bundles.map((b: any, idx: number) => {
          const meta = PLAN_TIER_META[idx] || PLAN_TIER_META[1];
          const isRecommended = idx === 1 || b.tier === 'Recommended';
          return (
            <PricingCard
              key={b.tier || idx}
              planTitle={meta.planTitle}
              tierBadge={b.bundleName}
              description={b.whySelected}
              monthlyPriceInr={b.monthlyTotalInr || 0}
              setupFeeInr={b.setupTotalInr || 0}
              contractMonths={b.contractMonths || 12}
              estimatedInstallDays={b.estimatedInstallDays || 3}
              matchScore={b.matchScore}
              bestSuitedFor={meta.bestSuitedFor}
              products={b.products || []}
              benefits={meta.benefits}
              isRecommended={isRecommended}
              isSelected={selectedTierIdx === idx}
              onSelect={() => setSelectedTierIdx(idx)}
            />
          );
        })}
      </div>

      {/* ====================================================================
          COUNTERFACTUAL PLAN COMPARATOR ("WHAT IF I CHOOSE ANOTHER PLAN?")
      ==================================================================== */}
      {counterfactualData?.comparison && (
        <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#E6EAF0]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8F0FF] text-[#2563EB] text-[11px] font-semibold">
                  Explainable AI Trade-Off Comparator
                </span>
                {counterfactualData.recommendationArchetypes && (
                  <span className="text-[11px] text-[#697386]">
                    Best-Fit: <strong className="text-[#172033]">{counterfactualData.recommendationArchetypes.bestFitBundle}</strong>
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-[#172033] mt-1">
                “What if I choose another plan?” — Counterfactual Impact Analysis
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#697386] font-medium">Compare:</span>
              <select
                value={compareFromTier}
                onChange={(e) => setCompareFromTier(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E6EAF0] bg-[#F8F9FC] font-semibold text-[#172033]"
              >
                <option value="Essential">Essential (Lowest-Cost)</option>
                <option value="Recommended">Growth (Best-Fit)</option>
                <option value="Advanced">Secure Scale (Best-Value)</option>
              </select>
              <span className="text-[#697386]">vs.</span>
              <select
                value={compareToTier}
                onChange={(e) => setCompareToTier(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E6EAF0] bg-[#F8F9FC] font-semibold text-[#2563EB]"
              >
                <option value="Essential">Essential (Lowest-Cost)</option>
                <option value="Recommended">Growth (Best-Fit)</option>
                <option value="Advanced">Secure Scale (Best-Value)</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-4 p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-1">
              <div className="text-xs font-semibold text-[#172033]">
                {counterfactualData.comparison.headlineSummary}
              </div>
              <div className="text-xl font-bold text-[#2563EB]">
                {counterfactualData.comparison.monthlyPriceDeltaInr >= 0 ? '+' : ''}₹
                {counterfactualData.comparison.monthlyPriceDeltaInr.toLocaleString('en-IN')}/mo
              </div>
              <div className="text-[11px] text-[#697386]">
                Setup delta: {counterfactualData.comparison.setupFeeDeltaInr >= 0 ? '+' : ''}₹
                {counterfactualData.comparison.setupFeeDeltaInr.toLocaleString('en-IN')} • Contract:{' '}
                {counterfactualData.comparison.contractMonthsFrom}m → {counterfactualData.comparison.contractMonthsTo}m
              </div>
            </div>

            <div className="md:col-span-8 p-4 rounded-xl bg-[#E8F0FF]/40 border border-[#B3CCFF] space-y-2 text-xs">
              <div className="text-[#172033] font-medium leading-relaxed">
                {counterfactualData.comparison.operationalTradeOffExplanation}
              </div>
              <div className="text-[#142B4A] font-semibold">
                Advisor Guidance: {counterfactualData.comparison.recommendationGuidance}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(counterfactualData.comparison.addedProducts || []).map((p: any) => (
                  <span
                    key={p.productId}
                    className="px-2 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[#14532D] text-[11px] font-medium"
                  >
                    + Gains {p.productName} ({p.productId})
                  </span>
                ))}
                {(counterfactualData.comparison.removedProducts || []).map((p: any) => (
                  <span
                    key={p.productId}
                    className="px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-[11px] font-medium"
                  >
                    − Loses {p.productName} ({p.productId})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          CUSTOMIZE SELECTED PLAN & ADD-ON SELECTOR + ROI CALCULATOR
      ==================================================================== */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Itemized Pricing, Add-on Selector, Dependencies & Eligibility */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E6EAF0]">
              <div>
                <h2 className="text-base font-semibold text-[#172033] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#2563EB]" />
                  <span>Itemized Plan Configuration & Add-Ons</span>
                </h2>
                <p className="text-xs text-[#697386] mt-0.5">
                  Adjust seat or site quantities, or add optional services from the catalogue.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#697386] font-medium">Contract Term:</span>
                <select
                  value={contractMonths}
                  onChange={(e) => setContractMonths(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-[#E6EAF0] bg-[#F8F9FC] font-semibold text-[#172033]"
                >
                  <option value={12}>12 Months</option>
                  <option value={24}>24 Months</option>
                  <option value={36}>36 Months</option>
                </select>
              </div>
            </div>

            {/* Live Dependency & Eligibility Status Banner */}
            {bundleValidation && (
              <div
                className={`p-4 rounded-xl border text-xs ${
                  bundleValidation.valid
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#14532D]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                }`}
              >
                <div className="font-semibold flex items-center gap-2">
                  {bundleValidation.valid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#16A36A] shrink-0" />
                      <span>All selected services and companion prerequisites are verified eligible.</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-[#DC4C4C] shrink-0" />
                      <span>Eligibility or Product Dependency Requirement Not Met:</span>
                    </>
                  )}
                </div>
                {!bundleValidation.valid && (
                  <ul className="mt-2 space-y-1 text-[11px] list-disc list-inside">
                    {bundleValidation.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Compact Itemized Product Rows */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[#172033]">
                Included Services in Your Plan ({(roiResult?.lineItems || []).length})
              </div>
              {(roiResult?.lineItems || []).map((item: any) => {
                const fullProd = productMap.get(item.productId);
                return (
                  <ProductRow
                    key={item.productId}
                    productId={item.productId}
                    productName={item.productName}
                    category={item.category}
                    unit={item.unit}
                    unitPriceInr={item.snapshotUnitMonthlyPriceInr}
                    setupFeeInr={item.snapshotUnitSetupFeeInr}
                    quantity={item.quantity}
                    lineMonthlyTotalInr={item.lineMonthlyTotalInr}
                    description={fullProd?.description}
                    dependencies={fullProd?.requiresOneOf}
                    onUpdateQty={(delta) => handleUpdateQty(item.productId, delta)}
                  />
                );
              })}
            </div>

            {/* Add-On Selector (Compact Rows by Category) */}
            <div className="pt-4 border-t border-[#E6EAF0] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#172033]">Add Optional Services</h3>
                  <p className="text-xs text-[#697386]">
                    Browse all 25 catalogue products. Locked items show why they are unavailable for your current profile.
                  </p>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        selectedCategory === cat
                          ? 'bg-[#142B4A] text-white'
                          : 'bg-[#F8F9FC] text-[#697386] hover:text-[#172033] border border-[#E6EAF0]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-[#E6EAF0] border border-[#E6EAF0] rounded-xl bg-[#F8F9FC]/50">
                {filteredCatalogueProducts.map((p: any) => {
                  const isSelected = customItems.some((i) => i.productId === p.productId);
                  const ineligEntry = ineligibleProducts.find((ip: any) => ip.productId === p.productId);
                  return (
                    <div
                      key={p.productId}
                      className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-white transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[#2563EB]">{p.productId}</span>
                          <span className="font-semibold text-[#172033] truncate">{p.productName}</span>
                          {ineligEntry && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                              <Lock className="w-2.5 h-2.5" /> Ineligible
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#697386] truncate mt-0.5">
                          {ineligEntry
                            ? ineligEntry.reasons.join(' • ')
                            : `${p.description} ${
                                p.requiresOneOf?.length
                                  ? `(Requires ${p.requiresOneOf.join(' or ')})`
                                  : ''
                              }`}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-semibold text-[#172033]">
                            ₹{p.priceMinInrPerMonth.toLocaleString('en-IN')}/mo
                          </div>
                          <div className="text-[10px] text-[#697386]">{p.unit.replace(/_/g, ' ')}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleAddon(p.productId)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            isSelected
                              ? 'bg-[#142B4A] text-white border-[#142B4A]'
                              : ineligEntry
                              ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] hover:bg-[#FEE2E2]'
                              : 'bg-white text-[#172033] border-[#E6EAF0] hover:border-[#2563EB]'
                          }`}
                        >
                          {isSelected ? 'Added' : 'Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Collapsible Eligibility Explanations */}
              {ineligibleProducts.length > 0 && (
                <div className="border border-[#E6EAF0] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowIneligiblePanel(!showIneligiblePanel)}
                    className="w-full px-4 py-2.5 bg-[#F8F9FC] text-xs font-medium text-[#697386] hover:text-[#172033] flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                      Why {ineligibleProducts.length} catalogue products are filtered out for your profile
                    </span>
                    {showIneligiblePanel ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {showIneligiblePanel && (
                    <div className="p-4 bg-white border-t border-[#E6EAF0] space-y-2 max-h-48 overflow-y-auto text-xs">
                      {ineligibleProducts.map((ip: any) => (
                        <div key={ip.productId} className="text-[#697386]">
                          <strong className="text-[#172033]">
                            {ip.productId} ({ip.productName}):
                          </strong>{' '}
                          {ip.reasons.join(' ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Itemized Price Summary (incl. GST) & ROI Savings Calculator */}
        <div className="lg:col-span-5 space-y-6">
          {/* Price Breakdown Card */}
          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF0]">
              <div>
                <h3 className="text-sm font-semibold text-[#172033]">Selected Plan Price Breakdown</h3>
                <p className="text-xs text-[#697386]">Calculated by official pricing engine</p>
              </div>
              <StatusBadge variant="navy">{contractMonths}m Term</StatusBadge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-[#697386]">
                <span>Monthly Recurring Subtotal</span>
                <span className="font-semibold text-[#172033]">
                  ₹{proposedMonthlyExclGst.toLocaleString('en-IN')}/mo
                </span>
              </div>
              <div className="flex justify-between text-[#697386]">
                <span>GST (18%)</span>
                <span className="font-medium text-[#172033]">
                  ₹{proposedMonthlyGst.toLocaleString('en-IN')}/mo
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[#172033] pt-2 border-t border-[#E6EAF0]">
                <span>Monthly Total (Incl. 18% GST)</span>
                <span className="text-[#2563EB]">
                  ₹{proposedMonthlyInclGst.toLocaleString('en-IN')}/mo
                </span>
              </div>
              <div className="flex justify-between text-[#697386] pt-1">
                <span>One-Time Installation & Setup Fee</span>
                <span className="font-semibold text-[#172033]">
                  ₹{(roiResult?.proposedOneTimeSetupInr || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <PrimaryButton
              type="button"
              onClick={handleGenerateQuoteAndProceed}
              loading={generatingQuote}
              className="w-full"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Lock Price & Check Coverage
            </PrimaryButton>
          </div>

          {/* Interactive ROI & Savings Calculator */}
          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#172033] flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#2563EB]" />
                <span>ROI & Monthly Savings Calculator</span>
              </h3>
              <p className="text-xs text-[#697386] mt-0.5">
                Compare your current fragmented bills and downtime impact against Udyam One.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-[#697386] mb-1">Current Internet (₹/mo)</label>
                <input
                  type="number"
                  value={currentSpend.broadbandAndInternetInr}
                  onChange={(e) =>
                    setCurrentSpend({
                      ...currentSpend,
                      broadbandAndInternetInr: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 border border-[#E6EAF0] rounded-lg font-semibold text-[#172033]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#697386] mb-1">Mobile & SIMs (₹/mo)</label>
                <input
                  type="number"
                  value={currentSpend.mobileAndSimsInr}
                  onChange={(e) =>
                    setCurrentSpend({ ...currentSpend, mobileAndSimsInr: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 border border-[#E6EAF0] rounded-lg font-semibold text-[#172033]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#697386] mb-1">POS & Billing (₹/mo)</label>
                <input
                  type="number"
                  value={currentSpend.posAndBillingSoftwareInr}
                  onChange={(e) =>
                    setCurrentSpend({
                      ...currentSpend,
                      posAndBillingSoftwareInr: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 border border-[#E6EAF0] rounded-lg font-semibold text-[#172033]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#697386] mb-1">Cloud & Email (₹/mo)</label>
                <input
                  type="number"
                  value={currentSpend.cloudAndEmailToolsInr}
                  onChange={(e) =>
                    setCurrentSpend({
                      ...currentSpend,
                      cloudAndEmailToolsInr: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 border border-[#E6EAF0] rounded-lg font-semibold text-[#172033]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#697386] mb-1">Downtime (Hrs/mo)</label>
                <input
                  type="number"
                  value={currentSpend.downtimeHoursPerMonth}
                  onChange={(e) =>
                    setCurrentSpend({
                      ...currentSpend,
                      downtimeHoursPerMonth: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 border border-[#E6EAF0] rounded-lg font-semibold text-[#172033]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#697386] mb-1">Loss / Hour (₹)</label>
                <input
                  type="number"
                  value={currentSpend.estimatedRevenueLossPerHourInr}
                  onChange={(e) =>
                    setCurrentSpend({
                      ...currentSpend,
                      estimatedRevenueLossPerHourInr: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 border border-[#E6EAF0] rounded-lg font-semibold text-[#172033]"
                />
              </div>
            </div>

            {roiResult && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0]">
                    <div className="text-[11px] text-[#697386]">Current Spend + Risk</div>
                    <div className="text-base font-bold text-[#172033] mt-0.5">
                      ₹
                      {(
                        (roiResult.currentMonthlyDirectSpendInr || 0) +
                        (roiResult.estimatedMonthlyDowntimeRiskInr || 0)
                      ).toLocaleString('en-IN')}
                      /mo
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
                    <div className="text-[11px] text-[#15803D]">Est. Annual Net Value</div>
                    <div className="text-base font-bold text-[#15803D] mt-0.5">
                      ₹{roiResult.estimatedTotalAnnualBenefitInr?.toLocaleString('en-IN')}/yr
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#697386]">Estimated Monthly Net Benefit</span>
                    <span className="font-semibold text-[#16A36A]">
                      ₹{roiResult.estimatedTotalMonthlyBenefitInr?.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#697386]">Setup Cost Payback Period</span>
                    <span className="font-semibold text-[#172033]">
                      {roiResult.paybackMonthsForSetup === 0
                        ? 'Immediate (₹0 setup)'
                        : `${roiResult.paybackMonthsForSetup} months`}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-[11px] text-[#697386]">
                  <Info className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />
                  <span>{roiResult.disclaimer}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
