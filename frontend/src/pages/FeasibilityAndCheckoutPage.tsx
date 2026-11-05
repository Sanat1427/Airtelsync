import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  FormField,
  StatusBadge,
  EmptyState,
} from '../components/ui';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Lock,
  ArrowRight,
  Radio,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

export const FeasibilityAndCheckoutPage: React.FC = () => {
  const {
    activeBusiness,
    activeQuote,
    setActiveQuote,
    setActiveOrder,
    showToast,
  } = useApp();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [pinCode, setPinCode] = useState('416059');
  const [city, setCity] = useState('Ludhiana');
  const [feasibility, setFeasibility] = useState<any | null>(null);
  const [checking, setChecking] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showSamplePins, setShowSamplePins] = useState(false);

  useEffect(() => {
    if (activeBusiness) {
      const addr = activeBusiness.address || `Commercial Premises, ${activeBusiness.city}`;
      const pin = activeBusiness.pinCode || '416059';
      const cty = activeBusiness.city || 'Ludhiana';
      setAddress(addr);
      setPinCode(pin);
      setCity(cty);
      runFeasibilityCheck(addr, pin, cty);
    }
  }, [activeBusiness]);

  const runFeasibilityCheck = async (addrVal: string, pinVal: string, cityVal: string) => {
    setChecking(true);
    try {
      const res = await api.post('/feasibility/check', {
        businessId: activeBusiness?.businessId,
        address: addrVal,
        pinCode: pinVal,
        city: cityVal,
        cityTier: activeBusiness?.cityTier || 2,
        requestedProducts: activeQuote?.items?.map((i: any) => i.productId) || ['P01'],
      });
      setFeasibility(res.data);
      if (res.data.outcome === 'NOT_AVAILABLE') {
        showToast(
          'error',
          'Coverage Not Available at PIN',
          'Fixed-line checkout is restricted; a Field Operations survey lead has been logged.'
        );
      } else if (res.data.outcome === 'ALTERNATIVE_AVAILABLE') {
        showToast(
          'warning',
          '5G AirFiber Alternative Available',
          'Wired fibre ducts are full; P04 Business 5G AirFiber is ready for 2-day installation.'
        );
      } else if (res.data.outcome === 'FIELD_SURVEY_REQUIRED') {
        showToast('info', 'Last-Mile Field Survey Scheduled', 'Physical engineering survey logged.');
      }
    } catch (err: any) {
      showToast('error', 'Feasibility Check Failed', err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleSwitchToAirFiberAlternative = async () => {
    try {
      const res = await api.post('/quotes', {
        businessId: activeBusiness?.businessId || 'BIZ-SCEN-01',
        bundleName: 'Udyam 5G AirFiber Rapid Bundle (Wireless Alternative)',
        tier: 'Recommended',
        items: [
          { productId: 'P04', quantity: activeBusiness?.numSites || 1 },
          { productId: 'P07', quantity: 2 },
          { productId: 'P19', quantity: 1 },
        ],
        contractMonths: 12,
        feasibilityStatus: 'ALTERNATIVE_AVAILABLE',
      });
      setActiveQuote(res.data.quote);
      showToast(
        'success',
        'Switched Plan to P04 Business 5G AirFiber',
        'Rapid 2-day wireless installation locked.'
      );
    } catch (err: any) {
      showToast('error', 'Could not switch to alternative', err.message);
    }
  };

  const handleAcceptQuote = async () => {
    if (!activeQuote) return;
    if (!termsAccepted) {
      showToast('warning', 'Service Terms Required', 'Please accept the service terms to proceed.');
      return;
    }
    setAccepting(true);
    try {
      const res = await api.post(`/quotes/${activeQuote.quoteId}/accept`, {
        feasibilityStatus: feasibility?.outcome || activeQuote.feasibilityStatus,
      });
      setActiveQuote(res.data.quote);
      setActiveOrder(res.data.order);
      showToast(
        'success',
        `Order ${res.data.order.orderId} Confirmed`,
        'Proceeding to Smart KYC document verification.'
      );
      navigate('/kyc');
    } catch (err: any) {
      showToast(
        'error',
        'Order Confirmation Blocked',
        err.response?.data?.error || err.message
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleRejectQuote = async () => {
    if (!activeQuote) return;
    try {
      const res = await api.post(`/quotes/${activeQuote.quoteId}/reject`, {
        reason: 'Customer requested plan modification during checkout.',
      });
      setActiveQuote(res.data.quote);
      showToast('info', 'Quote Marked for Revision', 'You can adjust your plan at any time.');
    } catch (err: any) {
      showToast('error', 'Failed to Update Quote', err.message);
    }
  };

  // GST & Final Amount Calculations
  const monthlySubtotal = activeQuote?.monthlyTotalInr || 0;
  const monthlyGst = Math.round(monthlySubtotal * 0.18);
  const monthlyInclGst = monthlySubtotal + monthlyGst;
  const setupSubtotal = activeQuote?.setupTotalInr || 0;
  const setupGst = Math.round(setupSubtotal * 0.18);
  const firstInvoiceFinalAmount = monthlyInclGst + setupSubtotal + setupGst;

  // Separate primary connectivity vs add-on services for clean presentation
  const connectivityIds = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06'];
  const coreItems = (activeQuote?.items || []).filter((i: any) =>
    connectivityIds.includes(i.productId)
  );
  const addonItems = (activeQuote?.items || []).filter(
    (i: any) => !connectivityIds.includes(i.productId)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Overview', href: '/' },
          { label: 'Plans & Pricing', href: '/bundles' },
          { label: 'Coverage & Checkout' },
        ]}
        title="Coverage Feasibility & Order Checkout"
        subtitle="Verify network availability at your installation address and review your itemized quote before confirming your order."
        actions={
          <SecondaryButton onClick={() => navigate('/bundles')}>
            Change Plan
          </SecondaryButton>
        }
      />

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* ====================================================================
            LEFT COLUMN (6 Cols): BUSINESS ADDRESS, PIN & CONNECTIVITY FEASIBILITY
        ==================================================================== */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#E6EAF0]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#E8F0FF] text-[#2563EB]">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#172033]">
                    Installation Address & Coverage Check
                  </h2>
                  <p className="text-xs text-[#697386]">
                    Checks optical fibre and 5G wireless availability at your premises
                  </p>
                </div>
              </div>
              <StatusBadge variant="warning">Simulated Network Data</StatusBadge>
            </div>

            <div className="grid sm:grid-cols-3 gap-3.5">
              <FormField
                label="PIN Code"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="font-mono font-semibold"
              />
              <div className="sm:col-span-2">
                <FormField
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <FormField
                  label="Installation Premises Street Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <SecondaryButton
              type="button"
              onClick={() => runFeasibilityCheck(address, pinCode, city)}
              loading={checking}
              className="w-full"
              icon={<MapPin className="w-4 h-4 text-[#2563EB]" />}
            >
              Verify Connectivity Feasibility
            </SecondaryButton>

            {/* Feasibility Outcome Card */}
            {feasibility && (
              <div
                className={`p-5 rounded-2xl border space-y-3.5 text-xs ${
                  feasibility.outcome === 'AVAILABLE'
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#14532D]'
                    : feasibility.outcome === 'ALTERNATIVE_AVAILABLE'
                    ? 'bg-[#E8F0FF] border-[#B3CCFF] text-[#1E3A8A]'
                    : feasibility.outcome === 'FIELD_SURVEY_REQUIRED'
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#78350F]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    {feasibility.outcome === 'AVAILABLE' && (
                      <CheckCircle2 className="w-5 h-5 text-[#16A36A] shrink-0" />
                    )}
                    {feasibility.outcome === 'ALTERNATIVE_AVAILABLE' && (
                      <Sparkles className="w-5 h-5 text-[#2563EB] shrink-0" />
                    )}
                    {feasibility.outcome === 'FIELD_SURVEY_REQUIRED' && (
                      <AlertTriangle className="w-5 h-5 text-[#E6A23C] shrink-0" />
                    )}
                    {feasibility.outcome === 'NOT_AVAILABLE' && (
                      <XCircle className="w-5 h-5 text-[#DC4C4C] shrink-0" />
                    )}
                    <span>
                      {feasibility.outcome === 'AVAILABLE'
                        ? 'Full Optical Fibre & 5G Coverage Available'
                        : feasibility.outcome === 'ALTERNATIVE_AVAILABLE'
                        ? 'Business 5G AirFiber Alternative Available'
                        : feasibility.outcome === 'FIELD_SURVEY_REQUIRED'
                        ? 'On-Site Engineering Survey Required'
                        : 'Fixed-Line Coverage Currently Unavailable'}
                    </span>
                  </div>
                </div>

                <p className="leading-relaxed opacity-90">{feasibility.explanation}</p>

                {/* Available Connectivity Options & Installation Estimate */}
                <div className="grid sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white/80 border border-black/5">
                    <div className="text-[10px] uppercase opacity-70 font-semibold">Optical Fibre</div>
                    <div className="font-semibold text-[#172033] mt-0.5">
                      {feasibility.fibreAvailable ? 'Available' : 'Not Available'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 border border-black/5">
                    <div className="text-[10px] uppercase opacity-70 font-semibold">5G AirFiber (P04)</div>
                    <div className="font-semibold text-[#172033] mt-0.5">
                      {feasibility.airFiber5GAvailable ? 'Available (24–48h)' : 'Not Available'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/80 border border-black/5">
                    <div className="text-[10px] uppercase opacity-70 font-semibold">
                      Installation Estimate
                    </div>
                    <div className="font-semibold text-[#172033] mt-0.5">
                      {feasibility.estimatedInstallWindowDays}
                    </div>
                  </div>
                </div>

                {feasibility.outcome === 'ALTERNATIVE_AVAILABLE' && (
                  <PrimaryButton
                    type="button"
                    size="sm"
                    onClick={handleSwitchToAirFiberAlternative}
                  >
                    Switch Plan to Business 5G AirFiber (2-Day Install)
                  </PrimaryButton>
                )}

                <div className="text-[11px] opacity-75 pt-2 border-t border-black/10">
                  <strong>Simulation Notice:</strong> {feasibility.simulationNotice}
                </div>
              </div>
            )}

            {/* Discreet Collapsible Coverage Test Scenarios */}
            <div className="border border-[#E6EAF0] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSamplePins(!showSamplePins)}
                className="w-full px-4 py-2.5 bg-[#F8F9FC] text-xs font-medium text-[#697386] hover:text-[#172033] flex items-center justify-between"
              >
                <span>Test Simulated Coverage Scenarios (4 Outcomes)</span>
                {showSamplePins ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {showSamplePins && (
                <div className="p-3.5 bg-white border-t border-[#E6EAF0] grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPinCode('416059');
                      setAddress('Shop/Unit 83, Market Yard, Ludhiana');
                      runFeasibilityCheck('Shop/Unit 83, Market Yard, Ludhiana', '416059', 'Ludhiana');
                    }}
                    className="p-2.5 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#14532D] border border-[#A7F3D0] font-medium text-left"
                  >
                    1. Fibre Available (PIN 416059)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinCode('226055');
                      setAddress('Shop 12, Old Town congested duct, Lucknow');
                      runFeasibilityCheck('Shop 12, Old Town congested duct, Lucknow', '226055', 'Lucknow');
                    }}
                    className="p-2.5 rounded-lg bg-[#E8F0FF] hover:bg-[#D6E4FF] text-[#1E3A8A] border border-[#B3CCFF] font-medium text-left"
                  >
                    2. 5G AirFiber Fallback (PIN 226055)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinCode('581188');
                      setAddress('Plot 44, SEZ Zone Survey Required, Ludhiana');
                      runFeasibilityCheck('Plot 44, SEZ Zone Survey Required, Ludhiana', '581188', 'Ludhiana');
                    }}
                    className="p-2.5 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#78350F] border border-[#FDE68A] font-medium text-left"
                  >
                    3. Field Survey Required (PIN 581188)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinCode('999001');
                      setAddress('Plot 9, Remote Hills Industrial Estate');
                      runFeasibilityCheck('Plot 9, Remote Hills Industrial Estate', '999001', 'Nashik');
                    }}
                    className="p-2.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#7F1D1D] border border-[#FECACA] font-medium text-left"
                  >
                    4. Coverage Unavailable (PIN 999001)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================================
            RIGHT COLUMN (6 Cols): ORDER SUMMARY, ITEMIZED CHARGES, GST & CHECKOUT
        ==================================================================== */}
        <div className="lg:col-span-6 space-y-6">
          {activeQuote ? (
            <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-5">
              {/* Order Summary Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E6EAF0]">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#2563EB]" />
                    <h2 className="text-base font-semibold text-[#172033]">
                      Order Summary ({activeQuote.quoteId})
                    </h2>
                  </div>
                  <p className="text-xs text-[#697386] mt-0.5">
                    Prepared for <strong className="text-[#172033]">{activeBusiness?.businessName}</strong> • GSTIN:{' '}
                    <code className="font-mono">{activeBusiness?.gstin || 'Pending'}</code>
                  </p>
                </div>

                <div className="text-right">
                  <StatusBadge
                    variant={
                      activeQuote.status === 'ACCEPTED'
                        ? 'success'
                        : activeQuote.status === 'REJECTED'
                        ? 'error'
                        : 'info'
                    }
                    dot
                  >
                    {activeQuote.status}
                  </StatusBadge>
                  <div className="text-[10px] text-[#697386] mt-1 flex items-center justify-end gap-1">
                    <Lock className="w-3 h-3 text-[#16A36A]" /> Price Snapshot Locked
                  </div>
                </div>
              </div>

              {/* Selected Bundle Banner */}
              <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] flex items-center justify-between text-xs">
                <div>
                  <div className="text-[11px] text-[#697386]">Selected Bundle</div>
                  <div className="font-semibold text-[#172033] mt-0.5">{activeQuote.bundleName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#697386]">Contract Term</div>
                  <div className="font-semibold text-[#172033] mt-0.5">
                    {activeQuote.contractMonths} Months
                  </div>
                </div>
              </div>

              {/* Core Connectivity & Add-on Line Items */}
              <div className="space-y-3 text-xs">
                {coreItems.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                      Primary Connectivity
                    </div>
                    {coreItems.map((item: any) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E6EAF0]"
                      >
                        <div>
                          <div className="font-semibold text-[#172033]">
                            {item.productName}{' '}
                            <span className="text-[#697386] font-normal">×{item.quantity}</span>
                          </div>
                          <div className="text-[11px] text-[#697386]">
                            ₹{item.snapshotUnitMonthlyPriceInr.toLocaleString('en-IN')}/mo • Setup: ₹
                            {item.lineSetupTotalInr.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="font-semibold text-[#172033]">
                          ₹{item.lineMonthlyTotalInr.toLocaleString('en-IN')}/mo
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {addonItems.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                      Included Add-Ons & Cloud Services
                    </div>
                    {addonItems.map((item: any) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E6EAF0]"
                      >
                        <div>
                          <div className="font-semibold text-[#172033]">
                            {item.productName}{' '}
                            <span className="text-[#697386] font-normal">×{item.quantity}</span>
                          </div>
                          <div className="text-[11px] text-[#697386]">
                            ₹{item.snapshotUnitMonthlyPriceInr.toLocaleString('en-IN')}/mo • Setup: ₹
                            {item.lineSetupTotalInr.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="font-semibold text-[#172033]">
                          ₹{item.lineMonthlyTotalInr.toLocaleString('en-IN')}/mo
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Breakdown (Monthly, Setup, GST, Final Amount) */}
              <div className="p-4 rounded-2xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-2 text-xs">
                <div className="flex justify-between text-[#697386]">
                  <span>Monthly Recurring Charges (Excl. GST)</span>
                  <span className="font-semibold text-[#172033]">
                    ₹{monthlySubtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#697386]">
                  <span>Monthly GST (18%)</span>
                  <span className="font-medium text-[#172033]">
                    ₹{monthlyGst.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-[#172033] pb-2 border-b border-[#E6EAF0]">
                  <span>Total Monthly Recurring (Incl. 18% GST)</span>
                  <span className="text-[#2563EB] text-sm">
                    ₹{monthlyInclGst.toLocaleString('en-IN')} / mo
                  </span>
                </div>

                <div className="flex justify-between text-[#697386] pt-1">
                  <span>One-Time Setup & Installation Charges</span>
                  <span className="font-medium text-[#172033]">
                    ₹{setupSubtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#697386]">
                  <span>GST on Setup Charges (18%)</span>
                  <span className="font-medium text-[#172033]">
                    ₹{setupGst.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2.5 border-t border-[#E6EAF0]">
                  <div>
                    <div className="font-semibold text-sm text-[#172033]">
                      Final First-Month Payable (Incl. Setup & GST)
                    </div>
                    <div className="text-[11px] text-[#697386]">
                      Contract Value ({activeQuote.contractMonths}m + Setup): ₹
                      {activeQuote.contractTotalValueInr?.toLocaleString('en-IN')} (+GST)
                    </div>
                  </div>
                  <span className="text-lg font-bold text-[#142B4A]">
                    ₹{firstInvoiceFinalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {feasibility?.outcome === 'NOT_AVAILABLE' && (
                <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#7F1D1D] flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-[#DC4C4C] shrink-0 mt-0.5" />
                  <div>
                    <strong>Coverage Restriction Active:</strong> Fixed-line coverage is currently unavailable at PIN{' '}
                    <code className="font-mono">{pinCode}</code>. Order confirmation is disabled until coverage is available or a wireless alternative is selected.
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2.5 text-xs text-[#697386] cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-[#D1D8E4] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span>
                  I agree to the Udyam One Enterprise Service Terms and confirm this quotation snapshot. (Simulated checkout—no live payment card is charged.)
                </span>
              </label>

              <div className="flex flex-wrap gap-3 pt-1">
                <PrimaryButton
                  type="button"
                  onClick={handleAcceptQuote}
                  loading={accepting}
                  className="flex-1"
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {activeQuote.status === 'ACCEPTED'
                    ? 'Quote Accepted — Continue to Smart KYC'
                    : 'Accept Quote & Confirm Order'}
                </PrimaryButton>
                <SecondaryButton type="button" onClick={handleRejectQuote}>
                  Request Revision
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Layers className="w-6 h-6" />}
              title="No Active Quotation Found"
              description="Select a connectivity and cloud bundle on the Plans & Pricing page to generate an official quotation."
              action={
                <PrimaryButton onClick={() => navigate('/bundles')}>
                  Explore Plans & Pricing
                </PrimaryButton>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};
