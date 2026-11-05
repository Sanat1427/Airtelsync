import mongoose, { Schema, Document } from 'mongoose';

// 1. User Model (users)
export type UserRole = 'Customer' | 'Sales Executive' | 'Channel Partner' | 'Admin' | 'KYC Reviewer';

export interface IUser extends Document {
  email: string;
  phone?: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  assignedTerritory?: string;
  partnerCode?: string;
  preferredLanguage: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['Customer', 'Sales Executive', 'Channel Partner', 'Admin', 'KYC Reviewer'],
      default: 'Customer',
    },
    assignedTerritory: { type: String },
    partnerCode: { type: String },
    preferredLanguage: { type: String, default: 'English' },
  },
  { timestamps: true, collection: 'users' }
);

// 2. Business Model (businesses)
export interface IBusinessLocation {
  siteName: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  cityTier: number;
  isPrimary: boolean;
}

export interface IBusiness extends Document {
  businessId: string;
  userId?: mongoose.Types.ObjectId;
  businessName: string;
  legalName?: string;
  businessType: string;
  segment: string; // 'Micro retail & services' | 'Professional offices' | 'Small multi-site businesses' | 'Small manufacturers'
  address: string;
  city: string;
  state: string;
  pinCode: string;
  cityTier: number; // 1 or 2
  employeeCount: number;
  numSites: number;
  locations: IBusinessLocation[];
  annualTurnoverBand: string;
  hasGstin: boolean;
  gstin?: string;
  gstinVerifiedStatus?: string;
  hasUdyam: boolean;
  udyamNumber?: string;
  udyamVerifiedStatus?: string;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
  preferredLanguage: string;
  currentInternet: string;
  currentProvider: string;
  monthlyTelecomSpendInr: number;
  profileCompletionPct: number;
  scenarioTag?: string;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    businessId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    businessName: { type: String, required: true },
    legalName: { type: String },
    businessType: { type: String, required: true },
    segment: { type: String, required: true },
    address: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pinCode: { type: String, default: '400001' },
    cityTier: { type: Number, required: true, enum: [1, 2], default: 1 },
    employeeCount: { type: Number, required: true, default: 1 },
    numSites: { type: Number, required: true, default: 1 },
    locations: [
      {
        siteName: String,
        address: String,
        city: String,
        state: String,
        pinCode: String,
        cityTier: Number,
        isPrimary: Boolean,
      },
    ],
    annualTurnoverBand: { type: String, default: '40 lakh - 1.5 cr' },
    hasGstin: { type: Boolean, default: false },
    gstin: { type: String },
    gstinVerifiedStatus: { type: String, default: 'UNVERIFIED' },
    hasUdyam: { type: Boolean, default: false },
    udyamNumber: { type: String },
    udyamVerifiedStatus: { type: String, default: 'UNVERIFIED' },
    contactName: { type: String, required: true },
    contactRole: { type: String, default: 'Owner' },
    contactPhone: { type: String, default: '+91 9876543210' },
    contactEmail: { type: String, default: '' },
    preferredLanguage: { type: String, default: 'English' },
    currentInternet: { type: String, default: 'Home broadband' },
    currentProvider: { type: String, default: 'Local ISP' },
    monthlyTelecomSpendInr: { type: Number, default: 1500 },
    profileCompletionPct: { type: Number, default: 60 },
    scenarioTag: { type: String },
  },
  { timestamps: true, collection: 'businesses' }
);

// 3. Product Model (products)
export interface IProduct extends Document {
  productId: string;
  category: string;
  productName: string;
  description: string;
  unit: string;
  priceMinInrPerMonth: number;
  priceMaxInrPerMonth: number;
  oneTimeSetupInr: number;
  minContractMonths: number;
  availableCityTiers: number[];
  minEmployees: number;
  minSites: number;
  requiresGstin: boolean;
  requiresOneOf: string[];
  typicalInstallDays: number;
  targetSegments: string[];
}

const ProductSchema = new Schema<IProduct>(
  {
    productId: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    productName: { type: String, required: true },
    description: { type: String, required: true },
    unit: { type: String, required: true },
    priceMinInrPerMonth: { type: Number, required: true },
    priceMaxInrPerMonth: { type: Number, required: true },
    oneTimeSetupInr: { type: Number, required: true, default: 0 },
    minContractMonths: { type: Number, required: true, default: 12 },
    availableCityTiers: [{ type: Number }],
    minEmployees: { type: Number, required: true, default: 1 },
    minSites: { type: Number, required: true, default: 1 },
    requiresGstin: { type: Boolean, required: true, default: false },
    requiresOneOf: [{ type: String }],
    typicalInstallDays: { type: Number, required: true, default: 3 },
    targetSegments: [{ type: String }],
  },
  { timestamps: true, collection: 'products' }
);

