export type FeasibilityOutcome =
  | 'AVAILABLE'
  | 'ALTERNATIVE_AVAILABLE'
  | 'FIELD_SURVEY_REQUIRED'
  | 'NOT_AVAILABLE';

export interface FeasibilityCheckInput {
  address: string;
  pinCode: string;
  city: string;
  cityTier?: number;
  requestedProducts?: string[];
}

export interface FeasibilityCheckResult {
  checkId: string;
  isSimulated: boolean;
  simulationNotice: string;
  outcome: FeasibilityOutcome;
  city: string;
  pinCode: string;
  address: string;
  fibreAvailable: boolean;
  airFiber5GAvailable: boolean;
  leasedLineAvailable: boolean;
  supportedConnectivityProductIds: string[];
  alternativeProductIds: string[];
  estimatedInstallWindowDays: string;
  explanation: string;
  canProceedToConnectivityCheckout: boolean;
  requiresFieldOpsLead: boolean;
}

export function checkNetworkFeasibility(input: FeasibilityCheckInput): FeasibilityCheckResult {
  const pin = (input.pinCode || '').trim();
  const addrLower = (input.address || '').toLowerCase();
  const city = input.city || 'Mumbai';

  // Deterministic Mock Coverage Rules for Repeatable Demonstrations:
  // 1. Explicit NOT_AVAILABLE trigger: PIN starting with '999' or '000' or containing 'remote'/'unavailable'/'999999'
  if (
    pin.startsWith('999') ||
    pin.startsWith('000') ||
    addrLower.includes('unavailable') ||
    addrLower.includes('remote hills') ||
    pin === '841999'
  ) {
    return {
      checkId: `FEAS-${Date.now()}`,
      isSimulated: true,
      simulationNotice:
        'SIMULATED COVERAGE CHECK: Results are generated from Udyam One deterministic mock coverage rules for hackathon demonstration, not live Airtel network GIS.',
      outcome: 'NOT_AVAILABLE',
      city,
      pinCode: pin,
      address: input.address,
      fibreAvailable: false,
      airFiber5GAvailable: false,
      leasedLineAvailable: false,
      supportedConnectivityProductIds: ['P07', 'P08'], // Mobile lines only
      alternativeProductIds: ['P07', 'P08'],
      estimatedInstallWindowDays: 'N/A (Fixed-line unserviceable)',
      explanation: `Fixed-line Fibre and 5G AirFiber coverage are currently NOT_AVAILABLE at PIN ${pin} (${input.address}). Final checkout for fixed-line connectivity bundles is restricted; a Field Operations expansion lead has been logged.`,
      canProceedToConnectivityCheckout: false,
      requiresFieldOpsLead: true,
    };
  }

  // 2. FIELD_SURVEY_REQUIRED trigger: PIN ending in '88' or address containing 'industrial phase 4' or 'survey' or leased line P05/P06 requested in outer zone
  const requestsLeasedLine = (input.requestedProducts || []).some((p) => ['P05', 'P06'].includes(p));
  if (
    pin.endsWith('88') ||
    addrLower.includes('survey') ||
    addrLower.includes('sez zone') ||
    (requestsLeasedLine && addrLower.includes('industrial'))
  ) {
    return {
      checkId: `FEAS-${Date.now()}`,
      isSimulated: true,
      simulationNotice:
        'SIMULATED COVERAGE CHECK: Results are generated from Udyam One deterministic mock coverage rules for hackathon demonstration.',
      outcome: 'FIELD_SURVEY_REQUIRED',
      city,
      pinCode: pin,
      address: input.address,
      fibreAvailable: true,
      airFiber5GAvailable: true,
      leasedLineAvailable: true,
      supportedConnectivityProductIds: ['P01', 'P02', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09'],
      alternativeProductIds: ['P04'],
      estimatedInstallWindowDays: '14–21 days (Pending physical last-mile feasibility survey)',
      explanation: `Premises at ${input.address} (${pin}) is within 450m of the nearest optical distribution point. A physical Field Operations last-mile survey is required before trenching/activation.`,
      canProceedToConnectivityCheckout: true,
      requiresFieldOpsLead: true,
    };
  }

  // 3. ALTERNATIVE_AVAILABLE trigger: PIN ending in '55' or address containing 'old town' or 'no fibre'
  if (pin.endsWith('55') || addrLower.includes('old town') || addrLower.includes('no fibre')) {
    return {
      checkId: `FEAS-${Date.now()}`,
      isSimulated: true,
      simulationNotice:
        'SIMULATED COVERAGE CHECK: Results are generated from Udyam One deterministic mock coverage rules for hackathon demonstration.',
      outcome: 'ALTERNATIVE_AVAILABLE',
      city,
      pinCode: pin,
      address: input.address,
      fibreAvailable: false,
      airFiber5GAvailable: true,
      leasedLineAvailable: false,
      supportedConnectivityProductIds: ['P04', 'P07', 'P08'],
      alternativeProductIds: ['P04', 'P07'],
      estimatedInstallWindowDays: '2 days (Plug-and-Play 5G AirFiber)',
      explanation: `Underground optical fibre ducts are congested in this pocket of ${city} (${pin}), but high-capacity 5G Fixed Wireless Access (P04 Biz 5G AirFiber 100) is AVAILABLE with 2-day rapid installation.`,
      canProceedToConnectivityCheckout: true,
      requiresFieldOpsLead: false,
    };
  }

  // 4. Default AVAILABLE outcome
  return {
    checkId: `FEAS-${Date.now()}`,
    isSimulated: true,
    simulationNotice:
      'SIMULATED COVERAGE CHECK: Results are generated from Udyam One deterministic mock coverage rules for hackathon demonstration.',
    outcome: 'AVAILABLE',
    city,
    pinCode: pin || '400001',
    address: input.address || `Commercial Complex, ${city}`,
    fibreAvailable: true,
    airFiber5GAvailable: true,
    leasedLineAvailable: true,
    supportedConnectivityProductIds: ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10', 'P11'],
    alternativeProductIds: ['P04'],
    estimatedInstallWindowDays: '3–5 business days (Fibre Ready Building)',
    explanation: `Optical Fibre Termination Box (FAT) and 5G Enterprise sector are active at ${input.address || city} (PIN ${pin || '400001'}). Instant digital onboarding is supported.`,
    canProceedToConnectivityCheckout: true,
    requiresFieldOpsLead: false,
  };
}
