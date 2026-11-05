import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  FormField,
  SelectField,
} from '../components/ui';
import {
  Headphones,
  CheckCircle2,
  Plus,
  Send,
  Gift,
  Wifi,
  FileText,
  Activity,
  ArrowUpRight,
  Sliders,
  Info,
  Copy,
} from 'lucide-react';

export const ActiveServicesPage: React.FC = () => {
  const { activeBusiness, activeOrder, showToast, loadScenario } = useApp();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('PLAN_UPGRADE');
  const [description, setDescription] = useState('');
  const [refBusinessName, setRefBusinessName] = useState('');
  const [refPhone, setRefPhone] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [submittingReferral, setSubmittingReferral] = useState(false);

  const fetchSupportAndReferrals = async () => {
    try {
      const [tRes, rRes] = await Promise.all([
        api.get('/support/tickets', {
          params: activeBusiness?.businessId ? { businessId: activeBusiness.businessId } : undefined,
        }),
        api.get('/referrals'),
      ]);
      setTickets(tRes.data.tickets || []);
      setReferrals(rRes.data.referrals || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSupportAndReferrals();
  }, [activeBusiness?.businessId]);

  const handleCreateTicket = async (
    e?: React.FormEvent,
    quickPreset?: { category: string; subject: string; description: string }
  ) => {
    if (e) e.preventDefault();
    const payload = quickPreset || { category, subject, description };
    if (!payload.subject || !payload.description) {
      showToast('warning', 'Missing Details', 'Please provide both a subject and a short description.');
      return;
    }
    setSubmittingTicket(true);
    try {
      const res = await api.post('/support/tickets', {
        businessId: activeBusiness?.businessId || 'BIZ-SCEN-08',
        orderId: activeOrder?.orderId,
        ...payload,
        priority: 'MEDIUM',
      });
      if (res.data.backendConfirmed) {
        showToast(
          'success',
          `Support Request Created (${res.data.ticket.ticketId})`,
          payload.subject
        );
        setSubject('');
        setDescription('');
        await fetchSupportAndReferrals();
      }
    } catch (err: any) {
      showToast('error', 'Failed to Create Request', err.message);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refBusinessName || !refPhone) return;
    setSubmittingReferral(true);
    try {
      const res = await api.post('/referrals', {
        referrerBusinessId: activeBusiness?.businessId,
        referrerName: `${activeBusiness?.businessName} (${activeBusiness?.contactName})`,
        referredBusinessName: refBusinessName,
        referredContactPhone: refPhone,
        city: activeBusiness?.city,
      });
      showToast(
        'success',
        `Referral Code Generated: ${res.data.referral.referralCode}`,
        `Invited ${refBusinessName} for ₹1,000 bill credit.`
      );
      setRefBusinessName('');
      setRefPhone('');
      await fetchSupportAndReferrals();
    } catch (err: any) {
      showToast('error', 'Referral Error', err.message);
    } finally {
      setSubmittingReferral(false);
    }
  };

  const activeProducts = activeOrder?.products || [
    {
      productId: 'P02',
      productName: 'Biz Fibre 300',
      quantity: 2,
      lineMonthlyTotalInr: 2998,
      unit: 'per site',
    },
    {
      productId: 'P19',
      productName: 'Cloud POS & Billing',
      quantity: 2,
      lineMonthlyTotalInr: 1198,
      unit: 'per counter',
    },
  ];

  const monthlyNet = activeOrder?.monthlyTotalInr || 4895;
  const monthlyGst = Math.round(monthlyNet * 0.18);
  const monthlyGross = monthlyNet + monthlyGst;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Customer Portal"
        title="Active Services & Account Lifecycle"
        subtitle="Manage your active subscriptions, monthly billing, service health, bandwidth upgrades, and business referrals."
        actions={
          <div className="flex items-center gap-2">
            {activeBusiness?.businessId !== 'BIZ-SCEN-08' && (
              <SecondaryButton onClick={() => loadScenario('SCENARIO_8')}>
                <Sliders className="w-3.5 h-3.5" />
                Load Activated Account Demo
              </SecondaryButton>
            )}
            <PrimaryButton onClick={() => navigate('/bundles')}>
              <ArrowUpRight className="w-4 h-4" />
              Explore Upgrades & Add-ons
            </PrimaryButton>
          </div>
        }
      />

      {/* Top Service Health & Billing KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Subscriptions"
          value={`${activeProducts.length} Services`}
          subtext={`${activeBusiness?.numSites || 1} connected location(s)`}
          icon={<Wifi className="w-4 h-4" />}
        />
        <StatCard
          label="Connectivity Uptime"
          value="99.95%"
          subtext="All primary fibre links online"
          trend={{ label: 'Simulated Telemetry', positive: true }}
          icon={<Activity className="w-4 h-4" />}
        />
        <StatCard
          label="Monthly Recurring (Net)"
          value={`₹${monthlyNet.toLocaleString('en-IN')}`}
          subtext={`₹${monthlyGross.toLocaleString('en-IN')}/mo incl. 18% GST`}
          icon={<FileText className="w-4 h-4" />}
        />
        <StatCard
          label="Referral Rewards"
          value={`₹${(referrals.length * 1000).toLocaleString('en-IN')}`}
          subtext={`${referrals.length} businesses referred`}
          icon={<Gift className="w-4 h-4" />}
        />
      </div>

      {/* Active Subscriptions & Monthly Bill Summary */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Active Subscriptions & Service Health */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-navy-900">
                  Active Subscriptions for {activeBusiness?.businessName || 'Your Business'}
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Provisioned across {activeBusiness?.numSites || 1} location(s) in {activeBusiness?.city || 'India'}
                </p>
              </div>
              <StatusBadge status="ACTIVE" />
            </div>

            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
              {activeProducts.map((item: any) => (
                <div
                  key={item.productId}
                  className="p-4 bg-white hover:bg-surface-muted/50 transition flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent text-primary-600 flex items-center justify-center font-mono text-xs font-bold">
                      {item.productId}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink-main">{item.productName}</div>
                      <div className="text-xs text-ink-muted">
                        Active Quantity: <strong className="text-ink-main">{item.quantity}</strong> ({item.unit})
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-navy-900">
                        ₹{item.lineMonthlyTotalInr?.toLocaleString('en-IN')}/mo
                      </div>
                      <div className="text-[11px] text-success font-medium flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Provisioned
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Simulated Connectivity Health Telemetry */}
            <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-navy-900">
                  <Activity className="w-4 h-4 text-success" />
                  Live Line Diagnostics & Service Health
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                  <Info className="w-3 h-3" /> Simulated Network Telemetry
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white border border-border">
                  <div className="text-ink-muted">Optical Signal Level</div>
                  <div className="text-sm font-bold text-navy-900 mt-0.5">-18.4 dBm (Optimal)</div>
                </div>
                <div className="p-3 rounded-lg bg-white border border-border">
                  <div className="text-ink-muted">Measured Throughput</div>
                  <div className="text-sm font-bold text-navy-900 mt-0.5">312 Mbps Down / 305 Mbps Up</div>
                </div>
                <div className="p-3 rounded-lg bg-white border border-border">
                  <div className="text-ink-muted">Gateway Latency</div>
                  <div className="text-sm font-bold text-navy-900 mt-0.5">4.2 ms (0.0% Packet Loss)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Support Tickets & Service Requests */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-navy-900 flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-primary-600" />
                  Support Tickets & Upgrade Requests ({tickets.length})
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Raise a bandwidth upgrade, add new SIM lines, or request technical assistance.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => handleCreateTicket(e)}
              className="grid sm:grid-cols-12 gap-3 p-4 rounded-xl bg-surface-muted border border-border"
            >
              <div className="sm:col-span-4">
                <SelectField
                  label="Request Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: 'PLAN_UPGRADE', label: 'Plan / Bandwidth Upgrade' },
                    { value: 'ADDITIONAL_SIM', label: 'Additional Mobile SIMs' },
                    { value: 'NEW_LOCATION', label: 'Add New Branch Site' },
                    { value: 'CONNECTIVITY_ISSUE', label: 'Connectivity Support' },
                    { value: 'BILLING_QUERY', label: 'GST Invoice / Billing' },
                  ]}
                />
              </div>
              <div className="sm:col-span-8">
                <FormField
                  label="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Add Static IP (P11) for our branch CCTV NVR"
                />
              </div>
              <div className="sm:col-span-9">
                <FormField
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share any details or preferred callback window..."
                />
              </div>
              <div className="sm:col-span-3 flex items-end">
                <PrimaryButton type="submit" loading={submittingTicket} className="w-full">
                  <Send className="w-3.5 h-3.5" />
                  Submit
                </PrimaryButton>
              </div>
            </form>

            <div className="space-y-3">
              {tickets.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-muted border border-dashed border-border rounded-xl">
                  No open support tickets for this business account.
                </div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.ticketId}
                    className="p-4 rounded-xl border border-border bg-white hover:border-slate-300 transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-navy-900">
                        <span className="font-mono text-primary-600 mr-2">{t.ticketId}</span>
                        {t.subject}
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-xs text-ink-muted">{t.description}</p>
                    <div className="text-[11px] text-ink-muted pt-1 flex items-center gap-3">
                      <span>Category: <strong className="text-ink-main">{t.category}</strong></span>
                      <span>•</span>
                      <span>Priority: <strong className="text-ink-main">{t.priority}</strong></span>
                      <span>•</span>
                      <span>Updates: {t.statusHistory?.length || 1}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Consolidated Billing Summary + Quick Upgrades + Referral Program */}
        <div className="lg:col-span-4 space-y-6">
          {/* Monthly Bill Summary Card */}
          <div className="bg-navy-900 text-white rounded-2xl p-6 shadow-elevated space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Monthly Bill Summary
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold">
                Auto-Pay Active
              </span>
            </div>

            <div className="space-y-2 text-xs border-b border-white/10 pb-4">
              <div className="flex justify-between text-slate-300">
                <span>Monthly Subscriptions (Net)</span>
                <span className="font-semibold text-white">₹{monthlyNet.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>GST (18%)</span>
                <span className="font-semibold text-white">₹{monthlyGst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                <span className="font-semibold text-white">Total Monthly Payable</span>
                <span className="text-2xl font-bold text-white">
                  ₹{monthlyGross.toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-slate-300">/mo</span>
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Next Invoice Date</span>
                <strong className="text-white">01 August 2026</strong>
              </div>
              <div className="flex justify-between">
                <span>Contract Term Renewal</span>
                <strong className="text-white">July 2027</strong>
              </div>
            </div>

            {/* Quick One-Click Upgrade Actions */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Quick Service Upgrades
              </div>
              <button
                onClick={() =>
                  handleCreateTicket(undefined, {
                    category: 'PLAN_UPGRADE',
                    subject: 'Upgrade Primary Link from Biz Fibre 100 (P01) to Biz Fibre 300 (P02)',
                    description: 'Customer requested bandwidth upgrade to 300 Mbps via Active Services portal.',
                  })
                }
                className="w-full py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition flex items-center justify-between"
              >
                <span>+ Request 300 Mbps Fibre Upgrade</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  handleCreateTicket(undefined, {
                    category: 'ADDITIONAL_SIM',
                    subject: 'Add 2 Business Postpaid 299 (P07) SIM Cards',
                    description: 'Requesting 2 additional mobile lines for field staff.',
                  })
                }
                className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition flex items-center justify-between"
              >
                <span>+ Add 2 Business Postpaid SIMs</span>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Post-Activation AI Growth Advisor Card */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-accent text-primary-600 font-semibold text-[10px]">
                  Post-Activation Growth Advisor
                </span>
                <h3 className="text-sm font-semibold text-navy-900 mt-1">
                  Recommended Next-Best Expansions
                </h3>
              </div>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Based on your active {activeProducts.length} services and 312 Mbps peak throughput, our AI Digital Twin identified 2 high-ROI expansion opportunities:
            </p>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1">
                <div className="flex items-center justify-between font-semibold text-navy-900">
                  <span>P09 Auto 4G/5G Failover Backup</span>
                  <span className="text-primary-600">₹499/mo</span>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Eliminates POS/UPI billing interruption during local fibre maintenance cuts.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    handleCreateTicket(undefined, {
                      category: 'PLAN_UPGRADE',
                      subject: 'Add P09 Automatic 4G/5G Failover Router to Primary Link',
                      description: 'Requested via Post-Activation AI Growth Advisor.',
                    })
                  }
                  className="text-[11px] font-semibold text-primary-600 hover:underline pt-0.5 inline-flex items-center gap-1"
                >
                  Request 1-Click Provisioning <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1">
                <div className="flex items-center justify-between font-semibold text-navy-900">
                  <span>P17 Cloud Backup 1TB (Encrypted)</span>
                  <span className="text-primary-600">₹399/mo</span>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Protects GST invoices and accounting ledgers with automated daily off-site snapshots.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    handleCreateTicket(undefined, {
                      category: 'PLAN_UPGRADE',
                      subject: 'Enable P17 Automated 1TB Encrypted Cloud Backup',
                      description: 'Requested via Post-Activation AI Growth Advisor.',
                    })
                  }
                  className="text-[11px] font-semibold text-primary-600 hover:underline pt-0.5 inline-flex items-center gap-1"
                >
                  Request 1-Click Provisioning <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Referral Program Card */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary-600" />
                Business Referral Program
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-accent text-primary-600 font-semibold text-[11px]">
                ₹1,000 Credit
              </span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Refer a fellow business owner in your market cluster and earn ₹1,000 bill credit when their connection activates.
            </p>

            <form onSubmit={handleCreateReferral} className="space-y-3">
              <FormField
                label="Referred Business Name"
                value={refBusinessName}
                onChange={(e) => setRefBusinessName(e.target.value)}
                placeholder="e.g., Kaveri Textiles Pvt Ltd"
                required
              />
              <FormField
                label="Owner Mobile Number"
                value={refPhone}
                onChange={(e) => setRefPhone(e.target.value)}
                placeholder="+91 98..."
                required
              />
              <PrimaryButton type="submit" loading={submittingReferral} className="w-full">
                <Plus className="w-4 h-4" />
                Generate Referral Invite
              </PrimaryButton>
            </form>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs font-semibold text-ink-muted">Tracked Referrals ({referrals.length})</div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {referrals.map((r) => (
                  <div
                    key={r.referralCode}
                    className="p-3 rounded-xl bg-surface-muted border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-ink-main">{r.referredBusinessName}</div>
                      <div className="text-[11px] text-ink-muted font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{r.referralCode}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(r.referralCode);
                            showToast('info', 'Copied Referral Code', r.referralCode);
                          }}
                          className="text-primary-600 hover:underline inline-flex items-center gap-0.5"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={r.status} />
                      <div className="text-xs font-bold text-navy-900 mt-1">₹{r.rewardAmountInr}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