// 4. Lead Model (leads) - Keeps 5,000 historical leads separate from live prototype leads via isHistorical flag
export interface ILead extends Document {
  leadId: string;
  isHistorical: boolean;
  createdDate: string;
  leadSource: string;
  businessName: string;
  businessType: string;
  segment: string;
  city: string;
  cityTier: number;
  state: string;
  preferredLanguage: string;
  employeeCount: number;
  numSites: number;
  annualTurnoverBand: string;
  hasGstin: boolean;
  gstin?: string;
  hasUdyam: boolean;
  udyamNumber?: string;
  currentInternet: string;
  currentProvider: string;
  monthlyTelecomSpendInr: number;
  productsOfInterest: string[];
  contactName: string;
  contactRole: string;
  stageReached: string;
  outcome: string;
  dropReason?: string;
  contactedDate?: string;
  needsAssessedDate?: string;
  quoteAcceptedDate?: string;
  kycCompleteDate?: string;
  activatedDate?: string;
  daysLeadToActivation?: number;
  customerFollowUpCalls: number;
  bundleProducts?: string;
  monthlyBundleValueInr?: number;
  oneTimeSetupInr?: number;
  contractMonths?: number;
  churnedWithin6Months?: string;
  npsScore?: number;
  acquisitionCostInr: number;
  // Live sales / human handoff fields
  assignedToUserId?: string;
  assignedToName?: string;
  assignedRole?: string;
  handoffReason?: string;
  handoffStatus?: 'AWAITING_ASSIGNMENT' | 'ASSIGNED' | 'ACCEPTED' | 'CONTACTED' | 'ESCALATED' | 'RESOLVED';
  handoffCreatedAt?: Date;
  slaMinutes?: number;
  slaDeadlineAt?: Date;
  acceptedAt?: Date;
  escalatedAt?: Date;
  handoffOutcome?: 'CONVERTED' | 'FOLLOW_UP_SCHEDULED' | 'DISQUALIFIED' | 'PENDING';
  outcomeNotes?: string;
  customerPainPoints?: string[];
  eligibleAndIneligibleNotes?: string[];
  conversationSummary?: string;
  unresolvedQuestions?: string[];
  recommendedProductsAttempted?: string[];
  propensityScore?: number;
  propensityPriority?: 'HIGH' | 'MEDIUM' | 'LOW';
  propensityReasons?: string[];
  suggestedNextAction?: string;
  followUpNotes?: Array<{ author: string; note: string; timestamp: Date }>;
}

