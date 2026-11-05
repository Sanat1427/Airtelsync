export type IntegrationClassification =
  | 'REAL INTERNAL IMPLEMENTATION'
  | 'MOCK DATA'
  | 'SIMULATED INTEGRATION'
  | 'FUTURE PRODUCTION INTEGRATION';

export interface IntegrationDescriptor {
  integrationId: string;
  name: string;
  category: 'Identity & Registry' | 'Document Intelligence' | 'Communications' | 'Commerce & Billing' | 'Telecom OSS/BSS';
  classification: IntegrationClassification;
  currentImplementationMode: string;
  providerInterface: string;
  productionTargetProvider: string;
  authRequirement: string;
  failureHandlingStrategy: string;
  latencySlaMs: number;
  isLiveExternalConnection: boolean;
  transparencyNote: string;
}

export function getProductionIntegrationReadiness(): {
  summary: {
    totalIntegrations: number;
    realInternalCount: number;
    mockDataCount: number;
    simulatedCount: number;
    futureProductionCount: number;
    architecturalPattern: string;
    disclaimer: string;
  };
  integrations: IntegrationDescriptor[];
} {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  const integrations: IntegrationDescriptor[] = [
    {
      integrationId: 'INT-01',
      name: 'GSTIN Registry Verification',
      category: 'Identity & Registry',
      classification: 'MOCK DATA',
      currentImplementationMode:
        'Real 15-character GSTIN format + Modulo-36 checksum validator backed by MongoDB mock GST registry (gstRegistrations collection)',
      providerInterface: 'IGstRegistryAdapter (backend/src/services/registryValidator.ts)',
      productionTargetProvider: 'GSTN Public API / Protean (NSDL) GSP Gateway',
      authRequirement: 'GSP OAuth2 Client Credentials + X-API-Key + mTLS Certificate',
      failureHandlingStrategy:
        'If GSP gateway times out (>3,000ms), validate 15-char state code & Mod-36 checksum locally and queue application as MANUAL_REVIEW',
      latencySlaMs: 45,
      isLiveExternalConnection: false,
      transparencyNote:
        'Uses real Modulo-36 cryptographic checksum math + seeded GSTN mock records (K01–K12 & demo profiles). Not connected to live government GSTN portal.',
    },
    {
      integrationId: 'INT-02',
      name: 'Udyam MSME Registry Lookup',
      category: 'Identity & Registry',
      classification: 'MOCK DATA',
      currentImplementationMode:
        'Strict UDYAM-XX-00-0000000 regex validator + MongoDB mock MSME registry lookup (udyamRegistrations collection)',
      providerInterface: 'IUdyamRegistryAdapter (backend/src/services/registryValidator.ts)',
      productionTargetProvider: 'Ministry of MSME Udyam API / API Setu Gateway',
      authRequirement: 'API Setu HMAC-SHA256 Signed Bearer Token',
      failureHandlingStrategy:
        'Accept GST Certificate as primary business proof if Udyam registry is unreachable; flag Udyam status for asynchronous retry',
      latencySlaMs: 38,
      isLiveExternalConnection: false,
      transparencyNote:
        'Validates exact Udyam format and cross-checks against local MongoDB mock registry. No live government API call.',
    },
    {
      integrationId: 'INT-03',
      name: 'Document OCR & Vision Extraction Pipeline',
      category: 'Document Intelligence',
      classification: 'REAL INTERNAL IMPLEMENTATION',
      currentImplementationMode: hasGeminiKey
        ? 'Modular OCR Pipeline: Binary PNG/PDF header inspection + Gemini 2.5 Flash Vision Adapter + Deterministic Fallback'
        : 'Modular OCR Pipeline: Binary PNG/PDF header inspection + Deterministic Specimen & Pattern OCR Parser (Gemini Vision ready via GEMINI_API_KEY)',
      providerInterface: 'IDocumentIntelligencePipeline (backend/src/services/documentIntelligence.ts)',
      productionTargetProvider: 'Google Cloud Document AI / Gemini 2.5 Flash Vision + On-Prem Blur Preprocessor',
      authRequirement: 'GEMINI_API_KEY or GCP Service Account IAM Token',
      failureHandlingStrategy:
        'Automatic fallback from LLM Vision to deterministic regex/specimen extraction; documents with <75% confidence or >5° skew route to MANUAL_REVIEW',
      latencySlaMs: hasGeminiKey ? 680 : 35,
      isLiveExternalConnection: hasGeminiKey,
      transparencyNote:
        'Performs real binary header inspection (PNG IHDR dimensions, file size, MIME validation), field normalization, and confidence thresholding.',
    },
    {
      integrationId: 'INT-04',
      name: 'DigiLocker Document Pull',
      category: 'Identity & Registry',
      classification: 'FUTURE PRODUCTION INTEGRATION',
      currentImplementationMode:
        'Adapter interface defined for zero-upload pull of GST/Udyam/PAN XML certificates; currently served via direct document upload & specimen selector',
      providerInterface: 'IDigiLockerPullAdapter (Planned API Setu OAuth2 Flow)',
      productionTargetProvider: 'MeitY DigiLocker Partner API v2',
      authRequirement: 'Customer 3-Legged OAuth2 PKCE + Aadhaar OTP Consent',
      failureHandlingStrategy:
        'Graceful fallback to direct PDF/PNG upload in Smart KYC portal with KYC Recovery Agent guidance',
      latencySlaMs: 0,
      isLiveExternalConnection: false,
      transparencyNote:
        'Architectural blueprint ready for Phase-2 production rollout; current flow uses file upload or specimen selection.',
    },
    {
      integrationId: 'INT-05',
      name: 'Aadhaar / DSC Digital E-Sign',
      category: 'Commerce & Billing',
      classification: 'FUTURE PRODUCTION INTEGRATION',
      currentImplementationMode:
        'Digital Quote Acceptance & DPDP Consent Ledger recorded with immutable price snapshot, IP, and timestamp in MongoDB',
      providerInterface: 'IEsignContractAdapter (Quote & Consent Ledger Service)',
      productionTargetProvider: 'Protean / eMudhra ESP Aadhaar eSign v3.2',
      authRequirement: 'X.509 ASP Digital Signature Certificate + Customer OTP',
      failureHandlingStrategy:
        'Fallback to click-wrap DPDP-compliant digital acceptance for standard broadband orders; require physical CAF signature during technician visit if eSign fails',
      latencySlaMs: 0,
      isLiveExternalConnection: false,
      transparencyNote:
        'Click-wrap quote & DPDP consent acceptance is implemented internally; external eMudhra/Aadhaar eSign is a Phase-2 production integration.',
    },
    {
      integrationId: 'INT-06',
      name: 'WhatsApp Business Omnichannel Notifications',
      category: 'Communications',
      classification: 'SIMULATED INTEGRATION',
      currentImplementationMode:
        'Event-driven notification dispatcher persists formatted WhatsApp/SMS/Email payloads to notifications collection with channelSimulated=WHATSAPP_SIMULATED',
      providerInterface: 'IOmnichannelNotifier (NotificationModel Dispatcher)',
      productionTargetProvider: 'Airtel IQ WhatsApp Business Cloud API',
      authRequirement: 'Airtel IQ System User Bearer Token + Approved HSM Template ID',
      failureHandlingStrategy:
        'Retry webhook delivery 3x with exponential backoff; fall back to transactional SMS and in-app notification drawer',
      latencySlaMs: 25,
      isLiveExternalConnection: false,
      transparencyNote:
        'All WhatsApp notifications are simulated and inspectable inside the in-app Notification Drawer and Audit Logs.',
    },
    {
      integrationId: 'INT-07',
      name: 'Enterprise Payment & Mandate Gateway',
      category: 'Commerce & Billing',
      classification: 'SIMULATED INTEGRATION',
      currentImplementationMode:
        'Zero-upfront B2B invoice checkout & immutable quote price snapshot engine (Quotes & Orders state machine)',
      providerInterface: 'IPaymentMandateGateway (Order Checkout Service)',
      productionTargetProvider: 'Airtel Payments Bank B2B PG / Razorpay eNACH',
      authRequirement: 'HMAC-SHA256 Webhook Secret + Merchant Key Pair',
      failureHandlingStrategy:
        'Idempotent webhook key verification (processedEventKeys); allow postpaid PO-based onboarding for verified GSTIN enterprises if online PG fails',
      latencySlaMs: 30,
      isLiveExternalConnection: false,
      transparencyNote:
        'Uses simulated B2B postpaid invoice checkout with immutable price snapshots. No real money or card processing occurs.',
    },
    {
      integrationId: 'INT-08',
      name: 'Network Feasibility & Port Coverage Engine',
      category: 'Telecom OSS/BSS',
      classification: 'SIMULATED INTEGRATION',
      currentImplementationMode:
        'Deterministic PIN-code, City-Tier, and Fibre/Leased-Line port availability engine with automatic 5G FWA + 4G backup fallback recommendations',
      providerInterface: 'INetworkFeasibilityAdapter (backend/src/routes/apiRoutes.ts /feasibility/check)',
      productionTargetProvider: 'Airtel GIS Fibre Inventory & NE Port Management OSS',
      authRequirement: 'Internal OSS mTLS Service Mesh Token',
      failureHandlingStrategy:
        'When Fibre GPON port is full or civil work is needed, automatically offer P05 Biz Air 5G FWA + P04 4G Backup Dongle so acquisition never stalls',
      latencySlaMs: 40,
      isLiveExternalConnection: false,
      transparencyNote:
        'Simulates GPON port availability, civil permission delays, and Tier-1/Tier-2 constraints deterministically by PIN code. Not connected to live telecom GIS.',
    },
    {
      integrationId: 'INT-09',
      name: 'Field Technician & Installation Scheduling',
      category: 'Telecom OSS/BSS',
      classification: 'REAL INTERNAL IMPLEMENTATION',
      currentImplementationMode:
        'Idempotent 9-state Order & Installation state machine with per-product SLA timelines, slot booking, delay escalation, and technician assignment in MongoDB',
      providerInterface: 'IInstallationWorkforceEngine (OrderModel & InstallationModel State Machine)',
      productionTargetProvider: 'Airtel Workforce Management (WFM) Field Dispatch System',
      authRequirement: 'Role-Based JWT (Admin / Operations / Sales Executive) + Idempotency Key',
      failureHandlingStrategy:
        'Duplicate order events are safely ignored via processedEventKeys; installation delays automatically trigger customer notifications and SLA alerts',
      latencySlaMs: 32,
      isLiveExternalConnection: false,
      transparencyNote:
        'Full state machine, slot scheduling, and per-product installation timelines run natively in the application backend.',
    },
  ];

  return {
    summary: {
      totalIntegrations: integrations.length,
      realInternalCount: integrations.filter((i) => i.classification === 'REAL INTERNAL IMPLEMENTATION').length,
      mockDataCount: integrations.filter((i) => i.classification === 'MOCK DATA').length,
      simulatedCount: integrations.filter((i) => i.classification === 'SIMULATED INTEGRATION').length,
      futureProductionCount: integrations.filter((i) => i.classification === 'FUTURE PRODUCTION INTEGRATION').length,
      architecturalPattern: 'Hexagonal Adapter Pattern with Deterministic Fallbacks & Idempotent Event Keys',
      disclaimer:
        'Transparency Disclosure: Udyam One runs in a self-contained hackathon environment. External government registries (GSTN/Udyam) use seeded mock datasets with real checksum/regex algorithms, and telecom OSS/WhatsApp channels are simulated.',
    },
    integrations,
  };
}
