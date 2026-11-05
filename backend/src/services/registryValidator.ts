import { GstRegistrationModel, UdyamRegistrationModel } from '../models';

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// Accepts 'X' in the 4th character of embedded PAN (index 5 of GSTIN) per dataset specification
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{3}[ABCFGHLJPTFX][A-Z][0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
// Accepts district code '00' per dataset specification
const UDYAM_REGEX = /^UDYAM-[A-Z]{2}-(00|[0-9]{2})-[0-9]{7}$/;

export function verifyGstinChecksum(gstin: string): boolean {
  if (!gstin || gstin.length !== 15) return false;
  let factor = 1;
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const code = GSTIN_CHARS.indexOf(gstin[i]);
    if (code === -1) return false;
    const prod = code * factor;
    factor = factor === 1 ? 2 : 1;
    total += Math.floor(prod / 36) + (prod % 36);
  }
  const rem = total % 36;
  const checkIndex = (36 - rem) % 36;
  return GSTIN_CHARS[checkIndex] === gstin[14];
}

export function normalizeOcrGstin(raw: string): { normalized: string; wasNormalized: boolean } {
  const cleaned = (raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (cleaned.length !== 15) return { normalized: cleaned, wasNormalized: false };

  const chars = cleaned.split('');
  let changed = false;
  // Indices 2,3,4,5,6,11,13 are strictly alphabetical in Indian GSTINs
  const alphaIndices = [2, 3, 4, 5, 6, 11, 13];
  for (const idx of alphaIndices) {
    if (chars[idx] === '0') {
      chars[idx] = 'O';
      changed = true;
    }
  }
  return { normalized: chars.join(''), wasNormalized: changed };
}

export async function verifyGstinAgainstRegistry(
  rawGstin?: string,
  expectedBusinessName?: string,
  expectedAddress?: string
) {
  if (!rawGstin || !rawGstin.trim()) {
    return {
      gstin: '',
      formatValid: false,
      checksumValid: false,
      status: 'NOT_PROVIDED' as const,
      message: 'No GSTIN was provided.',
      mismatches: [] as string[],
    };
  }

  const gstin = rawGstin.trim().toUpperCase();
  const formatRegexOk = GSTIN_REGEX.test(gstin);
  const checksumOk = formatRegexOk && verifyGstinChecksum(gstin);

  if (!formatRegexOk || !checksumOk) {
    // Also check if it exists in registry despite checksum or if it is a tampered GSTIN like K06 (08YKZXS8189L1Z0)
    const regCheck = await GstRegistrationModel.findOne({ gstin }).lean();
    if (!regCheck) {
      return {
        gstin,
        formatValid: formatRegexOk,
        checksumValid: checksumOk,
        status: formatRegexOk ? ('NOT_FOUND' as const) : ('INVALID_FORMAT' as const),
        message: !formatRegexOk
          ? `GSTIN '${gstin}' does not match the 15-character GSTIN format (with X allowed in 4th PAN character).`
          : `GSTIN '${gstin}' failed Modulo-36 checksum validation and was NOT FOUND in the GST registry (possible transcription or tampering error).`,
        mismatches: ['GSTIN failed format/checksum or registry lookup.'],
      };
    }
  }

  const record = await GstRegistrationModel.findOne({ gstin }).lean();
  if (!record) {
    return {
      gstin,
      formatValid: true,
      checksumValid: true,
      status: 'NOT_FOUND' as const,
      message: `GSTIN '${gstin}' has valid syntax but was NOT FOUND in mock_gstin_registry.csv.`,
      mismatches: ['GSTIN not found in government mock registry.'],
    };
  }

  const normalizedStatus = record.status.toUpperCase() as 'ACTIVE' | 'CANCELLED' | 'SUSPENDED';
  const mismatches: string[] = [];

  if (expectedBusinessName) {
    const expLower = expectedBusinessName.toLowerCase().trim();
    const tradeLower = record.tradeName.toLowerCase().trim();
    const legalLower = record.legalName.toLowerCase().trim();
    if (!tradeLower.includes(expLower) && !legalLower.includes(expLower) && !expLower.includes(tradeLower)) {
      mismatches.push(
        `Business name mismatch: provided '${expectedBusinessName}', registry lists Trade Name '${record.tradeName}' / Legal Name '${record.legalName}'.`
      );
    }
  }

  if (expectedAddress) {
    const expPin = expectedAddress.match(/\b\d{6}\b/)?.[0];
    const regPin = record.principalPlaceOfBusiness.match(/\b\d{6}\b/)?.[0];
    if (expPin && regPin && expPin !== regPin) {
      mismatches.push(
        `Address PIN mismatch: provided '${expPin}', registry lists '${record.principalPlaceOfBusiness}'.`
      );
    }
  }

  return {
    gstin,
    formatValid: true,
    checksumValid: true,
    status: normalizedStatus,
    message:
      normalizedStatus === 'ACTIVE'
        ? `GSTIN '${gstin}' is ACTIVE in registry (${record.legalName}).`
        : `GSTIN '${gstin}' is ${normalizedStatus} in registry and cannot satisfy active-GSTIN eligibility rules.`,
    registryRecord: record,
    mismatches,
  };
}

export async function verifyUdyamAgainstRegistry(
  rawUdyam?: string,
  expectedEnterpriseName?: string,
  expectedCity?: string
) {
  if (!rawUdyam || !rawUdyam.trim()) {
    return {
      udyamNumber: '',
      formatValid: false,
      status: 'NOT_PROVIDED' as const,
      message: 'No Udyam registration number was provided.',
      mismatches: [] as string[],
    };
  }

  const udyamNumber = rawUdyam.trim().toUpperCase();
  const formatValid = UDYAM_REGEX.test(udyamNumber);
  if (!formatValid) {
    return {
      udyamNumber,
      formatValid: false,
      status: 'INVALID_FORMAT' as const,
      message: `Udyam number '${udyamNumber}' does not match required format UDYAM-XX-00-XXXXXXX.`,
      mismatches: ['Invalid Udyam registration number syntax.'],
    };
  }

  const record = await UdyamRegistrationModel.findOne({ udyamNumber }).lean();
  if (!record) {
    return {
      udyamNumber,
      formatValid: true,
      status: 'NOT_FOUND' as const,
      message: `Udyam number '${udyamNumber}' was NOT FOUND in mock_udyam_registry.csv.`,
      mismatches: ['Udyam number not found in registry.'],
    };
  }

  const mismatches: string[] = [];
  if (expectedEnterpriseName) {
    const expLower = expectedEnterpriseName.toLowerCase().trim();
    const regLower = record.enterpriseName.toLowerCase().trim();
    if (!regLower.includes(expLower) && !expLower.includes(regLower)) {
      mismatches.push(
        `Enterprise name mismatch: provided '${expectedEnterpriseName}', Udyam registry lists '${record.enterpriseName}'.`
      );
    }
  }

  if (expectedCity) {
    if (record.city.toLowerCase() !== expectedCity.toLowerCase().trim()) {
      mismatches.push(
        `City mismatch: provided '${expectedCity}', Udyam registry lists '${record.city}'.`
      );
    }
  }

  return {
    udyamNumber,
    formatValid: true,
    status: 'VERIFIED' as const,
    message: `Udyam '${udyamNumber}' verified (${record.enterpriseName} — ${record.enterpriseType} ${record.majorActivity}).`,
    registryRecord: record,
    mismatches,
  };
}
