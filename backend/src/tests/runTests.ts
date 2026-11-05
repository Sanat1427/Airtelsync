import assert from 'assert';
import http from 'http';
import { app } from '../index';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { ensureSeeded } from '../services/demoScenarioSeeder';
import {
  ProductModel,
  GstRegistrationModel,
  UdyamRegistrationModel,
  LeadModel,
  QuoteModel,
  OrderModel,
} from '../models';

let baseUrl = '';

async function apiRequest(
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runAllAcceptanceTests() {
  console.log('================================================================');
  console.log('UDYAM ONE — AUTOMATED CRITICAL ACCEPTANCE TEST SUITE');
  console.log('================================================================\n');

  await connectDatabase();
  await ensureSeeded();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}/api`;

  let passed = 0;
  let failed = 0;
  const results: Array<{ id: string; name: string; status: 'PASS' | 'FAIL'; detail: string }> = [];

  async function test(id: string, name: string, fn: () => Promise<string>) {
    try {
      const detail = await fn();
      passed++;
      results.push({ id, name, status: 'PASS', detail });
      console.log(`✅ [PASS] ${id}: ${name}\n   -> ${detail}`);
    } catch (err: any) {
      failed++;
      results.push({ id, name, status: 'FAIL', detail: err.message });
      console.error(`❌ [FAIL] ${id}: ${name}\n   -> ${err.message}`);
    }
  }

  // 1. Dataset Integrity
  await test('T-01', 'Dataset Import Counts (25 Products, 3534 GSTINs, 2723 Udyam, 5000 Historical Leads)', async () => {
    const [pCount, gCount, uCount, lCount] = await Promise.all([
      ProductModel.countDocuments(),
      GstRegistrationModel.countDocuments(),
      UdyamRegistrationModel.countDocuments(),
      LeadModel.countDocuments({ isHistorical: true }),
    ]);
    assert.strictEqual(pCount, 25, `Expected 25 products, got ${pCount}`);
    assert.strictEqual(gCount, 3534, `Expected 3534 GSTIN records, got ${gCount}`);
    assert.strictEqual(uCount, 2723, `Expected 2723 Udyam records, got ${uCount}`);
    assert.strictEqual(lCount, 5000, `Expected 5000 historical leads, got ${lCount}`);
    return `Verified exact counts: Products=${pCount}, GSTINs=${gCount}, Udyam=${uCount}, HistoricalLeads=${lCount}`;
  });

  // 2. Product Eligibility: <10 employees rejected for P10 Managed SD-WAN
  await test('T-02', 'Eligibility Rule: Business with <10 employees cannot purchase P10 (Managed SD-WAN)', async () => {
    const { status, data } = await apiRequest('POST', '/quotes', {
      businessId: 'BIZ-TEST-EMP',
      bundleName: 'Invalid P10 Bundle',
      items: [
        { productId: 'P01', quantity: 3 },
        { productId: 'P10', quantity: 3 },
      ],
      eligibilityContext: {
        cityTier: 1,
        employeeCount: 6, // < 10 required
        numSites: 3,
        hasGstin: true,
        gstinStatus: 'ACTIVE',
      },
    });
    assert.strictEqual(status, 400);
    assert(data.validationErrors.some((e: string) => e.includes('requires at least 10 employees')));
    return `Rejected with 400: ${data.validationErrors[0]}`;
  });

  // 3. Product Eligibility: <3 sites rejected for P10 Managed SD-WAN
  await test('T-03', 'Eligibility Rule: Business with <3 sites cannot purchase P10 (Managed SD-WAN)', async () => {
    const { status, data } = await apiRequest('POST', '/quotes', {
      businessId: 'BIZ-TEST-SITES',
      bundleName: 'Invalid P10 Sites Bundle',
      items: [
        { productId: 'P02', quantity: 2 },
        { productId: 'P10', quantity: 2 },
      ],
      eligibilityContext: {
        cityTier: 1,
        employeeCount: 25,
        numSites: 2, // < 3 required
        hasGstin: true,
        gstinStatus: 'ACTIVE',
      },
    });
    assert.strictEqual(status, 400);
    assert(data.validationErrors.some((e: string) => e.includes('requires at least 3 business locations')));
    return `Rejected with 400: ${data.validationErrors[0]}`;
  });

  // 4. Product Dependency: P11 Static IP cannot be sold without P01|P02|P03
  await test('T-04', 'Dependency Rule: P11 (Static IP) rejected without companion P01|P02|P03', async () => {
    const { status, data } = await apiRequest('POST', '/quotes', {
      businessId: 'BIZ-TEST-DEP',
      bundleName: 'Invalid P11 Standalone',
      items: [
        { productId: 'P07', quantity: 2 },
        { productId: 'P11', quantity: 1 },
      ],
      eligibilityContext: {
        cityTier: 1,
        employeeCount: 15,
        numSites: 1,
        hasGstin: true,
        gstinStatus: 'ACTIVE',
      },
    });
    assert.strictEqual(status, 400);
    assert(data.validationErrors.some((e: string) => e.includes('P01 | P02 | P03')));
    return `Rejected with 400: ${data.validationErrors[0]}`;
  });

  // 5. GSTIN Status Rule: Cancelled GSTIN cannot satisfy active-GSTIN product requirement
  await test('T-05', 'GSTIN Eligibility: Cancelled GSTIN rejected for GST-required product P15', async () => {
    const { status, data } = await apiRequest('POST', '/quotes', {
      businessId: 'BIZ-SCEN-05',
      bundleName: 'Cancelled GSTIN Quote Attempt',
      items: [
        { productId: 'P01', quantity: 1 },
        { productId: 'P15', quantity: 1 }, // requires_gstin = Y
      ],
      eligibilityContext: {
        cityTier: 2,
        employeeCount: 8,
        numSites: 1,
        hasGstin: true,
        gstinStatus: 'CANCELLED',
      },
    });
    assert.strictEqual(status, 400);
    assert(data.validationErrors.some((e: string) => e.includes('CANCELLED')));
    return `Rejected with 400: ${data.validationErrors[0]}`;
  });

  // 6. Pricing & Immutable Price Snapshot
  await test('T-06', 'Pricing & Immutable Snapshot: Accepted quote preserves price snapshot if catalogue changes', async () => {
    const createRes = await apiRequest('POST', '/quotes', {
      businessId: 'BIZ-SCEN-02',
      bundleName: 'Snapshot Test Bundle',
      items: [
        { productId: 'P02', quantity: 1 }, // 1499/mo, 0 setup
        { productId: 'P16', quantity: 10 }, // 125 * 10 = 1250/mo
      ],
      contractMonths: 12,
    });
    assert.strictEqual(createRes.status, 201);
    const quote = createRes.data.quote;
    assert.strictEqual(quote.monthlyTotalInr, 1499 + 1250);

    // Accept the quote
    const acceptRes = await apiRequest('POST', `/quotes/${quote.quoteId}/accept`, {});
    assert.strictEqual(acceptRes.status, 200);

    // Temporarily mutate P02 price in DB and verify accepted quote snapshot is unchanged
    await ProductModel.updateOne({ productId: 'P02' }, { $set: { priceMinInrPerMonth: 9999 } });
    const fetchedQuote = await QuoteModel.findOne({ quoteId: quote.quoteId });
    await ProductModel.updateOne({ productId: 'P02' }, { $set: { priceMinInrPerMonth: 1499 } });

    assert.strictEqual(fetchedQuote?.monthlyTotalInr, 2749);
    assert.strictEqual(fetchedQuote?.items[0].snapshotUnitMonthlyPriceInr, 1499);
    return `Quote ${quote.quoteId} preserved ₹2,749/mo snapshot after catalogue mutation.`;
  });

  // 7. Registry Verification: Active, Cancelled, Suspended, Tampered/Invalid
  await test('T-07', 'Mock GSTIN & Udyam Registry Verification (Active, Cancelled, Suspended, Invalid, District 00)', async () => {
    const activeRes = await apiRequest('POST', '/kyc/verify/gstin', { gstin: '32TTNXB7384T1ZW' });
    const cancelledRes = await apiRequest('POST', '/kyc/verify/gstin', { gstin: '37IHKXV5167L1ZS' });
    const suspendedRes = await apiRequest('POST', '/kyc/verify/gstin', { gstin: '23QYBXS1811Q1ZD' });
    const tamperedK06 = await apiRequest('POST', '/kyc/verify/gstin', { gstin: '08YKZXS8189L1Z0' });
    const udyamRes = await apiRequest('POST', '/kyc/verify/udyam', { udyamNumber: 'UDYAM-KL-00-3078801' });

    assert.strictEqual(activeRes.data.status, 'ACTIVE');
    assert.strictEqual(cancelledRes.data.status, 'CANCELLED');
    assert.strictEqual(suspendedRes.data.status, 'SUSPENDED');
    assert(['NOT_FOUND', 'INVALID_FORMAT'].includes(tamperedK06.data.status));
    assert.strictEqual(udyamRes.data.status, 'VERIFIED');
    return `Verified Active=${activeRes.data.status}, Cancelled=${cancelledRes.data.status}, Suspended=${suspendedRes.data.status}, K06=${tamperedK06.data.status}, Udyam=${udyamRes.data.status}`;
  });

  // 8. Smart KYC: Consent Required Before Validation
  await test('T-08', 'Privacy Control: KYC validation blocked when customer consent is not recorded', async () => {
    const { status, data } = await apiRequest('POST', '/kyc/validate', {
      businessId: 'BIZ-NO-CONSENT-999',
      businessName: 'Unconsented Corp',
    });
    assert.strictEqual(status, 403);
    assert(data.error.includes('CONSENT REQUIRED'));
    return `Blocked with 403: ${data.error}`;
  });

  // 9. Smart KYC: Address proof > 90 days old flagged (Specimen K11 = 257 days vs 2026-07-15)
  await test('T-09', 'Smart KYC 90-Day Rule: Specimen K11 (2025-10-31 vs 2026-07-15) flagged as expired', async () => {
    const { status, data } = await apiRequest('POST', '/kyc/validate', {
      businessId: 'BIZ-QUEUE-K11',
      specimenCode: 'K11',
      businessName: 'Trinity Bake House Pvt Ltd',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.validation.addressProofAgeDays, 257);
    assert.strictEqual(data.validation.determinedStatus, 'NEEDS_CORRECTION');
    assert(data.validation.crossValidationIssues.some((i: any) => i.code === 'ADDRESS_PROOF_EXPIRED_90_DAYS'));
    return `K11 Bill Age=${data.validation.addressProofAgeDays} days (>90d) -> Status=${data.validation.determinedStatus}`;
  });

  // 10. Smart KYC: Low-confidence blurry OCR (Specimen K04 = 62%) never auto-approves
  await test('T-10', 'AI Safety: Low-confidence blurry OCR (Specimen K04) routed to MANUAL_REVIEW', async () => {
    const { status, data } = await apiRequest('POST', '/kyc/validate', {
      businessId: 'BIZ-SCEN-06',
      specimenCode: 'K04',
      businessName: 'Saffron Dental Care LLP',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.validation.determinedStatus, 'MANUAL_REVIEW');
    assert(data.validation.crossValidationIssues.some((i: any) => i.code === 'LOW_OCR_CONFIDENCE_BLUR'));
    return `K04 OCR Confidence=${Math.round(data.validation.minDocConfidence * 100)}% -> Routed to ${data.validation.determinedStatus}`;
  });

  // 11. Security: Cross-Customer Document Isolation & RBAC on Order Status
  await test('T-11', 'Security & Isolation: Customer cannot read another customer KYC or mutate Order status', async () => {
    const custSwitch = await apiRequest('POST', '/auth/switch-role', { role: 'Customer' });
    const custToken = custSwitch.data.token;

    // Cross-customer KYC access attempt
    const kycIsoRes = await apiRequest(
      'GET',
      '/kyc/KYC-BIZ-SCEN-08/status',
      undefined,
      {
        Authorization: `Bearer ${custToken}`,
        'x-customer-business-id': 'BIZ-SCEN-01',
      }
    );
    assert.strictEqual(kycIsoRes.status, 403);

    // Unauthorized order status transition by Customer role
    const ordMutRes = await apiRequest(
      'PATCH',
      '/orders/ORD-SCEN-01/status',
      { newStatus: 'ACTIVATED' },
      { Authorization: `Bearer ${custToken}` }
    );
    assert.strictEqual(ordMutRes.status, 403);
    return `Customer blocked from cross-tenant KYC (403) and unauthorized order status mutation (403).`;
  });

  // 12. Order State Machine & Duplicate Event Prevention
  await test('T-12', 'Order State Machine: Invalid state transition & duplicate event key rejected', async () => {
    const adminSwitch = await apiRequest('POST', '/auth/switch-role', { role: 'Admin' });
    const adminToken = adminSwitch.data.token;

    // Invalid jump from INSTALLATION_SCHEDULED directly to QUOTE_ACCEPTED
    const invalidRes = await apiRequest(
      'PATCH',
      '/orders/ORD-SCEN-01/status',
      { newStatus: 'QUOTE_ACCEPTED' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(invalidRes.status, 400);

    // Duplicate event key rejected
    const dupRes = await apiRequest(
      'PATCH',
      '/orders/ORD-SCEN-01/status',
      { newStatus: 'INSTALLATION_IN_PROGRESS', eventKey: 'EVT-INIT-01' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(dupRes.status, 409);

    // Duplicate quote acceptance does not create duplicate order
    const beforeCount = await OrderModel.countDocuments({ quoteId: 'QT-BIZ-SCEN-01' });
    await apiRequest('POST', '/quotes/QT-BIZ-SCEN-01/accept', {});
    const afterCount = await OrderModel.countDocuments({ quoteId: 'QT-BIZ-SCEN-01' });
    assert.strictEqual(beforeCount, afterCount);

    return `Invalid transition rejected (400), duplicate event key rejected (409), idempotent quote acceptance verified.`;
  });

  // 13. Feasibility Guard: NOT_AVAILABLE blocks connectivity checkout
  await test('T-13', 'Feasibility Guard: Unsupported location (NOT_AVAILABLE) blocks connectivity quote confirmation', async () => {
    const feasRes = await apiRequest('POST', '/feasibility/check', {
      businessId: 'BIZ-SCEN-07',
      address: 'Plot 9, Remote Hills Industrial Estate',
      pinCode: '999001',
      city: 'Nashik',
    });
    assert.strictEqual(feasRes.data.outcome, 'NOT_AVAILABLE');
    assert.strictEqual(feasRes.data.canProceedToConnectivityCheckout, false);

    const acceptBlocked = await apiRequest('POST', '/quotes/QT-BIZ-SCEN-07/accept', {
      feasibilityStatus: 'NOT_AVAILABLE',
    });
    assert.strictEqual(acceptBlocked.status, 400);
    assert(acceptBlocked.data.error.includes('FEASIBILITY RESTRICTION'));
    return `PIN 999001 returned NOT_AVAILABLE and blocked connectivity quote acceptance with 400.`;
  });

  // 14. AI Evaluation Suite (20 deterministic ground-truth cases across EN, HI, Hinglish, Security, OCR & Counterfactuals)
  await test('T-14', 'AI Quality & Evaluation Suite: All 20 ground-truth benchmark cases pass', async () => {
    const evalRes = await apiRequest('POST', '/ai-evaluation/run', {});
    assert.strictEqual(evalRes.status, 200);
    const ev = evalRes.data.evaluation;
    assert.strictEqual(ev.totalCases, 20);
    assert.strictEqual(ev.passedCases, 20);
    assert.strictEqual(ev.metrics.catalogueHallucinationRatePct, 0);
    assert.strictEqual(ev.metrics.eligibilityViolationRatePct, 0);
    return `Passed ${ev.passedCases}/${ev.totalCases} evaluation cases (0% hallucination, 0% eligibility violation).`;
  });

  // 15. Security Regression: Public registration role privilege escalation blocked & production role-switch guard
  await test('T-15', 'Security Regression: Public registration forces Customer role & production blocks role switch', async () => {
    const regRes = await apiRequest('POST', '/auth/register', {
      name: 'Attempted Escalation User',
      email: `sec-test-${Date.now()}@example.com`,
      password: 'SecureTestPassword@2026',
      role: 'Admin',
      businessName: 'SecTest Retailers',
    });
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.data.user.role, 'Customer');
    assert.strictEqual(regRes.data.privilegeEscalationBlocked, true);

    const prodSwitchRes = await apiRequest(
      'POST',
      '/auth/switch-role',
      { role: 'Admin' },
      { 'x-production-mode': 'true' }
    );
    assert.strictEqual(prodSwitchRes.status, 403);
    return `Public registration forced role='${regRes.data.user.role}' (privilegeEscalationBlocked=true); production role-switch blocked with 403.`;
  });

  // 16. Document Intelligence & Single-Document KYC Recovery with Preserved Verification History
  await test('T-16', 'Document Intelligence & KYC Recovery: OCR pipeline & single-document replacement preserve history', async () => {
    // Ensure consent exists for BIZ-QUEUE-K11
    await apiRequest('POST', '/kyc/consent', {
      businessId: 'BIZ-QUEUE-K11',
      consentGiven: true,
    });

    const uploadRes = await apiRequest('POST', '/kyc/upload', {
      businessId: 'BIZ-QUEUE-K11',
      documentType: 'GST_CERTIFICATE',
      specimenCode: 'K11',
      fileName: 'K11_gst_certificate.png',
    });
    assert.strictEqual(uploadRes.status, 201);
    assert(uploadRes.data.ocrPipeline.overallConfidence > 0.8);

    // Replace only the expired ADDRESS_PROOF on KYC-BIZ-QUEUE-K11
    const replaceRes = await apiRequest('POST', '/kyc/KYC-BIZ-QUEUE-K11/replace-document', {
      documentType: 'ADDRESS_PROOF',
      fileName: 'K01_address_proof_fresh_2026_07_02.png',
      addressProofDateInput: '2026-07-02',
    });
    assert.strictEqual(replaceRes.status, 200);
    assert.strictEqual(replaceRes.data.kycApplication.status, 'VERIFIED');
    assert(Array.isArray(replaceRes.data.kycApplication.verificationHistory));
    assert(replaceRes.data.kycApplication.verificationHistory.length >= 2);
    return `Single-document replacement transitioned KYC-BIZ-QUEUE-K11 to ${replaceRes.data.kycApplication.status} with ${replaceRes.data.kycApplication.verificationHistory.length} preserved history attempt(s).`;
  });

  // 17. AI Business Digital Twin & Before/After Bundle Simulation
  await test('T-17', 'AI Business Digital Twin: 5-dimension radar diagnosis & positive before/after bundle maturity lift', async () => {
    const twinRes = await apiRequest('GET', '/digital-twin/BIZ-SCEN-01');
    assert.strictEqual(twinRes.status, 200);
    const twin = twinRes.data.digitalTwin;
    assert.strictEqual(twin.radarChartData.length, 5);
    assert(twin.projectedMaturity.overallScore > twin.currentMaturity.overallScore);

    const simRes = await apiRequest('POST', '/digital-twin/simulate', {
      businessId: 'BIZ-SCEN-01',
      targetTier: 'Advanced',
    });
    assert.strictEqual(simRes.status, 200);
    assert(simRes.data.digitalTwin.projectedMaturity.scoreDelta > 0);
    return `Digital Twin current=${twin.currentMaturity.overallScore}/100 -> projected=${twin.projectedMaturity.overallScore}/100 (+${twin.projectedMaturity.scoreDelta} pts across 5 dimensions).`;
  });

  // 18. Explainable Recommendations, Counterfactual Comparator & 7-Scenario Evaluation Suite
  await test('T-18', 'Explainable AI Recommendations: Counterfactual trade-off comparator & 7/7 scenario evaluation pass', async () => {
    const cfRes = await apiRequest('POST', '/products/recommend/counterfactual', {
      businessId: 'BIZ-SCEN-01',
      fromTier: 'Recommended',
      toTier: 'Essential',
    });
    assert.strictEqual(cfRes.status, 200);
    assert(cfRes.data.comparison.headlineSummary.length > 10);
    assert(Boolean(cfRes.data.recommendationArchetypes));

    const suiteRes = await apiRequest('GET', '/products/recommend/evaluate');
    assert.strictEqual(suiteRes.status, 200);
    assert.strictEqual(suiteRes.data.passedScenarios, 7);
    assert.strictEqual(suiteRes.data.totalScenarios, 7);
    return `Counterfactual comparator verified; Recommendation Evaluation Suite passed ${suiteRes.data.passedScenarios}/${suiteRes.data.totalScenarios} MSME scenarios.`;
  });

  // 19. Trained ML Propensity Model Evaluation & Target Leakage Prevention
  await test('T-19', 'Trained ML Propensity Pipeline: Out-of-time holdout ROC-AUC > 0.70 & Brier calibration < 0.10', async () => {
    const mlRes = await apiRequest('GET', '/ml/propensity-evaluation');
    assert.strictEqual(mlRes.status, 200);
    const lr = mlRes.data.holdoutEvaluation.trainedLogisticRegression;
    const heur = mlRes.data.holdoutEvaluation.heuristicBaseline;
    assert(lr.rocAuc > 0.7, `Expected ROC-AUC > 0.70, got ${lr.rocAuc}`);
    assert(lr.rocAuc > heur.rocAuc, 'Expected trained ML model to outperform heuristic baseline ROC-AUC');
    assert(lr.brierCalibrationError < 0.1, `Expected Brier error < 0.10, got ${lr.brierCalibrationError}`);
    return `Trained Logistic Regression ROC-AUC=${lr.rocAuc} (vs Heuristic ${heur.rocAuc}), Brier=${lr.brierCalibrationError}, Top-Decile Lift=${lr.topDecileLift}x.`;
  });

  // 20. Evidence-Based Segment Intelligence & Interactive Commercial Impact Simulator
  await test('T-20', 'Segment Intelligence & Commercial Impact Simulator: 4 segments & 3 sensitivity scenarios verified', async () => {
    const segRes = await apiRequest('GET', '/analytics/segment-intelligence');
    assert.strictEqual(segRes.status, 200);
    assert.strictEqual(segRes.data.segments.length, 4);
    assert(segRes.data.segments[0].prioritisationScore > 0);

    const simRes = await apiRequest('POST', '/analytics/commercial-simulator', {
      quoteAcceptanceRelativeLiftPct: 25,
      kycCompletionRelativeLiftPct: 30,
      activationTimeReductionPct: 35,
      cacReductionPct: 25,
    });
    assert.strictEqual(simRes.status, 200);
    assert.strictEqual(simRes.data.sensitivityAnalysis.length, 3);
    assert(simRes.data.projectedImpact.incrementalArrInr > 0);
    return `Verified 4 MSME segments (top score=${segRes.data.segments[0].prioritisationScore}/100) and +₹${Math.round(simRes.data.projectedImpact.incrementalArrInr / 100000)}L projected ARR lift.`;
  });

  // 21. Intelligent Human Handoff SLA & Closed-Loop Outcome Tracking
  await test('T-21', 'Intelligent Human Handoff Lifecycle: SLA deadline calculation, acceptance & outcome recording', async () => {
    const adminSwitch = await apiRequest('POST', '/auth/switch-role', { role: 'Admin' });
    const adminToken = adminSwitch.data.token;

    const createHnd = await apiRequest('POST', '/handoff', {
      businessId: 'BIZ-SCEN-03',
      handoffReason: 'Multi-branch SD-WAN topology consultation',
      conversationSummary: 'Customer has 4 sites and 28 employees; needs P10 Managed SD-WAN SLA review.',
      customerPainPoints: ['Frequent branch VPN drops', 'Centralized firewall visibility'],
    });
    assert.strictEqual(createHnd.status, 201);
    const leadId = createHnd.data.handoff.leadId;
    assert(createHnd.data.handoff.slaMinutes > 0);

    const outcomeRes = await apiRequest(
      'POST',
      `/handoff/${leadId}/outcome`,
      {
        action: 'RECORD_OUTCOME',
        outcome: 'CONVERTED',
        outcomeNotes: 'Closed 4-site Secure Scale bundle via Enterprise Desk.',
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert.strictEqual(outcomeRes.status, 200);
    assert.strictEqual(outcomeRes.data.lead.handoffOutcome, 'CONVERTED');
    return `Handoff ${leadId} created with ${createHnd.data.handoff.slaMinutes}m SLA and recorded final outcome=${outcomeRes.data.lead.handoffOutcome}.`;
  });

  // 22. Production Integration Readiness Matrix
  await test('T-22', 'Production Integration Readiness Matrix: All 9 internal/mock/simulated/future adapters documented', async () => {
    const intRes = await apiRequest('GET', '/admin/integrations');
    assert.strictEqual(intRes.status, 200);
    assert.strictEqual(intRes.data.summary.totalIntegrations, 9);
    assert.strictEqual(intRes.data.integrations.length, 9);
    return `Verified ${intRes.data.integrations.length} integration descriptors with transparent classification and failure fallback strategies.`;
  });

  server.close();
  await disconnectDatabase();

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllAcceptanceTests();