const LeadSchema = new Schema<ILead>(
  {
    leadId: { type: String, required: true, unique: true, index: true },
    isHistorical: { type: Boolean, required: true, default: true, index: true },
    createdDate: { type: String, required: true },
    leadSource: { type: String, required: true, index: true },
    businessName: { type: String, required: true },
    businessType: { type: String, required: true },
    segment: { type: String, required: true, index: true },
    city: { type: String, required: true, index: true },
    cityTier: { type: Number, required: true },
    state: { type: String, required: true },
    preferredLanguage: { type: String, required: true },
    employeeCount: { type: Number, required: true },
    numSites: { type: Number, required: true },
    annualTurnoverBand: { type: String },
    hasGstin: { type: Boolean, default: false },
    gstin: { type: String },
    hasUdyam: { type: Boolean, default: false },
    udyamNumber: { type: String },
    currentInternet: { type: String },
    currentProvider: { type: String },
    monthlyTelecomSpendInr: { type: Number, default: 0 },
    productsOfInterest: [{ type: String }],
    contactName: { type: String },
    contactRole: { type: String },
    stageReached: { type: String, required: true, index: true },
    outcome: { type: String, required: true, index: true },
    dropReason: { type: String },
    contactedDate: { type: String },
    needsAssessedDate: { type: String },
    quoteAcceptedDate: { type: String },
    kycCompleteDate: { type: String },
    activatedDate: { type: String },
    daysLeadToActivation: { type: Number },
    customerFollowUpCalls: { type: Number, default: 0 },
    bundleProducts: { type: String },
    monthlyBundleValueInr: { type: Number },
    oneTimeSetupInr: { type: Number },
    contractMonths: { type: Number },
    churnedWithin6Months: { type: String },
    npsScore: { type: Number },
    acquisitionCostInr: { type: Number, default: 0 },
    assignedToUserId: { type: String },
    assignedToName: { type: String },
    assignedRole: { type: String },
    handoffReason: { type: String },
    handoffStatus: {
      type: String,
      enum: ['AWAITING_ASSIGNMENT', 'ASSIGNED', 'ACCEPTED', 'CONTACTED', 'ESCALATED', 'RESOLVED'],
    },
    handoffCreatedAt: { type: Date },
    slaMinutes: { type: Number, default: 30 },
    slaDeadlineAt: { type: Date },
    acceptedAt: { type: Date },
    escalatedAt: { type: Date },
    handoffOutcome: {
      type: String,
      enum: ['CONVERTED', 'FOLLOW_UP_SCHEDULED', 'DISQUALIFIED', 'PENDING'],
    },
    outcomeNotes: { type: String },
    customerPainPoints: [{ type: String }],
    eligibleAndIneligibleNotes: [{ type: String }],
    conversationSummary: { type: String },
    unresolvedQuestions: [{ type: String }],
    recommendedProductsAttempted: [{ type: String }],
    propensityScore: { type: Number },
    propensityPriority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'] },
    propensityReasons: [{ type: String }],
    suggestedNextAction: { type: String },
    followUpNotes: [
      {
        author: String,
        note: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: 'leads' }
);

// 5. GST Registration Model (gstRegistrations) - Mock Registry
export interface IGstRegistration extends Document {
  gstin: string;
  legalName: string;
  tradeName: string;
  constitution: string;
  principalPlaceOfBusiness: string;
  state: string;
  registrationDate: string;
  status: string; // 'Active' | 'Suspended' | 'Cancelled'
}

const GstRegistrationSchema = new Schema<IGstRegistration>(
  {
    gstin: { type: String, required: true, unique: true, index: true },
    legalName: { type: String, required: true },
    tradeName: { type: String, required: true },
    constitution: { type: String, required: true },
    principalPlaceOfBusiness: { type: String, required: true },
    state: { type: String, required: true },
    registrationDate: { type: String, required: true },
    status: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: 'gstRegistrations' }
);

// 6. Udyam Registration Model (udyamRegistrations) - Mock Registry
export interface IUdyamRegistration extends Document {
  udyamNumber: string;
  enterpriseName: string;
  enterpriseType: string; // 'Micro' | 'Small' | 'Medium'
  majorActivity: string; // 'Services' | 'Trading' | 'Manufacturing'
  nicDescription: string;
  state: string;
  city: string;
  dateOfRegistration: string;
}

const UdyamRegistrationSchema = new Schema<IUdyamRegistration>(
  {
    udyamNumber: { type: String, required: true, unique: true, index: true },
    enterpriseName: { type: String, required: true },
    enterpriseType: { type: String, required: true },
    majorActivity: { type: String, required: true },
    nicDescription: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    dateOfRegistration: { type: String, required: true },
  },
  { timestamps: true, collection: 'udyamRegistrations' }
);

// 7. Conversation Model (conversations)
export interface IConversation extends Document {
  conversationId: string;
  businessId: string;
  language: string;
  channel: 'WEB' | 'VOICE' | 'WHATSAPP';
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    suggestedQuestions?: string[];
    guardrailTriggered?: boolean;
  }>;
  extractedRequirements: {
    businessType?: string;
    segment?: string;
    employeeCount?: number;
    numberOfSites?: number;
    city?: string;
    cityTier?: number;
    currentProvider?: string;
    currentExpenditure?: number;
    requirements: string[];
    budget?: number;
    preferredLanguage?: string;
    gstinAvailable?: boolean;
    gstinStatus?: string;
    contractPreference?: number;
  };
  handoffTriggered: boolean;
}

const ConversationSchema = new Schema<IConversation>(
  {
    conversationId: { type: String, required: true, unique: true, index: true },
    businessId: { type: String, required: true, index: true },
    language: { type: String, default: 'English' },
    channel: { type: String, enum: ['WEB', 'VOICE', 'WHATSAPP'], default: 'WEB' },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant', 'system'] },
        content: String,
        timestamp: { type: Date, default: Date.now },
        suggestedQuestions: [String],
        guardrailTriggered: Boolean,
      },
    ],
    extractedRequirements: {
      businessType: String,
      segment: String,
      employeeCount: Number,
      numberOfSites: Number,
      city: String,
      cityTier: Number,
      currentProvider: String,
      currentExpenditure: Number,
      requirements: [String],
      budget: Number,
      preferredLanguage: String,
      gstinAvailable: Boolean,
      gstinStatus: String,
      contractPreference: Number,
    },
    handoffTriggered: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'conversations' }
);

