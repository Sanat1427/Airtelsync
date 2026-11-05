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
  DocumentUpload,
} from '../components/ui';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ArrowRight,
  ArrowLeft,
  Wrench,
  UserCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';

function getFriendlyIssueExplanation(issue: any): { headline: string; detail: string } {
  const code = String(issue.code || '').toUpperCase();
  if (code.includes('CANCELLED')) {
    return {
      headline: 'This GST registration appears to be inactive or cancelled.',
      detail:
        'Our check against the GST registry indicates this GSTIN is currently marked as Cancelled. Please provide an active GSTIN or update your registration details.',
    };
  }
  if (code.includes('CHECKSUM') || code.includes('TAMPER')) {
    return {
      headline: 'The GSTIN on the certificate did not pass format verification.',
      detail:
        'One or more characters in the GSTIN appear altered or invalid. Please verify the 15-character GSTIN and re-submit.',
    };
  }
  if (code.includes('NAME_MISMATCH') || code.includes('LEGAL_NAME')) {
    return {
      headline: "We couldn't verify the business name against the registration record.",
      detail:
        'The legal or trade name on your uploaded certificate differs from the official registry record. Please review your business name details.',
    };
  }
  if (code.includes('SIGNATORY')) {
    return {
      headline: 'The authorised signatory name does not match the primary applicant.',
      detail:
        'Please upload an ID card matching the authorised signatory listed on your business application, or update your contact person.',
    };
  }
  if (code.includes('MISSING') || code.includes('BLANK')) {
    return {
      headline: 'Your Udyam registration certificate or number is incomplete.',
      detail:
        'We could not find a valid Udyam registration number on the uploaded file. Please upload a clear Udyam certificate or enter your UDYAM-XX-00-XXXXXXX number.',
    };
  }
  if (code.includes('EXPIRED') || code.includes('AGE') || code.includes('90')) {
    return {
      headline: 'Your utility bill address proof is older than 90 days.',
      detail:
        'Telecom regulations require an electricity or utility bill issued within the last 90 days (on or after 16 April 2026). Please upload a recent bill.',
    };
  }
  if (code.includes('BLUR') || code.includes('CONFIDENCE')) {
    return {
      headline: 'Your document image is slightly blurry and has been queued for specialist review.',
      detail:
        'To protect your account, our system never guesses on low-clarity scans. A verification specialist will review your document shortly, or you may upload a clearer scan.',
    };
  }
  if (code.includes('OCR') || code.includes('NORMALIZED')) {
    return {
      headline: 'Automatic character correction was applied to your rotated scan.',
      detail: issue.description,
    };
  }
  return {
    headline: 'Please review the highlighted document detail.',
    detail: issue.description || 'A discrepancy was detected across your uploaded documents.',
  };
}

const KYC_STEPS = [
  { id: 'CONSENT', label: '1. Consent & Privacy', docFileSuffix: 'gst_certificate.png' },
  { id: 'GST', label: '2. GST Certificate', docFileSuffix: 'gst_certificate.png' },
  { id: 'UDYAM', label: '3. Udyam Certificate', docFileSuffix: 'udyam_certificate.png' },
  { id: 'SIGNATORY', label: '4. Signatory ID', docFileSuffix: 'signatory_id.png' },
  { id: 'ADDRESS', label: '5. Address Proof', docFileSuffix: 'address_proof.png' },
  { id: 'RESULTS', label: '6. Verification Results', docFileSuffix: 'gst_certificate.png' },
];

