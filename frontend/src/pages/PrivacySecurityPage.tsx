import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  PageHeader,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  FileCheck2,
  Server,
  AlertTriangle,
  Clock,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Database,
  CheckCircle2,
} from 'lucide-react';

export const PrivacySecurityPage: React.FC = () => {
  const { activeBusiness, activeKyc } = useApp();
  const navigate = useNavigate();
  const [showTechGovernance, setShowTechGovernance] = useState(false);

  const hasConsent = Boolean(activeKyc?.consentGiven);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        badge="Trust & Privacy Centre"
        title="Data Privacy, Security & Your Rights"
        subtitle="Transparent information on how Udyam One protects your business registration records, KYC documents, and account data."
        actions={
          <SecondaryButton onClick={() => navigate('/kyc')}>
            <ShieldCheck className="w-4 h-4" />
            Manage KYC & Consent
          </SecondaryButton>
        }
      />

      {/* Current Consent Status Banner */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent text-primary-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-navy-900">
                Consent Status for {activeBusiness?.businessName || 'Your Business'}
              </h2>
              <StatusBadge status={hasConsent ? 'VERIFIED' : 'PENDING'} />
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Policy Version: <strong className="text-ink-main">DPDP-2026-v1.2</strong> •{' '}
              {hasConsent
                ? 'Explicit digital consent recorded for KYC verification and registry lookup.'
                : 'No identity documents are processed until you provide explicit consent on the Smart KYC screen.'}
            </p>
          </div>
        </div>
        {!hasConsent && (
          <PrimaryButton onClick={() => navigate('/kyc')}>
            Review & Grant Consent
          </PrimaryButton>
        )}
      </div>

      {/* Core 6 Privacy Pillars */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* 1. Data Collected */}
        <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-navy-900">
            <Database className="w-4 h-4 text-primary-600" />
            1. Data We Collect
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            We collect only the minimum business and subscriber information required to recommend plans, check network coverage, and complete regulatory telecom onboarding:
          </p>
          <ul className="space-y-1.5 text-xs text-ink-main">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              Business identity, industry type, employee count, and site PIN codes
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              GSTIN and Udyam Registration numbers for entity validation
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              Authorised Signatory Proof of Identity (PAN / Aadhaar / Passport)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              Premises Address Proof (Utility Bill or Lease Agreement within 90 days)
            </li>
          </ul>
        </div>

        {/* 2. Purpose of Collection */}
        <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-navy-900">
            <FileCheck2 className="w-4 h-4 text-primary-600" />
            2. Purpose of Collection
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Your business information and documents are used strictly for the following specified purposes:
          </p>
          <ul className="space-y-1.5 text-xs text-ink-main">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              Mandatory Department of Telecommunications (DoT) subscriber verification
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              Automated GSTIN & Udyam registry cross-verification and GST invoicing
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              PIN-level optical fibre / 5G Fixed Wireless feasibility assessment
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              Installation scheduling and ongoing service lifecycle support
            </li>
          </ul>
        </div>

        {/* 3. Document Handling & Retention */}
        <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-navy-900">
            <Clock className="w-4 h-4 text-primary-600" />
            3. Document Handling & Retention
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Uploaded KYC documents are stored in isolated, non-public storage buckets and are accessible only to your account and authorised KYC Compliance Reviewers.
          </p>
          <div className="p-3.5 rounded-xl bg-surface-muted border border-border text-xs space-y-1">
            <div className="font-semibold text-navy-900">180-Day Compliance Retention Window</div>
            <p className="text-ink-muted">
              Raw document uploads are retained for 180 days for regulatory audit verification and automatically purged thereafter, keeping only verified status metadata.
            </p>
          </div>
        </div>

        {/* 4. Data Protection & Tenant Isolation */}
        <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-navy-900">
            <EyeOff className="w-4 h-4 text-primary-600" />
            4. Data Protection & Isolation
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Every customer session is strictly isolated at the API layer so no business can view or query another customer's profile, quotes, or KYC records.
          </p>
          <div className="p-3.5 rounded-xl bg-surface-muted border border-border text-xs space-y-1">
            <div className="font-semibold text-navy-900">Identifier Masking & Role Access Control</div>
            <p className="text-ink-muted">
              Sensitive registration numbers are masked in operational logs, and every administrative review action is recorded in an immutable security audit trail.
            </p>
          </div>
        </div>
      </div>

      {/* 5. User Rights under DPDP Principles */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-navy-900">
          <UserCheck className="w-4 h-4 text-primary-600" />
          5. Your Data Principal Rights
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-1">
            <div className="font-semibold text-navy-900">Right to Access & Review</div>
            <p className="text-ink-muted leading-relaxed">
              View all business details, extracted OCR fields, and active service subscriptions associated with your account at any time.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-1">
            <div className="font-semibold text-navy-900">Right to Correction</div>
            <p className="text-ink-muted leading-relaxed">
              Update your business profile or re-upload corrected registration and address documents directly through the Smart KYC workflow.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-1">
            <div className="font-semibold text-navy-900">Right to Withdraw Consent</div>
            <p className="text-ink-muted leading-relaxed">
              Withdraw onboarding consent prior to activation or raise a data deletion request through our Privacy Grievance Officer.
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Technical AI Safety & Architecture Governance Note */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-card">
        <button
          type="button"
          onClick={() => setShowTechGovernance(!showTechGovernance)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-muted transition"
        >
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-primary-600" />
            <div>
              <div className="text-sm font-semibold text-navy-900">
                Technical Architecture, RBAC & AI Safety Governance
              </div>
              <div className="text-xs text-ink-muted">
                How Udyam One enforces deterministic pricing, eligibility rules, and human-in-the-loop KYC oversight
              </div>
            </div>
          </div>
          {showTechGovernance ? (
            <ChevronUp className="w-4 h-4 text-ink-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ink-muted" />
          )}
        </button>

        {showTechGovernance && (
          <div className="px-6 pb-6 pt-2 border-t border-border space-y-4 text-xs">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-1.5">
                <div className="font-semibold text-navy-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary-600" />
                  Authoritative Backend & Zero-Hallucination Pricing
                </div>
                <p className="text-ink-muted leading-relaxed">
                  The conversational AI Advisor extracts business requirements but is never permitted to invent prices, waive GSTIN requirements, or bypass companion product dependencies. Every quote is computed by the deterministic Node.js pricing engine against the 25-product catalogue.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-1.5">
                <div className="font-semibold text-navy-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
                  Human-in-the-Loop KYC Compliance Escalation
                </div>
                <p className="text-ink-muted leading-relaxed">
                  Whenever OCR extraction confidence falls below 80% (such as blurred or low-contrast scans), the application is automatically routed to a certified human KYC Reviewer rather than being auto-approved or summarily rejected.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Production Legal & Regulatory Review Note</div>
                <p className="mt-0.5 text-amber-900 leading-relaxed">
                  While technical consent gating, tenant isolation, role-based access control, and immutable audit logging are active in this platform, commercial telecom deployment requires formal DoT subscriber verification sign-off, DPDP Act 2023 Data Fiduciary compliance audit, and CERT-In security certification.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
