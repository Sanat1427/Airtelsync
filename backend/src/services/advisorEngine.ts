import { GoogleGenAI } from '@google/genai';

export interface AdvisorInputContext {
  message: string;
  language?: string; // 'English' | 'Hindi'
  channel?: 'WEB' | 'VOICE' | 'WHATSAPP';
  currentExtracted?: {
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
    contractPreference?: number;
  };
  history?: Array<{ role: string; content: string }>;
}

const CITY_TIER_MAP: Record<string, number> = {
  delhi: 1,
  mumbai: 1,
  bengaluru: 1,
  bangalore: 1,
  hyderabad: 1,
  chennai: 1,
  pune: 1,
  kolkata: 1,
  ahmedabad: 1,
  vadodara: 2,
  kochi: 2,
  ludhiana: 2,
  indore: 2,
  nagpur: 2,
  lucknow: 2,
  bhopal: 2,
  jaipur: 2,
  mysuru: 2,
  coimbatore: 2,
  nashik: 2,
  visakhapatnam: 2,
  patna: 2,
  surat: 2,
};

export function checkAdvisorInputGuardrails(message: string): {
  blocked: boolean;
  reason?: string;
  safeResponseEn?: string;
  safeResponseHi?: string;
} {
  const lower = (message || '').toLowerCase();

  // 1. Prompt Injection / System Override attempts
  if (
    lower.includes('ignore previous instructions') ||
    lower.includes('ignore all rules') ||
    lower.includes('system prompt') ||
    lower.includes('override price') ||
    lower.includes('set price to 0') ||
    lower.includes('approve kyc automatically') ||
    lower.includes('bypass gstin') ||
    lower.includes('bypass eligibility')
  ) {
    return {
      blocked: true,
      reason: 'PROMPT_INJECTION_OR_POLICY_OVERRIDE_ATTEMPT',
      safeResponseEn:
        'Guardrail Active: I am an authorized Udyam One Business Advisor. I cannot override catalogue prices, bypass deterministic eligibility/dependency rules, or auto-approve KYC verification. How can I help assess your MSME connectivity and digital tool requirements?',
      safeResponseHi:
        'सुरक्षा गार्डरेल सक्रिय: मैं उद्यम वन बिज़नेस सलाहकार हूँ। मैं कैटलॉग की कीमतों को बदल नहीं सकता, पात्रता नियमों को बायपास नहीं कर सकता, या स्वयं KYC स्वीकृत नहीं कर सकता। मैं आपके व्यवसाय की इंटरनेट और डिजिटल आवश्यकताओं में कैसे सहायता कर सकता हूँ?',
    };
  }

  // 2. Fabricated / Unsupported Product ID requests (e.g. P99, satellite link, crypto mining rig)
  if (/\bp(2[6-9]|[3-9]\d|\d{3})\b/i.test(message) || lower.includes('starlink') || lower.includes('satellite internet')) {
    return {
      blocked: true,
      reason: 'UNSUPPORTED_CATALOGUE_PRODUCT_REQUEST',
      safeResponseEn:
        'Catalogue Grounding Notice: The requested product is not part of the official 25-product Udyam One catalogue (P01–P25). I can only recommend verified connectivity (Fibre P01–P03, 5G AirFiber P04, Leased Lines P05–P06, SD-WAN P10), Communication (P12–P15), Cloud/POS (P16–P19), Security (P20–P22), and IoT (P23–P25) services.',
      safeResponseHi:
        'कैटलॉग सूचना: यह उत्पाद हमारे आधिकारिक 25-उत्पाद उद्यम वन कैटलॉग (P01–P25) में उपलब्ध नहीं है। मैं केवल प्रमाणित ब्रॉडबैंड, क्लाउड, POS, सुरक्षा और IoT सेवाओं की सिफारिश कर सकता हूँ।',
    };
  }

  return { blocked: false };
}