// 8. Assessment Model (assessments)
export interface IAssessment extends Document {
  assessmentId: string;
  businessId: string;
  scoringRuleVersion: string;
  answers: Record<string, any>;
  overallScore: number;
  maturityBand: string;
  categoryScores: {
    connectivity: number;
    communication: number;
    productivity: number;
    security: number;
    businessContinuity: number;
  };
  strengths: string[];
  weaknesses: string[];
  identifiedGaps: string[];
  actionableRecommendations: Array<{
    title: string;
    gapAddressed: string;
    impact: string;
    productId: string;
    productName: string;
    monthlyPriceInr: number;
  }>;
}

const AssessmentSchema = new Schema<IAssessment>(
  {
    assessmentId: { type: String, required: true, unique: true, index: true },
    businessId: { type: String, required: true, index: true },
    scoringRuleVersion: { type: String, default: 'v1.0-deterministic' },
    answers: { type: Schema.Types.Mixed, required: true },
    overallScore: { type: Number, required: true },
    maturityBand: { type: String, required: true },
    categoryScores: {
      connectivity: Number,
      communication: Number,
      productivity: Number,
      security: Number,
      businessContinuity: Number,
    },
    strengths: [String],
    weaknesses: [String],
    identifiedGaps: [String],
    actionableRecommendations: [
      {
        title: String,
        gapAddressed: String,
        impact: String,
        productId: String,
        productName: String,
        monthlyPriceInr: Number,
      },
    ],
  },
  { timestamps: true, collection: 'assessments' }
);

// 9. Recommendation Model (recommendations)
export interface IRecommendation extends Document {
  recommendationId: string;
  businessId: string;
  scoringFormulaVersion: string;
  inputsSnapshot: Record<string, any>;
  bundles: Array<{
    tier: 'Essential' | 'Recommended' | 'Advanced';
    bundleName: string;
    matchScore: number;
    scoreBreakdown: {
      requirementCoverage: number;
      affordability: number;
      segmentSuitability: number;
      compatibility: number;
    };
    products: Array<{
      productId: string;
      productName: string;
      category: string;
      unit: string;
      quantity: number;
      unitMonthlyPriceInr: number;
      lineMonthlyTotalInr: number;
      unitSetupFeeInr: number;
      lineSetupTotalInr: number;
      minContractMonths: number;
      typicalInstallDays: number;
      whyRecommended: string;
      requirementAddressed: string;
    }>;
    monthlyTotalInr: number;
    setupTotalInr: number;
    contractMonths: number;
    contractTotalValueInr: number;
    estimatedInstallDays: number;
    whySelected: string;
    requirementsAddressed: string[];
    missingCapabilities: string[];
    limitations: string[];
  }>;
  ineligibleProducts: Array<{
    productId: string;
    productName: string;
    reasons: string[];
  }>;
}

const RecommendationSchema = new Schema<IRecommendation>(
  {
    recommendationId: { type: String, required: true, unique: true, index: true },
    businessId: { type: String, required: true, index: true },
    scoringFormulaVersion: { type: String, default: 'v1.0-catalogue-grounded' },
    inputsSnapshot: { type: Schema.Types.Mixed },
    bundles: [Schema.Types.Mixed],
    ineligibleProducts: [
      {
        productId: String,
        productName: String,
        reasons: [String],
      },
    ],
  },
  { timestamps: true, collection: 'recommendations' }
);

// 10. Quote Model (quotes) - Stores immutable price snapshots
export type QuoteStatus = 'DRAFT' | 'GENERATED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface IQuoteLineItem {
  productId: string;
  productName: string;
  category: string;
  unit: string;
  quantity: number;
  snapshotUnitMonthlyPriceInr: number;
  snapshotUnitSetupFeeInr: number;
  lineMonthlyTotalInr: number;
  lineSetupTotalInr: number;
  minContractMonths: number;
  typicalInstallDays: number;
}

export interface IQuote extends Document {
  quoteId: string;
  businessId: string;
  bundleName: string;
  tier: string;
  items: IQuoteLineItem[];
  monthlyTotalInr: number;
  setupTotalInr: number;
  contractMonths: number;
  contractTotalValueInr: number;
  estimatedInstallDays: number;
  feasibilityStatus: string;
  feasibilityCheckId?: string;
  status: QuoteStatus;
  rejectionReason?: string;
  acceptedAt?: Date;
  immutablePriceSnapshot: boolean;
}

