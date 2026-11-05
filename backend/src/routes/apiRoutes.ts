import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import {
  UserModel,
  BusinessModel,
  ProductModel,
  LeadModel,
  ConversationModel,
  AssessmentModel,
  RecommendationModel,
  QuoteModel,
  KycConsentModel,
  KycDocumentModel,
  KycApplicationModel,
  OrderModel,
  OrderStatusHistoryModel,
  InstallationModel,
  NotificationModel,
  PartnerModel,
  SupportTicketModel,
  ReferralModel,
  AuditLogModel,
  AiEvaluationModel,
  UserRole,
  OrderStatus,
} from '../models';
import {
  authenticate,
  optionalAuth,
  requireRole,
  signToken,
  logAuditEvent,
  verifyCustomerOwnership,
  sanitizeBusinessPayload,
  sanitizePiiInDetails,
  AuthenticatedRequest,
} from '../middleware/auth';
import {
  checkSingleProductEligibility,
  validateBundleEligibilityAndDependencies,
  generateCatalogueRecommendations,
  generateCounterfactualComparison,
  runRecommendationEvaluationSuite,
} from '../services/catalogueEngine';
import { calculateBundlePricing, calculateROIAndSavings } from '../services/pricingEngine';
import { calculateDigitalReadinessScore } from '../services/assessmentEngine';
import { checkNetworkFeasibility } from '../services/feasibilityEngine';
import { verifyGstinAgainstRegistry, verifyUdyamAgainstRegistry } from '../services/registryValidator';
import {
  SPECIMEN_KYC_CATALOGUE,
  runComprehensiveKycValidation,
  DATASET_REFERENCE_DATE,
} from '../services/kycEngine';
import { runModularOcrPipeline } from '../services/documentIntelligence';
import { generateBusinessDigitalTwin } from '../services/digitalTwinEngine';
import {
  generateAdvisorResponse,
  extractStructuredRequirementsDeterministic,
} from '../services/advisorEngine';
import { validateOrderStateTransition, addDaysToDateStr } from '../services/orderStateMachine';
import { calculateLeadPropensity, getPropensityModelEvaluation } from '../services/propensityEngine';
import { computeSegmentIntelligence } from '../services/segmentIntelligenceEngine';
import { getProductionIntegrationReadiness } from '../services/integrationReadiness';
import { runCommercialImpactSimulation } from '../services/commercialSimulator';
import { runAiEvaluationSuite } from '../services/aiEvalEngine';
import { DEMO_SCENARIOS, seedAllEightDemoScenarios } from '../services/demoScenarioSeeder';

export const apiRouter = Router();

// Dedicated Rate Limiters for sensitive Authentication and KYC Verification endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

const kycRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many KYC verification requests. Please wait before retrying.' },
});

// Configure Multer for private KYC uploads
const uploadDir = path.resolve(__dirname, '../../../.private_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PNG, JPG, and PDF files are allowed.'));
    }
    cb(null, true);
  },
});

// ============================================================================
// 1. AUTHENTICATION & ROLE SWITCHING
// ============================================================================

