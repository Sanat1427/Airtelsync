import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  ProgressStepper,
  StatusBadge,
} from '../components/ui';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Info,
  Check,
} from 'lucide-react';

interface QuestionItem {
  key: string;
  label: string;
  explanation: string;
  options: Array<{ value: string; title: string; subtitle: string }>;
}

const QUESTION_GROUPS: Array<{
  id: string;
  title: string;
  subtitle: string;
  questions: QuestionItem[];
}> = [
  {
    id: 'connectivity',
    title: 'Connectivity & Continuity',
    subtitle: 'How your premises connect to the internet and stay online during outages.',
    questions: [
      {
        key: 'internetReliability',
        label: '1. What is your primary internet connection across your premises?',
        explanation: 'Reliable business broadband or leased lines prevent POS and cloud downtime.',
        options: [
          {
            value: 'none_or_hotspot',
            title: 'Mobile Hotspot / Dongle Only',
            subtitle: 'Shared mobile data with variable speed and latency',
          },
          {
            value: 'home_broadband',
            title: 'Consumer Home Broadband',
            subtitle: 'Best-effort residential fibre without commercial SLA',
          },
          {
            value: 'business_broadband',
            title: 'Business Fibre / 5G AirFiber Broadband',
            subtitle: 'Commercial grade broadband with priority support',
          },
          {
            value: 'dedicated_leased_line',
            title: '1:1 Dedicated Internet Leased Line',
            subtitle: 'Symmetric bandwidth with 99.95% uptime SLA',
          },
        ],
      },
      {
        key: 'backupConnectivity',
        label: '2. How do you handle internet outages or fibre cuts?',
        explanation: 'Automated 4G/5G failover keeps billing counters and calls active without manual intervention.',
        options: [
          {
            value: 'no_backup',
            title: 'No Backup Link',
            subtitle: 'Operations pause until the primary line is restored',
          },
          {
            value: 'manual_mobile_hotspot',
            title: 'Manual Phone Hotspot Switching',
            subtitle: 'Staff manually reconnect devices to mobile data',
          },
          {
            value: 'auto_4g_5g_failover',
            title: 'Automatic 4G/5G Failover Router',
            subtitle: 'Instant sub-second switchover to wireless backup',
          },
        ],
      },
    ],
  },
  {
    id: 'payments_pos',
    title: 'Payments & GST Billing',
    subtitle: 'How your business processes customer payments, invoices, and inventory.',
    questions: [
      {
        key: 'upiAndPayments',
        label: '3. How do you accept customer payments?',
        explanation: 'Integrated digital payment terminals speed up checkout and reconciliation.',
        options: [
          {
            value: 'cash_only',
            title: 'Primarily Cash Transactions',
            subtitle: 'Manual cash handling and reconciliation',
          },
          {
            value: 'basic_qr',
            title: 'Static UPI QR Sticker',
            subtitle: 'Manual amount entry by customers without billing sync',
          },
          {
            value: 'integrated_pos',
            title: 'Integrated POS + Dynamic UPI / Card Terminal',
            subtitle: 'Automated payment confirmation linked to invoices',
          },
        ],
      },
      {
        key: 'posAndBilling',
        label: '4. How do you generate GST invoices and track inventory?',
        explanation: 'Cloud POS systems automate GST filing and multi-outlet stock tracking.',
        options: [
          {
            value: 'paper_manual',
            title: 'Paper Bill Book / Calculator',
            subtitle: 'Handwritten receipts and manual ledger entry',
          },
          {
            value: 'basic_excel',
            title: 'Standalone Desktop Excel / Offline Tally',
            subtitle: 'Single-PC records without real-time cloud sync',
          },
          {
            value: 'cloud_gst_pos',
            title: 'Cloud GST POS & Real-Time Inventory',
            subtitle: 'Automated GST billing accessible from anywhere',
          },
        ],
      },
    ],
  },
  {
    id: 'communications',
    title: 'Customer & Team Communication',
    subtitle: 'How customers reach your business and how your team collaborates.',
    questions: [
      {
        key: 'whatsappBusiness',
        label: '5. How do you engage customers on WhatsApp?',
        explanation: 'Verified WhatsApp Business accounts build customer trust and automate order updates.',
        options: [
          {
            value: 'personal_whatsapp',
            title: 'Personal WhatsApp Account',
            subtitle: 'Single phone without business catalogue or automation',
          },
          {
            value: 'whatsapp_business_app',
            title: 'Free WhatsApp Business Mobile App',
            subtitle: 'Basic business profile on a single handset',
          },
          {
            value: 'verified_whatsapp_api',
            title: 'Verified WhatsApp Business API & Multi-Agent Inbox',
            subtitle: 'Automated notifications, catalogue, and team inbox',
          },
        ],
      },
      {
        key: 'businessEmail',
        label: '6. What email and collaboration tools does your team use?',
        explanation: 'Custom domain email and shared cloud drives improve professional credibility.',
        options: [
          {
            value: 'personal_gmail',
            title: 'Personal Email (@gmail.com / @yahoo.com)',
            subtitle: 'Individual accounts without company administration',
          },
          {
            value: 'custom_domain_email',
            title: 'Basic Custom Domain Email',
            subtitle: 'Company email addresses without cloud office suite',
          },
          {
            value: 'full_cloud_office_suite',
            title: 'Cloud Productivity Suite (Email, Docs & Video)',
            subtitle: 'Managed workspace with shared storage and video meetings',
          },
        ],
      },
    ],
  },
  {
    id: 'cloud_records',
    title: 'Data Backup & Digital Records',
    subtitle: 'How your critical business files, accounting, and records are protected.',
    questions: [
      {
        key: 'cloudBackup',
        label: '7. Where are your critical business files and accounting backups stored?',
        explanation: 'Automated encrypted cloud backups protect against hardware failure and ransomware.',
        options: [
          {
            value: 'local_pc_only',
            title: 'Local Computer Hard Disk Only',
            subtitle: 'High risk of permanent loss if PC fails',
          },
          {
            value: 'manual_external_drive',
            title: 'Occasional USB / External Drive Copy',
            subtitle: 'Manual backups that can become outdated',
          },
          {
            value: 'automated_cloud_backup',
            title: 'Automated Encrypted Cloud Backup',
            subtitle: 'Scheduled daily cloud snapshots with instant recovery',
          },
        ],
      },
      {
        key: 'digitalRecords',
        label: '8. How digitized are your core business records and operations?',
        explanation: 'Cloud-based records enable faster financial reporting and remote management.',
        options: [
          {
            value: 'mostly_paper',
            title: 'Paper Ledgers & Physical Registers',
            subtitle: 'Manual record-keeping across departments',
          },
          {
            value: 'partial_digital',
            title: 'Partially Digitized Invoices',
            subtitle: 'Mix of spreadsheets and paper files',
          },
          {
            value: 'fully_cloud_erp_crm',
            title: 'Fully Cloud-Based Accounting & Operations',
            subtitle: 'End-to-end digital workflows across the business',
          },
        ],
      },
    ],
  },
  {
    id: 'security_multisite',
    title: 'Security & Multi-Location Management',
    subtitle: 'How you protect devices, physical premises, and branch connectivity.',
    questions: [
      {
        key: 'cybersecurity',
        label: '9. How are your office computers and network protected against cyber threats?',
        explanation: 'Managed endpoint security and firewalls prevent phishing and data breaches.',
        options: [
          {
            value: 'none',
            title: 'No Antivirus or Firewall Protection',
            subtitle: 'Unprotected computers and open Wi-Fi routers',
          },
          {
            value: 'free_antivirus',
            title: 'Basic Consumer Antivirus',
            subtitle: 'Individual PC antivirus without central policy',
          },
          {
            value: 'managed_endpoint_and_firewall',
            title: 'Managed Endpoint Security & Enterprise Firewall',
            subtitle: 'Centralized threat protection and 24×7 SOC monitoring',
          },
        ],
      },
      {
        key: 'cctvAndPhysicalSecurity',
        label: '10. How do you monitor physical security across your premises?',
        explanation: 'Cloud CCTV retains 30-day off-site recordings and enables mobile viewing.',
        options: [
          {
            value: 'none',
            title: 'No CCTV Cameras Installed',
            subtitle: 'No video monitoring of premises',
          },
          {
            value: 'local_dvr_cctv',
            title: 'Local DVR Only (No Cloud Backup)',
            subtitle: 'On-site hard drive vulnerable to theft or damage',
          },
          {
            value: 'cloud_cctv_and_iot',
            title: 'Cloud CCTV with 30-Day Off-Site Recording',
            subtitle: 'Encrypted cloud video retention and smart alerts',
          },
        ],
      },
      {
        key: 'multiSiteManagement',
        label: '11. How do you manage connectivity across your locations?',
        explanation: 'Centralized SD-WAN unifies branch networks under a single policy dashboard.',
        options: [
          {
            value: 'single_site',
            title: 'Single Business Location',
            subtitle: 'All operations run from one primary address',
          },
          {
            value: 'independent_site_links',
            title: 'Multiple Sites with Separate Unmanaged ISPs',
            subtitle: 'Each branch manages its own local broadband bill',
          },
          {
            value: 'central_sdwan',
            title: 'Centralized Managed SD-WAN Across Sites',
            subtitle: 'Unified multi-site network with central visibility',
          },
        ],
      },
    ],
  },
];