const QuoteSchema = new Schema<IQuote>(
  {
    quoteId: { type: String, required: true, unique: true, index: true },
    businessId: { type: String, required: true, index: true },
    bundleName: { type: String, required: true },
    tier: { type: String, default: 'Recommended' },
    items: [
      {
        productId: String,
        productName: String,
        category: String,
        unit: String,
        quantity: Number,
        snapshotUnitMonthlyPriceInr: Number,
        snapshotUnitSetupFeeInr: Number,
        lineMonthlyTotalInr: Number,
        lineSetupTotalInr: Number,
        minContractMonths: Number,
        typicalInstallDays: Number,
      },
    ],
    monthlyTotalInr: { type: Number, required: true },
    setupTotalInr: { type: Number, required: true },
    contractMonths: { type: Number, required: true },
    contractTotalValueInr: { type: Number, required: true },
    estimatedInstallDays: { type: Number, required: true },
    feasibilityStatus: { type: String, default: 'AVAILABLE' },
    feasibilityCheckId: { type: String },
    status: {
      type: String,
      enum: ['DRAFT', 'GENERATED', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
      default: 'GENERATED',
    },
    rejectionReason: { type: String },
    acceptedAt: { type: Date },
    immutablePriceSnapshot: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'quotes' }
);

// 11. KYC Consent Model (kycConsents)
export interface IKycConsent extends Document {
  consentId: string;
  businessId: string;
  userId?: string;
  policyVersion: string;
  consentGiven: boolean;
  purposesAccepted: string[];
  retentionDays: number;
  timestamp: Date;
  ipAddress?: string;
}

const KycConsentSchema = new Schema<IKycConsent>(
  {
    consentId: { type: String, required: true, unique: true, index: true },
    businessId: { type: String, required: true, index: true },
    userId: { type: String },
    policyVersion: { type: String, default: 'DPDP-2026-v1.2' },
    consentGiven: { type: Boolean, required: true },
    purposesAccepted: [String],
    retentionDays: { type: Number, default: 180 },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String },
  },
  { timestamps: true, collection: 'kycConsents' }
);

// 12. KYC Document Model (kycDocuments)
export interface IKycDocument extends Document {
  documentId: string;
  kycId: string;
  businessId: string;
  documentType: 'GST_CERTIFICATE' | 'UDYAM_CERTIFICATE' | 'SIGNATORY_ID' | 'ADDRESS_PROOF';
  fileName: string;
  specimenCode?: string; // e.g., K01 .. K12
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  extractedFields: Record<string, any>;
  fieldConfidence: Record<string, number>;
  overallConfidence: number;
  qualityFlags: string[];
}

const KycDocumentSchema = new Schema<IKycDocument>(
  {
    documentId: { type: String, required: true, unique: true, index: true },
    kycId: { type: String, required: true, index: true },
    businessId: { type: String, required: true, index: true },
    documentType: {
      type: String,
      enum: ['GST_CERTIFICATE', 'UDYAM_CERTIFICATE', 'SIGNATORY_ID', 'ADDRESS_PROOF'],
      required: true,
    },
    fileName: { type: String, required: true },
    specimenCode: { type: String },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    storagePath: { type: String, required: true },
    extractedFields: { type: Schema.Types.Mixed, default: {} },
    fieldConfidence: { type: Schema.Types.Mixed, default: {} },
    overallConfidence: { type: Number, default: 0.95 },
    qualityFlags: [String],
  },
  { timestamps: true, collection: 'kycDocuments' }
);

// 13. KYC Application Model (kycApplications)
export type KycStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'PROCESSING'
  | 'NEEDS_CORRECTION'
  | 'MANUAL_REVIEW'
  | 'VERIFIED'
  | 'REJECTED';

