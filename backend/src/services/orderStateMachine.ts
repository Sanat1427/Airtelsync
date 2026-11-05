import { OrderStatus } from '../models';

// Authoritative Backend Order State Machine
const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  QUOTE_ACCEPTED: ['KYC_PENDING', 'KYC_VERIFIED', 'ON_HOLD', 'CANCELLED'],
  KYC_PENDING: ['KYC_VERIFIED', 'NEEDS_CUSTOMER_ACTION', 'ON_HOLD', 'CANCELLED', 'FAILED'],
  NEEDS_CUSTOMER_ACTION: ['KYC_PENDING', 'KYC_VERIFIED', 'CANCELLED'],
  KYC_VERIFIED: ['ORDER_CONFIRMED', 'INSTALLATION_SCHEDULED', 'ON_HOLD', 'CANCELLED'],
  ORDER_CONFIRMED: ['INSTALLATION_SCHEDULED', 'ON_HOLD', 'CANCELLED'],
  INSTALLATION_SCHEDULED: ['INSTALLATION_IN_PROGRESS', 'ON_HOLD', 'NEEDS_CUSTOMER_ACTION', 'CANCELLED'],
  INSTALLATION_IN_PROGRESS: ['ACTIVATED', 'ON_HOLD', 'FAILED'],
  ON_HOLD: [
    'KYC_PENDING',
    'KYC_VERIFIED',
    'ORDER_CONFIRMED',
    'INSTALLATION_SCHEDULED',
    'INSTALLATION_IN_PROGRESS',
    'CANCELLED',
  ],
  ACTIVATED: [], // Terminal active state
  CANCELLED: [], // Terminal state
  FAILED: ['KYC_PENDING', 'INSTALLATION_SCHEDULED', 'CANCELLED'],
};

export function validateOrderStateTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): { valid: boolean; reason?: string } {
  if (currentStatus === nextStatus) {
    return {
      valid: false,
      reason: `Duplicate state transition rejected: Order is already in '${currentStatus}' state.`,
    };
  }

  const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      reason: `Invalid state transition from '${currentStatus}' to '${nextStatus}'. Allowed next states from '${currentStatus}' are: [${allowed.join(', ') || 'NONE (Terminal State)'}].`,
    };
  }

  return { valid: true };
}

export function addDaysToDateStr(baseDateStr: string, daysToAdd: number): string {
  const d = new Date(baseDateStr);
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split('T')[0];
}