apiRouter.post('/auth/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role, preferredLanguage } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }
    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);

    // SECURITY ENFORCEMENT: Public registration MUST always create a Customer account.
    // Privileged accounts can only be created via administrative or controlled seed processes.
    const attemptedPrivilegedRole = Boolean(role && role !== 'Customer');
    const validRole: UserRole = 'Customer';

    const user = await UserModel.create({
      email: email.toLowerCase().trim(),
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : undefined,
      passwordHash,
      role: validRole,
      preferredLanguage: preferredLanguage || 'English',
    });

    const token = signToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await logAuditEvent({
      action: attemptedPrivilegedRole ? 'USER_REGISTERED_PRIVILEGE_ESCALATION_BLOCKED' : 'USER_REGISTERED',
      module: 'AUTH',
      actorId: user.email,
      actorRole: user.role,
      targetId: String(user._id),
      details: attemptedPrivilegedRole
        ? { attemptedRole: role, enforcedRole: 'Customer' }
        : { enforcedRole: 'Customer' },
    });

    res.status(201).json({
      token,
      privilegeEscalationBlocked: attemptedPrivilegedRole,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

apiRouter.post('/auth/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email: (email || '').toLowerCase().trim() });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const match = await bcrypt.compare(password || '', user.passwordHash);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await logAuditEvent({
      action: 'USER_LOGIN',
      module: 'AUTH',
      actorId: user.email,
      actorRole: user.role,
      targetId: String(user._id),
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Presentation Role Switcher: Issues a real signed JWT for the seeded demo account of that role
// Protected by demo-environment guard so it can never become a production privilege escalation vector
apiRouter.post('/auth/switch-role', authRateLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isProductionEnv =
      process.env.NODE_ENV === 'production' ||
      process.env.ENABLE_DEMO_ROLE_SWITCH === 'false' ||
      req.headers['x-production-mode'] === 'true';

    if (isProductionEnv) {
      res.status(403).json({
        error: 'SECURITY POLICY: Demo role switching is disabled in production environments.',
      });
      return;
    }

    const { role } = req.body;
    const roleEmailMap: Record<string, string> = {
      Customer: 'customer@udyamone.in',
      'Sales Executive': 'sales@udyamone.in',
      'Channel Partner': 'partner@udyamone.in',
      'KYC Reviewer': 'kyc@udyamone.in',
      Admin: 'admin@udyamone.in',
    };
    const targetEmail = roleEmailMap[role];
    if (!targetEmail) {
      res.status(400).json({ error: `Invalid role '${role}'.` });
      return;
    }
    const user = await UserModel.findOne({ email: targetEmail });
    if (!user) {
      res.status(404).json({ error: 'Seeded role user not found.' });
      return;
    }

    const token = signToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await logAuditEvent({
      action: 'DEMO_ROLE_SWITCHED',
      module: 'AUTH',
      actorId: req.user?.email || user.email,
      actorRole: req.user?.role || user.role,
      targetId: String(user._id),
      details: { previousRole: req.user?.role || 'AnonymousDemo', switchedToRole: user.role },
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/auth/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// ============================================================================
// 2. DEMO SCENARIO SELECTOR & RESET
// ============================================================================

apiRouter.get('/demo/scenarios', async (_req: Request, res: Response) => {
  res.json({ scenarios: DEMO_SCENARIOS });
});

apiRouter.post('/demo/scenarios/:scenarioId/load', async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const scen = DEMO_SCENARIOS.find(
      (s) => s.scenarioId.toLowerCase() === scenarioId.toLowerCase() || String(s.number) === scenarioId
    );
    if (!scen) {
      res.status(404).json({ error: `Scenario '${scenarioId}' not found.` });
      return;
    }
    const business = await BusinessModel.findOne({ businessId: scen.businessId });
    const assessment = await AssessmentModel.findOne({ businessId: scen.businessId });
    const recommendation = await RecommendationModel.findOne({ businessId: scen.businessId });
    const quote = await QuoteModel.findOne({ businessId: scen.businessId }).sort({ createdAt: -1 });
    const kyc = await KycApplicationModel.findOne({ businessId: scen.businessId }).sort({ createdAt: -1 });
    const order = await OrderModel.findOne({ businessId: scen.businessId }).sort({ createdAt: -1 });

    res.json({
      scenario: scen,
      business,
      assessment,
      recommendation,
      quote,
      kyc,
      order,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/demo/reset', async (_req: Request, res: Response) => {
  try {
    await seedAllEightDemoScenarios();
    res.json({ message: 'All 8 Demo Scenarios reset to initial deterministic state.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. BUSINESS PROFILE
// ============================================================================

apiRouter.get('/business', async (_req: Request, res: Response) => {
  const list = await BusinessModel.find().sort({ businessId: 1 });
  res.json({ businesses: list });
});

apiRouter.post('/business', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sanitized = sanitizeBusinessPayload(req.body || {});
    const businessId = (req.body?.businessId ? String(req.body.businessId) : '') || `BIZ-${Date.now()}`;

    const ownership = verifyCustomerOwnership(req, businessId);
    if (!ownership.allowed) {
      res.status(403).json({ error: ownership.reason });
      return;
    }

    let gstinVerifiedStatus = 'UNVERIFIED';
    if (sanitized.gstin) {
      const gCheck = await verifyGstinAgainstRegistry(sanitized.gstin);
      gstinVerifiedStatus = gCheck.status;
    }
    let udyamVerifiedStatus = 'UNVERIFIED';
    if (sanitized.udyamNumber) {
      const uCheck = await verifyUdyamAgainstRegistry(sanitized.udyamNumber);
      udyamVerifiedStatus = uCheck.status;
    }

    const fieldsFilled = [
      sanitized.businessName,
      sanitized.businessType,
      sanitized.segment,
      sanitized.city,
      sanitized.employeeCount,
      sanitized.contactName,
      sanitized.gstin,
      sanitized.udyamNumber,
    ].filter(Boolean).length;
    const profileCompletionPct = Math.min(100, Math.round((fieldsFilled / 7) * 100));

    const business = await BusinessModel.findOneAndUpdate(
      { businessId },
      {
        ...sanitized,
        businessId,
        hasGstin: Boolean(sanitized.gstin),
        gstinVerifiedStatus,
        hasUdyam: Boolean(sanitized.udyamNumber),
        udyamVerifiedStatus,
        profileCompletionPct,
      },
      { new: true, upsert: true }
    );

    await NotificationModel.create({
      notificationId: `NOTIF-${Date.now()}`,
      businessId: business.businessId,
      type: 'REGISTRATION_SAVED',
      title: 'Business Profile Updated',
      message: `${business.businessName} profile (${business.city}, Tier-${business.cityTier}) saved with ${profileCompletionPct}% completion.`,
      channelSimulated: 'IN_APP',
      isRead: false,
    });

    res.status(201).json({ business });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/business/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const ownership = verifyCustomerOwnership(req, req.params.id);
  if (!ownership.allowed) {
    res.status(403).json({ error: ownership.reason });
    return;
  }
  const business = await BusinessModel.findOne({ businessId: req.params.id });
  if (!business) {
    res.status(404).json({ error: 'Business profile not found.' });
    return;
  }
  res.json({ business });
});

apiRouter.patch('/business/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ownership = verifyCustomerOwnership(req, req.params.id);
    if (!ownership.allowed) {
      res.status(403).json({ error: ownership.reason });
      return;
    }

    const updates = sanitizeBusinessPayload(req.body || {});
    if (updates.gstin !== undefined) {
      updates.hasGstin = Boolean(updates.gstin);
      if (updates.gstin) {
        const gCheck = await verifyGstinAgainstRegistry(updates.gstin);
        updates.gstinVerifiedStatus = gCheck.status;
      } else {
        updates.gstinVerifiedStatus = 'NOT_PROVIDED';
      }
    }
    if (updates.udyamNumber !== undefined) {
      updates.hasUdyam = Boolean(updates.udyamNumber);
      if (updates.udyamNumber) {
        const uCheck = await verifyUdyamAgainstRegistry(updates.udyamNumber);
        updates.udyamVerifiedStatus = uCheck.status;
      } else {
        updates.udyamVerifiedStatus = 'NOT_PROVIDED';
      }
    }

    const business = await BusinessModel.findOneAndUpdate(
      { businessId: req.params.id },
      { $set: updates },
      { new: true }
    );
    if (!business) {
      res.status(404).json({ error: 'Business profile not found.' });
      return;
    }
    res.json({ business });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 4. BUSINESS DIGITAL READINESS ASSESSMENT
// ============================================================================

apiRouter.post('/assessment/score', async (req: Request, res: Response) => {
  try {
    const { businessId, answers, eligibilityContext } = req.body;
    const biz = businessId ? await BusinessModel.findOne({ businessId }) : null;
    const eligInput = eligibilityContext || {
      cityTier: biz?.cityTier || 1,
      employeeCount: biz?.employeeCount || 5,
      numSites: biz?.numSites || 1,
      hasGstin: biz?.hasGstin ?? true,
      gstinStatus: biz?.gstinVerifiedStatus || 'ACTIVE',
      segment: biz?.segment || 'Micro retail & services',
    };

    const scoreResult = await calculateDigitalReadinessScore(answers || {}, eligInput);

    if (businessId) {
      const saved = await AssessmentModel.findOneAndUpdate(
        { businessId },
        {
          assessmentId: `ASSESS-${businessId}`,
          businessId,
          answers: answers || {},
          ...scoreResult,
        },
        { new: true, upsert: true }
      );
      res.json({ assessment: saved, ...scoreResult });
      return;
    }

    res.json(scoreResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/assessment', async (req: Request, res: Response) => {
  try {
    const { businessId, answers, eligibilityContext } = req.body;
    const biz = businessId ? await BusinessModel.findOne({ businessId }) : null;
    const eligInput = eligibilityContext || {
      cityTier: biz?.cityTier || 1,
      employeeCount: biz?.employeeCount || 5,
      numSites: biz?.numSites || 1,
      hasGstin: biz?.hasGstin ?? true,
      gstinStatus: biz?.gstinVerifiedStatus || 'ACTIVE',
      segment: biz?.segment || 'Micro retail & services',
    };
    const scoreResult = await calculateDigitalReadinessScore(answers || {}, eligInput);
    const bId = businessId || `BIZ-${Date.now()}`;
    const saved = await AssessmentModel.findOneAndUpdate(
      { businessId: bId },
      {
        assessmentId: `ASSESS-${bId}`,
        businessId: bId,
        answers: answers || {},
        ...scoreResult,
      },
      { new: true, upsert: true }
    );
    res.status(201).json({ assessment: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/assessment/:id', async (req: Request, res: Response) => {
  const assessment = await AssessmentModel.findOne({
    $or: [{ assessmentId: req.params.id }, { businessId: req.params.id }],
  });
  if (!assessment) {
    res.status(404).json({ error: 'Assessment not found.' });
    return;
  }
  res.json({ assessment });
});

// ============================================================================
// 5. AI BUSINESS ADVISOR
// ============================================================================

apiRouter.post('/advisor/message', async (req: Request, res: Response) => {
  try {
    const { businessId, message, language, channel, currentExtracted } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const bId = businessId || 'BIZ-SCEN-01';
    let conv = await ConversationModel.findOne({ businessId: bId });

    const advisorResult = await generateAdvisorResponse({
      message,
      language,
      channel: channel || 'WEB',
      currentExtracted: currentExtracted || conv?.extractedRequirements,
    });

    if (!conv) {
      conv = new ConversationModel({
        conversationId: `CONV-${bId}-${Date.now()}`,
        businessId: bId,
        language: advisorResult.language,
        channel: channel || 'WEB',
        messages: [],
        extractedRequirements: advisorResult.extractedRequirements,
        handoffTriggered: advisorResult.shouldTriggerHandoff,
      });
    }

    conv.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    conv.messages.push({
      role: 'assistant',
      content: advisorResult.reply,
      timestamp: new Date(),
      suggestedQuestions: advisorResult.suggestedQuestions,
      guardrailTriggered: advisorResult.guardrailTriggered,
    });
    conv.extractedRequirements = advisorResult.extractedRequirements;
    if (advisorResult.shouldTriggerHandoff) {
      conv.handoffTriggered = true;
    }
    await conv.save();

    res.json({
      ...advisorResult,
      conversationId: conv.conversationId,
      messages: conv.messages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/advisor/extract', async (req: Request, res: Response) => {
  const { message, currentExtracted, preferredLanguage } = req.body;
  const extracted = extractStructuredRequirementsDeterministic(message || '', currentExtracted, preferredLanguage);
  res.json({ extractedRequirements: extracted });
});

apiRouter.post('/advisor/recommend', async (req: Request, res: Response) => {
  try {
    const { businessId, extractedRequirements } = req.body;
    const biz = businessId ? await BusinessModel.findOne({ businessId }) : null;
    const recInput = {
      cityTier: Number(extractedRequirements?.cityTier || biz?.cityTier || 1),
      employeeCount: Number(extractedRequirements?.employeeCount || biz?.employeeCount || 4),
      numSites: Number(extractedRequirements?.numberOfSites || biz?.numSites || 1),
      hasGstin: extractedRequirements?.gstinAvailable ?? biz?.hasGstin ?? true,
      gstinStatus: biz?.gstinVerifiedStatus || 'ACTIVE',
      segment: extractedRequirements?.segment || biz?.segment || 'Micro retail & services',
      businessType: extractedRequirements?.businessType || biz?.businessType || 'Retail shop',
      requirements: extractedRequirements?.requirements || [],
      budgetInr: Number(extractedRequirements?.budget || biz?.monthlyTelecomSpendInr || 3500),
    };

    const result = await generateCatalogueRecommendations(recInput);
    if (businessId) {
      await RecommendationModel.findOneAndUpdate(
        { businessId },
        {
          recommendationId: `REC-${businessId}`,
          businessId,
          inputsSnapshot: recInput,
          ...result,
        },
        { new: true, upsert: true }
      );
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/advisor/conversation/:businessId', async (req: Request, res: Response) => {
  const conv = await ConversationModel.findOne({ businessId: req.params.businessId });
  res.json({ conversation: conv });
});

// ============================================================================
// 6. PRODUCT CATALOGUE, ELIGIBILITY & RECOMMENDATION ENGINE
// ============================================================================

apiRouter.get('/products', async (_req: Request, res: Response) => {
  const products = await ProductModel.find().sort({ productId: 1 });
  res.json({ products });
});

apiRouter.post('/products/eligibility', async (req: Request, res: Response) => {
  try {
    const { productIds, cityTier, employeeCount, numSites, hasGstin, gstinStatus, segment } = req.body;
    const allProducts = await ProductModel.find().sort({ productId: 1 });
    const eligInput = {
      cityTier: Number(cityTier || 1),
      employeeCount: Number(employeeCount || 1),
      numSites: Number(numSites || 1),
      hasGstin: Boolean(hasGstin),
      gstinStatus: gstinStatus || (hasGstin ? 'ACTIVE' : 'NOT_PROVIDED'),
      segment,
    };

    if (Array.isArray(productIds) && productIds.length > 0) {
      const selected = allProducts.filter((p) => productIds.includes(p.productId));
      const bundleValidation = validateBundleEligibilityAndDependencies(selected, eligInput);
      res.json(bundleValidation);
      return;
    }

    const results = allProducts.map((p) => checkSingleProductEligibility(p, eligInput));
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/products/recommend', async (req: Request, res: Response) => {
  try {
    const {
      businessId,
      cityTier,
      employeeCount,
      numSites,
      hasGstin,
      gstinStatus,
      segment,
      businessType,
      requirements,
      budgetInr,
      fibreFeasible,
    } = req.body;

    const biz = businessId ? await BusinessModel.findOne({ businessId }) : null;
    const recInput = {
      cityTier: Number(cityTier ?? biz?.cityTier ?? 1),
      employeeCount: Number(employeeCount ?? biz?.employeeCount ?? 4),
      numSites: Number(numSites ?? biz?.numSites ?? 1),
      hasGstin: hasGstin ?? biz?.hasGstin ?? true,
      gstinStatus: gstinStatus || biz?.gstinVerifiedStatus || 'ACTIVE',
      segment: segment || biz?.segment || 'Micro retail & services',
      businessType: businessType || biz?.businessType || 'Retail shop',
      requirements: requirements || [],
      budgetInr: Number(budgetInr ?? biz?.monthlyTelecomSpendInr ?? 3500),
      fibreFeasible,
    };

    const recResult = await generateCatalogueRecommendations(recInput);
    if (businessId) {
      await RecommendationModel.findOneAndUpdate(
        { businessId },
        {
          recommendationId: `REC-${businessId}`,
          businessId,
          inputsSnapshot: recInput,
          ...recResult,
        },
        { new: true, upsert: true }
      );
    }
    res.json(recResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 7. ROI CALCULATOR, FEASIBILITY & QUOTES
// ============================================================================

apiRouter.post('/roi/calculate', async (req: Request, res: Response) => {
  try {
    const { currentExpenditures, items, contractMonths } = req.body;
    const allProducts = await ProductModel.find();
    const prodMap = new Map(allProducts.map((p) => [p.productId, p]));

    const proposedBundleItems = (items || [])
      .map((i: { productId: string; quantity: number }) => {
        const product = prodMap.get(i.productId);
        return product ? { product, quantity: Number(i.quantity || 1) } : null;
      })
      .filter(Boolean) as Array<{ product: any; quantity: number }>;

    const roi = calculateROIAndSavings({
      currentExpenditures: currentExpenditures || {
        broadbandAndInternetInr: 1500,
        mobileAndSimsInr: 1200,
        posAndBillingSoftwareInr: 800,
        cloudAndEmailToolsInr: 0,
        cctvAndSecurityInr: 0,
        whatsappAndMarketingInr: 0,
        downtimeHoursPerMonth: 4,
        estimatedRevenueLossPerHourInr: 500,
      },
      proposedBundleItems,
      contractMonths,
    });
    res.json(roi);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/feasibility/check', async (req: Request, res: Response) => {
  try {
    const { businessId, address, pinCode, city, cityTier, requestedProducts } = req.body;
    const result = checkNetworkFeasibility({
      address: address || '',
      pinCode: pinCode || '400001',
      city: city || 'Mumbai',
      cityTier,
      requestedProducts,
    });

    if (result.requiresFieldOpsLead) {
      const biz = businessId ? await BusinessModel.findOne({ businessId }) : null;
      const handoffLeadId = `HND-FEAS-${Date.now()}`;
      await LeadModel.create({
        leadId: handoffLeadId,
        isHistorical: false,
        createdDate: DATASET_REFERENCE_DATE,
        leadSource: 'Website form',
        businessName: biz?.businessName || `Site at PIN ${pinCode}`,
        businessType: biz?.businessType || 'MSME Site',
        segment: biz?.segment || 'Small manufacturers',
        city: result.city,
        cityTier: Number(cityTier || biz?.cityTier || 2),
        state: biz?.state || 'Maharashtra',
        preferredLanguage: biz?.preferredLanguage || 'English',
        employeeCount: biz?.employeeCount || 10,
        numSites: biz?.numSites || 1,
        hasGstin: biz?.hasGstin ?? true,
        gstin: biz?.gstin,
        hasUdyam: biz?.hasUdyam ?? false,
        currentInternet: biz?.currentInternet || 'Mobile hotspot',
        currentProvider: biz?.currentProvider || 'Local ISP',
        monthlyTelecomSpendInr: biz?.monthlyTelecomSpendInr || 3000,
        productsOfInterest: requestedProducts || ['P01', 'P04'],
        contactName: biz?.contactName || 'Site Owner',
        contactRole: 'Owner',
        stageReached: 'Needs assessed',
        outcome: 'Field Survey Required',
        handoffReason: `Feasibility outcome '${result.outcome}' at ${result.address} (PIN ${result.pinCode}).`,
        handoffStatus: 'AWAITING_ASSIGNMENT',
        conversationSummary: result.explanation,
        propensityScore: 65,
        propensityPriority: 'HIGH',
        suggestedNextAction: 'Dispatch Field Operations engineer for physical last-mile feasibility check.',
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/quotes', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      businessId,
      bundleName,
      tier,
      items,
      contractMonths,
      feasibilityStatus,
      eligibilityContext,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one product item is required to generate a quotation.' });
      return;
    }

    const biz = businessId ? await BusinessModel.findOne({ businessId }) : null;
    const eligInput = eligibilityContext || {
      cityTier: biz?.cityTier || 1,
      employeeCount: biz?.employeeCount || 5,
      numSites: biz?.numSites || 1,
      hasGstin: biz?.hasGstin ?? true,
      gstinStatus: biz?.gstinVerifiedStatus || 'ACTIVE',
      segment: biz?.segment,
    };

    const allProducts = await ProductModel.find();
    const prodMap = new Map(allProducts.map((p) => [p.productId, p]));

    const selectedProducts = items
      .map((i: { productId: string }) => prodMap.get(i.productId))
      .filter(Boolean) as any[];

    if (selectedProducts.length !== items.length) {
      res.status(400).json({ error: 'One or more product IDs do not exist in the official catalogue.' });
      return;
    }

    // Authoritative Backend Eligibility & Dependency Check
    const validation = validateBundleEligibilityAndDependencies(selectedProducts, eligInput);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Bundle failed deterministic eligibility or companion dependency validation.',
        validationErrors: validation.errors,
        itemResults: validation.itemResults,
      });
      return;
    }

    const calcInput = items.map((i: { productId: string; quantity: number }) => ({
      product: prodMap.get(i.productId)!,
      quantity: Number(i.quantity || 1),
    }));

    const pricing = calculateBundlePricing(calcInput, contractMonths);
    const quoteId = `QT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const bId = businessId || 'BIZ-SCEN-01';

    const quote = await QuoteModel.create({
      quoteId,
      businessId: bId,
      bundleName: bundleName || 'Custom Udyam One Bundle',
      tier: tier || 'Recommended',
      items: pricing.items,
      monthlyTotalInr: pricing.monthlyTotalInr,
      setupTotalInr: pricing.setupTotalInr,
      contractMonths: pricing.contractMonths,
      contractTotalValueInr: pricing.contractTotalValueInr,
      estimatedInstallDays: pricing.estimatedInstallDays,
      feasibilityStatus: feasibilityStatus || 'AVAILABLE',
      status: 'GENERATED',
      immutablePriceSnapshot: true,
    });

    await NotificationModel.create({
      notificationId: `NOTIF-${Date.now()}`,
      businessId: bId,
      type: 'QUOTE_GENERATED',
      title: `Quotation ${quoteId} Generated`,
      message: `Your immutable price quotation for ${quote.bundleName} (₹${quote.monthlyTotalInr.toLocaleString('en-IN')}/mo) is ready for acceptance.`,
      channelSimulated: 'IN_APP',
      isRead: false,
    });

    res.status(201).json({ quote });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/quotes', async (req: Request, res: Response) => {
  const filter = req.query.businessId ? { businessId: String(req.query.businessId) } : {};
  const quotes = await QuoteModel.find(filter).sort({ createdAt: -1 });
  res.json({ quotes });
});

apiRouter.get('/quotes/:id', async (req: Request, res: Response) => {
  const quote = await QuoteModel.findOne({
    $or: [{ quoteId: req.params.id }, { businessId: req.params.id }],
  }).sort({ createdAt: -1 });
  if (!quote) {
    res.status(404).json({ error: 'Quote not found.' });
    return;
  }
  res.json({ quote });
});

async function handleAcceptQuote(req: AuthenticatedRequest, res: Response) {
  try {
    const quote = await QuoteModel.findOne({ quoteId: req.params.id });
    if (!quote) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }

    // Feasibility Guard: Block final connectivity order confirmation if feasibility is NOT_AVAILABLE
    const hasConnectivityItem = quote.items.some((i) =>
      ['P01', 'P02', 'P03', 'P04', 'P05', 'P06'].includes(i.productId)
    );
    const requestedFeasibility = req.body.feasibilityStatus || quote.feasibilityStatus;
    if (hasConnectivityItem && requestedFeasibility === 'NOT_AVAILABLE') {
      res.status(400).json({
        error:
          'FEASIBILITY RESTRICTION: Fixed-line connectivity is NOT_AVAILABLE at this address. Final order confirmation is blocked until Field Operations completes a survey or an eligible wireless alternative is selected.',
      });
      return;
    }

    // Re-validate eligibility and dependencies before accepting quote
    const biz = await BusinessModel.findOne({ businessId: quote.businessId });
    if (biz) {
      const allProducts = await ProductModel.find();
      const prodMap = new Map(allProducts.map((p) => [p.productId, p]));
      const selected = quote.items.map((i) => prodMap.get(i.productId)).filter(Boolean) as any[];
      const reval = validateBundleEligibilityAndDependencies(selected, {
        cityTier: biz.cityTier,
        employeeCount: biz.employeeCount,
        numSites: biz.numSites,
        hasGstin: biz.hasGstin,
        gstinStatus: biz.gstinVerifiedStatus,
      });
      if (!reval.valid) {
        res.status(400).json({
          error: 'Quote acceptance blocked: Business profile no longer satisfies bundle eligibility/dependencies.',
          validationErrors: reval.errors,
        });
        return;
      }
    }

    quote.status = 'ACCEPTED';
    quote.acceptedAt = new Date();
    await quote.save();

    // Create or return linked Order (Idempotent on quoteId so duplicate events never create duplicate orders)
    let order = await OrderModel.findOne({ quoteId: quote.quoteId });
    if (!order) {
      const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const expectedDate = addDaysToDateStr(DATASET_REFERENCE_DATE, quote.estimatedInstallDays);
      order = await OrderModel.create({
        orderId,
        businessId: quote.businessId,
        quoteId: quote.quoteId,
        status: 'QUOTE_ACCEPTED',
        products: quote.items,
        monthlyTotalInr: quote.monthlyTotalInr,
        setupTotalInr: quote.setupTotalInr,
        contractMonths: quote.contractMonths,
        overallInstallDays: quote.estimatedInstallDays,
        expectedInstallationDate: expectedDate,
        scheduledSlot: `${expectedDate} (10:00 AM - 01:00 PM)`,
        pendingActions: ['Complete Smart KYC document upload & registry verification'],
        processedEventKeys: [`QUOTE_ACCEPTED:${quote.quoteId}`],
      });

      await OrderStatusHistoryModel.create({
        orderId: order.orderId,
        eventType: 'QUOTE_ACCEPTED',
        previousStatus: 'NONE',
        newStatus: 'QUOTE_ACCEPTED',
        actor: req.user?.name || biz?.contactName || 'Customer',
        actorRole: req.user?.role || 'Customer',
        reason: `Accepted Quote ${quote.quoteId} with immutable price snapshot`,
        timestamp: new Date(),
      });

      await NotificationModel.create({
        notificationId: `NOTIF-${Date.now()}`,
        businessId: quote.businessId,
        type: 'QUOTE_ACCEPTED',
        title: `Quote ${quote.quoteId} Accepted — Order ${order.orderId} Created`,
        message: `Immutable price snapshot locked at ₹${quote.monthlyTotalInr.toLocaleString('en-IN')}/mo. Please complete Smart KYC to schedule installation.`,
        channelSimulated: 'WHATSAPP_SIMULATED',
        isRead: false,
      });
    }

    res.json({ quote, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

apiRouter.post('/quotes/:id/accept', optionalAuth, handleAcceptQuote);
apiRouter.patch('/quotes/:id/accept', optionalAuth, handleAcceptQuote);

async function handleRejectQuote(req: AuthenticatedRequest, res: Response) {
  const quote = await QuoteModel.findOne({ quoteId: req.params.id });
  if (!quote) {
    res.status(404).json({ error: 'Quote not found.' });
    return;
  }
  quote.status = 'REJECTED';
  quote.rejectionReason = req.body.reason || 'Customer requested bundle modification.';
  await quote.save();
  res.json({ quote });
}

apiRouter.post('/quotes/:id/reject', optionalAuth, handleRejectQuote);
apiRouter.patch('/quotes/:id/reject', optionalAuth, handleRejectQuote);

// ============================================================================
// 8. SMART KYC & MOCK GOVERNMENT REGISTRY VERIFICATION
// ============================================================================

apiRouter.get('/kyc/specimens', (_req: Request, res: Response) => {
  res.json({ specimens: Object.values(SPECIMEN_KYC_CATALOGUE) });
});

apiRouter.get('/kyc/specimen-image/:fileName', (req: Request, res: Response) => {
  const safeFile = path.basename(req.params.fileName);
  const fullPath = path.resolve(__dirname, '../../../kyc_documents', safeFile);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: `Specimen image '${safeFile}' does not exist in kyc_documents/.` });
    return;
  }
  res.sendFile(fullPath);
});

apiRouter.post('/kyc/verify/gstin', kycRateLimiter, async (req: Request, res: Response) => {
  const { gstin, businessName, address } = req.body;
  const result = await verifyGstinAgainstRegistry(gstin, businessName, address);
  res.json(result);
});
apiRouter.post('/verification/gstin', kycRateLimiter, async (req: Request, res: Response) => {
  const { gstin, businessName, address } = req.body;
  const result = await verifyGstinAgainstRegistry(gstin, businessName, address);
  res.json(result);
});

apiRouter.post('/kyc/verify/udyam', kycRateLimiter, async (req: Request, res: Response) => {
  const { udyamNumber, enterpriseName, city } = req.body;
  const result = await verifyUdyamAgainstRegistry(udyamNumber, enterpriseName, city);
  res.json(result);
});
apiRouter.post('/verification/udyam', kycRateLimiter, async (req: Request, res: Response) => {
  const { udyamNumber, enterpriseName, city } = req.body;
  const result = await verifyUdyamAgainstRegistry(udyamNumber, enterpriseName, city);
  res.json(result);
});

apiRouter.post('/kyc/consent', kycRateLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId, consentGiven, policyVersion, purposesAccepted } = req.body;
    if (!consentGiven) {
      res.status(400).json({ error: 'Explicit customer consent is mandatory before KYC document collection.' });
      return;
    }
    const consentId = `CNS-${Date.now()}`;
    const consent = await KycConsentModel.create({
      consentId,
      businessId: businessId || 'BIZ-SCEN-01',
      userId: req.user?.userId,
      policyVersion: policyVersion || 'DPDP-2026-v1.2',
      consentGiven: true,
      purposesAccepted: purposesAccepted || [
        'GSTIN & Udyam Registry Verification',
        'OCR Document Extraction & Cross-Document Validation',
        '180-Day Encrypted Compliance Retention',
      ],
      retentionDays: 180,
      timestamp: new Date(),
      ipAddress: req.ip,
    });

    await logAuditEvent({
      action: 'KYC_CONSENT_RECORDED',
      module: 'KYC',
      actorId: req.user?.email || 'customer',
      actorRole: req.user?.role || 'Customer',
      targetId: consentId,
      details: { businessId, policyVersion: consent.policyVersion },
    });

    res.status(201).json({ consent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/kyc/upload', kycRateLimiter, optionalAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId, kycId, documentType, consentId, specimenCode, rawTextHints } = req.body;
    const bId = businessId || 'BIZ-SCEN-01';

    const ownership = verifyCustomerOwnership(req, bId);
    if (!ownership.allowed) {
      res.status(403).json({ error: ownership.reason });
      return;
    }

    // Verify consent exists for business
    const hasConsent = await KycConsentModel.findOne({
      $or: [{ consentId }, { businessId: bId }],
      consentGiven: true,
    });
    if (!hasConsent) {
      res.status(403).json({
        error: 'CONSENT REQUIRED: Explicit KYC privacy consent must be recorded before uploading identity or business documents.',
      });
      return;
    }

    const file = req.file;
    const docType = (documentType || 'GST_CERTIFICATE') as
      | 'GST_CERTIFICATE'
      | 'UDYAM_CERTIFICATE'
      | 'SIGNATORY_ID'
      | 'ADDRESS_PROOF';
    const fileName = file ? file.originalname : req.body.fileName || 'uploaded_document.png';
    const mimeType = file ? file.mimetype : req.body.mimeType || 'image/png';
    const fileSizeBytes = file ? file.size : Number(req.body.fileSizeBytes || 128000);
    const storagePath = file ? file.path : path.resolve(__dirname, '../../../kyc_documents', path.basename(fileName));

    // Run Modular Document Intelligence & OCR Pipeline
    const parsedHints = typeof rawTextHints === 'string' ? JSON.parse(rawTextHints) : rawTextHints;
    const effectiveFileName = specimenCode ? `${specimenCode}_${fileName}` : fileName;
    const ocrResult = await runModularOcrPipeline({
      filePath: fs.existsSync(storagePath) ? storagePath : undefined,
      fileName: effectiveFileName,
      mimeType,
      fileSizeBytes,
      documentType: docType,
      businessContext: parsedHints,
    });

    const documentId = `DOC-${Date.now()}`;
    const doc = await KycDocumentModel.create({
      documentId,
      kycId: kycId || `KYC-${bId}`,
      businessId: bId,
      documentType: docType,
      fileName,
      specimenCode,
      mimeType,
      fileSizeBytes,
      storagePath,
      extractedFields: ocrResult.extractedFields,
      fieldConfidence: ocrResult.fieldConfidence,
      overallConfidence: ocrResult.overallConfidence,
      qualityFlags: ocrResult.qualityFlags,
    });

    res.status(201).json({ document: doc, ocrPipeline: ocrResult });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Server-side authorized access to uploaded KYC documents
apiRouter.get('/kyc/documents/:documentId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await KycDocumentModel.findOne({ documentId: req.params.documentId });
    if (!doc) {
      res.status(404).json({ error: 'KYC document not found.' });
      return;
    }

    const ownership = verifyCustomerOwnership(req, doc.businessId);
    if (!ownership.allowed) {
      res.status(403).json({ error: ownership.reason });
      return;
    }

    res.json({ document: doc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single-Document KYC Recovery Replacement Endpoint (Preserves verification history)
apiRouter.post('/kyc/:id/replace-document', kycRateLimiter, optionalAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const kycApp = await KycApplicationModel.findOne({
      $or: [{ kycId: req.params.id }, { businessId: req.params.id }],
    });
    if (!kycApp) {
      res.status(404).json({ error: 'KYC application not found.' });
      return;
    }

    const ownership = verifyCustomerOwnership(req, kycApp.businessId);
    if (!ownership.allowed) {
      res.status(403).json({ error: ownership.reason });
      return;
    }

    const {
      documentType,
      specimenCode,
      gstinInput,
      udyamInput,
      addressInput,
      addressProofDateInput,
      ocrConfidenceOverride,
      businessName,
      contactName,
    } = req.body;

    const docType = (documentType || 'GST_CERTIFICATE') as
      | 'GST_CERTIFICATE'
      | 'UDYAM_CERTIFICATE'
      | 'SIGNATORY_ID'
      | 'ADDRESS_PROOF';

    const previousDoc = await KycDocumentModel.findOne({
      kycId: kycApp.kycId,
      documentType: docType,
    }).sort({ createdAt: -1 });

    const file = req.file;
    const fileName = file ? file.originalname : req.body.fileName || `corrected_${docType.toLowerCase()}.png`;
    const mimeType = file ? file.mimetype : 'image/png';
    const fileSizeBytes = file ? file.size : 145000;
    const storagePath = file ? file.path : `/private/${fileName}`;

    const effectiveSpecCode = specimenCode || 'K03';
    const ocrResult = await runModularOcrPipeline({
      filePath: file ? file.path : undefined,
      fileName: `${effectiveSpecCode}_${fileName}`,
      mimeType,
      fileSizeBytes,
      documentType: docType,
      businessContext: {
        gstin: gstinInput,
        udyamNumber: udyamInput,
        address: addressInput,
        billDate: addressProofDateInput,
        businessName,
        contactName,
      },
    });

    const newDocumentId = `DOC-REPL-${Date.now()}`;
    const newDoc = await KycDocumentModel.create({
      documentId: newDocumentId,
      kycId: kycApp.kycId,
      businessId: kycApp.businessId,
      documentType: docType,
      fileName,
      specimenCode: specimenCode || kycApp.specimenCode,
      mimeType,
      fileSizeBytes,
      storagePath,
      extractedFields: ocrResult.extractedFields,
      fieldConfidence: ocrResult.fieldConfidence,
      overallConfidence: ocrResult.overallConfidence,
      qualityFlags: ocrResult.qualityFlags,
    });

    // Record previous verification attempt in verificationHistory before re-validating
    const historyList = Array.isArray(kycApp.verificationHistory) ? [...kycApp.verificationHistory] : [];
    historyList.push({
      attemptNumber: historyList.length + 1,
      timestamp: new Date(),
      status: kycApp.status,
      replacedDocumentType: docType,
      previousDocumentId: previousDoc?.documentId || 'SPECIMEN_INITIAL',
      newDocumentId,
      issuesCount: kycApp.crossValidationIssues?.length || 0,
      summary: `Replaced ${docType} (${previousDoc?.fileName || kycApp.specimenCode || 'previous doc'} -> ${fileName})`,
    });

    const biz = await BusinessModel.findOne({ businessId: kycApp.businessId });
    const revalidation = await runComprehensiveKycValidation({
      specimenCode: effectiveSpecCode,
      businessName: businessName || biz?.businessName || 'MSME Applicant',
      contactName: contactName || biz?.contactName,
      gstinInput: gstinInput ?? ocrResult.extractedFields.gstinNormalized ?? biz?.gstin,
      udyamInput: udyamInput ?? ocrResult.extractedFields.udyamNumber ?? biz?.udyamNumber,
      addressInput: addressInput ?? ocrResult.extractedFields.registeredAddress ?? biz?.address,
      addressProofDateInput: addressProofDateInput ?? ocrResult.extractedFields.billDate,
      ocrConfidenceOverride: ocrConfidenceOverride ?? ocrResult.overallConfidence,
    });

    kycApp.status = revalidation.determinedStatus;
    kycApp.gstinVerification = revalidation.gstinVerification;
    kycApp.udyamVerification = revalidation.udyamVerification;
    kycApp.crossValidationIssues = revalidation.crossValidationIssues;
    kycApp.addressProofAgeDays = revalidation.addressProofAgeDays;
    kycApp.recoveryPlan = revalidation.recoveryPlan;
    kycApp.verificationHistory = historyList;
    if (!kycApp.documents.includes(newDocumentId)) {
      kycApp.documents.push(newDocumentId);
    }
    await kycApp.save();

    res.json({
      kycApplication: kycApp,
      replacedDocument: newDoc,
      ocrPipeline: ocrResult,
      validation: revalidation,
      verificationHistoryCount: kycApp.verificationHistory.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/kyc/validate', kycRateLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      businessId,
      specimenCode,
      businessName,
      contactName,
      gstinInput,
      udyamInput,
      addressInput,
      addressProofDateInput,
      ocrConfidenceOverride,
      consentId,
    } = req.body;

    const bId = businessId || 'BIZ-SCEN-01';
    const ownership = verifyCustomerOwnership(req, bId);
    if (!ownership.allowed) {
      res.status(403).json({ error: ownership.reason });
      return;
    }

    const hasConsent = await KycConsentModel.findOne({
      $or: [{ consentId }, { businessId: bId }],
      consentGiven: true,
    });

    if (!hasConsent) {
      res.status(403).json({
        error: 'CONSENT REQUIRED: Explicit KYC consent must be recorded before running OCR and cross-document validation.',
      });
      return;
    }

    const biz = await BusinessModel.findOne({ businessId: bId });
    const validation = await runComprehensiveKycValidation({
      specimenCode,
      businessName: businessName || biz?.businessName || 'MSME Applicant',
      contactName: contactName || biz?.contactName,
      gstinInput: gstinInput ?? biz?.gstin,
      udyamInput: udyamInput ?? biz?.udyamNumber,
      addressInput: addressInput ?? biz?.address,
      addressProofDateInput,
      ocrConfidenceOverride,
    });

    const kycId = `KYC-${bId}`;
    const existingApp = await KycApplicationModel.findOne({ kycId });
    const historyList = Array.isArray(existingApp?.verificationHistory)
      ? [...existingApp!.verificationHistory]
      : [];
    historyList.push({
      attemptNumber: historyList.length + 1,
      timestamp: new Date(),
      status: validation.determinedStatus,
      issuesCount: validation.crossValidationIssues.length,
      summary: `Comprehensive KYC validation on ${validation.specimenCode || 'custom submission'} -> ${validation.determinedStatus}`,
    });

    const kycApp = await KycApplicationModel.findOneAndUpdate(
      { kycId },
      {
        kycId,
        businessId: bId,
        specimenCode: validation.specimenCode,
        consentId: hasConsent.consentId,
        status: validation.determinedStatus,
        gstinVerification: validation.gstinVerification,
        udyamVerification: validation.udyamVerification,
        crossValidationIssues: validation.crossValidationIssues,
        addressProofAgeDays: validation.addressProofAgeDays,
        referenceDateUsed: validation.referenceDateUsed,
        recoveryPlan: validation.recoveryPlan,
        verificationHistory: historyList,
      },
      { new: true, upsert: true }
    );

    // Update Business GSTIN/Udyam status
    if (biz) {
      biz.gstinVerifiedStatus = validation.gstinVerification.status;
      biz.udyamVerifiedStatus = validation.udyamVerification.status;
      await biz.save();
    }

    // Update linked Order if one exists
    const order = await OrderModel.findOne({ businessId: bId }).sort({ createdAt: -1 });
    if (order) {
      order.kycId = kycId;
      if (validation.determinedStatus === 'VERIFIED' && ['QUOTE_ACCEPTED', 'KYC_PENDING', 'NEEDS_CUSTOMER_ACTION'].includes(order.status)) {
        const prev = order.status;
        order.status = 'KYC_VERIFIED';
        order.pendingActions = [];
        await order.save();
        await OrderStatusHistoryModel.create({
          orderId: order.orderId,
          eventType: 'KYC_VERIFIED',
          previousStatus: prev,
          newStatus: 'KYC_VERIFIED',
          actor: 'Smart KYC Engine',
          actorRole: 'System',
          reason: `KYC ${kycId} verified cleanly`,
          timestamp: new Date(),
        });
      } else if (validation.determinedStatus === 'NEEDS_CORRECTION') {
        order.status = 'NEEDS_CUSTOMER_ACTION';
        order.pendingActions = validation.crossValidationIssues.map((i) => i.description);
        await order.save();
      } else if (validation.determinedStatus === 'MANUAL_REVIEW') {
        order.status = 'KYC_PENDING';
        order.pendingActions = ['Awaiting human KYC Reviewer decision'];
        await order.save();
      }
    }

    await NotificationModel.create({
      notificationId: `NOTIF-${Date.now()}`,
      businessId: bId,
      type: `KYC_${validation.determinedStatus}`,
      title: `Smart KYC Result: ${validation.determinedStatus}`,
      message:
        validation.determinedStatus === 'VERIFIED'
          ? 'Your GSTIN, Udyam & Address Proof passed cross-document verification.'
          : `KYC status is ${validation.determinedStatus} (${validation.crossValidationIssues.length} flag(s) detected).`,
      channelSimulated: 'IN_APP',
      isRead: false,
    });

    res.json({ kycApplication: kycApp, validation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Data Isolation on KYC Status endpoint
apiRouter.get('/kyc/:id/status', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const kycApp = await KycApplicationModel.findOne({
    $or: [{ kycId: req.params.id }, { businessId: req.params.id }],
  });
  if (!kycApp) {
    res.status(404).json({ error: 'KYC application not found.' });
    return;
  }

  // Enforce Customer Isolation using server-side JWT claim or explicit isolation header
  const ownership = verifyCustomerOwnership(req, kycApp.businessId);
  if (!ownership.allowed) {
    res.status(403).json({
      error: ownership.reason || 'DATA ISOLATION VIOLATION: Customers cannot access another business customer’s KYC application or identity documents.',
    });
    return;
  }

  const documents = await KycDocumentModel.find({ kycId: kycApp.kycId });
  res.json({ kycApplication: kycApp, documents });
});

apiRouter.get(
  '/kyc/queue',
  authenticate,
  requireRole(['KYC Reviewer', 'Admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    const applications = await KycApplicationModel.find().sort({ updatedAt: -1 });
    res.json({ applications });
  }
);

apiRouter.post(
  '/kyc/:id/review',
  authenticate,
  requireRole(['KYC Reviewer', 'Admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { decision, notes } = req.body; // 'VERIFIED' | 'NEEDS_CORRECTION' | 'REJECTED'
      if (!['VERIFIED', 'NEEDS_CORRECTION', 'REJECTED'].includes(decision)) {
        res.status(400).json({ error: 'Decision must be VERIFIED, NEEDS_CORRECTION, or REJECTED.' });
        return;
      }
      const kycApp = await KycApplicationModel.findOne({
        $or: [{ kycId: req.params.id }, { businessId: req.params.id }],
      });
      if (!kycApp) {
        res.status(404).json({ error: 'KYC application not found.' });
        return;
      }

      const prevStatus = kycApp.status;
      kycApp.status = decision;
      kycApp.reviewerNotes = notes || `Reviewed by ${req.user!.name}`;
      kycApp.reviewedBy = req.user!.name;
      kycApp.reviewedAt = new Date();
      await kycApp.save();

      await logAuditEvent({
        action: `KYC_REVIEW_${decision}`,
        module: 'KYC_REVIEW',
        actorId: req.user!.email,
        actorRole: req.user!.role,
        targetId: kycApp.kycId,
        details: { previousStatus: prevStatus, newStatus: decision, notes },
      });

      // Sync linked Order if KYC is approved by reviewer
      const order = await OrderModel.findOne({ businessId: kycApp.businessId }).sort({ createdAt: -1 });
      if (order && decision === 'VERIFIED') {
        const oldOrderStatus = order.status;
        order.status = 'KYC_VERIFIED';
        order.pendingActions = [];
        await order.save();
        await OrderStatusHistoryModel.create({
          orderId: order.orderId,
          eventType: 'KYC_VERIFIED_BY_REVIEWER',
          previousStatus: oldOrderStatus,
          newStatus: 'KYC_VERIFIED',
          actor: req.user!.name,
          actorRole: req.user!.role,
          reason: notes || 'Approved by human KYC Reviewer',
          timestamp: new Date(),
        });
      }

      await NotificationModel.create({
        notificationId: `NOTIF-${Date.now()}`,
        businessId: kycApp.businessId,
        type: `KYC_REVIEW_${decision}`,
        title: `KYC Review Decision: ${decision}`,
        message: `KYC Reviewer (${req.user!.name}) updated your application status to ${decision}. Note: ${notes || 'Verified'}`,
        channelSimulated: 'IN_APP',
        isRead: false,
      });

      res.json({ kycApplication: kycApp });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ============================================================================
// 9. EVENT-DRIVEN ORDER & INSTALLATION TRACKER
// ============================================================================

apiRouter.get('/orders', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const filter = req.query.businessId ? { businessId: String(req.query.businessId) } : {};
  if (req.query.businessId) {
    const ownership = verifyCustomerOwnership(req, String(req.query.businessId));
    if (!ownership.allowed) {
      res.status(403).json({ error: ownership.reason });
      return;
    }
  }
  const orders = await OrderModel.find(filter).sort({ createdAt: -1 });
  res.json({ orders });
});

apiRouter.get('/orders/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const order = await OrderModel.findOne({
    $or: [{ orderId: req.params.id }, { businessId: req.params.id }],
  }).sort({ createdAt: -1 });
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  const ownership = verifyCustomerOwnership(req, order.businessId);
  if (!ownership.allowed) {
    res.status(403).json({ error: ownership.reason });
    return;
  }
  const history = await OrderStatusHistoryModel.find({ orderId: order.orderId }).sort({ timestamp: 1 });
  const installation = await InstallationModel.findOne({ orderId: order.orderId });
  res.json({ order, history, installation });
});

apiRouter.patch(
  '/orders/:id/status',
  authenticate,
  requireRole(['Admin', 'Sales Executive', 'KYC Reviewer']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { newStatus, eventType, reason, eventKey, scheduledSlot } = req.body;
      const order = await OrderModel.findOne({ orderId: req.params.id });
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      // Prevent duplicate event processing
      if (eventKey && order.processedEventKeys.includes(eventKey)) {
        res.status(409).json({
          error: `Duplicate event key '${eventKey}' rejected: Event has already been processed.`,
          order,
        });
        return;
      }

      const transition = validateOrderStateTransition(order.status, newStatus as OrderStatus);
      if (!transition.valid) {
        res.status(400).json({ error: transition.reason });
        return;
      }

      const previousStatus = order.status;
      order.status = newStatus as OrderStatus;
      if (scheduledSlot) {
        order.scheduledSlot = scheduledSlot;
      }
      if (newStatus === 'ACTIVATED') {
        order.actualActivationDate = DATASET_REFERENCE_DATE;
        order.pendingActions = [];
      }
      if (eventKey) {
        order.processedEventKeys.push(eventKey);
      }
      await order.save();

      const historyEntry = await OrderStatusHistoryModel.create({
        orderId: order.orderId,
        eventType: eventType || `STATUS_${newStatus}`,
        previousStatus,
        newStatus,
        actor: req.user!.name,
        actorRole: req.user!.role,
        reason: reason || `Order transitioned from ${previousStatus} to ${newStatus}`,
        timestamp: new Date(),
      });

      await logAuditEvent({
        action: 'ORDER_STATUS_TRANSITION',
        module: 'ORDERS',
        actorId: req.user!.email,
        actorRole: req.user!.role,
        targetId: order.orderId,
        details: { previousStatus, newStatus, reason },
      });

      await NotificationModel.create({
        notificationId: `NOTIF-${Date.now()}`,
        businessId: order.businessId,
        type: `ORDER_${newStatus}`,
        title: `Order ${order.orderId} Status: ${newStatus}`,
        message: reason || `Your order status was updated to ${newStatus}.`,
        channelSimulated: 'WHATSAPP_SIMULATED',
        isRead: false,
      });

      res.json({ order, historyEntry });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ============================================================================
// 10. INTELLIGENT HUMAN HANDOFF, LEADS & PARTNER MANAGEMENT
// ============================================================================

apiRouter.post('/handoff', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      businessId,
      businessName,
      businessType,
      segment,
      city,
      cityTier,
      employeeCount,
      numSites,
      budgetInr,
      preferredLanguage,
      handoffReason,
      conversationSummary,
      unresolvedQuestions,
      recommendedProductsAttempted,
      customerPainPoints,
      eligibleAndIneligibleNotes,
      slaMinutes,
    } = req.body;

    const biz = businessId ? await BusinessModel.findOne({ businessId }) : null;
    const leadId = `HND-${Date.now()}`;

    const prop = calculateLeadPropensity({
      leadSource: 'Website form',
      segment: segment || biz?.segment || 'Small multi-site businesses',
      cityTier: Number(cityTier || biz?.cityTier || 1),
      employeeCount: Number(employeeCount || biz?.employeeCount || 15),
      numSites: Number(numSites || biz?.numSites || 2),
      hasGstin: biz?.hasGstin ?? true,
      hasUdyam: biz?.hasUdyam ?? true,
      currentInternet: biz?.currentInternet || 'Business broadband',
      currentProvider: biz?.currentProvider || 'Competitor A',
      monthlyTelecomSpendInr: Number(budgetInr || biz?.monthlyTelecomSpendInr || 8000),
      preferredLanguage: preferredLanguage || biz?.preferredLanguage || 'English',
    });

    const now = new Date();
    const slaMins = Number(slaMinutes || (prop.priority === 'HIGH' ? 15 : 30));
    const slaDeadlineAt = new Date(now.getTime() + slaMins * 60 * 1000);

    const handoffLead = await LeadModel.create({
      leadId,
      isHistorical: false,
      createdDate: DATASET_REFERENCE_DATE,
      leadSource: 'Website form',
      businessName: businessName || biz?.businessName || 'Escalated MSME Lead',
      businessType: businessType || biz?.businessType || 'Commercial Business',
      segment: segment || biz?.segment || 'Small multi-site businesses',
      city: city || biz?.city || 'Mumbai',
      cityTier: Number(cityTier || biz?.cityTier || 1),
      state: biz?.state || 'Maharashtra',
      preferredLanguage: preferredLanguage || biz?.preferredLanguage || 'English',
      employeeCount: Number(employeeCount || biz?.employeeCount || 15),
      numSites: Number(numSites || biz?.numSites || 2),
      hasGstin: biz?.hasGstin ?? true,
      gstin: biz?.gstin,
      hasUdyam: biz?.hasUdyam ?? false,
      udyamNumber: biz?.udyamNumber,
      currentInternet: biz?.currentInternet || 'Business broadband',
      currentProvider: biz?.currentProvider || 'Competitor A',
      monthlyTelecomSpendInr: Number(budgetInr || biz?.monthlyTelecomSpendInr || 8000),
      productsOfInterest: recommendedProductsAttempted || ['P02', 'P09'],
      contactName: biz?.contactName || 'Business Owner',
      contactRole: biz?.contactRole || 'Owner',
      stageReached: 'Needs assessed',
      outcome: 'Active Handoff',
      handoffReason: handoffReason || 'Customer requested human sales assistance for custom bundle.',
      handoffStatus: 'AWAITING_ASSIGNMENT',
      handoffCreatedAt: now,
      slaMinutes: slaMins,
      slaDeadlineAt,
      handoffOutcome: 'PENDING',
      customerPainPoints: customerPainPoints || [
        'Multi-site connectivity coordination',
        'Custom SLA & static IP architecture validation',
      ],
      eligibleAndIneligibleNotes: eligibleAndIneligibleNotes || [
        'Eligible for P02 Biz Fibre 300 & P09 Site-to-Site VPN',
        'P10 Managed SD-WAN requires >= 10 employees & >= 3 sites',
      ],
      conversationSummary:
        conversationSummary ||
        'Structured handoff created by AI Business Advisor with complete requirement snapshot.',
      unresolvedQuestions: unresolvedQuestions || ['Requires custom SLA or multi-site validation'],
      recommendedProductsAttempted: recommendedProductsAttempted || ['P02', 'P09'],
      propensityScore: prop.conversionProbabilityPct,
      propensityPriority: prop.priority,
      propensityReasons: prop.reasons,
      suggestedNextAction: prop.suggestedNextAction,
      followUpNotes: [
        {
          author: 'AI Advisor Handoff Engine',
          note: `Context preserved with ${slaMins}-min SLA target so customer does not repeat firmographic or requirement details.`,
          timestamp: now,
        },
      ],
    });

    res.status(201).json({ handoff: handoffLead, propensityDetails: prop });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/handoff', async (_req: Request, res: Response) => {
  const handoffs = await LeadModel.find({ isHistorical: false }).sort({ createdAt: -1 }).lean();
  const nowMs = Date.now();
  const enriched = handoffs.map((h) => {
    const deadlineMs = h.slaDeadlineAt ? new Date(h.slaDeadlineAt).getTime() : nowMs + 20 * 60 * 1000;
    const remainingMins = Math.round((deadlineMs - nowMs) / 60000);
    const slaStatus =
      h.handoffStatus === 'RESOLVED'
        ? 'MET'
        : remainingMins < 0
        ? 'BREACHED'
        : remainingMins <= 10
        ? 'AT_RISK'
        : 'ON_TRACK';
    return {
      ...h,
      slaRemainingMinutes: remainingMins,
      slaStatus,
    };
  });
  res.json({ handoffs: enriched });
});

async function assignHandoffLead(req: AuthenticatedRequest, res: Response) {
  try {
    const { assignedToUserId, assignedToName, assignedRole, handoffStatus, note } = req.body;
    const lead = await LeadModel.findOne({ leadId: req.params.id });
    if (!lead) {
      res.status(404).json({ error: 'Lead / Handoff not found.' });
      return;
    }

    lead.assignedToUserId = assignedToUserId || lead.assignedToUserId || 'EXEC-01';
    lead.assignedToName = assignedToName || lead.assignedToName || 'Rohan Deshmukh (Enterprise Sales)';
    lead.assignedRole = assignedRole || lead.assignedRole || 'Sales Executive';
    lead.handoffStatus = handoffStatus || 'ASSIGNED';
    if (handoffStatus === 'ACCEPTED') {
      lead.acceptedAt = new Date();
    } else if (handoffStatus === 'ESCALATED') {
      lead.escalatedAt = new Date();
    }
    if (note) {
      lead.followUpNotes = lead.followUpNotes || [];
      lead.followUpNotes.push({
        author: req.user?.name || 'Admin',
        note,
        timestamp: new Date(),
      });
    }
    await lead.save();

    await logAuditEvent({
      action: `HANDOFF_LEAD_${lead.handoffStatus}`,
      module: 'SALES_HANDOFF',
      actorId: req.user?.email || 'admin',
      actorRole: req.user?.role || 'Admin',
      targetId: lead.leadId,
      details: { assignedToName: lead.assignedToName, handoffStatus: lead.handoffStatus },
    });

    res.json({ lead });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

apiRouter.patch(
  '/handoff/:id/assign',
  authenticate,
  requireRole(['Admin', 'Sales Executive', 'Channel Partner']),
  assignHandoffLead
);
apiRouter.patch(
  '/partners/leads/:id/assign',
  authenticate,
  requireRole(['Admin', 'Sales Executive', 'Channel Partner']),
  assignHandoffLead
);

apiRouter.post(
  '/handoff/:id/outcome',
  authenticate,
  requireRole(['Admin', 'Sales Executive', 'Channel Partner']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { outcome, outcomeNotes, escalate } = req.body;
      const lead = await LeadModel.findOne({ leadId: req.params.id });
      if (!lead) {
        res.status(404).json({ error: 'Handoff lead not found.' });
        return;
      }

      if (escalate) {
        lead.handoffStatus = 'ESCALATED';
        lead.escalatedAt = new Date();
        lead.followUpNotes = lead.followUpNotes || [];
        lead.followUpNotes.push({
          author: req.user?.name || 'Sales Specialist',
          note: `ESCALATED TO REGIONAL SALES HEAD: ${outcomeNotes || 'Requires custom enterprise pricing approval'}`,
          timestamp: new Date(),
        });
      } else {
        lead.handoffOutcome = outcome || 'CONVERTED';
        lead.outcomeNotes = outcomeNotes || 'Resolved by human sales specialist.';
        lead.handoffStatus = 'RESOLVED';
        lead.outcome = outcome === 'CONVERTED' ? 'Activated' : outcome || 'Resolved';
        lead.followUpNotes = lead.followUpNotes || [];
        lead.followUpNotes.push({
          author: req.user?.name || 'Sales Specialist',
          note: `HANDOFF OUTCOME (${lead.handoffOutcome}): ${lead.outcomeNotes}`,
          timestamp: new Date(),
        });
      }

      await lead.save();
      res.json({ lead });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

apiRouter.get('/leads', async (req: Request, res: Response) => {
  try {
    const { isHistorical, segment, city, stageReached, leadSource, priority, limit = '50' } = req.query;
    const query: Record<string, any> = {};
    if (isHistorical !== undefined) {
      query.isHistorical = isHistorical === 'true';
    }
    if (segment) query.segment = segment;
    if (city) query.city = city;
    if (stageReached) query.stageReached = stageReached;
    if (leadSource) query.leadSource = leadSource;
    if (priority) query.propensityPriority = priority;

    const leads = await LeadModel.find(query)
      .sort({ isHistorical: 1, propensityScore: -1, leadId: 1 })
      .limit(Math.min(200, Number(limit) || 50))
      .lean();

    const enriched = leads.map((l) => {
      const prop = calculateLeadPropensity({
        leadSource: l.leadSource,
        segment: l.segment,
        cityTier: l.cityTier,
        employeeCount: l.employeeCount,
        numSites: l.numSites,
        hasGstin: l.hasGstin,
        hasUdyam: l.hasUdyam,
        currentInternet: l.currentInternet,
        currentProvider: l.currentProvider,
        monthlyTelecomSpendInr: l.monthlyTelecomSpendInr,
        preferredLanguage: l.preferredLanguage,
        productsOfInterestCount: l.productsOfInterest?.length || 1,
      });
      return {
        ...l,
        propensityScore: l.propensityScore ?? prop.conversionProbabilityPct,
        calibratedProbabilityPct: prop.calibratedProbabilityPct,
        heuristicScorePct: prop.heuristicScorePct,
        propensityPriority: l.propensityPriority ?? prop.priority,
        propensityReasons: l.propensityReasons?.length ? l.propensityReasons : prop.reasons,
        positiveFactors: prop.positiveFactors,
        negativeFactors: prop.negativeFactors,
        suggestedNextAction: l.suggestedNextAction || prop.suggestedNextAction,
        modelType: prop.modelMetadata.algorithm,
      };
    });

    res.json({ leads: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/partners', async (_req: Request, res: Response) => {
  const partners = await PartnerModel.find();
  res.json({ partners });
});

apiRouter.get('/partners/leads', async (_req: Request, res: Response) => {
  const liveHandoffs = await LeadModel.find({ isHistorical: false }).sort({ createdAt: -1 });
  const partnerHistorical = await LeadModel.find({
    isHistorical: true,
    leadSource: 'Channel partner',
  })
    .limit(30)
    .lean();
  res.json({ liveHandoffs, partnerHistorical });
});

// ============================================================================
// 11. POST-ACTIVATION SUPPORT, NOTIFICATIONS, REFERRALS & AUDIT LOGS
// ============================================================================

apiRouter.get('/support/tickets', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const filter: Record<string, any> = {};
  if (req.query.businessId) {
    filter.businessId = String(req.query.businessId);
  }
  const tickets = await SupportTicketModel.find(filter).sort({ createdAt: -1 });
  res.json({ tickets });
});

apiRouter.post('/support/tickets', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId, orderId, category, subject, description, priority } = req.body;
    if (!subject || !description) {
      res.status(400).json({ error: 'Ticket subject and description are required.' });
      return;
    }
    const ticketId = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const bId = businessId || 'BIZ-SCEN-08';

    const ticket = await SupportTicketModel.create({
      ticketId,
      businessId: bId,
      orderId,
      category: category || 'CONNECTIVITY_ISSUE',
      subject,
      description,
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      statusHistory: [
        {
          status: 'OPEN',
          note: 'Support ticket confirmed and logged in backend.',
          actor: req.user?.name || 'Customer',
          timestamp: new Date(),
        },
      ],
    });

    await NotificationModel.create({
      notificationId: `NOTIF-${Date.now()}`,
      businessId: bId,
      type: 'SUPPORT_TICKET_CREATED',
      title: `Support Ticket ${ticketId} Logged`,
      message: `Ticket '${subject}' (${ticket.category}) is OPEN and assigned to Enterprise Care.`,
      channelSimulated: 'IN_APP',
      isRead: false,
    });

    res.status(201).json({ ticket, backendConfirmed: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/support/tickets/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, note } = req.body;
    const ticket = await SupportTicketModel.findOne({ ticketId: req.params.id });
    if (!ticket) {
      res.status(404).json({ error: 'Support ticket not found.' });
      return;
    }
    ticket.status = status || ticket.status;
    ticket.statusHistory.push({
      status: ticket.status,
      note: note || `Updated to ${ticket.status}`,
      actor: req.user?.name || 'Support Agent',
      timestamp: new Date(),
    });
    await ticket.save();
    res.json({ ticket });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/notifications', async (req: Request, res: Response) => {
  const filter = req.query.businessId ? { businessId: String(req.query.businessId) } : {};
  const notifications = await NotificationModel.find(filter).sort({ createdAt: -1 }).limit(30);
  res.json({ notifications });
});

apiRouter.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  const notif = await NotificationModel.findOneAndUpdate(
    { notificationId: req.params.id },
    { $set: { isRead: true } },
    { new: true }
  );
  res.json({ notification: notif });
});

apiRouter.get('/referrals', async (_req: Request, res: Response) => {
  const referrals = await ReferralModel.find().sort({ createdAt: -1 });
  res.json({ referrals });
});

apiRouter.post('/referrals', async (req: Request, res: Response) => {
  const { referrerBusinessId, referrerName, referredBusinessName, referredContactPhone, city } = req.body;
  const referralCode = `UDYAM-REF-${Math.floor(1000 + Math.random() * 9000)}`;
  const ref = await ReferralModel.create({
    referralCode,
    referrerBusinessId: referrerBusinessId || 'BIZ-SCEN-01',
    referrerName: referrerName || 'Saffron Bakers',
    referredBusinessName,
    referredContactPhone,
    city: city || 'Ludhiana',
    status: 'INVITED',
    rewardAmountInr: 1000,
  });
  res.status(201).json({ referral: ref });
});

apiRouter.get('/audit-logs', async (_req: Request, res: Response) => {
  const logs = await AuditLogModel.find().sort({ timestamp: -1 }).limit(100);
  res.json({ logs });
});

// ============================================================================
// 12. ADMIN BUSINESS ANALYTICS (STRICTLY SEPARATING HISTORICAL vs LIVE)
// ============================================================================

apiRouter.get('/analytics/overview', async (_req: Request, res: Response) => {
  try {
    const [
      totalHistoricalLeads,
      activatedLeads,
      bySource,
      bySegment,
      byCity,
      byLanguage,
      byBusinessType,
      gstinVsConversion,
      liveBusinessesCount,
      liveQuotesCount,
      liveOrdersCount,
      liveKycCount,
      liveHandoffsCount,
    ] = await Promise.all([
      LeadModel.countDocuments({ isHistorical: true }),
      LeadModel.find({ isHistorical: true, outcome: 'Activated' }).lean(),
      LeadModel.aggregate([
        { $match: { isHistorical: true } },
        {
          $group: {
            _id: '$leadSource',
            count: { $sum: 1 },
            activated: { $sum: { $cond: [{ $eq: ['$outcome', 'Activated'] }, 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
      ]),
      LeadModel.aggregate([
        { $match: { isHistorical: true } },
        {
          $group: {
            _id: '$segment',
            count: { $sum: 1 },
            activated: { $sum: { $cond: [{ $eq: ['$outcome', 'Activated'] }, 1, 0] } },
            avgMonthlySpend: { $avg: '$monthlyTelecomSpendInr' },
            activatedRevenue: { $sum: { $ifNull: ['$monthlyBundleValueInr', 0] } },
          },
        },
        { $sort: { count: -1 } },
      ]),
      LeadModel.aggregate([
        { $match: { isHistorical: true } },
        {
          $group: {
            _id: { city: '$city', tier: '$cityTier' },
            count: { $sum: 1 },
            activated: { $sum: { $cond: [{ $eq: ['$outcome', 'Activated'] }, 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
      ]),
      LeadModel.aggregate([
        { $match: { isHistorical: true } },
        { $group: { _id: '$preferredLanguage', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      LeadModel.aggregate([
        { $match: { isHistorical: true } },
        { $group: { _id: '$businessType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),
      LeadModel.aggregate([
        { $match: { isHistorical: true } },
        {
          $group: {
            _id: '$hasGstin',
            total: { $sum: 1 },
            activated: { $sum: { $cond: [{ $eq: ['$outcome', 'Activated'] }, 1, 0] } },
          },
        },
      ]),
      BusinessModel.countDocuments(),
      QuoteModel.countDocuments(),
      OrderModel.countDocuments(),
      KycApplicationModel.countDocuments(),
      LeadModel.countDocuments({ isHistorical: false }),
    ]);

    const totalAcqSpendAgg = await LeadModel.aggregate([
      { $match: { isHistorical: true } },
      { $group: { _id: null, totalSpend: { $sum: '$acquisitionCostInr' } } },
    ]);
    const totalAcqSpend = totalAcqSpendAgg[0]?.totalSpend || 0;

    const actCount = activatedLeads.length || 1;
    const totalMonthlyActivatedRevenue = activatedLeads.reduce(
      (s, l) => s + (l.monthlyBundleValueInr || 0),
      0
    );
    const avgBundleValueInr = Number((totalMonthlyActivatedRevenue / actCount).toFixed(2));
    const avgActivationDays = Number(
      (
        activatedLeads.reduce((s, l) => s + (l.daysLeadToActivation || 0), 0) / actCount
      ).toFixed(2)
    );
    const avgNps = Number(
      (activatedLeads.reduce((s, l) => s + (l.npsScore || 0), 0) / actCount).toFixed(2)
    );
    const churnedCount = activatedLeads.filter((l) => l.churnedWithin6Months === 'Y').length;
    const churnRatePct = Number(((churnedCount / actCount) * 100).toFixed(2));
    const blendedCacInr = Math.round(totalAcqSpend / actCount);

    // Calculate product popularity from bundle_products in activated leads
    const prodCounts: Record<string, number> = {};
    for (const l of activatedLeads) {
      if (!l.bundleProducts) continue;
      for (const part of l.bundleProducts.split(';')) {
        const pid = part.split('x')[0]?.trim();
        if (pid) prodCounts[pid] = (prodCounts[pid] || 0) + 1;
      }
    }
    const productPopularity = Object.entries(prodCounts)
      .map(([productId, count]) => ({ productId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      datasetSeparationNotice:
        'Historical Q2 2026 Dataset Metrics (5,000 rows from smb_leads.csv) are strictly separated from Live Prototype Session Metrics.',
      historicalMetrics: {
        totalLeads: totalHistoricalLeads,
        activatedCount: activatedLeads.length,
        overallConversionRatePct: Number(
          ((activatedLeads.length / Math.max(1, totalHistoricalLeads)) * 100).toFixed(2)
        ),
        avgBundleValueInr,
        totalMonthlyActivatedRevenueInr: totalMonthlyActivatedRevenue,
        avgActivationDays,
        blendedCacInr,
        churnRatePct,
        avgNps,
        leadSourceDistribution: bySource.map((s) => ({
          source: s._id,
          leads: s.count,
          activated: s.activated,
          conversionPct: Number(((s.activated / s.count) * 100).toFixed(1)),
        })),
        segmentDistribution: bySegment.map((s) => ({
          segment: s._id,
          leads: s.count,
          activated: s.activated,
          conversionPct: Number(((s.activated / s.count) * 100).toFixed(1)),
          avgMonthlySpendInr: Math.round(s.avgMonthlySpend || 0),
          activatedRevenueInr: s.activatedRevenue,
        })),
        cityDistribution: byCity.map((c) => ({
          city: c._id.city,
          cityTier: c._id.tier,
          leads: c.count,
          activated: c.activated,
        })),
        languageDistribution: byLanguage.map((l) => ({
          language: l._id,
          leads: l.count,
        })),
        topBusinessTypes: byBusinessType.map((b) => ({
          businessType: b._id,
          leads: b.count,
        })),
        gstinVsConversion: gstinVsConversion.map((g) => ({
          hasGstin: g._id ? 'GSTIN Available' : 'No GSTIN',
          total: g.total,
          activated: g.activated,
          conversionPct: Number(((g.activated / g.total) * 100).toFixed(2)),
        })),
        productPopularity,
      },
      livePrototypeMetrics: {
        activeBusinesses: liveBusinessesCount,
        quotesGenerated: liveQuotesCount,
        ordersCreated: liveOrdersCount,
        kycApplicationsProcessed: liveKycCount,
        liveHandoffLeads: liveHandoffsCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/analytics/funnel', async (_req: Request, res: Response) => {
  try {
    const [total, contacted, needsAssessed, quoteAccepted, kycComplete, activated] =
      await Promise.all([
        LeadModel.countDocuments({ isHistorical: true }),
        LeadModel.countDocuments({ isHistorical: true, contactedDate: { $exists: true, $ne: '' } }),
        LeadModel.countDocuments({ isHistorical: true, needsAssessedDate: { $exists: true, $ne: '' } }),
        LeadModel.countDocuments({ isHistorical: true, quoteAcceptedDate: { $exists: true, $ne: '' } }),
        LeadModel.countDocuments({ isHistorical: true, kycCompleteDate: { $exists: true, $ne: '' } }),
        LeadModel.countDocuments({ isHistorical: true, outcome: 'Activated' }),
      ]);

    const stages = [
      { stage: 'Lead Generated', count: total, prevStageConversionPct: 100, overallPct: 100 },
      {
        stage: 'Contacted',
        count: contacted,
        prevStageConversionPct: Number(((contacted / Math.max(1, total)) * 100).toFixed(1)),
        overallPct: Number(((contacted / Math.max(1, total)) * 100).toFixed(1)),
      },
      {
        stage: 'Needs Assessed',
        count: needsAssessed,
        prevStageConversionPct: Number(((needsAssessed / Math.max(1, contacted)) * 100).toFixed(1)),
        overallPct: Number(((needsAssessed / Math.max(1, total)) * 100).toFixed(1)),
      },
      {
        stage: 'Quote Accepted',
        count: quoteAccepted,
        prevStageConversionPct: Number(((quoteAccepted / Math.max(1, needsAssessed)) * 100).toFixed(1)),
        overallPct: Number(((quoteAccepted / Math.max(1, total)) * 100).toFixed(1)),
      },
      {
        stage: 'KYC Completed',
        count: kycComplete,
        prevStageConversionPct: Number(((kycComplete / Math.max(1, quoteAccepted)) * 100).toFixed(1)),
        overallPct: Number(((kycComplete / Math.max(1, total)) * 100).toFixed(1)),
      },
      {
        stage: 'Activated',
        count: activated,
        prevStageConversionPct: Number(((activated / Math.max(1, kycComplete)) * 100).toFixed(1)),
        overallPct: Number(((activated / Math.max(1, total)) * 100).toFixed(2)),
      },
    ];

    res.json({ funnel: stages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/analytics/segments', async (_req: Request, res: Response) => {
  const segments = await LeadModel.aggregate([
    { $match: { isHistorical: true } },
    {
      $group: {
        _id: '$segment',
        leads: { $sum: 1 },
        activated: { $sum: { $cond: [{ $eq: ['$outcome', 'Activated'] }, 1, 0] } },
        avgSpend: { $avg: '$monthlyTelecomSpendInr' },
        activatedMonthlyRev: { $sum: { $ifNull: ['$monthlyBundleValueInr', 0] } },
      },
    },
    { $sort: { leads: -1 } },
  ]);
  res.json({ segments });
});

apiRouter.get('/analytics/drop-reasons', async (_req: Request, res: Response) => {
  const dropReasons = await LeadModel.aggregate([
    { $match: { isHistorical: true, outcome: 'Dropped', dropReason: { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: { reason: '$dropReason', stage: '$stageReached' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const byReasonAgg = await LeadModel.aggregate([
    { $match: { isHistorical: true, outcome: 'Dropped', dropReason: { $exists: true, $ne: '' } } },
    { $group: { _id: '$dropReason', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  res.json({
    dropReasons: byReasonAgg.map((r) => ({ reason: r._id, count: r.count })),
    dropByStage: dropReasons.map((d) => ({
      reason: d._id.reason,
      stage: d._id.stage,
      count: d.count,
    })),
  });
});

// ============================================================================
// 13. AI QUALITY & EVALUATION SUITE
// ============================================================================

apiRouter.post('/ai-evaluation/run', async (_req: Request, res: Response) => {
  try {
    const result = await runAiEvaluationSuite();
    const saved = await AiEvaluationModel.create({
      evalRunId: `EVAL-${Date.now()}`,
      ...result,
      runAt: new Date(),
    });
    res.json({ evaluation: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/ai-evaluation/results', async (_req: Request, res: Response) => {
  let latest = await AiEvaluationModel.findOne().sort({ runAt: -1 });
  if (!latest) {
    const result = await runAiEvaluationSuite();
    latest = await AiEvaluationModel.create({
      evalRunId: `EVAL-${Date.now()}`,
      ...result,
      runAt: new Date(),
    });
  }
  res.json({ evaluation: latest });
});

// ============================================================================
// 14. ADVANCED DIFFERENTIATORS: DIGITAL TWIN, COUNTERFACTUALS, ML, SEGMENTS,
//     INTEGRATION READINESS & COMMERCIAL IMPACT SIMULATOR
// ============================================================================

apiRouter.get('/digital-twin/:businessId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const businessId = req.params.businessId || 'BIZ-SCEN-01';
    const ownership = verifyCustomerOwnership(req, businessId);
    if (!ownership.allowed) {
      res.status(403).json({ error: ownership.reason });
      return;
    }
    const simulatedProductIds = req.query.products
      ? String(req.query.products).split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const targetTier = req.query.targetTier as 'Essential' | 'Recommended' | 'Advanced' | undefined;
    const twin = await generateBusinessDigitalTwin({
      businessId,
      customProductIds: simulatedProductIds,
      targetTier,
    });
    res.json({ digitalTwin: twin });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/digital-twin/simulate', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { businessId, productIds, targetTier, answersOverride, profileOverride } = req.body;
    const bId = businessId || 'BIZ-SCEN-01';
    const ownership = verifyCustomerOwnership(req, bId);
    if (!ownership.allowed) {
      res.status(403).json({ error: ownership.reason });
      return;
    }
    const twin = await generateBusinessDigitalTwin({
      businessId: bId,
      customProductIds: Array.isArray(productIds) ? productIds : undefined,
      targetTier,
      answersOverride,
      profileOverride,
    });
    res.json({ digitalTwin: twin });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/products/recommend/counterfactual', async (req: Request, res: Response) => {
  try {
    const { businessId, fromTier, toTier, requirements, budgetInr } = req.body;
    const biz = businessId ? await BusinessModel.findOne({ businessId }) : null;
    const recResult = await generateCatalogueRecommendations({
      cityTier: biz?.cityTier || 1,
      employeeCount: biz?.employeeCount || 8,
      numSites: biz?.numSites || 1,
      hasGstin: biz?.hasGstin ?? true,
      gstinStatus: biz?.gstinVerifiedStatus || 'ACTIVE',
      segment: biz?.segment || 'Micro retail & services',
      businessType: biz?.businessType || 'Retail shop',
      requirements: requirements || ['reliable_internet', 'pos_billing', 'whatsapp_business'],
      budgetInr: Number(budgetInr || biz?.monthlyTelecomSpendInr || 3500),
    });

    const fromBundle = recResult.bundles.find((b) => b.tier === (fromTier || 'Recommended')) || recResult.bundles[1];
    const toBundle = recResult.bundles.find((b) => b.tier === (toTier || 'Essential')) || recResult.bundles[0];

    const comparison = generateCounterfactualComparison(fromBundle as any, toBundle as any);
    res.json({
      comparison,
      allComparisons: recResult.counterfactualComparisons,
      recommendationArchetypes: recResult.recommendationArchetypes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/products/recommend/evaluate', async (_req: Request, res: Response) => {
  try {
    const evaluation = await runRecommendationEvaluationSuite();
    res.json(evaluation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/ml/propensity-evaluation', (_req: Request, res: Response) => {
  const metadata = getPropensityModelEvaluation();
  res.json(metadata);
});

apiRouter.get('/analytics/segment-intelligence', async (_req: Request, res: Response) => {
  try {
    const intel = await computeSegmentIntelligence();
    res.json(intel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/analytics/commercial-simulator', async (req: Request, res: Response) => {
  try {
    const result = await runCommercialImpactSimulation({
      cohortLeadVolume: req.query.cohortLeadVolume ? Number(req.query.cohortLeadVolume) : undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/analytics/commercial-simulator', async (req: Request, res: Response) => {
  try {
    const result = await runCommercialImpactSimulation(req.body || {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/admin/integrations', (_req: Request, res: Response) => {
  const readiness = getProductionIntegrationReadiness();
  res.json(readiness);
});