export interface IKycApplication extends Document {
  kycId: string;
  businessId: string;
  quoteId?: string;
  specimenCode?: string;
  consentId?: string;
  status: KycStatus;
  documents: string[]; // documentIds
  gstinVerification: {
    gstin?: string;
    formatValid: boolean;
    checksumValid: boolean;
    status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'NOT_FOUND' | 'INVALID_FORMAT' | 'NOT_PROVIDED';
    registryRecord?: Record<string, any>;
  };
  udyamVerification: {
    udyamNumber?: string;
    formatValid: boolean;
    status: 'VERIFIED' | 'NOT_FOUND' | 'INVALID_FORMAT' | 'NOT_PROVIDED';
    registryRecord?: Record<string, any>;
  };
  crossValidationIssues: Array<{
    code: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    documentType: string;
    field: string;
    description: string;
  }>;
  addressProofAgeDays?: number;
  referenceDateUsed: string;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  recoveryPlan?: Record<string, any>;
  verificationHistory?: Array<{
    attemptNumber: number;
    timestamp: Date;
    status: string;
    replacedDocumentType?: string;
    previousDocumentId?: string;
    newDocumentId?: string;
    issuesCount: number;
    summary: string;
  }>;
}

const KycApplicationSchema = new Schema<IKycApplication>(
  {
    kycId: { type: String, required: true, unique: true, index: true },
    businessId: { type: String, required: true, index: true },
    quoteId: { type: String },
    specimenCode: { type: String },
    consentId: { type: String },
    status: {
      type: String,
      enum: [
        'NOT_STARTED',
        'PENDING',
        'PROCESSING',
        'NEEDS_CORRECTION',
        'MANUAL_REVIEW',
        'VERIFIED',
        'REJECTED',
      ],
      default: 'NOT_STARTED',
    },
    documents: [String],
    gstinVerification: { type: Schema.Types.Mixed, default: {} },
    udyamVerification: { type: Schema.Types.Mixed, default: {} },
    crossValidationIssues: [
      {
        code: String,
        severity: { type: String, enum: ['CRITICAL', 'WARNING', 'INFO'] },
        documentType: String,
        field: String,
        description: String,
      },
    ],
    addressProofAgeDays: { type: Number },
    referenceDateUsed: { type: String, default: '2026-07-15' },
    reviewerNotes: { type: String },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    recoveryPlan: { type: Schema.Types.Mixed },
    verificationHistory: [
      {
        attemptNumber: Number,
        timestamp: { type: Date, default: Date.now },
        status: String,
        replacedDocumentType: String,
        previousDocumentId: String,
        newDocumentId: String,
        issuesCount: Number,
        summary: String,
      },
    ],
  },
  { timestamps: true, collection: 'kycApplications' }
);

// 14. Order Model (orders)
export type OrderStatus =
  | 'QUOTE_ACCEPTED'
  | 'KYC_PENDING'
  | 'KYC_VERIFIED'
  | 'ORDER_CONFIRMED'
  | 'INSTALLATION_SCHEDULED'
  | 'INSTALLATION_IN_PROGRESS'
  | 'ACTIVATED'
  | 'ON_HOLD'
  | 'NEEDS_CUSTOMER_ACTION'
  | 'CANCELLED'
  | 'FAILED';

export interface IOrder extends Document {
  orderId: string;
  businessId: string;
  quoteId: string;
  kycId?: string;
  status: OrderStatus;
  products: IQuoteLineItem[];
  monthlyTotalInr: number;
  setupTotalInr: number;
  contractMonths: number;
  overallInstallDays: number;
  expectedInstallationDate: string;
  actualActivationDate?: string;
  scheduledSlot?: string;
  pendingActions: string[];
  delayReason?: string;
  processedEventKeys: string[];
}

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    businessId: { type: String, required: true, index: true },
    quoteId: { type: String, required: true },
    kycId: { type: String },
    status: {
      type: String,
      enum: [
        'QUOTE_ACCEPTED',
        'KYC_PENDING',
        'KYC_VERIFIED',
        'ORDER_CONFIRMED',
        'INSTALLATION_SCHEDULED',
        'INSTALLATION_IN_PROGRESS',
        'ACTIVATED',
        'ON_HOLD',
        'NEEDS_CUSTOMER_ACTION',
        'CANCELLED',
        'FAILED',
      ],
      default: 'QUOTE_ACCEPTED',
    },
    products: [Schema.Types.Mixed],
    monthlyTotalInr: { type: Number, required: true },
    setupTotalInr: { type: Number, required: true },
    contractMonths: { type: Number, required: true },
    overallInstallDays: { type: Number, required: true },
    expectedInstallationDate: { type: String, required: true },
    actualActivationDate: { type: String },
    scheduledSlot: { type: String },
    pendingActions: [String],
    delayReason: { type: String },
    processedEventKeys: [String],
  },
  { timestamps: true, collection: 'orders' }
);

