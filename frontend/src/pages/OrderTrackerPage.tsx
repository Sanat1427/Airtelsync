import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  Timeline,
  EmptyState,
} from '../components/ui';
import {
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Phone,
  ArrowRight,
  SlidersHorizontal,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';

const STAGE_DEFINITIONS = [
  {
    key: 'QUOTE_ACCEPTED',
    label: 'Quote Accepted',
    explanation: 'Plan quotation and price snapshot locked.',
    nextAction: 'Complete Smart KYC document verification',
  },
  {
    key: 'KYC_VERIFIED',
    label: 'KYC Verification',
    explanation: 'GSTIN, Udyam & address proof verified.',
    nextAction: 'Automated order confirmation & network dispatch',
  },
  {
    key: 'ORDER_CONFIRMED',
    label: 'Order Confirmation',
    explanation: 'Provisioning order confirmed in core billing.',
    nextAction: 'Assign field installation engineer & slot',
  },
  {
    key: 'INSTALLATION_SCHEDULED',
    label: 'Installation Scheduling',
    explanation: 'Field engineer slot scheduled at your premises.',
    nextAction: 'Engineer visit for optical fibre & router setup',
  },
  {
    key: 'INSTALLATION_IN_PROGRESS',
    label: 'Installation in Progress',
    explanation: 'On-site wiring, ONT termination & cloud setup.',
    nextAction: 'Final link speed test & service activation',
  },
  {
    key: 'ACTIVATED',
    label: 'Activation',
    explanation: 'All connectivity and cloud services are live.',
    nextAction: 'Manage active services & monthly invoices',
  },
];

function getStageIndex(status?: string): number {
  if (!status) return 0;
  if (status === 'QUOTE_ACCEPTED' || status === 'KYC_PENDING' || status === 'NEEDS_CUSTOMER_ACTION') {
    return 0;
  }
  if (status === 'KYC_VERIFIED') return 1;
  if (status === 'ORDER_CONFIRMED') return 2;
  if (status === 'INSTALLATION_SCHEDULED') return 3;
  if (status === 'INSTALLATION_IN_PROGRESS') return 4;
  if (status === 'ACTIVATED') return 5;
  return 0;
}

export const OrderTrackerPage: React.FC = () => {
  const { activeBusiness, activeOrder, setActiveOrder, user, showToast, switchRole } = useApp();
  const navigate = useNavigate();

  const [history, setHistory] = useState<any[]>([]);
  const [installation, setInstallation] = useState<any | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showSimControls, setShowSimControls] = useState(false);

  const fetchOrderDetails = async (targetId?: string) => {
    const idToLoad =
      targetId || activeOrder?.orderId || activeBusiness?.businessId || 'BIZ-SCEN-01';
    try {
      const res = await api.get(`/orders/${idToLoad}`);
      setActiveOrder(res.data.order);
      setHistory(res.data.history || []);
      setInstallation(res.data.installation || null);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchOrderDetails(activeBusiness?.businessId);
  }, [activeBusiness?.businessId]);

  const handleAdvanceStatus = async (nextStatus: string, reason: string) => {
    if (!activeOrder) return;
    setTransitioning(true);
    try {
      const res = await api.patch(`/orders/${activeOrder.orderId}/status`, {
        newStatus: nextStatus,
        eventType: `STATUS_${nextStatus}`,
        reason,
      });
      setActiveOrder(res.data.order);
      await fetchOrderDetails(activeOrder.orderId);
      showToast('success', `Order Updated: ${nextStatus.replace(/_/g, ' ')}`, reason);
    } catch (err: any) {
      showToast(
        'error',
        'Transition Restricted',
        err.response?.data?.error || err.message
      );
    } finally {
      setTransitioning(false);
    }
  };

  const currentStageIdx = getStageIndex(activeOrder?.status);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: 'Orders & Installation' }]}
        title="Order & Installation Tracker"
        subtitle="Track your order verification, technician appointment, and service activation timeline in real time."
        badge={
          activeOrder && (
            <StatusBadge
              variant={activeOrder.status === 'ACTIVATED' ? 'success' : 'info'}
              dot
            >
              {activeOrder.status.replace(/_/g, ' ')}
            </StatusBadge>
          )
        }
        actions={
          <PrimaryButton
            onClick={() => navigate('/active-services')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            View Active Services
          </PrimaryButton>
        }
      />

      {activeOrder ? (
        <>
          {/* ====================================================================
              ORDER PROGRESS STEPPER (Horizontal on Desktop, Vertical on Mobile)
          ==================================================================== */}
          <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E6EAF0]">
              <div>
                <div className="text-xs text-[#697386]">
                  Order Reference:{' '}
                  <strong className="font-mono text-[#172033]">{activeOrder.orderId}</strong> • Linked Quote:{' '}
                  <span className="font-mono text-[#172033]">{activeOrder.quoteId}</span>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-[#172033] mt-0.5">
                  { STAGE_DEFINITIONS[currentStageIdx]?.label } —{' '}
                  <span className="text-[#2563EB] font-medium">
                    {STAGE_DEFINITIONS[currentStageIdx]?.explanation}
                  </span>
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <div className="px-3.5 py-2 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0]">
                  <span className="text-[#697386]">Target Activation: </span>
                  <strong className="text-[#172033]">{activeOrder.expectedInstallationDate}</strong>
                </div>
                {activeOrder.actualActivationDate && (
                  <StatusBadge variant="success" dot>
                    Activated on {activeOrder.actualActivationDate}
                  </StatusBadge>
                )}
              </div>
            </div>

            {/* Responsive 6-Stage Progress Stepper */}
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
              {STAGE_DEFINITIONS.map((stage, idx) => {
                const isCompleted = idx < currentStageIdx || activeOrder.status === 'ACTIVATED';
                const isCurrent = idx === currentStageIdx && activeOrder.status !== 'ACTIVATED';
                const matchingHistory = history.find((h) => h.newStatus === stage.key);
                const timestampStr = matchingHistory
                  ? new Date(matchingHistory.timestamp).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : isCompleted
                  ? 'Completed'
                  : 'Scheduled';

                return (
                  <div
                    key={stage.key}
                    className={`p-4 rounded-xl border transition-all flex lg:flex-col items-start gap-3 ${
                      isCurrent
                        ? 'bg-[#E8F0FF]/60 border-[#2563EB] shadow-2xs'
                        : isCompleted
                        ? 'bg-white border-[#E6EAF0]'
                        : 'bg-[#F8F9FC] border-[#E6EAF0] opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between w-auto lg:w-full shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isCompleted
                            ? 'bg-[#16A36A] text-white'
                            : isCurrent
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-white border border-[#D1D8E4] text-[#697386]'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className="hidden lg:inline-block text-[10px] font-mono text-[#697386]">
                        {timestampStr}
                      </span>
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between lg:block">
                        <div
                          className={`text-xs font-semibold ${
                            isCurrent ? 'text-[#2563EB]' : 'text-[#172033]'
                          }`}
                        >
                          {stage.label}
                        </div>
                        <span className="lg:hidden text-[10px] font-mono text-[#697386]">
                          {timestampStr}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#697386] leading-snug">{stage.explanation}</p>
                      {isCurrent && (
                        <div className="pt-1 text-[10px] font-medium text-[#142B4A]">
                          Next: {stage.nextAction}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {activeOrder.pendingActions?.length > 0 && (
              <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#78350F] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#E6A23C] shrink-0" />
                  <span>
                    <strong>Next Required Action:</strong> {activeOrder.pendingActions.join(' • ')}
                  </span>
                </div>
                {activeOrder.status.includes('KYC') || activeOrder.status.includes('ACTION') ? (
                  <SecondaryButton size="sm" onClick={() => navigate('/kyc')}>
                    Go to Smart KYC
                  </SecondaryButton>
                ) : null}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Technician & Installation Appointment + Product Provisioning SLAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-5">
                <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#E6EAF0]">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#2563EB]" />
                    <h3 className="text-base font-semibold text-[#172033]">
                      Installation Appointment & Technician Details
                    </h3>
                  </div>
                  <StatusBadge variant="warning">Simulated Field Telemetry</StatusBadge>
                </div>

                <div className="grid sm:grid-cols-3 gap-3.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0]">
                    <div className="text-[#697386] flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-[#2563EB]" /> Appointment Slot
                    </div>
                    <div className="font-semibold text-[#172033]">
                      {activeOrder.scheduledSlot ||
                        `${activeOrder.expectedInstallationDate} (10:00 AM – 01:00 PM)`}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0]">
                    <div className="text-[#697386] flex items-center gap-1.5 mb-1">
                      <User className="w-3.5 h-3.5 text-[#2563EB]" /> Field Engineer
                    </div>
                    <div className="font-semibold text-[#172033]">
                      {installation?.technicianName || 'Ramesh Verma (Field Eng #408)'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0]">
                    <div className="text-[#697386] flex items-center gap-1.5 mb-1">
                      <Phone className="w-3.5 h-3.5 text-[#2563EB]" /> Contact Number
                    </div>
                    <div className="font-semibold text-[#172033] font-mono">
                      {installation?.technicianPhone || '+91 98112 23344'}
                    </div>
                  </div>
                </div>

                {/* Product-Level SLA Table */}
                <div className="space-y-2.5 pt-2">
                  <div className="text-xs font-semibold text-[#172033]">
                    Service Provisioning Schedule
                  </div>
                  <div className="border border-[#E6EAF0] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8F9FC] border-b border-[#E6EAF0] text-[#697386] font-medium">
                        <tr>
                          <th className="py-2.5 px-3.5">Service</th>
                          <th className="py-2.5 px-3">Qty</th>
                          <th className="py-2.5 px-3">Standard SLA</th>
                          <th className="py-2.5 px-3.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6EAF0]">
                        {(activeOrder.products || []).map((p: any) => (
                          <tr key={p.productId}>
                            <td className="py-3 px-3.5">
                              <span className="font-mono font-semibold text-[#2563EB] mr-1.5">
                                {p.productId}
                              </span>
                              <span className="font-medium text-[#172033]">{p.productName}</span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#172033]">×{p.quantity}</td>
                            <td className="py-3 px-3 text-[#697386]">{p.typicalInstallDays} Days</td>
                            <td className="py-3 px-3.5 text-right">
                              <StatusBadge
                                variant={activeOrder.status === 'ACTIVATED' ? 'success' : 'info'}
                              >
                                {activeOrder.status === 'ACTIVATED' ? 'Active' : 'Provisioning'}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Discreet Collapsible State Machine Simulation Controls */}
              <div className="bg-white border border-[#E6EAF0] rounded-2xl overflow-hidden shadow-card">
                <button
                  type="button"
                  onClick={() => setShowSimControls(!showSimControls)}
                  className="w-full px-5 py-3.5 bg-[#F8F9FC] flex items-center justify-between text-xs font-medium text-[#697386] hover:text-[#172033]"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Operations State Machine Simulation Controls (RBAC Tested)</span>
                  </span>
                  {showSimControls ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showSimControls && (
                  <div className="p-5 border-t border-[#E6EAF0] space-y-3.5 text-xs">
                    {user?.role === 'Customer' && (
                      <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#78350F] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-[#E6A23C] shrink-0" />
                          <span>
                            Role protection active: Customer role cannot manually advance order states (returns 403). Switch to Admin to simulate transitions.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => switchRole('Admin')}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-[#142B4A] text-white font-medium text-[11px]"
                        >
                          Switch to Admin
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton
                        size="sm"
                        disabled={transitioning}
                        onClick={() =>
                          handleAdvanceStatus('KYC_VERIFIED', 'Smart KYC & Registry checks verified')
                        }
                      >
                        → KYC Verified
                      </SecondaryButton>
                      <SecondaryButton
                        size="sm"
                        disabled={transitioning}
                        onClick={() =>
                          handleAdvanceStatus(
                            'INSTALLATION_SCHEDULED',
                            'Field Engineer slot confirmed for 10:00 AM'
                          )
                        }
                      >
                        → Schedule Install
                      </SecondaryButton>
                      <SecondaryButton
                        size="sm"
                        disabled={transitioning}
                        onClick={() =>
                          handleAdvanceStatus(
                            'INSTALLATION_IN_PROGRESS',
                            'Field Engineer arrived on site; ONT splicing started'
                          )
                        }
                      >
                        → Install In Progress
                      </SecondaryButton>
                      <PrimaryButton
                        size="sm"
                        disabled={transitioning}
                        onClick={() =>
                          handleAdvanceStatus(
                            'ACTIVATED',
                            'All optical & cloud services tested and activated'
                          )
                        }
                      >
                        → Activate Services
                      </PrimaryButton>
                      <button
                        type="button"
                        disabled={transitioning}
                        onClick={() =>
                          handleAdvanceStatus(
                            'QUOTE_ACCEPTED',
                            'Test invalid backward state transition'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] text-xs font-medium"
                      >
                        Test Invalid Backward Transition
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Cols: Append-Only Event History Timeline */}
            <div className="lg:col-span-5 bg-white border border-[#E6EAF0] rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF0]">
                <h3 className="text-base font-semibold text-[#172033] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2563EB]" />
                  <span>Order Activity Log</span>
                </h3>
                <span className="text-xs text-[#697386]">{history.length} events</span>
              </div>

              <Timeline
                events={history.map((h, i) => ({
                  id: `${h.orderId}-${i}`,
                  title: h.eventType?.replace(/_/g, ' '),
                  subtitle: `${h.previousStatus} → ${h.newStatus}`,
                  description: h.reason,
                  timestamp: new Date(h.timestamp).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }),
                  actor: `${h.actor} (${h.actorRole})`,
                  status: i === history.length - 1 ? 'current' : 'completed',
                }))}
              />
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Truck className="w-6 h-6" />}
          title={`No Active Order for ${activeBusiness?.businessName || 'Your Business'}`}
          description="Confirm a quotation on the Coverage & Checkout page to initiate provisioning and schedule your installation."
          action={
            <PrimaryButton onClick={() => navigate('/feasibility')}>
              Go to Coverage & Checkout
            </PrimaryButton>
          }
        />
      )}
    </div>
  );
};