export function extractStructuredRequirementsDeterministic(
  message: string,
  prev?: AdvisorInputContext['currentExtracted'],
  preferredLang = 'English'
) {
  const lower = (message || '').toLowerCase();
  const result = {
    businessType: prev?.businessType || '',
    segment: prev?.segment || '',
    employeeCount: prev?.employeeCount || 0,
    numberOfSites: prev?.numberOfSites || 1,
    city: prev?.city || '',
    cityTier: prev?.cityTier || 1,
    currentProvider: prev?.currentProvider || '',
    currentExpenditure: prev?.currentExpenditure || 0,
    requirements: [...(prev?.requirements || [])],
    budget: prev?.budget || 0,
    preferredLanguage: prev?.preferredLanguage || preferredLang,
    gstinAvailable: prev?.gstinAvailable ?? true,
    contractPreference: prev?.contractPreference || 12,
  };

  // Detect Hindi or Tamil script or explicit language preference
  if (/[\u0900-\u097F]/.test(message) || lower.includes('hindi') || lower.includes('हिंदी')) {
    result.preferredLanguage = 'Hindi';
  } else if (/[\u0B80-\u0BFF]/.test(message) || lower.includes('tamil')) {
    result.preferredLanguage = 'Tamil';
  } else if (lower.includes('english')) {
    result.preferredLanguage = 'English';
  }

  // Extract Business Type & Segment
  if (
    lower.includes('retail') ||
    lower.includes('kirana') ||
    lower.includes('shop') ||
    lower.includes('store') ||
    lower.includes('bakery') ||
    lower.includes('salon') ||
    lower.includes('pharmacy') ||
    lower.includes('दुकान') ||
    lower.includes('किराना') ||
    lower.includes('रिटेल')
  ) {
    if (lower.includes('chain') || lower.includes('multi') || (result.numberOfSites && result.numberOfSites >= 3)) {
      result.businessType = result.businessType || 'Retail chain';
      result.segment = 'Small multi-site businesses';
    } else {
      result.businessType = result.businessType || 'Kirana / Retail Shop';
      result.segment = 'Micro retail & services';
    }
  } else if (
    lower.includes('clinic') ||
    lower.includes('dental') ||
    lower.includes('diagnostic') ||
    lower.includes('doctor') ||
    lower.includes('hospital') ||
    lower.includes('law') ||
    lower.includes('ca firm') ||
    lower.includes('office') ||
    lower.includes('क्लिनिक') ||
    lower.includes('अस्पताल') ||
    lower.includes('ऑफिस')
  ) {
    result.businessType = lower.includes('dental') ? 'Dental clinic' : 'Professional clinic / office';
    result.segment = 'Professional offices';
  } else if (
    lower.includes('restaurant') ||
    lower.includes('hotel') ||
    lower.includes('branch') ||
    lower.includes('multi-site') ||
    lower.includes('multiple location') ||
    lower.includes('रेस्तरां') ||
    lower.includes('होटल')
  ) {
    result.businessType = 'Restaurant chain';
    result.segment = 'Small multi-site businesses';
  } else if (
    lower.includes('manufactur') ||
    lower.includes('factory') ||
    lower.includes('plant') ||
    lower.includes('auto-parts') ||
    lower.includes('textile') ||
    lower.includes('packaging') ||
    lower.includes('फैक्ट्री') ||
    lower.includes('निर्माण')
  ) {
    result.businessType = 'Manufacturing unit';
    result.segment = 'Small manufacturers';
  }

  // Extract City & Tier
  for (const [cityKey, tierVal] of Object.entries(CITY_TIER_MAP)) {
    if (lower.includes(cityKey)) {
      result.city = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
      if (result.city === 'Bangalore') result.city = 'Bengaluru';
      result.cityTier = tierVal;
      break;
    }
  }
  if (lower.includes('पटना')) {
    result.city = 'Patna';
    result.cityTier = 2;
  } else if (lower.includes('दिल्ली')) {
    result.city = 'Delhi';
    result.cityTier = 1;
  } else if (lower.includes('मुंबई')) {
    result.city = 'Mumbai';
    result.cityTier = 1;
  } else if (lower.includes('जयपुर')) {
    result.city = 'Jaipur';
    result.cityTier = 2;
  } else if (lower.includes('लखनऊ')) {
    result.city = 'Lucknow';
    result.cityTier = 2;
  } else if (message.includes('சென்னை')) {
    result.city = 'Chennai';
    result.cityTier = 1;
  }

  // Extract Employee Count
  const empMatch =
    message.match(/(\d+)\s*(?:employees|staff|people|workers|users|doctors|कर्मचारी|लोग|ஊழியர்கள்)/i) ||
    message.match(/(?:employees|staff)\s*[:=-]?\s*(\d+)/i);
  if (empMatch) {
    result.employeeCount = parseInt(empMatch[1], 10);
  }

  // Extract Number of Sites / Locations
  const siteMatch =
    message.match(/(\d+)\s*(?:sites|locations|branches|outlets|shops|stores|units|शाखाएं|दुकानें|लोकेशन)/i);
  if (siteMatch) {
    result.numberOfSites = parseInt(siteMatch[1], 10);
    if (result.numberOfSites >= 3 && !result.segment.includes('manufactur')) {
      result.segment = 'Small multi-site businesses';
    }
  }

  // Extract Budget / Spend
  const budgetMatch =
    message.match(/(?:budget|spend|spending|under|around|max|rs\.?|₹|inr|बजट|खर्च)\s*(?:of|is|around)?\s*₹?\s*(\d[\d,]*)/i) ||
    message.match(/(\d{3,5})\s*(?:per month|\/month|monthly|रुपये|प्रति माह)/i);
  if (budgetMatch) {
    const val = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    if (val >= 300 && val <= 200000) {
      result.budget = val;
    }
  }

  // Extract GSTIN availability
  if (lower.includes('no gst') || lower.includes('without gst') || lower.includes('dont have gst') || lower.includes('जीएसटी नहीं')) {
    result.gstinAvailable = false;
  } else if (lower.includes('have gst') || lower.includes('gstin available') || lower.includes('active gst') || lower.includes('जीएसटी है')) {
    result.gstinAvailable = true;
  }

  // Extract Requirements
  const addReq = (r: string) => {
    if (!result.requirements.includes(r)) result.requirements.push(r);
  };

  if (lower.includes('internet') || lower.includes('broadband') || lower.includes('fibre') || lower.includes('wifi') || lower.includes('इंटरनेट') || lower.includes('ब्रॉडबैंड') || message.includes('இணையம்')) {
    addReq('reliable_internet');
  }
  if (lower.includes('upi') || lower.includes('pos') || lower.includes('billing') || lower.includes('counter') || lower.includes('बिलिंग')) {
    addReq('upi_pos');
    addReq('pos_billing');
  }
  if (lower.includes('whatsapp') || lower.includes('व्हाट्सएप') || message.includes('வாட்ஸ்அப்')) {
    addReq('whatsapp_business');
  }
  if (lower.includes('email') || lower.includes('office') || lower.includes('ईमेल')) {
    addReq('business_email');
  }
  if (lower.includes('cloud') || lower.includes('backup') || lower.includes('patient record') || lower.includes('storage') || lower.includes('क्लाउड') || lower.includes('रिकॉर्ड')) {
    addReq('cloud_storage');
  }
  if (lower.includes('security') || lower.includes('antivirus') || lower.includes('ransomware') || lower.includes('सुरक्षा')) {
    addReq('endpoint_security');
  }
  if (lower.includes('firewall') || lower.includes('फायरवॉल')) {
    addReq('firewall_security');
  }
  if (lower.includes('cctv') || lower.includes('camera') || lower.includes('surveillance') || lower.includes('कैमरा')) {
    addReq('cctv_surveillance');
  }
  if (lower.includes('backup link') || lower.includes('failover') || lower.includes('downtime') || lower.includes('बैकअप')) {
    addReq('backup_connectivity');
  }
  if (lower.includes('sd-wan') || lower.includes('central') || lower.includes('multi-site') || lower.includes('multiple')) {
    addReq('multi_site_management');
  }
  if (lower.includes('leased line') || lower.includes('dedicated') || lower.includes('sla') || lower.includes('erp')) {
    addReq('dedicated_bandwidth');
  }
  if (lower.includes('iot') || lower.includes('machine') || lower.includes('sensor') || lower.includes('मशीन')) {
    addReq('iot_monitoring');
  }
  if (lower.includes('ivr') || lower.includes('telephony') || lower.includes('sip') || lower.includes('call')) {
    addReq('cloud_telephony');
  }
  if (lower.includes('static ip')) {
    addReq('static_ip');
  }

  return result;
}