// 15. Order Status History Model (orderStatusHistory)
export interface IOrderStatusHistory extends Document {
  orderId: string;
  eventType: string;
  previousStatus: string;
  newStatus: string;
  actor: string;
  actorRole: string;
  reason: string;
  timestamp: Date;
}

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    orderId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    previousStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    actor: { type: String, required: true },
    actorRole: { type: String, required: true },
    reason: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'orderStatusHistory' }
);

// 16. Installation Model (installations)
export interface IInstallation extends Document {
  installationId: string;
  orderId: string;
  businessId: string;
  siteAddress: string;
  city: string;
  pinCode: string;
  technicianName: string;
  technicianPhone: string;
  scheduledDate: string;
  slotWindow: string;
  status: 'PENDING_SCHEDULE' | 'SCHEDULED' | 'IN_PROGRESS' | 'DELAYED' | 'COMPLETED';
  productTimelines: Array<{
    productId: string;
    productName: string;
    typicalInstallDays: number;
    status: string;
  }>;
  notes?: string;
}

const InstallationSchema = new Schema<IInstallation>(
  {
    installationId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    businessId: { type: String, required: true },
    siteAddress: { type: String, required: true },
    city: { type: String, required: true },
    pinCode: { type: String, required: true },
    technicianName: { type: String, default: 'Ramesh Verma (Field Eng #408)' },
    technicianPhone: { type: String, default: '+91 98112 23344' },
    scheduledDate: { type: String, required: true },
    slotWindow: { type: String, default: '10:00 AM - 01:00 PM' },
    status: {
      type: String,
      enum: ['PENDING_SCHEDULE', 'SCHEDULED', 'IN_PROGRESS', 'DELAYED', 'COMPLETED'],
      default: 'SCHEDULED',
    },
    productTimelines: [
      {
        productId: String,
        productName: String,
        typicalInstallDays: Number,
        status: String,
      },
    ],
    notes: { type: String },
  },
  { timestamps: true, collection: 'installations' }
);

// 17. Notification Model (notifications)
export interface INotification extends Document {
  notificationId: string;
  businessId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  channelSimulated: 'IN_APP' | 'WHATSAPP_SIMULATED' | 'SMS_SIMULATED' | 'EMAIL_SIMULATED';
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    businessId: { type: String, required: true, index: true },
    userId: { type: String },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    channelSimulated: {
      type: String,
      enum: ['IN_APP', 'WHATSAPP_SIMULATED', 'SMS_SIMULATED', 'EMAIL_SIMULATED'],
      default: 'IN_APP',
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'notifications' }
);

// 18. Partner Model (partners)
export interface IPartner extends Document {
  partnerId: string;
  partnerName: string;
  partnerType: 'Sales Executive' | 'Channel Partner';
  city: string;
  state: string;
  assignedLeadsCount: number;
  convertedLeadsCount: number;
  totalCommissionInr: number;
}