export const ReadinessAssessmentPage: React.FC = () => {
  const { activeBusiness, activeAssessment, setActiveAssessment, showToast } = useApp();
  const navigate = useNavigate();

  const [stepIdx, setStepIdx] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'WIZARD' | 'REPORT'>('REPORT');
  const [calculating, setCalculating] = useState(false);
  const [digitalTwin, setDigitalTwin] = useState<any | null>(null);
  const [simulatedTier, setSimulatedTier] = useState<'Essential' | 'Recommended' | 'Advanced'>('Recommended');

  const [answers, setAnswers] = useState<Record<string, string>>({
    internetReliability: 'none_or_hotspot',
    backupConnectivity: 'no_backup',
    upiAndPayments: 'basic_qr',
    posAndBilling: 'basic_excel',
    whatsappBusiness: 'whatsapp_business_app',
    businessEmail: 'personal_gmail',
    cloudBackup: 'local_pc_only',
    cybersecurity: 'free_antivirus',
    cctvAndPhysicalSecurity: 'local_dvr_cctv',
    digitalRecords: 'partial_digital',
    multiSiteManagement: 'single_site',
  });

  useEffect(() => {
    if (activeAssessment?.answers) {
      setAnswers(activeAssessment.answers);
    }
  }, [activeAssessment]);

  useEffect(() => {
    const bId = activeBusiness?.businessId || 'BIZ-SCEN-01';
    api
      .get(`/digital-twin/${bId}?targetTier=${simulatedTier}`)
      .then((res) => setDigitalTwin(res.data.digitalTwin))
      .catch(() => {});
  }, [activeBusiness?.businessId, simulatedTier, activeAssessment]);

  const handleRecalculate = async () => {
    setCalculating(true);
    try {
      const res = await api.post('/assessment/score', {
        businessId: activeBusiness?.businessId || 'BIZ-SCEN-01',
        answers,
      });
      setActiveAssessment(res.data.assessment || res.data);
      setViewMode('REPORT');
      showToast(
        'success',
        `Readiness Score Updated: ${res.data.overallScore}/100`,
        `Maturity Band: ${res.data.maturityBand}`
      );
    } catch (err: any) {
      showToast('error', 'Failed to Calculate Readiness Score', err.message);
    } finally {
      setCalculating(false);
    }
  };

  const chartData = activeAssessment
    ? [
        { name: 'Connectivity', score: activeAssessment.categoryScores?.connectivity || 0, color: '#2563EB' },
        { name: 'Communication', score: activeAssessment.categoryScores?.communication || 0, color: '#142B4A' },
        { name: 'Productivity', score: activeAssessment.categoryScores?.productivity || 0, color: '#16A36A' },
        { name: 'Security', score: activeAssessment.categoryScores?.security || 0, color: '#E6A23C' },
        { name: 'Continuity', score: activeAssessment.categoryScores?.businessContinuity || 0, color: '#3B82F6' },
      ]
    : [];

  const currentGroup = QUESTION_GROUPS[stepIdx];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: 'Business Assessment' }]}
        title="Business Readiness Assessment"
        subtitle={`Evaluate ${
          activeBusiness?.businessName || 'your business'
        } across five core digital pillars to uncover operational risks and recommended upgrades.`}
        badge={
          activeAssessment && (
            <StatusBadge variant="info">
              Score: {activeAssessment.overallScore}/100 • {activeAssessment.maturityBand}
            </StatusBadge>
          )
        }
        actions={
          <>
            <SecondaryButton
              onClick={() => setViewMode(viewMode === 'WIZARD' ? 'REPORT' : 'WIZARD')}
            >
              {viewMode === 'WIZARD' ? 'View Readiness Report' : 'Edit Assessment Answers'}
            </SecondaryButton>
            <PrimaryButton
              onClick={() => navigate('/advisor')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Consult AI Business Advisor
            </PrimaryButton>
          </>
        }
      />

      {/* Advisory Notice */}
      <div className="bg-[#E8F0FF]/60 border border-[#B3CCFF] rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-[#142B4A]">
        <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
        <span>
          This readiness assessment is a technology gap diagnostic designed to personalize your connectivity and cloud plan recommendations.
        </span>
      </div>

      {/* ====================================================================
          GUIDED STEP-BY-STEP QUESTIONNAIRE WIZARD
      ==================================================================== */}
      {viewMode === 'WIZARD' && (
        <div className="space-y-6 animate-fade-in">
          <ProgressStepper
            orientation="horizontal"
            onStepClick={(idx) => setStepIdx(idx)}
            steps={QUESTION_GROUPS.map((g, i) => ({
              id: g.id,
              label: g.title,
              description: `${g.questions.length} questions`,
              status: i < stepIdx ? 'completed' : i === stepIdx ? 'current' : 'upcoming',
            }))}
          />

          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
            <div className="border-b border-[#E6EAF0] pb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
                  Step {stepIdx + 1} of {QUESTION_GROUPS.length}
                </div>
                <h2 className="text-lg font-semibold text-[#172033] mt-0.5">{currentGroup.title}</h2>
                <p className="text-xs text-[#697386] mt-0.5">{currentGroup.subtitle}</p>
              </div>
            </div>

            <div className="space-y-6">
              {currentGroup.questions.map((q) => (
                <div key={q.key} className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#172033]">{q.label}</h3>
                    <p className="text-xs text-[#697386] mt-0.5">{q.explanation}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [q.key]: opt.value })}
                          className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'bg-[#E8F0FF]/60 border-[#2563EB] ring-1 ring-[#2563EB]'
                              : 'bg-white hover:bg-[#F8F9FC] border-[#E6EAF0]'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                              isSelected
                                ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                : 'border-[#D1D8E4] bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#172033]">{opt.title}</div>
                            <div className="text-[11px] text-[#697386] mt-0.5 leading-snug">
                              {opt.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-5 border-t border-[#E6EAF0] flex items-center justify-between">
              <SecondaryButton
                type="button"
                disabled={stepIdx === 0}
                onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Previous Step
              </SecondaryButton>

              <div className="flex items-center gap-2.5">
                {stepIdx < QUESTION_GROUPS.length - 1 ? (
                  <PrimaryButton
                    type="button"
                    onClick={() => setStepIdx(stepIdx + 1)}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Continue
                  </PrimaryButton>
                ) : (
                  <PrimaryButton
                    type="button"
                    onClick={handleRecalculate}
                    loading={calculating}
                    icon={<RefreshCw className="w-4 h-4" />}
                  >
                    Complete & Generate Report
                  </PrimaryButton>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          POLISHED READINESS REPORT VIEW
      ==================================================================== */}
      {viewMode === 'REPORT' && activeAssessment && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Report Summary & 5-Dimension Chart */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Overall Score Card */}
            <div className="lg:col-span-5 bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#697386]">
                    Overall Readiness Score
                  </span>
                  <StatusBadge variant="info">{activeAssessment.maturityBand}</StatusBadge>
                </div>

                <div className="flex items-center gap-5 p-5 rounded-2xl bg-[#F8F9FC] border border-[#E6EAF0]">
                  <div className="w-20 h-20 rounded-2xl bg-[#142B4A] text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                    <span className="text-3xl font-bold">{activeAssessment.overallScore}</span>
                    <span className="text-[10px] uppercase text-white/60">out of 100</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-[#172033]">
                      {activeBusiness?.businessName}
                    </h3>
                    <p className="text-xs text-[#697386] leading-relaxed">
                      Evaluated across Connectivity, Communication, Productivity, Security, and Business Continuity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E6EAF0] flex items-center justify-between gap-2">
                <SecondaryButton
                  size="sm"
                  onClick={() => {
                    setStepIdx(0);
                    setViewMode('WIZARD');
                  }}
                >
                  Retake Assessment
                </SecondaryButton>
                <PrimaryButton
                  size="sm"
                  onClick={handleRecalculate}
                  loading={calculating}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Refresh Score
                </PrimaryButton>
              </div>
            </div>

            {/* 5-Dimension Capability Chart */}
            <div className="lg:col-span-7 bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#172033]">
                    Five Assessment Dimensions (0–100 Scale)
                  </h3>
                  <p className="text-xs text-[#697386]">
                    Benchmarking your current infrastructure against modern MSME standards
                  </p>
                </div>
              </div>

              <div className="h-52 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 15, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6EAF0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#697386' }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={105}
                      tick={{ fontSize: 12, fontWeight: 500, fill: '#172033' }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #E6EAF0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Identified Gaps & Current Strengths */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
                <AlertTriangle className="w-4 h-4 text-[#E6A23C]" />
                <span>Identified Business Gaps</span>
              </div>
              <ul className="space-y-2 text-xs text-[#697386]">
                {(activeAssessment.identifiedGaps || activeAssessment.weaknesses || []).map(
                  (g: string, i: number) => (
                    <li
                      key={i}
                      className="p-3 rounded-xl bg-[#FFFBEB]/70 border border-[#FDE68A] text-[#78350F] leading-relaxed"
                    >
                      {g}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
                <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
                <span>Current Operational Strengths</span>
              </div>
              <ul className="space-y-2 text-xs text-[#697386]">
                {(activeAssessment.strengths || []).map((s: string, i: number) => (
                  <li
                    key={i}
                    className="p-3 rounded-xl bg-[#ECFDF5]/70 border border-[#A7F3D0] text-[#14532D] leading-relaxed"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ====================================================================
              AI BUSINESS DIGITAL TWIN: BEFORE vs AFTER BUNDLE SIMULATION
          ==================================================================== */}
          {digitalTwin && (
            <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E6EAF0]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F0FF] text-[#2563EB] text-[11px] font-semibold">
                      AI Business Digital Twin
                    </span>
                    <span className="text-[11px] text-[#697386] font-mono">{digitalTwin.twinId}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#172033] mt-1">
                    Before vs. After Bundle Maturity Simulation
                  </h3>
                  <p className="text-xs text-[#697386]">
                    Simulate how adopting a Udyam One bundle elevates your digital maturity and resolves operational risks.
                  </p>
                </div>

                {/* Tier Simulation Selector */}
                <div className="flex items-center gap-1.5 bg-[#F8F9FC] p-1 rounded-xl border border-[#E6EAF0]">
                  {(['Essential', 'Recommended', 'Advanced'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSimulatedTier(tier)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        simulatedTier === tier
                          ? 'bg-[#142B4A] text-white shadow-xs'
                          : 'text-[#697386] hover:text-[#172033]'
                      }`}
                    >
                      {tier === 'Recommended' ? 'Growth (Recommended)' : tier === 'Advanced' ? 'Secure Scale' : 'Essential'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Before vs After Summary Strip */}
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0]">
                  <div className="text-[11px] text-[#697386] font-medium">Current Maturity</div>
                  <div className="text-2xl font-bold text-[#172033] mt-1">
                    {digitalTwin.currentMaturity?.overallScore}/100
                  </div>
                  <div className="text-[11px] text-[#697386] mt-0.5">
                    {digitalTwin.currentMaturity?.maturityBand}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#E8F0FF]/50 border border-[#B3CCFF]">
                  <div className="text-[11px] text-[#2563EB] font-semibold">
                    Simulated After {simulatedTier === 'Recommended' ? 'Growth' : simulatedTier}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-[#142B4A]">
                      {digitalTwin.projectedMaturity?.overallScore}/100
                    </span>
                    <span className="text-xs font-bold text-[#16A36A]">
                      +{digitalTwin.projectedMaturity?.scoreDelta} pts
                    </span>
                  </div>
                  <div className="text-[11px] text-[#142B4A] mt-0.5">
                    {digitalTwin.projectedMaturity?.maturityBand}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0]">
                  <div className="text-[11px] text-[#697386] font-medium">Simulated Bundle Cost</div>
                  <div className="text-xl font-bold text-[#172033] mt-1">
                    ₹{digitalTwin.investmentSummary?.monthlyRecurringInr?.toLocaleString('en-IN')}/mo
                  </div>
                  <div className="text-[11px] text-[#697386] mt-0.5">
                    Setup: ₹{digitalTwin.investmentSummary?.oneTimeSetupInr?.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#ECFDF5]/60 border border-[#A7F3D0]">
                  <div className="text-[11px] text-[#14532D] font-medium">Operational Gaps Closed</div>
                  <div className="text-xl font-bold text-[#16A36A] mt-1">
                    {digitalTwin.operationalGaps?.length || 0} Priority Risks
                  </div>
                  <div className="text-[11px] text-[#14532D] mt-0.5">
                    {digitalTwin.investmentSummary?.servicesIncluded?.length || 0} catalogue services
                  </div>
                </div>
              </div>

              {/* 5-Dimension Before vs After Comparison Bars */}
              <div className="grid lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 space-y-3">
                  <div className="text-xs font-semibold text-[#172033]">
                    5-Dimension Capability Lift (Current vs. Simulated Bundle)
                  </div>
                  <div className="space-y-3">
                    {(digitalTwin.radarChartData || []).map((row: any) => (
                      <div key={row.dimension} className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#172033]">{row.dimension}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[#697386]">Now: {row.currentScore}</span>
                            <span className="text-[#2563EB] font-bold">→ After: {row.projectedScore}/100</span>
                          </div>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-[#E6EAF0] overflow-hidden relative">
                          <div
                            className="h-full bg-[#94A3B8] rounded-full absolute left-0 top-0"
                            style={{ width: `${Math.min(100, row.currentScore)}%` }}
                          />
                          <div
                            className="h-full bg-[#2563EB] rounded-full opacity-85"
                            style={{ width: `${Math.min(100, row.projectedScore)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operational Risk & Consequence Diagnosis */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="text-xs font-semibold text-[#172033]">
                    Operational Risk & Consequence Analysis
                  </div>
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {(digitalTwin.operationalGaps || []).map((gap: any) => (
                      <div
                        key={gap.id}
                        className="p-3.5 rounded-xl border border-[#E6EAF0] bg-[#F8F9FC] space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#172033]">{gap.gapTitle}</span>
                          <StatusBadge
                            variant={
                              gap.severity === 'HIGH'
                                ? 'error'
                                : gap.severity === 'MEDIUM'
                                ? 'warning'
                                : 'info'
                            }
                          >
                            {gap.severity} RISK
                          </StatusBadge>
                        </div>
                        <div className="text-[11px] text-[#697386]">
                          <strong className="text-[#172033]">Business Consequence:</strong> {gap.operationalConsequence}
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[11px] text-[#2563EB] font-medium">
                          <span>
                            Resolved by: {gap.recommendedProductName} ({gap.recommendedProductId})
                          </span>
                          <span>₹{gap.monthlyCostInr?.toLocaleString('en-IN')}/mo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#697386] bg-[#F8F9FC] px-3.5 py-2 rounded-lg border border-[#E6EAF0]">
                {digitalTwin.simulationDisclaimer}
              </div>
            </div>
          )}

          {/* Recommended Improvements & Relevant Catalogue Products */}
          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-[#172033] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  <span>Recommended Improvements & Relevant Products</span>
                </h3>
                <p className="text-xs text-[#697386] mt-0.5">
                  Matched to your business profile and eligible in Tier-{activeBusiness?.cityTier || 2}{' '}
                  {activeBusiness?.city}
                </p>
              </div>
              <PrimaryButton size="sm" onClick={() => navigate('/bundles')}>
                Compare All Bundled Plans
              </PrimaryButton>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeAssessment.actionableRecommendations || []).map((rec: any, i: number) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-[#E6EAF0] bg-[#F8F9FC] flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#E8F0FF] text-[#2563EB] font-mono text-[11px] font-semibold">
                        {rec.productId}
                      </span>
                      <span className="text-xs font-bold text-[#172033]">
                        ₹{rec.monthlyPriceInr?.toLocaleString('en-IN')}/mo
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-[#172033]">{rec.title}</div>
                    <div className="text-[11px] text-[#2563EB] font-medium">
                      Addresses: {rec.gapAddressed}
                    </div>
                    <p className="text-xs text-[#697386] leading-relaxed">{rec.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
