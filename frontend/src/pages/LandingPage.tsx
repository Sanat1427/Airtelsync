import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '../components/ui';
import {
  ArrowRight,
  Wifi,
  ShieldCheck,
  MessageSquare,
  Cloud,
  Building2,
  ClipboardCheck,
  Layers,
  Truck,
  CheckCircle2,
  Sparkles,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const {
    activeBusiness,
    activeAssessment,
    activeRecommendation,
    activeOrder,
    activeKyc,
    setDemoControlsOpen,
  } = useApp();
  const navigate = useNavigate();

  const recommendedBundle =
    activeRecommendation?.bundles?.find((b: any) => b.tier === 'Recommended') ||
    activeRecommendation?.bundles?.[0];

  // Determine the intelligent next step in the customer's onboarding journey
  const getRecommendedNextStep = () => {
    if (!activeBusiness) {
      return {
        title: 'Complete your business profile',
        description: 'Tell us about your locations, team size, and GST details to unlock tailored plans.',
        cta: 'Set Up Profile',
        path: '/profile',
        stepNumber: 'Step 1 of 5',
      };
    }
    if (!activeAssessment) {
      return {
        title: 'Take your 2-minute Business Readiness Assessment',
        description: 'Identify connectivity, backup, billing, and security gaps across your locations.',
        cta: 'Start Assessment',
        path: '/readiness',
        stepNumber: 'Step 2 of 5',
      };
    }
    if (!activeOrder) {
      return {
        title: 'Review your recommended connectivity plan & check coverage',
        description: `Your ${recommendedBundle?.bundleName || 'Growth'} plan is ready. Verify PIN ${
          activeBusiness.pinCode || '416059'
        } feasibility and lock your quote.`,
        cta: 'Review Plan & Checkout',
        path: '/bundles',
        stepNumber: 'Step 3 of 5',
      };
    }
    if (activeKyc?.status !== 'VERIFIED') {
      return {
        title: 'Complete Smart KYC verification',
        description: 'Verify your GST certificate, Udyam registration, and address proof to schedule installation.',
        cta: 'Complete KYC',
        path: '/kyc',
        stepNumber: 'Step 4 of 5',
      };
    }
    if (activeOrder.status !== 'ACTIVATED') {
      return {
        title: 'Track your installation appointment',
        description: `Order ${activeOrder.orderId} is ${activeOrder.status.replace(/_/g, ' ').toLowerCase()}. Expected activation by ${activeOrder.expectedInstallationDate}.`,
        cta: 'Track Order',
        path: '/orders',
        stepNumber: 'Step 5 of 5',
      };
    }
    return {
      title: 'Manage your active services & billing',
      description: 'All connectivity and cloud tools are active. View service health, invoices, or request upgrades.',
      cta: 'Manage Services',
      path: '/active-services',
      stepNumber: 'Active Customer',
    };
  };

  const nextStep = getRecommendedNextStep();

  return (
    <div className="space-y-8">
      {/* ====================================================================
          COMMERCIAL SAAS HERO SECTION
      ==================================================================== */}
      <section className="bg-white border border-[#E6EAF0] rounded-2xl p-6 sm:p-10 shadow-card overflow-hidden relative">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Left 7 Cols: Headline, Subheading & CTAs */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F0FF] text-[#2563EB] text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Udyam One for Indian Businesses</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-semibold text-[#172033] tracking-tight leading-[1.18]">
              Everything your business needs to stay connected.
            </h1>

            <p className="text-sm sm:text-base text-[#697386] leading-relaxed max-w-xl">
              Internet, communication, productivity and security — all managed in one place.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <PrimaryButton
                size="lg"
                onClick={() => navigate('/advisor')}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Get Started
              </PrimaryButton>

              <SecondaryButton size="lg" onClick={() => navigate('/bundles')}>
                Explore Plans
              </SecondaryButton>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#697386]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
                99.95% Enterprise SLA Uptime
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
                Instant GST & Udyam Verification
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
                Single Consolidated GST Invoice
              </span>
            </div>
          </div>

          {/* Right 5 Cols: Clean Visual Composition of the Business Connectivity Ecosystem */}
          <div className="lg:col-span-5">
            <div className="bg-[#F8F9FC] border border-[#E6EAF0] rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF0]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#16A36A]" />
                  <span className="text-xs font-semibold text-[#142B4A]">
                    Connected Business Ecosystem
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#2563EB] bg-[#E8F0FF] px-2 py-0.5 rounded-md">
                  Unified Stack
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-xl bg-white border border-[#E6EAF0] shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#E8F0FF] text-[#2563EB] flex items-center justify-center">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-[#172033]">High-Speed Internet</div>
                  <p className="text-[11px] text-[#697386] leading-snug">
                    Business Fibre, Leased Line & 5G AirFiber backup
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E6EAF0] shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#16A36A] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-[#172033]">Communication</div>
                  <p className="text-[11px] text-[#697386] leading-snug">
                    Verified WhatsApp Business, Cloud IVR & Postpaid
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E6EAF0] shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] text-[#E6A23C] flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-[#172033]">Productivity & POS</div>
                  <p className="text-[11px] text-[#697386] leading-snug">
                    GST Billing POS, Business Email & 1 TB Cloud Backup
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E6EAF0] shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0F4F9] text-[#142B4A] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-[#172033]">Cyber & Site Security</div>
                  <p className="text-[11px] text-[#697386] leading-snug">
                    Managed Firewall, Endpoint Protection & Cloud CCTV
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          RECOMMENDED NEXT STEP BANNER
      ==================================================================== */}
      <section className="bg-[#142B4A] text-white rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-white/10 text-[#B3CCFF] text-[11px] font-medium">
              {nextStep.stepNumber}
            </span>
            <span className="text-xs text-white/70 font-medium">Recommended Next Step</span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-white">{nextStep.title}</h2>
          <p className="text-xs text-white/75 max-w-2xl">{nextStep.description}</p>
        </div>

        <PrimaryButton
          onClick={() => navigate(nextStep.path)}
          className="shrink-0"
          icon={<ArrowRight className="w-4 h-4" />}
        >
          {nextStep.cta}
        </PrimaryButton>
      </section>

      {/* ====================================================================
          WORKSPACE OVERVIEW GRID (Profile, Readiness, Plan, Orders)
      ==================================================================== */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* 1. Current Business Profile Status */}
        <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#E8F0FF] text-[#2563EB]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#172033]">Business Profile Status</h3>
                  <p className="text-xs text-[#697386]">Company details & registrations</p>
                </div>
              </div>
              <StatusBadge
                variant={
                  activeBusiness?.gstinVerifiedStatus === 'ACTIVE'
                    ? 'success'
                    : activeBusiness?.gstinVerifiedStatus === 'CANCELLED'
                    ? 'error'
                    : 'warning'
                }
                dot
              >
                {activeBusiness?.gstinVerifiedStatus === 'ACTIVE'
                  ? 'Verified Profile'
                  : activeBusiness?.gstinVerifiedStatus || 'Pending Verification'}
              </StatusBadge>
            </div>

            {activeBusiness ? (
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] text-xs">
                <div>
                  <div className="text-[#697386]">Business Name</div>
                  <div className="font-semibold text-[#172033] mt-0.5">
                    {activeBusiness.businessName}
                  </div>
                </div>
                <div>
                  <div className="text-[#697386]">Industry & Segment</div>
                  <div className="font-semibold text-[#172033] mt-0.5">
                    {activeBusiness.businessType}
                  </div>
                </div>
                <div>
                  <div className="text-[#697386]">Locations & Team</div>
                  <div className="font-semibold text-[#172033] mt-0.5">
                    {activeBusiness.numSites} site(s) • {activeBusiness.employeeCount} staff
                  </div>
                </div>
                <div>
                  <div className="text-[#697386]">Primary City & PIN</div>
                  <div className="font-semibold text-[#172033] mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#2563EB]" />
                    {activeBusiness.city} ({activeBusiness.pinCode || '416059'})
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#697386]">No business profile configured yet.</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#E6EAF0]">
            <span className="text-xs text-[#697386]">
              Profile completion: <strong className="text-[#172033]">{activeBusiness?.profileCompletionPct || 95}%</strong>
            </span>
            <SecondaryButton size="sm" onClick={() => navigate('/profile')}>
              Edit Profile
            </SecondaryButton>
          </div>
        </div>

        {/* 2. Business Readiness Score */}
        <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#E8F0FF] text-[#2563EB]">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#172033]">Business Readiness Score</h3>
                  <p className="text-xs text-[#697386]">Digital maturity across 5 pillars</p>
                </div>
              </div>
              {activeAssessment && (
                <StatusBadge variant="info">{activeAssessment.maturityBand}</StatusBadge>
              )}
            </div>

            {activeAssessment ? (
              <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-[#142B4A] text-white flex flex-col items-center justify-center shrink-0">
                  <span className="text-xl font-bold">{activeAssessment.overallScore}</span>
                  <span className="text-[10px] text-white/60">/ 100</span>
                </div>
                <div className="flex-1 space-y-1.5 text-xs">
                  <div className="font-medium text-[#172033]">Top Identified Focus Area:</div>
                  <p className="text-[#697386] line-clamp-2">
                    {activeAssessment.identifiedGaps?.[0] ||
                      activeAssessment.weaknesses?.[0] ||
                      'Upgrade primary connectivity and enable automated cloud backup.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#697386]">
                Complete our guided assessment to measure your connectivity and security readiness.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#E6EAF0]">
            <span className="text-xs text-[#697386]">
              {activeAssessment?.actionableRecommendations?.length || 3} tailored improvements available
            </span>
            <SecondaryButton size="sm" onClick={() => navigate('/readiness')}>
              View Assessment
            </SecondaryButton>
          </div>
        </div>

        {/* 3. Recommended Plan */}
        <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#E8F0FF] text-[#2563EB]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#172033]">Recommended Plan</h3>
                  <p className="text-xs text-[#697386]">Tailored to your size & locations</p>
                </div>
              </div>
              {recommendedBundle && (
                <StatusBadge variant="success">{recommendedBundle.matchScore}% Match</StatusBadge>
              )}
            </div>

            {recommendedBundle ? (
              <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[#2563EB]">Growth Plan (Recommended)</div>
                    <div className="text-sm font-semibold text-[#172033]">
                      {recommendedBundle.bundleName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#172033]">
                      ₹{recommendedBundle.monthlyTotalInr?.toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-[#697386]">/mo</span>
                    </div>
                    <div className="text-[10px] text-[#697386]">+ 18% GST</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(recommendedBundle.products || []).slice(0, 4).map((p: any) => (
                    <span
                      key={p.productId}
                      className="px-2 py-0.5 rounded-md bg-white border border-[#E6EAF0] text-[11px] font-medium text-[#172033]"
                    >
                      {p.productName} ×{p.quantity}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#697386]">
                Speak with the AI Business Advisor to generate a tailored connectivity & cloud bundle.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#E6EAF0]">
            <span className="text-xs text-[#697386]">
              Includes eligibility & dependency checks
            </span>
            <SecondaryButton size="sm" onClick={() => navigate('/bundles')}>
              Compare Plans
            </SecondaryButton>
          </div>
        </div>

        {/* 4. Existing Orders & Installation */}
        <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#E8F0FF] text-[#2563EB]">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#172033]">Orders & Installation</h3>
                  <p className="text-xs text-[#697386]">Provisioning & service activation</p>
                </div>
              </div>
              {activeOrder ? (
                <StatusBadge
                  variant={activeOrder.status === 'ACTIVATED' ? 'success' : 'info'}
                  dot
                >
                  {activeOrder.status.replace(/_/g, ' ')}
                </StatusBadge>
              ) : (
                <StatusBadge variant="neutral">No Active Order</StatusBadge>
              )}
            </div>

            {activeOrder ? (
              <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#697386]">Order Reference</span>
                  <span className="font-mono font-semibold text-[#172033]">{activeOrder.orderId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#697386]">Scheduled Installation</span>
                  <span className="font-medium text-[#172033]">
                    {activeOrder.expectedInstallationDate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#697386]">Monthly Subscription</span>
                  <span className="font-semibold text-[#172033]">
                    ₹{activeOrder.monthlyTotalInr?.toLocaleString('en-IN')}/mo
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] text-xs text-[#697386]">
                You do not have an active order yet. Select a plan and verify coverage at your PIN code to schedule installation.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#E6EAF0]">
            <span className="text-xs text-[#697386]">
              {activeOrder ? `${activeOrder.products?.length || 0} service(s) in order` : 'Ready to order'}
            </span>
            <SecondaryButton
              size="sm"
              onClick={() => navigate(activeOrder ? '/orders' : '/feasibility')}
            >
              {activeOrder ? 'Track Order' : 'Check Coverage'}
            </SecondaryButton>
          </div>
        </div>
      </section>

      {/* Subtle Workspace Switcher Footer for Demo Convenience */}
      <div className="bg-white border border-[#E6EAF0] rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#697386]">
        <div className="flex items-center gap-2">
          <span>
            Viewing workspace for <strong className="text-[#172033]">{activeBusiness?.businessName}</strong> ({activeBusiness?.city})
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDemoControlsOpen(true)}
          className="inline-flex items-center gap-1.5 text-[#2563EB] hover:underline font-medium"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Switch sample business or role</span>
        </button>
      </div>
    </div>
  );
};