const PartnerSchema = new Schema<IPartner>(
  {
    partnerId: { type: String, required: true, unique: true, index: true },
    partnerName: { type: String, required: true },
    partnerType: { type: String, enum: ['Sales Executive', 'Channel Partner'], required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    assignedLeadsCount: { type: Number, default: 0 },
    convertedLeadsCount: { type: Number, default: 0 },
    totalCommissionInr: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'partners' }
);

// 19. Support Ticket Model (supportTickets)
export interface ISupportTicket extends Document {
  ticketId: string;
  businessId: string;
  orderId?: string;
  category: 'CONNECTIVITY_ISSUE' | 'PLAN_UPGRADE' | 'ADDITIONAL_SIM' | 'NEW_LOCATION' | 'BILLING_QUERY' | 'INSTALLATION_DELAY';
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
  statusHistory: Array<{
    status: string;
    note: string;
    actor: string;
    timestamp: Date;
  }>;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    businessId: { type: String, required: true, index: true },
    orderId: { type: String },
    category: {
      type: String,
      enum: ['CONNECTIVITY_ISSUE', 'PLAN_UPGRADE', 'ADDITIONAL_SIM', 'NEW_LOCATION', 'BILLING_QUERY', 'INSTALLATION_DELAY'],
      required: true,
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'], default: 'OPEN' },
    statusHistory: [
      {
        status: String,
        note: String,
        actor: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: 'supportTickets' }
);

// 20. Referral Model (referrals)
export interface IReferral extends Document {
  referralCode: string;
  referrerBusinessId: string;
  referrerName: string;
  referredBusinessName: string;
  referredContactPhone: string;
  city: string;
  status: 'INVITED' | 'REGISTERED' | 'QUOTE_ACCEPTED' | 'ACTIVATED';
  rewardAmountInr: number;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referralCode: { type: String, required: true, unique: true, index: true },
    referrerBusinessId: { type: String, required: true, index: true },
    referrerName: { type: String, required: true },
    referredBusinessName: { type: String, required: true },
    referredContactPhone: { type: String, required: true },
    city: { type: String, required: true },
    status: {
      type: String,
      enum: ['INVITED', 'REGISTERED', 'QUOTE_ACCEPTED', 'ACTIVATED'],
      default: 'INVITED',
    },
    rewardAmountInr: { type: Number, default: 1000 },
  },
  { timestamps: true, collection: 'referrals' }
);

// 21. Audit Log Model (auditLogs)
export interface IAuditLog extends Document {
  auditId: string;
  action: string;
  module: string;
  actorId: string;
  actorRole: string;
  targetId: string;
  details: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    action: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    targetId: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'auditLogs' }
);

// 22. AI Evaluation Model (aiEvaluations)
export interface IAiEvaluation extends Document {
  evalRunId: string;
  suiteVersion: string;
  modelName: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  metrics: {
    requirementExtractionAccuracyPct: number;
    recommendationPrecisionPct: number;
    catalogueHallucinationRatePct: number;
    eligibilityViolationRatePct: number;
    ocrFieldAccuracyPct: number;
    avgLatencyMs: number;
    estimatedCostPerOnboardingInr: number;
    humanHandoffRatePct: number;
  };
  caseResults: Array<{
    caseId: string;
    category: string;
    language: string;
    inputPrompt: string;
    expectedBehavior: string;
    actualOutcome: string;
    passed: boolean;
    latencyMs: number;
  }>;
  runAt: Date;
}

const AiEvaluationSchema = new Schema<IAiEvaluation>(
  {
    evalRunId: { type: String, required: true, unique: true, index: true },
    suiteVersion: { type: String, default: 'eval-suite-2026.1' },
    modelName: { type: String, required: true },
    totalCases: { type: Number, required: true },
    passedCases: { type: Number, required: true },
    failedCases: { type: Number, required: true },
    metrics: {
      requirementExtractionAccuracyPct: Number,
      recommendationPrecisionPct: Number,
      catalogueHallucinationRatePct: Number,
      eligibilityViolationRatePct: Number,
      ocrFieldAccuracyPct: Number,
      avgLatencyMs: Number,
      estimatedCostPerOnboardingInr: Number,
      humanHandoffRatePct: Number,
    },
    caseResults: [
      {
        caseId: String,
        category: String,
        language: String,
        inputPrompt: String,
        expectedBehavior: String,
        actualOutcome: String,
        passed: Boolean,
        latencyMs: Number,
      },
    ],
    runAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'aiEvaluations' }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
export const BusinessModel = mongoose.model<IBusiness>('Business', BusinessSchema);
export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);
export const LeadModel = mongoose.model<ILead>('Lead', LeadSchema);
export const GstRegistrationModel = mongoose.model<IGstRegistration>('GstRegistration', GstRegistrationSchema);
export const UdyamRegistrationModel = mongoose.model<IUdyamRegistration>('UdyamRegistration', UdyamRegistrationSchema);
export const ConversationModel = mongoose.model<IConversation>('Conversation', ConversationSchema);
export const AssessmentModel = mongoose.model<IAssessment>('Assessment', AssessmentSchema);
export const RecommendationModel = mongoose.model<IRecommendation>('Recommendation', RecommendationSchema);
export const QuoteModel = mongoose.model<IQuote>('Quote', QuoteSchema);
export const KycConsentModel = mongoose.model<IKycConsent>('KycConsent', KycConsentSchema);
export const KycDocumentModel = mongoose.model<IKycDocument>('KycDocument', KycDocumentSchema);
export const KycApplicationModel = mongoose.model<IKycApplication>('KycApplication', KycApplicationSchema);
export const OrderModel = mongoose.model<IOrder>('Order', OrderSchema);
export const OrderStatusHistoryModel = mongoose.model<IOrderStatusHistory>('OrderStatusHistory', OrderStatusHistorySchema);
export const InstallationModel = mongoose.model<IInstallation>('Installation', InstallationSchema);
export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);
export const PartnerModel = mongoose.model<IPartner>('Partner', PartnerSchema);
export const SupportTicketModel = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
export const ReferralModel = mongoose.model<IReferral>('Referral', ReferralSchema);
export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export const AiEvaluationModel = mongoose.model<IAiEvaluation>('AiEvaluation', AiEvaluationSchema);
