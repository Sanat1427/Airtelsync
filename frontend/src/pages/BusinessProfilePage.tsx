import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  FormField,
  SelectField,
  StatusBadge,
} from '../components/ui';
import {
  Building2,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const CITY_OPTIONS = [
  { city: 'Delhi', state: 'Delhi', tier: 1 },
  { city: 'Mumbai', state: 'Maharashtra', tier: 1 },
  { city: 'Bengaluru', state: 'Karnataka', tier: 1 },
  { city: 'Hyderabad', state: 'Telangana', tier: 1 },
  { city: 'Chennai', state: 'Tamil Nadu', tier: 1 },
  { city: 'Pune', state: 'Maharashtra', tier: 1 },
  { city: 'Kolkata', state: 'West Bengal', tier: 1 },
  { city: 'Ahmedabad', state: 'Gujarat', tier: 1 },
  { city: 'Ludhiana', state: 'Punjab', tier: 2 },
  { city: 'Kochi', state: 'Kerala', tier: 2 },
  { city: 'Nagpur', state: 'Maharashtra', tier: 2 },
  { city: 'Vadodara', state: 'Gujarat', tier: 2 },
  { city: 'Indore', state: 'Madhya Pradesh', tier: 2 },
  { city: 'Lucknow', state: 'Uttar Pradesh', tier: 2 },
  { city: 'Bhopal', state: 'Madhya Pradesh', tier: 2 },
  { city: 'Jaipur', state: 'Rajasthan', tier: 2 },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', tier: 2 },
  { city: 'Patna', state: 'Bihar', tier: 2 },
  { city: 'Surat', state: 'Gujarat', tier: 2 },
  { city: 'Nashik', state: 'Maharashtra', tier: 2 },
  { city: 'Coimbatore', state: 'Tamil Nadu', tier: 2 },
  { city: 'Mysuru', state: 'Karnataka', tier: 2 },
];

export const BusinessProfilePage: React.FC = () => {
  const { activeBusiness, setActiveBusiness, showToast } = useApp();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<'IDENTITY' | 'LOCATIONS' | 'REGISTRATIONS'>('IDENTITY');
  const [showSampleIds, setShowSampleIds] = useState(false);

  const [form, setForm] = useState<any>({
    businessId: 'BIZ-SCEN-01',
    businessName: 'Saffron Bakers',
    businessType: 'Bakery',
    segment: 'Micro retail & services',
    address: 'Shop/Unit 83, Market Yard, Ludhiana, Punjab - 416059',
    city: 'Ludhiana',
    state: 'Punjab',
    pinCode: '416059',
    cityTier: 2,
    employeeCount: 4,
    numSites: 1,
    annualTurnoverBand: '40 lakh - 1.5 cr',
    gstin: '03PJNXS4821G1ZB',
    udyamNumber: 'UDYAM-MH-00-9516696',
    contactName: 'Sneha Rao',
    contactRole: 'Owner',
    contactPhone: '+91 98765 43210',
    contactEmail: 'sneha@saffronbakers.in',
    preferredLanguage: 'English',
    currentInternet: 'Mobile hotspot',
    currentProvider: 'Competitor B',
    monthlyTelecomSpendInr: 3450,
    locations: [],
  });

  const [gstVerifyResult, setGstVerifyResult] = useState<any | null>(null);
  const [udyamVerifyResult, setUdyamVerifyResult] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [verifyingUdyam, setVerifyingUdyam] = useState(false);

  useEffect(() => {
    if (activeBusiness) {
      setForm({
        ...activeBusiness,
        locations: activeBusiness.locations || [],
      });
      setGstVerifyResult(null);
      setUdyamVerifyResult(null);
    }
  }, [activeBusiness]);

  // Inline Validation Helpers
  const pinError =
    form.pinCode && !/^\d{6}$/.test(String(form.pinCode).trim())
      ? 'Please enter a valid 6-digit Indian PIN code.'
      : undefined;

  const gstinError =
    form.gstin && String(form.gstin).trim().length > 0 && String(form.gstin).trim().length !== 15
      ? 'GSTIN must be exactly 15 characters.'
      : undefined;

  const udyamError =
    form.udyamNumber &&
    String(form.udyamNumber).trim().length > 0 &&
    !/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/i.test(String(form.udyamNumber).trim())
      ? 'Expected format: UDYAM-XX-00-XXXXXXX'
      : undefined;

  const handleCityChange = (cityName: string) => {
    const found = CITY_OPTIONS.find((c) => c.city === cityName);
    if (found) {
      setForm({ ...form, city: found.city, state: found.state, cityTier: found.tier });
    } else {
      setForm({ ...form, city: cityName });
    }
  };

  const handleVerifyGstin = async (customGstin?: string) => {
    const target = customGstin !== undefined ? customGstin : form.gstin;
    if (!target) return;
    setVerifyingGst(true);
    try {
      const res = await api.post('/kyc/verify/gstin', {
        gstin: target,
        businessName: form.businessName,
        address: form.address,
      });
      setGstVerifyResult(res.data);
      setForm((prev: any) => ({ ...prev, gstin: target, gstinVerifiedStatus: res.data.status }));
      showToast(
        res.data.status === 'ACTIVE' ? 'success' : 'warning',
        res.data.status === 'ACTIVE' ? 'GSTIN Verified Active' : `GSTIN Status: ${res.data.status}`,
        res.data.message
      );
    } catch (err: any) {
      showToast('error', 'GSTIN Verification Error', err.message);
    } finally {
      setVerifyingGst(false);
    }
  };

  const handleVerifyUdyam = async (customUdyam?: string) => {
    const target = customUdyam !== undefined ? customUdyam : form.udyamNumber;
    if (!target) return;
    setVerifyingUdyam(true);
    try {
      const res = await api.post('/kyc/verify/udyam', {
        udyamNumber: target,
        enterpriseName: form.businessName,
        city: form.city,
      });
      setUdyamVerifyResult(res.data);
      setForm((prev: any) => ({ ...prev, udyamNumber: target, udyamVerifiedStatus: res.data.status }));
      showToast(
        res.data.status === 'VERIFIED' ? 'success' : 'warning',
        res.data.status === 'VERIFIED' ? 'Udyam Registration Verified' : `Udyam Status: ${res.data.status}`,
        res.data.message
      );
    } catch (err: any) {
      showToast('error', 'Udyam Verification Error', err.message);
    } finally {
      setVerifyingUdyam(false);
    }
  };

  const handleAddLocation = () => {
    const nextLocations = [
      ...(form.locations || []),
      {
        siteName: `Branch Location #${(form.locations?.length || 0) + 1}`,
        address: `Commercial Market, ${form.city}`,
        city: form.city,
        state: form.state,
        pinCode: form.pinCode || '400001',
        cityTier: form.cityTier,
        isPrimary: (form.locations?.length || 0) === 0,
      },
    ];
    setForm({
      ...form,
      locations: nextLocations,
      numSites: Math.max(form.numSites, nextLocations.length),
    });
  };

  const handleRemoveLocation = (idx: number) => {
    const nextLocations = (form.locations || []).filter((_: any, i: number) => i !== idx);
    setForm({
      ...form,
      locations: nextLocations,
      numSites: Math.max(1, nextLocations.length),
    });
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/business', form);
      setActiveBusiness(res.data.business);
      showToast('success', 'Business Profile Saved', `${res.data.business.businessName} details updated.`);
    } catch (err: any) {
      showToast('error', 'Could Not Save Profile', err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: 'Business Profile' }]}
        title="Business Profile"
        subtitle="Manage your company identity, operating locations, and tax registrations to receive accurate plan recommendations."
        badge={
          <StatusBadge variant="success" dot>
            {form.profileCompletionPct || 95}% Complete
          </StatusBadge>
        }
        actions={
          <>
            <SecondaryButton
              onClick={() => handleSaveProfile()}
              loading={saving}
              icon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </SecondaryButton>
            <PrimaryButton
              onClick={() => navigate('/readiness')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Assessment
            </PrimaryButton>
          </>
        }
      />

      {/* Section Stepper Tabs */}
      <div className="grid grid-cols-3 gap-2.5 bg-white p-1.5 rounded-2xl border border-[#E6EAF0] shadow-card">
        {[
          {
            id: 'IDENTITY',
            label: '1. Business Identity & Industry',
            sub: `${form.businessName} • ${form.businessType}`,
            icon: Building2,
          },
          {
            id: 'LOCATIONS',
            label: '2. Scale, PIN & Locations',
            sub: `${form.employeeCount} employees • ${form.numSites} site(s)`,
            icon: MapPin,
          },
          {
            id: 'REGISTRATIONS',
            label: '3. GSTIN & Udyam Verification',
            sub: `GST: ${form.gstinVerifiedStatus || 'ACTIVE'}`,
            icon: ShieldCheck,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                active
                  ? 'bg-[#E8F0FF] text-[#2563EB] border border-[#2563EB]/30'
                  : 'hover:bg-[#F8F9FC] text-[#697386]'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  active ? 'bg-[#2563EB] text-white' : 'bg-[#F8F9FC] text-[#697386]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-semibold truncate ${active ? 'text-[#142B4A]' : 'text-[#172033]'}`}>
                  {tab.label}
                </div>
                <div className="text-[11px] text-[#697386] truncate hidden sm:block">{tab.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSaveProfile} className="grid lg:grid-cols-12 gap-6">
        {/* Left 8 Columns: Guided Form Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: BUSINESS IDENTITY & INDUSTRY */}
          {activeSection === 'IDENTITY' && (
            <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-5 animate-fade-in">
              <div>
                <h2 className="text-base font-semibold text-[#172033]">Business Identity & Industry</h2>
                <p className="text-xs text-[#697386] mt-0.5">
                  Tell us about your organization, industry vertical, and primary point of contact.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  label="Business / Trade Name"
                  value={form.businessName || ''}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  required
                />

                <SelectField
                  label="Business Segment"
                  value={form.segment || 'Micro retail & services'}
                  onChange={(e) => setForm({ ...form, segment: e.target.value })}
                  options={[
                    { value: 'Micro retail & services', label: 'Micro retail & services' },
                    { value: 'Professional offices', label: 'Professional offices' },
                    { value: 'Small multi-site businesses', label: 'Small multi-site businesses' },
                    { value: 'Small manufacturers', label: 'Small manufacturers' },
                  ]}
                />

                <FormField
                  label="Industry & Business Type"
                  hint="e.g. Bakery, Clinic, Logistics"
                  value={form.businessType || ''}
                  onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                />

                <SelectField
                  label="Annual Turnover Band"
                  value={form.annualTurnoverBand || '40 lakh - 1.5 cr'}
                  onChange={(e) => setForm({ ...form, annualTurnoverBand: e.target.value })}
                  options={[
                    { value: '< 40 lakh', label: 'Under ₹40 Lakh' },
                    { value: '40 lakh - 1.5 cr', label: '₹40 Lakh – ₹1.5 Crore' },
                    { value: '1.5 - 5 cr', label: '₹1.5 Crore – ₹5 Crore' },
                    { value: '5 - 25 cr', label: '₹5 Crore – ₹25 Crore' },
                    { value: '25 - 100 cr', label: '₹25 Crore – ₹100 Crore' },
                  ]}
                />

                <FormField
                  label="Primary Contact Name"
                  value={form.contactName || ''}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />

                <SelectField
                  label="Designation / Role"
                  value={form.contactRole || 'Owner'}
                  onChange={(e) => setForm({ ...form, contactRole: e.target.value })}
                  options={[
                    { value: 'Owner', label: 'Business Owner / Proprietor' },
                    { value: 'Partner', label: 'Managing Partner / Director' },
                    { value: 'Manager', label: 'Operations / IT Manager' },
                    { value: 'Office admin', label: 'Office Administrator' },
                  ]}
                />

                <SelectField
                  label="Preferred Communication Language"
                  value={form.preferredLanguage || 'English'}
                  onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                  options={[
                    { value: 'English', label: 'English' },
                    { value: 'Hindi', label: 'Hindi (हिंदी)' },
                    { value: 'Punjabi', label: 'Punjabi' },
                    { value: 'Marathi', label: 'Marathi' },
                    { value: 'Tamil', label: 'Tamil' },
                    { value: 'Telugu', label: 'Telugu' },
                    { value: 'Kannada', label: 'Kannada' },
                    { value: 'Bengali', label: 'Bengali' },
                    { value: 'Gujarati', label: 'Gujarati' },
                  ]}
                />

                <FormField
                  label="Current Monthly Connectivity Spend (₹)"
                  type="number"
                  min={0}
                  value={form.monthlyTelecomSpendInr || 0}
                  onChange={(e) => setForm({ ...form, monthlyTelecomSpendInr: Number(e.target.value) })}
                />
              </div>

              <div className="pt-4 border-t border-[#E6EAF0] flex items-center justify-end gap-2.5">
                <PrimaryButton type="button" onClick={() => setActiveSection('LOCATIONS')}>
                  Next: Scale & Locations
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* SECTION 2: SCALE, PIN CODE & LOCATIONS */}
          {activeSection === 'LOCATIONS' && (
            <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-6 animate-fade-in">
              <div>
                <h2 className="text-base font-semibold text-[#172033]">
                  Employee Count, PIN Code & Operating Locations
                </h2>
                <p className="text-xs text-[#697386] mt-0.5">
                  Your team size, number of sites, and city help us match eligible enterprise connectivity and multi-branch plans.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  label="Total Employee Count"
                  hint="Across all locations"
                  type="number"
                  min={1}
                  max={500}
                  value={form.employeeCount || 1}
                  onChange={(e) => setForm({ ...form, employeeCount: Number(e.target.value) })}
                />

                <FormField
                  label="Number of Business Locations"
                  hint="3+ sites qualify for Managed SD-WAN"
                  type="number"
                  min={1}
                  max={50}
                  value={form.numSites || 1}
                  onChange={(e) => setForm({ ...form, numSites: Number(e.target.value) })}
                />

                <SelectField
                  label="Primary City"
                  hint={`City Tier ${form.cityTier || 2}`}
                  value={form.city || 'Ludhiana'}
                  onChange={(e) => handleCityChange(e.target.value)}
                  options={CITY_OPTIONS.map((c) => ({
                    value: c.city,
                    label: `${c.city}, ${c.state} (Tier ${c.tier})`,
                  }))}
                />

                <FormField
                  label="PIN Code"
                  value={form.pinCode || ''}
                  onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                  error={pinError}
                  placeholder="6-digit PIN"
                />

                <div className="sm:col-span-2">
                  <FormField
                    label="Registered Premises Street Address"
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Building, street, commercial area..."
                  />
                </div>

                <SelectField
                  label="Current Internet Setup"
                  value={form.currentInternet || 'Mobile hotspot'}
                  onChange={(e) => setForm({ ...form, currentInternet: e.target.value })}
                  options={[
                    { value: 'Mobile hotspot', label: 'Mobile hotspot / Dongle' },
                    { value: 'Home broadband', label: 'Home broadband' },
                    { value: 'Business broadband', label: 'Business broadband' },
                    { value: 'Mixed per site', label: 'Mixed providers across sites' },
                    { value: 'Leased line', label: 'Dedicated leased line' },
                    { value: 'None', label: 'New setup (No existing internet)' },
                  ]}
                />
              </div>

              {/* Multi-Location Footprint List */}
              <div className="pt-4 border-t border-[#E6EAF0] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#172033]">
                      Additional Branch / Site Addresses ({form.locations?.length || 0})
                    </h3>
                    <p className="text-xs text-[#697386]">
                      Add branch outlets, clinics, or warehouses if you operate multiple locations.
                    </p>
                  </div>
                  <SecondaryButton
                    type="button"
                    size="sm"
                    onClick={handleAddLocation}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Location
                  </SecondaryButton>
                </div>

                {(form.locations || []).length > 0 && (
                  <div className="space-y-2.5">
                    {(form.locations || []).map((loc: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 p-3 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] text-xs"
                      >
                        <input
                          type="text"
                          value={loc.siteName || ''}
                          onChange={(e) => {
                            const next = [...form.locations];
                            next[idx] = { ...next[idx], siteName: e.target.value };
                            setForm({ ...form, locations: next });
                          }}
                          placeholder="Location Name"
                          className="w-40 px-3 py-1.5 bg-white border border-[#E6EAF0] rounded-lg font-medium text-[#172033]"
                        />
                        <input
                          type="text"
                          value={loc.address || ''}
                          onChange={(e) => {
                            const next = [...form.locations];
                            next[idx] = { ...next[idx], address: e.target.value };
                            setForm({ ...form, locations: next });
                          }}
                          placeholder="Street Address"
                          className="flex-1 px-3 py-1.5 bg-white border border-[#E6EAF0] rounded-lg text-[#172033]"
                        />
                        <input
                          type="text"
                          value={loc.pinCode || ''}
                          onChange={(e) => {
                            const next = [...form.locations];
                            next[idx] = { ...next[idx], pinCode: e.target.value };
                            setForm({ ...form, locations: next });
                          }}
                          placeholder="PIN"
                          className="w-24 px-3 py-1.5 bg-white border border-[#E6EAF0] rounded-lg font-mono text-[#172033]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLocation(idx)}
                          className="p-1.5 text-[#697386] hover:text-[#DC4C4C] transition"
                          aria-label="Remove location"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#E6EAF0] flex items-center justify-between">
                <SecondaryButton type="button" onClick={() => setActiveSection('IDENTITY')}>
                  Back
                </SecondaryButton>
                <PrimaryButton type="button" onClick={() => setActiveSection('REGISTRATIONS')}>
                  Next: Tax & MSME Registrations
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* SECTION 3: GSTIN & UDYAM REGISTRATIONS */}
          {activeSection === 'REGISTRATIONS' && (
            <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-6 animate-fade-in">
              <div>
                <h2 className="text-base font-semibold text-[#172033]">
                  Tax & MSME Registration Verification
                </h2>
                <p className="text-xs text-[#697386] mt-0.5">
                  Verify your GSTIN and Udyam Registration to unlock GST input tax credit invoicing and enterprise-grade connectivity plans.
                </p>
              </div>

              {/* GSTIN Block */}
              <div className="p-5 rounded-2xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#172033]">GSTIN Verification</h3>
                    <p className="text-xs text-[#697386]">
                      15-character Goods and Services Tax Identification Number
                    </p>
                  </div>
                  <StatusBadge
                    variant={
                      (gstVerifyResult?.status || form.gstinVerifiedStatus) === 'ACTIVE'
                        ? 'success'
                        : (gstVerifyResult?.status || form.gstinVerifiedStatus) === 'SUSPENDED'
                        ? 'warning'
                        : 'error'
                    }
                    dot
                  >
                    {(gstVerifyResult?.status || form.gstinVerifiedStatus) === 'ACTIVE'
                      ? 'Active & Verified'
                      : gstVerifyResult?.status || form.gstinVerifiedStatus || 'Unverified'}
                  </StatusBadge>
                </div>

                <FormField
                  label="15-Character GSTIN"
                  value={form.gstin || ''}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  error={gstinError}
                  placeholder="e.g. 03PJNXS4821G1ZB"
                  className="font-mono uppercase"
                  rightElement={
                    <SecondaryButton
                      type="button"
                      onClick={() => handleVerifyGstin()}
                      loading={verifyingGst}
                    >
                      Verify GSTIN
                    </SecondaryButton>
                  }
                />

                {gstVerifyResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                      gstVerifyResult.status === 'ACTIVE'
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#14532D]'
                        : gstVerifyResult.status === 'SUSPENDED'
                        ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#78350F]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      {gstVerifyResult.status === 'ACTIVE' ? (
                        <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
                      ) : gstVerifyResult.status === 'SUSPENDED' ? (
                        <AlertTriangle className="w-4 h-4 text-[#E6A23C]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#DC4C4C]" />
                      )}
                      <span>
                        {gstVerifyResult.status === 'ACTIVE'
                          ? 'GST Registration Verified Active'
                          : gstVerifyResult.status === 'CANCELLED'
                          ? 'This GSTIN is marked as Cancelled in the official registry'
                          : `GST Registration Status: ${gstVerifyResult.status}`}
                      </span>
                    </div>
                    <p className="opacity-90">{gstVerifyResult.message}</p>
                    {gstVerifyResult.registryRecord && (
                      <div className="grid sm:grid-cols-2 gap-2 pt-2 mt-2 border-t border-black/10 text-[11px]">
                        <div>
                          <span className="opacity-75">Legal Name: </span>
                          <strong>{gstVerifyResult.registryRecord.legalName}</strong>
                        </div>
                        <div>
                          <span className="opacity-75">Trade Name: </span>
                          <strong>{gstVerifyResult.registryRecord.tradeName}</strong>
                        </div>
                        <div>
                          <span className="opacity-75">Constitution: </span>
                          <strong>{gstVerifyResult.registryRecord.constitution}</strong>
                        </div>
                        <div>
                          <span className="opacity-75">Registered State: </span>
                          <strong>{gstVerifyResult.registryRecord.state}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Udyam Block */}
              <div className="p-5 rounded-2xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#172033]">Udyam MSME Registration</h3>
                    <p className="text-xs text-[#697386]">
                      Ministry of MSME Udyam Registration Number
                    </p>
                  </div>
                  <StatusBadge
                    variant={
                      (udyamVerifyResult?.status || form.udyamVerifiedStatus) === 'VERIFIED'
                        ? 'success'
                        : 'neutral'
                    }
                    dot
                  >
                    {(udyamVerifyResult?.status || form.udyamVerifiedStatus) === 'VERIFIED'
                      ? 'Verified MSME'
                      : udyamVerifyResult?.status || form.udyamVerifiedStatus || 'Optional'}
                  </StatusBadge>
                </div>

                <FormField
                  label="Udyam Registration Number"
                  value={form.udyamNumber || ''}
                  onChange={(e) => setForm({ ...form, udyamNumber: e.target.value.toUpperCase() })}
                  error={udyamError}
                  placeholder="UDYAM-XX-00-XXXXXXX"
                  className="font-mono uppercase"
                  rightElement={
                    <SecondaryButton
                      type="button"
                      onClick={() => handleVerifyUdyam()}
                      loading={verifyingUdyam}
                    >
                      Verify Udyam
                    </SecondaryButton>
                  }
                />

                {udyamVerifyResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                      udyamVerifyResult.status === 'VERIFIED'
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#14532D]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      {udyamVerifyResult.status === 'VERIFIED' ? (
                        <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#DC4C4C]" />
                      )}
                      <span>
                        {udyamVerifyResult.status === 'VERIFIED'
                          ? 'Udyam Certificate Verified'
                          : 'Could not verify Udyam number against registry'}
                      </span>
                    </div>
                    <p className="opacity-90">{udyamVerifyResult.message}</p>
                    {udyamVerifyResult.registryRecord && (
                      <div className="grid sm:grid-cols-2 gap-2 pt-2 mt-2 border-t border-black/10 text-[11px]">
                        <div>
                          <span className="opacity-75">Enterprise Name: </span>
                          <strong>{udyamVerifyResult.registryRecord.enterpriseName}</strong>
                        </div>
                        <div>
                          <span className="opacity-75">Classification: </span>
                          <strong>
                            {udyamVerifyResult.registryRecord.enterpriseType} (
                            {udyamVerifyResult.registryRecord.majorActivity})
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Discreet Collapsible Sample Registry Numbers for Testing */}
              <div className="border border-[#E6EAF0] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSampleIds(!showSampleIds)}
                  className="w-full px-4 py-2.5 bg-[#F8F9FC] text-xs font-medium text-[#697386] hover:text-[#172033] flex items-center justify-between transition"
                >
                  <span>Sample Registry Records for Verification Testing</span>
                  {showSampleIds ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showSampleIds && (
                  <div className="p-4 bg-white space-y-3 text-xs border-t border-[#E6EAF0]">
                    <div>
                      <div className="text-[11px] font-medium text-[#697386] mb-1.5">
                        Test GSTIN Scenarios:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Active (03PJNXS4821G1ZB)', val: '03PJNXS4821G1ZB' },
                          { label: 'Cancelled K01 (37IHKXV5167L1ZS)', val: '37IHKXV5167L1ZS' },
                          { label: 'Suspended (23QYBXS1811Q1ZD)', val: '23QYBXS1811Q1ZD' },
                          { label: 'Checksum Error K06 (08YKZXS8189L1Z0)', val: '08YKZXS8189L1Z0' },
                        ].map((tc) => (
                          <button
                            key={tc.val}
                            type="button"
                            onClick={() => handleVerifyGstin(tc.val)}
                            className="px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-[#E8F0FF] text-[#172033] border border-[#E6EAF0] text-[11px] font-medium transition"
                          >
                            {tc.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[#697386] mb-1.5">
                        Test Udyam Scenarios:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Verified (UDYAM-WB-00-5053330)', val: 'UDYAM-WB-00-5053330' },
                          { label: 'Verified (UDYAM-MH-00-9516696)', val: 'UDYAM-MH-00-9516696' },
                          { label: 'Invalid Format', val: 'UDYAM-99-INVALID' },
                        ].map((tc) => (
                          <button
                            key={tc.val}
                            type="button"
                            onClick={() => handleVerifyUdyam(tc.val)}
                            className="px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-[#E8F0FF] text-[#172033] border border-[#E6EAF0] text-[11px] font-medium transition"
                          >
                            {tc.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#E6EAF0] flex items-center justify-between">
                <SecondaryButton type="button" onClick={() => setActiveSection('LOCATIONS')}>
                  Back
                </SecondaryButton>
                <div className="flex items-center gap-2.5">
                  <PrimaryButton type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>
                    Save Business Profile
                  </PrimaryButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Columns: Live Profile Summary Card */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-[#E6EAF0] pb-3.5">
              <div>
                <h3 className="text-sm font-semibold text-[#172033]">Profile Summary</h3>
                <p className="text-xs text-[#697386]">Used for plan eligibility</p>
              </div>
              <StatusBadge variant="info">Tier-{form.cityTier || 2} City</StatusBadge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#697386]">Business Name</span>
                <span className="font-semibold text-[#172033]">{form.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697386]">Industry & Segment</span>
                <span className="font-medium text-[#172033]">{form.businessType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697386]">Employees</span>
                <span className="font-semibold text-[#172033]">{form.employeeCount} staff</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697386]">Operating Sites</span>
                <span className="font-semibold text-[#172033]">{form.numSites} site(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697386]">Primary Location</span>
                <span className="font-medium text-[#172033]">
                  {form.city} ({form.pinCode})
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E6EAF0]">
                <span className="text-[#697386]">GSTIN Status</span>
                <StatusBadge
                  variant={form.gstinVerifiedStatus === 'ACTIVE' ? 'success' : 'warning'}
                >
                  {form.gstinVerifiedStatus || 'ACTIVE'}
                </StatusBadge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#697386]">Udyam Status</span>
                <StatusBadge
                  variant={form.udyamVerifiedStatus === 'VERIFIED' ? 'success' : 'neutral'}
                >
                  {form.udyamVerifiedStatus || 'VERIFIED'}
                </StatusBadge>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6EAF0] space-y-2">
              <PrimaryButton
                type="submit"
                loading={saving}
                className="w-full"
                icon={<Save className="w-4 h-4" />}
              >
                Save Profile
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={() => navigate('/readiness')}
                className="w-full"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Assessment
              </SecondaryButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