export async function generateAdvisorResponse(input: AdvisorInputContext) {
  const startMs = Date.now();
  const guard = checkAdvisorInputGuardrails(input.message);
  const lang =
    /[\u0900-\u097F]/.test(input.message) || input.language === 'Hindi'
      ? 'Hindi'
      : /[\u0B80-\u0BFF]/.test(input.message) || input.language === 'Tamil'
      ? 'Tamil'
      : 'English';

  const extracted = extractStructuredRequirementsDeterministic(
    input.message,
    input.currentExtracted,
    lang
  );

  if (guard.blocked) {
    return {
      reply: lang === 'Hindi' ? guard.safeResponseHi! : guard.safeResponseEn!,
      language: lang,
      guardrailTriggered: true,
      guardrailReason: guard.reason,
      extractedRequirements: extracted,
      suggestedQuestions:
        lang === 'Hindi'
          ? [
              'मेरी किराना दुकान के लिए भरोसेमंद इंटरनेट और POS बताएं',
              'मेरे क्लिनिक (12 कर्मचारी, पटना) के लिए क्लाउड और ईमेल प्लान',
              '4 शाखाओं वाले रेस्तरां के लिए SD-WAN और बैकअप कनेक्टिविटी',
            ]
          : [
              'I run a retail shop with 4 staff and need reliable internet, UPI POS & WhatsApp Business',
              'We are a dental clinic in Patna with 12 staff needing fast fibre, email & cloud backup',
              'We have 4 restaurant outlets in Mumbai and need centralized SD-WAN + failover',
            ],
      shouldTriggerHandoff: false,
      latencyMs: Date.now() - startMs,
    };
  }

  // Check if customer explicitly asks for human handoff or has complex multi-site (>8 sites) requirements
  const lower = input.message.toLowerCase();
  const explicitHumanRequest =
    lower.includes('human') ||
    lower.includes('agent') ||
    lower.includes('sales executive') ||
    lower.includes('call me') ||
    lower.includes('अधिकारी से बात') ||
    lower.includes('एजेंट');

  const shouldTriggerHandoff =
    explicitHumanRequest || (extracted.numberOfSites >= 8 && extracted.employeeCount >= 50);

  // Build adaptive follow-up questions based on detected vertical
  const btypeLower = (extracted.businessType || extracted.segment || '').toLowerCase();
  let adaptiveFollowUpEn = '';
  let adaptiveFollowUpHi = '';
  let suggestedQuestionsEn: string[] = [];
  let suggestedQuestionsHi: string[] = [];

  if (btypeLower.includes('clinic') || btypeLower.includes('dental') || btypeLower.includes('office') || btypeLower.includes('prof')) {
    adaptiveFollowUpEn =
      'For a clinic or professional office, patient/client data security and uninterrupted cloud access are critical. To tailor your bundle:\n1. Do you maintain digital patient/client records requiring automated 1 TB Cloud Backup (P17)?\n2. How many staff members need custom-domain Business Email & Office Suite (P16)?\n3. Do you require Endpoint Security (P20) or Cloud Telephony IVR (P12) for appointment booking?';
    adaptiveFollowUpHi =
      'क्लिनिक या प्रोफेशनल ऑफिस के लिए डेटा सुरक्षा और क्लाउड कनेक्टिविटी अत्यंत महत्वपूर्ण हैं:\n1. क्या आप डिजिटल पेशेंट रिकॉर्ड रखते हैं जिसके लिए 1 TB क्लाउड बैकअप (P17) चाहिए?\n2. कितने कर्मचारियों को बिज़नेस ईमेल और ऑफिस सुइट (P16) की आवश्यकता है?\n3. क्या अपॉइंटमेंट कॉल्स के लिए क्लाउड टेलीफोनी IVR (P12) या एंटीवायरस सुरक्षा (P20) चाहिए?';
    suggestedQuestionsEn = [
      'We have 12 employees in Patna, budget ₹4,500/month, and need Cloud Backup + Business Email',
      'Add Endpoint Security for 10 devices and Static IP for our diagnostic server',
      'Generate eligible bundles for our clinic now',
    ];
    suggestedQuestionsHi = [
      'पटना में 12 कर्मचारी हैं, बजट ₹4,500/माह है, क्लाउड बैकअप और ईमेल चाहिए',
      'हमारे 10 कंप्यूटरों के लिए एंडपॉइंट सिक्योरिटी और स्टैटिक IP जोड़ें',
      'हमारे क्लिनिक के लिए उपयुक्त बंडल दिखाएं',
    ];
  } else if (btypeLower.includes('multi') || btypeLower.includes('restaurant') || btypeLower.includes('chain') || extracted.numberOfSites > 1) {
    adaptiveFollowUpEn =
      `For a multi-location business (${extracted.numberOfSites} site(s)), avoiding counter downtime across outlets is key:\n1. Do you need Centralized Managed SD-WAN (P10 — requires >=3 sites, >=10 staff & active GSTIN)?\n2. Should we include Automatic 4G/5G Failover (P09) at each outlet so POS/UPI never stops?\n3. Do you need Cloud POS (P19) or Cloud CCTV (P23) across all branches?`;
    adaptiveFollowUpHi =
      `मल्टी-लोकेशन व्यवसाय (${extracted.numberOfSites} शाखाएं) के लिए सभी आउटलेट्स को जोड़ना आवश्यक है:\n1. क्या आपको सेंट्रलाइज्ड SD-WAN (P10 — न्यूनतम 3 साइट्स व 10 कर्मचारी आवश्यक) चाहिए?\n2. क्या हर आउटलेट पर ऑटोमैटिक 4G/5G फेलओवर (P09) जोड़ें ताकि बिलिंग कभी न रुके?\n3. क्या सभी शाखाओं पर क्लाउड CCTV (P23) या POS (P19) चाहिए?`;
    suggestedQuestionsEn = [
      'We have 4 sites and 25 employees in Mumbai with active GSTIN, budget ₹20,000/month',
      'Include Managed SD-WAN (P10) and Backup 4G/5G Failover (P09) for all sites',
      'Check network feasibility and show our multi-site bundles',
    ];
    suggestedQuestionsHi = [
      'मुंबई में हमारी 4 शाखाएं और 25 कर्मचारी हैं, सक्रिय GSTIN है, बजट ₹20,000/माह',
      'सभी शाखाओं के लिए SD-WAN (P10) और 4G/5G फेलओवर (P09) शामिल करें',
      'हमारे मल्टी-साइट बंडल और बचत दिखाएं',
    ];
  } else if (btypeLower.includes('manufactur') || btypeLower.includes('mfg') || btypeLower.includes('factory')) {
    adaptiveFollowUpEn =
      'For a manufacturing operation, SLA-backed bandwidth and OT/IT security are essential:\n1. Do you run ERP systems requiring Dedicated 1:1 Internet Leased Line (P05 20 Mbps or P06 100 Mbps)?\n2. Do you need Managed SOC Firewall (P21 — requires >=10 employees & base fibre/ILL)?\n3. Would you like Machine Monitoring IoT sensors (P24) for shop-floor uptime & energy tracking?';
    adaptiveFollowUpHi =
      'मैन्युफैक्चरिंग यूनिट के लिए समर्पित बैंडविड्थ और सुरक्षा आवश्यक हैं:\n1. क्या आप ERP चलाते हैं जिसके लिए 1:1 इंटरनेट लीज्ड लाइन (P05 या P06) चाहिए?\n2. क्या आपको मैनेज्ड फायरवॉल (P21) और स्टैटिक IP (P11) की आवश्यकता है?\n3. क्या मशीनों की निगरानी के लिए IoT सेंसर किट (P24) जोड़ें?';
    suggestedQuestionsEn = [
      'We have 35 employees at 2 sites in Pune, active GSTIN, need Leased Line + Firewall + IoT',
      'What if we only have 6 employees—can we still buy Internet Leased Line P05 or SD-WAN P10?',
      'Escalate our complex multi-plant requirement to a human Sales Executive',
    ];
    suggestedQuestionsHi = [
      'पुणे में 35 कर्मचारी और 2 साइट्स हैं, लीज्ड लाइन + फायरवॉल + IoT चाहिए',
      'यदि केवल 6 कर्मचारी हों तो क्या P05 लीज्ड लाइन मिल सकती है?',
      'हमारे प्लांट के लिए मानव सेल्स विशेषज्ञ से जोड़ें',
    ];
  } else {
    // Default / Micro Retail Shop
    adaptiveFollowUpEn =
      'For a retail shop or local service business, fast UPI checkout and customer engagement drive daily revenue:\n1. How many daily UPI/card transactions do you process, and do you need Cloud POS & GST Billing (P19)?\n2. How critical is uninterrupted internet for your counter (Biz Fibre 100 P01 at ₹999/mo or 5G AirFiber P04)?\n3. Would you like Verified WhatsApp Business API (P15) or Guest Wi-Fi (P22) to engage customers?';
    adaptiveFollowUpHi =
      'रिटेल दुकान के लिए तेज़ UPI पेमेंट और ग्राहकों से जुड़ाव सबसे महत्वपूर्ण है:\n1. आप प्रतिदिन कितने UPI/कार्ड ट्रांजेक्शन करते हैं? क्या आपको क्लाउड POS और GST बिलिंग (P19) चाहिए?\n2. काउंटर के लिए निर्बाध ब्रॉडबैंड (Biz Fibre 100 P01 - ₹999/माह) कितना ज़रूरी है?\n3. क्या आप ग्राहकों को ऑफर्स भेजने के लिए WhatsApp Business API (P15) चाहते हैं?';
    suggestedQuestionsEn = [
      'I have a bakery in Ludhiana with 4 staff, active GSTIN, budget ₹3,000/mo — need Fibre, POS & WhatsApp',
      'Add 2 Cloud CCTV cameras (P23) and Secure Guest Wi-Fi (P22)',
      'Show my recommended bundles and monthly savings now',
    ];
    suggestedQuestionsHi = [
      'लुधियाना में मेरी बेकरी है (4 कर्मचारी, बजट ₹3,000/माह) — फाइबर, POS और WhatsApp चाहिए',
      'दुकान की सुरक्षा के लिए 2 क्लाउड CCTV कैमरे (P23) और Wi-Fi (P22) जोड़ें',
      'मेरे लिए उपयुक्त बंडल और मासिक बचत की गणना करें',
    ];
  }

  const reqSummaryEn = `**Extracted Context**: Vertical: *${extracted.businessType || 'MSME'}* (${extracted.segment || 'Micro retail & services'}) | Sites: **${extracted.numberOfSites}** | Staff: **${extracted.employeeCount || 4}** | City: **${extracted.city || 'Tier-' + extracted.cityTier}** | Budget: **${extracted.budget ? '₹' + extracted.budget.toLocaleString('en-IN') + '/mo' : 'Flexible'}** | Needs: **${extracted.requirements.length ? extracted.requirements.join(', ') : 'reliable_internet, upi_pos'}**.`;

  const reqSummaryHi = `**समझी गई आवश्यकताएं**: व्यवसाय: *${extracted.businessType || 'एमएसएमई'}* | शाखाएं: **${extracted.numberOfSites}** | कर्मचारी: **${extracted.employeeCount || 4}** | शहर: **${extracted.city || 'टियर-' + extracted.cityTier}** | बजट: **${extracted.budget ? '₹' + extracted.budget.toLocaleString('en-IN') + '/माह' : 'लचीला'}** | सेवाएं: **${extracted.requirements.length ? extracted.requirements.join(', ') : 'इंटरनेट, पीओएस'}**.`;

  let replyText =
    lang === 'Hindi'
      ? `नमस्ते! मैंने आपकी व्यावसायिक आवश्यकताओं का विश्लेषण किया है।\n\n${reqSummaryHi}\n\n${adaptiveFollowUpHi}`
      : `Hello! I have analyzed your business context against the Udyam One product catalogue.\n\n${reqSummaryEn}\n\n${adaptiveFollowUpEn}`;

  // Optional Gemini API enrichment when GEMINI_API_KEY is configured
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are Udyam One AI Business Advisor for Indian MSMEs.
Respond in ${lang}. Keep response concise (under 140 words), helpful, and grounded strictly in the 25-product catalogue (P01-P25).
Never invent prices or product IDs.
Customer message: "${input.message}"
Extracted JSON so far: ${JSON.stringify(extracted)}
Include a brief summary of what you understood and ask 2-3 adaptive vertical questions.`;
      const resp = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt,
      });
      if (resp.text) {
        replyText = resp.text;
      }
    } catch {
      // Fallback to deterministic response seamlessly
    }
  }

  return {
    reply: replyText,
    language: lang,
    guardrailTriggered: false,
    extractedRequirements: extracted,
    suggestedQuestions: lang === 'Hindi' ? suggestedQuestionsHi : suggestedQuestionsEn,
    shouldTriggerHandoff,
    latencyMs: Date.now() - startMs,
  };
}
