import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, AuditLogModel } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'udyam_one_enterprise_secret_key_change_in_prod_2026';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  businessId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please provide a valid Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(authHeader.split(' ')[1]);
    } catch {
      // ignore invalid optional token
    }
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized. Required one of: ${allowedRoles.join(', ')}`,
      });
      return;
    }
    next();
  };
}

/**
 * Server-side Customer Ownership Enforcement:
 * - Operations roles (Admin, Sales Executive, Channel Partner, KYC Reviewer) may access customer records for legitimate operations.
 * - Customer role is strictly restricted to their own businessId (verified against JWT businessId claim first, never trusting a spoofed header over JWT claim).
 */
export function verifyCustomerOwnership(
  req: AuthenticatedRequest,
  targetBusinessId: string
): { allowed: boolean; reason?: string } {
  if (!req.user) {
    return { allowed: true };
  }
  if (req.user.role !== 'Customer') {
    return { allowed: true };
  }

  const tokenBizId = req.user.businessId;
  const headerBizId = req.headers['x-customer-business-id'] as string | undefined;

  if (tokenBizId && tokenBizId !== targetBusinessId) {
    return {
      allowed: false,
      reason: `DATA ISOLATION VIOLATION: Authenticated customer token is bound to '${tokenBizId}' and cannot access resources belonging to '${targetBusinessId}'.`,
    };
  }

  if (headerBizId && headerBizId !== targetBusinessId) {
    return {
      allowed: false,
      reason:
        'DATA ISOLATION VIOLATION: Customers cannot access another business customer’s KYC application, orders, or identity documents.',
    };
  }

  return { allowed: true };
}

const ALLOWED_BUSINESS_FIELDS = new Set([
  'businessId',
  'businessName',
  'legalName',
  'businessType',
  'segment',
  'address',
  'city',
  'state',
  'pinCode',
  'cityTier',
  'employeeCount',
  'numSites',
  'locations',
  'annualTurnoverBand',
  'hasGstin',
  'gstin',
  'hasUdyam',
  'udyamNumber',
  'contactName',
  'contactRole',
  'contactPhone',
  'contactEmail',
  'preferredLanguage',
  'currentInternet',
  'currentProvider',
  'monthlyTelecomSpendInr',
  'scenarioTag',
]);

/**
 * Prevents mass assignment of privileged or system-managed fields on business profile creation/updates.
 */
export function sanitizeBusinessPayload(raw: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  if (!raw || typeof raw !== 'object') return clean;
  for (const [key, val] of Object.entries(raw)) {
    if (ALLOWED_BUSINESS_FIELDS.has(key) && val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

export function maskGstin(gstin?: string): string {
  if (!gstin || gstin.length < 10) return gstin || '';
  return `${gstin.slice(0, 4)}*******${gstin.slice(-4)}`;
}

export function maskUdyam(udyam?: string): string {
  if (!udyam || udyam.length < 12) return udyam || '';
  return `${udyam.slice(0, 9)}****${udyam.slice(-3)}`;
}

export function maskPhone(phone?: string): string {
  if (!phone || phone.length < 6) return phone || '';
  return `${phone.slice(0, 3)}*****${phone.slice(-2)}`;
}

export function sanitizePiiInDetails(details?: Record<string, any>): Record<string, any> {
  if (!details || typeof details !== 'object') return {};
  const copy: Record<string, any> = { ...details };
  if (typeof copy.gstin === 'string') copy.gstin = maskGstin(copy.gstin);
  if (typeof copy.udyamNumber === 'string') copy.udyamNumber = maskUdyam(copy.udyamNumber);
  if (typeof copy.contactPhone === 'string') copy.contactPhone = maskPhone(copy.contactPhone);
  return copy;
}

export async function logAuditEvent(params: {
  action: string;
  module: string;
  actorId: string;
  actorRole: string;
  targetId: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    const auditId = `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await AuditLogModel.create({
      auditId,
      action: params.action,
      module: params.module,
      actorId: params.actorId,
      actorRole: params.actorRole,
      targetId: params.targetId,
      details: sanitizePiiInDetails(params.details),
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit event:', err);
  }
}