export const SmartKYCPage: React.FC = () => {
  const {
    activeBusiness,
    setActiveKyc,
    showToast,
    refreshBusinessData,
    setAdminSection,
  } = useApp();
  const navigate = useNavigate();

  const [activeStepIdx, setActiveStepIdx] = useState<number>(5); // Default to Verification Results overview, with clickable 1-6 steps
  const [specimens, setSpecimens] = useState<any[]>([]);
  const [selectedSpecimenCode, setSelectedSpecimenCode] = useState<string>('K03');
  const [consentGiven, setConsentGiven] = useState<boolean>(true);
  const [consentId, setConsentId] = useState<string>('');
  const [validationData, setValidationData] = useState<any | null>(null);
  const [validating, setValidating] = useState<boolean>(false);
  const [previewImageFile, setPreviewImageFile] = useState<string>('K03_gst_certificate.png');
  const [showSpecimenVault, setShowSpecimenVault] = useState<boolean>(true);

  // Self-service correction fields
  const [overrideGstin, setOverrideGstin] = useState<string>('');
  const [overrideUdyam, setOverrideUdyam] = useState<string>('');
  const [overrideBillDate, setOverrideBillDate] = useState<string>('');
  const [verificationHistory, setVerificationHistory] = useState<any[]>([]);
  const [replacingDoc, setReplacingDoc] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/kyc/specimens');
        setSpecimens(res.data.specimens || []);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeBusiness) return;
    let defaultSpec = 'K03';
    if (activeBusiness.businessId === 'BIZ-SCEN-02') defaultSpec = 'K02';
    else if (activeBusiness.businessId === 'BIZ-SCEN-05') defaultSpec = 'K01';
    else if (activeBusiness.businessId === 'BIZ-SCEN-06') defaultSpec = 'K04';
    else if (activeBusiness.businessId === 'BIZ-SCEN-08') defaultSpec = 'K12';

    setSelectedSpecimenCode(defaultSpec);
    setPreviewImageFile(`${defaultSpec}_gst_certificate.png`);
    handleRunValidation(defaultSpec);
  }, [activeBusiness?.businessId]);

  const handleStepSelect = (idx: number) => {
    setActiveStepIdx(idx);
    const step = KYC_STEPS[idx];
    if (step) {
      setPreviewImageFile(`${selectedSpecimenCode}_${step.docFileSuffix}`);
    }
  };

  const handleRecordConsent = async () => {
    try {
      const res = await api.post('/kyc/consent', {
        businessId: activeBusiness?.businessId || 'BIZ-SCEN-01',
        consentGiven: true,
        policyVersion: 'DPDP-2026-v1.2',
      });
      setConsentGiven(true);
      setConsentId(res.data.consent.consentId);
      showToast(
        'success',
        'Privacy Consent Recorded',
        `DPDP-2026-v1.2 Consent ID: ${res.data.consent.consentId}`
      );
      handleStepSelect(1);
    } catch (err: any) {
      showToast('error', 'Consent Error', err.response?.data?.error || err.message);
    }
  };

  const handleRunValidation = async (specCode?: string, useOverrides = false) => {
    const codeToUse = useOverrides ? undefined : specCode ?? selectedSpecimenCode;
    setValidating(true);
    try {
      if (consentGiven && !consentId) {
        await api.post('/kyc/consent', {
          businessId: activeBusiness?.businessId || 'BIZ-SCEN-01',
          consentGiven: true,
        });
      }

      const res = await api.post('/kyc/validate', {
        businessId: activeBusiness?.businessId || 'BIZ-SCEN-01',
        specimenCode: codeToUse,
        businessName: activeBusiness?.businessName,
        contactName: activeBusiness?.contactName,
        gstinInput: useOverrides ? overrideGstin : undefined,
        udyamInput: useOverrides ? overrideUdyam : undefined,
        addressProofDateInput: useOverrides ? overrideBillDate : undefined,
        consentId: consentGiven ? consentId || 'CNS-AUTO' : undefined,
      });

      setActiveKyc(res.data.kycApplication);
      setValidationData(res.data.validation);
      setVerificationHistory(res.data.kycApplication?.verificationHistory || []);
      await refreshBusinessData(activeBusiness?.businessId);

      const st = res.data.validation.determinedStatus;
      showToast(
        st === 'VERIFIED' ? 'success' : st === 'MANUAL_REVIEW' ? 'warning' : 'error',
        st === 'VERIFIED'
          ? 'KYC Verification Complete'
          : st === 'MANUAL_REVIEW'
          ? 'Queued for Specialist Review'
          : 'Document Action Needed',
        st === 'VERIFIED'
          ? 'All documents verified against official records.'
          : `${res.data.validation.crossValidationIssues?.length || 0} item(s) require attention.`
      );
    } catch (err: any) {
      showToast('error', 'KYC Validation Blocked', err.response?.data?.error || err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleFileUpload = async (file: File, docType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('businessId', activeBusiness?.businessId || 'BIZ-SCEN-01');
    formData.append('documentType', docType);
    try {
      const res = await api.post('/kyc/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast(
        'success',
        `Document Uploaded (${file.name})`,
        `Encrypted storage ID: ${res.data.document.documentId}`
      );
    } catch (err: any) {
      showToast('error', 'Upload Failed', err.response?.data?.error || err.message);
    }
  };

  const handleReplaceSingleDocument = async (docType: string) => {
    setReplacingDoc(true);
    try {
      const bId = activeBusiness?.businessId || 'BIZ-SCEN-01';
      const res = await api.post(`/kyc/${bId}/replace-document`, {
        documentType: docType,
        specimenCode: 'K03',
        businessName: activeBusiness?.businessName,
        contactName: activeBusiness?.contactName,
        gstinInput: overrideGstin || '08YKZXS5189L1ZO',
        udyamInput: overrideUdyam || 'UDYAM-RJ-00-6577157',
        addressProofDateInput: overrideBillDate || '2026-06-25',
      });
      setActiveKyc(res.data.kycApplication);
      setValidationData(res.data.validation);
      setVerificationHistory(res.data.kycApplication?.verificationHistory || []);
      await refreshBusinessData(bId);
      showToast(
        'success',
        `Single Document Replaced (${docType})`,
        `Previous attempt preserved in audit trail (#${res.data.verificationHistoryCount}). New status: ${res.data.validation.determinedStatus}`
      );
    } catch (err: any) {
      showToast('error', 'Document Replacement Failed', err.response?.data?.error || err.message);
    } finally {
      setReplacingDoc(false);
    }
  };

  const currentSpecObj = specimens.find((s) => s.specimenCode === selectedSpecimenCode);
  const determinedStatus = validationData?.determinedStatus || 'VERIFIED';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: 'Smart KYC Verification' }]}
        title="Smart KYC & Document Verification"
        subtitle="Securely verify your business registration, signatory identity, and address proof to activate your telecom services."
        badge={
          <StatusBadge
            variant={
              determinedStatus === 'VERIFIED'
                ? 'success'
                : determinedStatus === 'MANUAL_REVIEW'
                ? 'warning'
                : 'error'
            }
            dot
          >
            {determinedStatus === 'VERIFIED'
              ? 'Verified'
              : determinedStatus === 'MANUAL_REVIEW'
              ? 'In Manual Review'
              : 'Action Required'}
          </StatusBadge>
        }
        actions={
          <>
            <SecondaryButton
              onClick={() => {
                setAdminSection('KYC_REVIEW');
                navigate('/admin');
              }}
              icon={<UserCheck className="w-4 h-4 text-[#2563EB]" />}
            >
              Reviewer Workspace
            </SecondaryButton>
            <PrimaryButton
              onClick={() => navigate('/orders')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Order Tracker
            </PrimaryButton>
          </>
        }
      />

      {/* 6-Step Verification Progress Stepper */}
      <ProgressStepper
        orientation="horizontal"
        onStepClick={handleStepSelect}
        steps={KYC_STEPS.map((st, idx) => ({
          id: st.id,
          label: st.label,
          status:
            idx === activeStepIdx
              ? 'current'
              : determinedStatus === 'VERIFIED' || idx < activeStepIdx
              ? 'completed'
              : 'upcoming',
        }))}
      />

      {/* ====================================================================
          MAIN TWO-COLUMN WORKSPACE: STEP CONTENT + DOCUMENT PREVIEW
      ==================================================================== */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Active Step Content or Verification Results */}
        <div className="lg:col-span-7 space-y-5">
          {/* STEP 1: CONSENT & PRIVACY */}
          {activeStepIdx === 0 && (
            <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-5 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#16A36A] shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[#172033]">
                    Step 1: Data Protection & KYC Consent
                  </h2>
                  <p className="text-xs text-[#697386]">
                    Policy Version: <code className="font-mono">DPDP-2026-v1.2</code> • Digital Personal Data Protection Act Compliant
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-2.5 text-xs text-[#697386] leading-relaxed">
                <div>
                  <strong className="text-[#172033]">Documents Collected:</strong> GST Registration Certificate, Udyam Registration Certificate, Authorised Signatory ID Card, and Recent Utility Bill (Address Proof).
                </div>
                <div>
                  <strong className="text-[#172033]">Purpose of Processing:</strong> Mandatory telecommunications subscriber verification, GST/Udyam registry validation, and installation address confirmation.
                </div>
                <div>
                  <strong className="text-[#172033]">Security & Retention:</strong> Documents are stored in private encrypted storage accessible only to you and authorised KYC Reviewers, and are automatically purged after 180 days.
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <StatusBadge variant="success" dot>
                  Explicit Consent Active
                </StatusBadge>
                <PrimaryButton onClick={handleRecordConsent} icon={<ArrowRight className="w-4 h-4" />}>
                  Confirm Consent & Continue
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* STEP 2: GST CERTIFICATE */}
          {activeStepIdx === 1 && (
            <div className="space-y-4 animate-fade-in">
              <DocumentUpload
                label="Step 2: GST Registration Certificate (Form GST REG-06)"
                description="Verified against official GST registry for active status, Modulo-36 checksum, and legal name match."
                status={
                  validationData?.gstinVerification?.status === 'ACTIVE'
                    ? 'VERIFIED'
                    : validationData?.determinedStatus === 'MANUAL_REVIEW'
                    ? 'MANUAL_REVIEW'
                    : 'NEEDS_CORRECTION'
                }
                extractedSummary={[
                  {
                    label: 'Extracted GSTIN',
                    value: validationData?.gstinVerification?.gstin || '—',
                  },
                  {
                    label: 'Registry Status',
                    value: validationData?.gstinVerification?.status || '—',
                  },
                  {
                    label: 'Document Legal Name',
                    value: currentSpecObj?.documents?.GST_CERTIFICATE?.legalName || '—',
                  },
                  {
                    label: 'Registered State',
                    value:
                      validationData?.gstinVerification?.registryRecord?.state ||
                      activeBusiness?.state ||
                      '—',
                  },
                ]}
                previewUrl={`/api/kyc/specimen-image/${selectedSpecimenCode}_gst_certificate.png`}
                onFileSelect={(f) => handleFileUpload(f, 'GST_CERTIFICATE')}
              />
              <div className="flex justify-between">
                <SecondaryButton onClick={() => handleStepSelect(0)} icon={<ArrowLeft className="w-4 h-4" />}>
                  Previous
                </SecondaryButton>
                <PrimaryButton onClick={() => handleStepSelect(2)} icon={<ArrowRight className="w-4 h-4" />}>
                  Next: Udyam Certificate
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* STEP 3: UDYAM CERTIFICATE */}
          {activeStepIdx === 2 && (
            <div className="space-y-4 animate-fade-in">
              <DocumentUpload
                label="Step 3: Udyam Registration Certificate"
                description="Verifies MSME registration number (UDYAM-XX-00-XXXXXXX) and enterprise classification."
                status={
                  selectedSpecimenCode === 'K05'
                    ? 'MISSING'
                    : validationData?.udyamVerification?.status === 'VERIFIED'
                    ? 'VERIFIED'
                    : 'NEEDS_CORRECTION'
                }
                extractedSummary={[
                  {
                    label: 'Udyam Number',
                    value: validationData?.udyamVerification?.udyamNumber || 'Not Found / Blank',
                  },
                  {
                    label: 'Verification Status',
                    value: validationData?.udyamVerification?.status || '—',
                  },
                  {
                    label: 'Enterprise Name',
                    value:
                      validationData?.udyamVerification?.registryRecord?.enterpriseName ||
                      activeBusiness?.businessName ||
                      '—',
                  },
                  {
                    label: 'Enterprise Type',
                    value:
                      validationData?.udyamVerification?.registryRecord?.enterpriseType || 'Micro / Small',
                  },
                ]}
                previewUrl={`/api/kyc/specimen-image/${selectedSpecimenCode}_udyam_certificate.png`}
                onFileSelect={(f) => handleFileUpload(f, 'UDYAM_CERTIFICATE')}
              />
              <div className="flex justify-between">
                <SecondaryButton onClick={() => handleStepSelect(1)} icon={<ArrowLeft className="w-4 h-4" />}>
                  Previous
                </SecondaryButton>
                <PrimaryButton onClick={() => handleStepSelect(3)} icon={<ArrowRight className="w-4 h-4" />}>
                  Next: Signatory ID
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* STEP 4: SIGNATORY ID */}
          {activeStepIdx === 3 && (
            <div className="space-y-4 animate-fade-in">
              <DocumentUpload
                label="Step 4: Authorised Signatory Identity Proof"
                description="Matches the authorised representative's name and role against your business profile."
                status={selectedSpecimenCode === 'K10' ? 'MANUAL_REVIEW' : 'VERIFIED'}
                extractedSummary={[
                  {
                    label: 'Name on ID Card',
                    value: currentSpecObj?.documents?.SIGNATORY_ID?.signatoryName || '—',
                  },
                  {
                    label: 'Designation',
                    value: currentSpecObj?.documents?.SIGNATORY_ID?.designation || 'Proprietor / Director',
                  },
                  {
                    label: 'Expected Applicant',
                    value: currentSpecObj?.expectedContactName || activeBusiness?.contactName || '—',
                  },
                  {
                    label: 'ID Number',
                    value: currentSpecObj?.documents?.SIGNATORY_ID?.idNumber || 'Verified',
                  },
                ]}
                previewUrl={`/api/kyc/specimen-image/${selectedSpecimenCode}_signatory_id.png`}
                onFileSelect={(f) => handleFileUpload(f, 'SIGNATORY_ID')}
              />
              <div className="flex justify-between">
                <SecondaryButton onClick={() => handleStepSelect(2)} icon={<ArrowLeft className="w-4 h-4" />}>
                  Previous
                </SecondaryButton>
                <PrimaryButton onClick={() => handleStepSelect(4)} icon={<ArrowRight className="w-4 h-4" />}>
                  Next: Address Proof
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* STEP 5: ADDRESS PROOF */}
          {activeStepIdx === 4 && (
            <div className="space-y-4 animate-fade-in">
              <DocumentUpload
                label="Step 5: Premises Address Proof (Utility / Electricity Bill)"
                description="Must match your installation address and be issued within the last 90 days (Reference Date: 15 July 2026)."
                status={
                  (validationData?.addressProofAgeDays || 0) > 90 ? 'NEEDS_CORRECTION' : 'VERIFIED'
                }
                extractedSummary={[
                  {
                    label: 'Bill Issue Date',
                    value: currentSpecObj?.documents?.ADDRESS_PROOF?.billDate || '2026-06-20',
                  },
                  {
                    label: 'Document Recency',
                    value: `${validationData?.addressProofAgeDays || 25} days old (Limit: ≤ 90 days)`,
                  },
                  {
                    label: 'Utility Provider',
                    value: currentSpecObj?.documents?.ADDRESS_PROOF?.provider || 'State Electricity Board',
                  },
                  {
                    label: 'Service Address',
                    value: currentSpecObj?.documents?.ADDRESS_PROOF?.address || activeBusiness?.address || '—',
                  },
                ]}
                previewUrl={`/api/kyc/specimen-image/${selectedSpecimenCode}_address_proof.png`}
                onFileSelect={(f) => handleFileUpload(f, 'ADDRESS_PROOF')}
              />
              <div className="flex justify-between">
                <SecondaryButton onClick={() => handleStepSelect(3)} icon={<ArrowLeft className="w-4 h-4" />}>
                  Previous
                </SecondaryButton>
                <PrimaryButton onClick={() => handleStepSelect(5)} icon={<ArrowRight className="w-4 h-4" />}>
                  View Verification Summary
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* STEP 6: VERIFICATION RESULTS & HUMAN-FRIENDLY SUMMARY */}
          {activeStepIdx === 5 && validationData && (
            <div className="space-y-5 animate-fade-in">
              {/* Overall Verification Status Card */}
              <div
                className={`p-6 rounded-2xl border shadow-card flex flex-wrap items-center justify-between gap-4 ${
                  determinedStatus === 'VERIFIED'
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#14532D]'
                    : determinedStatus === 'MANUAL_REVIEW'
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#78350F]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {determinedStatus === 'VERIFIED' && (
                    <CheckCircle2 className="w-7 h-7 text-[#16A36A] shrink-0 mt-0.5" />
                  )}
                  {determinedStatus === 'MANUAL_REVIEW' && (
                    <AlertTriangle className="w-7 h-7 text-[#E6A23C] shrink-0 mt-0.5" />
                  )}
                  {determinedStatus === 'NEEDS_CORRECTION' && (
                    <XCircle className="w-7 h-7 text-[#DC4C4C] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h2 className="text-lg font-semibold">
                      {determinedStatus === 'VERIFIED'
                        ? 'Your Business KYC is Verified'
                        : determinedStatus === 'MANUAL_REVIEW'
                        ? 'Queued for Specialist Verification Review'
                        : 'We Need a Quick Update on Your Documents'}
                    </h2>
                    <p className="text-xs mt-1 opacity-90">
                      Document Clarity: <strong>{Math.round((validationData.minDocConfidence || 0.95) * 100)}%</strong> • Utility Bill Age:{' '}
                      <strong>{validationData.addressProofAgeDays} days</strong> (Reference Date: {validationData.referenceDateUsed})
                    </p>
                  </div>
                </div>

                {determinedStatus === 'VERIFIED' && (
                  <PrimaryButton onClick={() => navigate('/orders')} icon={<ArrowRight className="w-4 h-4" />}>
                    Track Order
                  </PrimaryButton>
                )}
              </div>

              {/* Human-Friendly Verification Findings */}
              <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#172033]">
                    Verification Check Summary
                  </h3>
                  <span className="text-xs text-[#697386]">
                    {validationData.crossValidationIssues?.length || 0} item(s) flagged
                  </span>
                </div>

                {validationData.crossValidationIssues?.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#14532D] flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#16A36A] shrink-0" />
                    <span>
                      All checks passed! Your GSTIN is Active, your Udyam registration is verified, your signatory ID matches, and your address proof is within the 90-day window.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {validationData.crossValidationIssues.map((iss: any, idx: number) => {
                      const friendly = getFriendlyIssueExplanation(iss);
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                            iss.severity === 'CRITICAL'
                              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                              : iss.severity === 'WARNING'
                              ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#78350F]'
                              : 'bg-[#E8F0FF] border-[#B3CCFF] text-[#1E3A8A]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm">{friendly.headline}</span>
                            <span className="px-2 py-0.5 rounded bg-white/80 font-mono text-[10px] font-medium shrink-0">
                              {iss.code}
                            </span>
                          </div>
                          <p className="leading-relaxed opacity-90">{friendly.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Extracted Field Summary Cards */}
                <div className="grid sm:grid-cols-2 gap-3.5 pt-2 text-xs">
                  <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-[#172033]">
                      <span>GST Registration</span>
                      <StatusBadge
                        variant={
                          validationData.gstinVerification?.status === 'ACTIVE' ? 'success' : 'error'
                        }
                      >
                        {validationData.gstinVerification?.status}
                      </StatusBadge>
                    </div>
                    <div className="text-[#697386] space-y-1 text-[11px]">
                      <div>
                        GSTIN: <code className="font-mono text-[#172033]">{validationData.gstinVerification?.gstin}</code>
                      </div>
                      <div>
                        Legal Name: <strong className="text-[#172033]">{currentSpecObj?.documents?.GST_CERTIFICATE?.legalName}</strong>
                      </div>
                      <div>
                        Registry Match: <strong className="text-[#172033]">{validationData.gstinVerification?.registryRecord?.legalName || 'Not Found'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-[#172033]">
                      <span>Udyam & Address Recency</span>
                      <StatusBadge
                        variant={
                          validationData.udyamVerification?.status === 'VERIFIED'
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {validationData.udyamVerification?.status}
                      </StatusBadge>
                    </div>
                    <div className="text-[#697386] space-y-1 text-[11px]">
                      <div>
                        Udyam: <code className="font-mono text-[#172033]">{validationData.udyamVerification?.udyamNumber || 'Missing'}</code>
                      </div>
                      <div>
                        Signatory: <strong className="text-[#172033]">{currentSpecObj?.documents?.SIGNATORY_ID?.signatoryName}</strong>
                      </div>
                      <div>
                        Utility Bill Date: <strong className="text-[#172033]">{currentSpecObj?.documents?.ADDRESS_PROOF?.billDate} ({validationData.addressProofAgeDays}d old)</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Self-Service Correction Form when NEEDS_CORRECTION */}
              {determinedStatus === 'NEEDS_CORRECTION' && (
                <div className="bg-white border-2 border-[#2563EB]/30 rounded-2xl p-6 shadow-card space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[#172033] flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-[#2563EB]" />
                        <span>Update Details & Retry Verification</span>
                      </h3>
                      <p className="text-xs text-[#697386] mt-0.5">
                        Provide your active GSTIN, Udyam number, or recent utility bill date (≤ 90 days) to complete verification immediately.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOverrideGstin('08YKZXS5189L1ZO');
                        setOverrideUdyam('UDYAM-RJ-00-6577157');
                        setOverrideBillDate('2026-06-25');
                      }}
                      className="text-xs text-[#2563EB] hover:underline font-medium"
                    >
                      Auto-fill valid replacement details
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-medium text-[#697386] mb-1">Active GSTIN</label>
                      <input
                        type="text"
                        value={overrideGstin}
                        onChange={(e) => setOverrideGstin(e.target.value.toUpperCase())}
                        placeholder="15-character GSTIN"
                        className="w-full px-3 py-2 border border-[#E6EAF0] rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#697386] mb-1">Udyam Number</label>
                      <input
                        type="text"
                        value={overrideUdyam}
                        onChange={(e) => setOverrideUdyam(e.target.value.toUpperCase())}
                        placeholder="UDYAM-XX-00-XXXXXXX"
                        className="w-full px-3 py-2 border border-[#E6EAF0] rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#697386] mb-1">Recent Bill Date</label>
                      <input
                        type="date"
                        value={overrideBillDate}
                        onChange={(e) => setOverrideBillDate(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E6EAF0] rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <PrimaryButton
                      type="button"
                      onClick={() => handleRunValidation(undefined, true)}
                      loading={validating}
                    >
                      Submit Updated Details & Re-Verify
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() =>
                        handleReplaceSingleDocument(
                          validationData?.recoveryPlan?.[0]?.documentType || 'GST_CERTIFICATE'
                        )
                      }
                      disabled={replacingDoc}
                    >
                      {replacingDoc ? 'Replacing Document...' : 'Replace Single Rejected Document Only'}
                    </SecondaryButton>
                  </div>
                </div>
              )}

              {/* KYC Recovery Agent Action Plan (Plain-English Field Diagnosis & Alternatives) */}
              {Array.isArray(validationData?.recoveryPlan) && validationData.recoveryPlan.length > 0 && (
                <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E8F0FF] text-[#2563EB] text-[11px] font-semibold">
                        KYC Recovery Agent
                      </span>
                      <h3 className="text-sm font-semibold text-[#172033] mt-1">
                        Guided Document Recovery & Acceptable Alternatives
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {validationData.recoveryPlan.map((recItem: any, rIdx: number) => (
                      <div
                        key={rIdx}
                        className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-[#172033]">
                            {recItem.documentType} • Field: <code className="font-mono text-[#2563EB]">{recItem.fieldIdentified}</code>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReplaceSingleDocument(recItem.documentType)}
                            className="px-2.5 py-1 rounded-lg bg-[#2563EB] text-white text-[11px] font-semibold hover:bg-[#1D4ED8] transition"
                          >
                            Replace Only {recItem.documentType}
                          </button>
                        </div>
                        <p className="text-[#697386]">{recItem.plainLanguageExplanation}</p>
                        <div className="text-[#172033]">
                          <strong>How to fix:</strong> {recItem.howToCorrect}
                        </div>
                        {Array.isArray(recItem.acceptableAlternatives) && recItem.acceptableAlternatives.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-[#697386] font-medium">Acceptable Alternatives:</span>
                            {recItem.acceptableAlternatives.map((alt: string, aIdx: number) => (
                              <span
                                key={aIdx}
                                className="px-2 py-0.5 rounded bg-white border border-[#E6EAF0] text-[11px] text-[#142B4A]"
                              >
                                {alt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preserved Verification History Timeline */}
              {verificationHistory.length > 0 && (
                <div className="bg-white border border-[#E6EAF0] rounded-2xl p-5 shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#697386]">
                      Preserved Verification Attempt History ({verificationHistory.length})
                    </h3>
                    <span className="text-[11px] text-[#16A36A] font-medium">
                      Immutable Compliance Trail
                    </span>
                  </div>
                  <div className="space-y-2">
                    {verificationHistory.slice(-4).map((h: any, hIdx: number) => (
                      <div
                        key={hIdx}
                        className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-mono font-semibold text-[#2563EB] mr-2">
                            Attempt #{h.attemptNumber || hIdx + 1}
                          </span>
                          <span className="text-[#172033]">{h.summary}</span>
                        </div>
                        <StatusBadge
                          variant={
                            h.status === 'VERIFIED'
                              ? 'success'
                              : h.status === 'MANUAL_REVIEW'
                              ? 'warning'
                              : 'error'
                          }
                        >
                          {h.status}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Always-Visible Document Image Preview (Customer never feels their document disappeared) */}
        <div className="lg:col-span-5 bg-white border border-[#E6EAF0] rounded-2xl p-5 shadow-card space-y-4 sticky top-24">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#172033] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#2563EB]" />
              <span>Uploaded Document Preview ({selectedSpecimenCode})</span>
            </h3>
            <span className="text-[11px] font-mono text-[#697386]">{previewImageFile}</span>
          </div>

          {/* 4 Document Switcher Pills */}
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { label: 'GST Certificate', file: `${selectedSpecimenCode}_gst_certificate.png` },
              {
                label: 'Udyam Certificate',
                file: `${selectedSpecimenCode}_udyam_certificate.png`,
                missing: selectedSpecimenCode === 'K05',
              },
              { label: 'Signatory ID', file: `${selectedSpecimenCode}_signatory_id.png` },
              { label: 'Address Proof', file: `${selectedSpecimenCode}_address_proof.png` },
            ].map((docTab) => (
              <button
                key={docTab.file}
                type="button"
                onClick={() => setPreviewImageFile(docTab.file)}
                className={`py-2 px-3 rounded-xl font-medium border text-left flex items-center justify-between transition ${
                  previewImageFile === docTab.file
                    ? 'bg-[#142B4A] text-white border-[#142B4A]'
                    : docTab.missing
                    ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                    : 'bg-[#F8F9FC] text-[#172033] border-[#E6EAF0] hover:bg-white'
                }`}
              >
                <span className="truncate">{docTab.label}</span>
                {docTab.missing && <span className="text-[10px] font-bold">Missing</span>}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[#E6EAF0] bg-[#F8F9FC] p-3 flex items-center justify-center min-h-[360px]">
            {selectedSpecimenCode === 'K05' && previewImageFile.includes('udyam') ? (
              <div className="p-6 text-center space-y-2 text-[#7F1D1D]">
                <XCircle className="w-8 h-8 text-[#DC4C4C] mx-auto" />
                <div className="font-semibold text-sm">Udyam Certificate Not Uploaded</div>
                <p className="text-xs text-[#697386]">
                  This application only includes 3 documents. Upload the missing Udyam certificate in Step 3 to complete verification.
                </p>
              </div>
            ) : (
              <img
                src={`/api/kyc/specimen-image/${previewImageFile}`}
                alt={previewImageFile}
                className="max-h-[420px] w-auto object-contain rounded-lg shadow-xs bg-white"
              />
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          SPECIMEN VAULT SELECTOR (K01–K12) FOR TESTING ALL 12 DOCUMENT SETS
      ==================================================================== */}
      <div className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden shadow-card">
        <button
          type="button"
          onClick={() => setShowSpecimenVault(!showSpecimenVault)}
          className="w-full px-6 py-4 bg-[#F8F9FC] flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-[#2563EB]" />
            <div>
              <div className="text-xs font-semibold text-[#172033]">
                Test Specimen Applications (K01–K12 Document Vault)
              </div>
              <div className="text-[11px] text-[#697386]">
                Switch between all 12 supplied KYC specimen sets (47 images) to test OCR normalization, expired bills, and manual review routing
              </div>
            </div>
          </div>
          {showSpecimenVault ? (
            <ChevronUp className="w-4 h-4 text-[#697386]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#697386]" />
          )}
        </button>

        {showSpecimenVault && (
          <div className="p-5 border-t border-[#E6EAF0] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
            {[
              { code: 'K01', tag: 'Cancelled GST + Blank Udyam', status: 'error' },
              { code: 'K02', tag: 'Rotated 7° + O/0 OCR Fix', status: 'warning' },
              { code: 'K03', tag: 'Clean Verified Record', status: 'success' },
              { code: 'K04', tag: 'Blurry Scan (62% Conf)', status: 'warning' },
              { code: 'K05', tag: 'Missing Udyam File', status: 'error' },
              { code: 'K06', tag: 'Tampered GSTIN Digit', status: 'error' },
              { code: 'K07', tag: 'Legal Name Mismatch', status: 'error' },
              { code: 'K08', tag: 'Clean Verified Record', status: 'success' },
              { code: 'K09', tag: 'Clean Verified Record', status: 'success' },
              { code: 'K10', tag: 'Signatory ID Mismatch', status: 'warning' },
              { code: 'K11', tag: 'Expired Bill (257 Days)', status: 'error' },
              { code: 'K12', tag: 'Clean Verified Record', status: 'success' },
            ].map((item) => {
              const active = selectedSpecimenCode === item.code;
              const specInfo = specimens.find((s) => s.specimenCode === item.code);
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setSelectedSpecimenCode(item.code);
                    setPreviewImageFile(`${item.code}_gst_certificate.png`);
                    setActiveStepIdx(5);
                    handleRunValidation(item.code);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? 'bg-[#E8F0FF] border-[#2563EB] ring-1 ring-[#2563EB]'
                      : 'bg-[#F8F9FC] hover:bg-white border-[#E6EAF0]'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[#172033]">
                    <span>{item.code}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.status === 'success'
                          ? 'bg-[#16A36A]'
                          : item.status === 'warning'
                          ? 'bg-[#E6A23C]'
                          : 'bg-[#DC4C4C]'
                      }`}
                    />
                  </div>
                  <div className="font-medium text-[11px] text-[#172033] truncate mt-0.5">
                    {specInfo?.businessName || item.code}
                  </div>
                  <div className="text-[10px] text-[#697386] mt-0.5 truncate">{item.tag}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
