import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  Loader2,
  UploadCloud,
  FileText,
  Mic,
  Send,
  Volume2,
  ShieldAlert,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { ToastMessage } from '../../context/AppContext';

// ============================================================================
// 1. BREADCRUMBS & PAGE HEADER
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#697386] mb-2">
    {items.map((item, idx) => (
      <React.Fragment key={idx}>
        {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#8C96A8]" />}
        {item.href ? (
          <Link to={item.href} className="hover:text-[#172033] transition-colors font-medium">
            {item.label}
          </Link>
        ) : (
          <span className="text-[#172033] font-medium">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  badge,
  actions,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E6EAF0]">
    <div className="space-y-1">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#172033] tracking-tight">{title}</h1>
        {badge}
      </div>
      {subtitle && <p className="text-sm text-[#697386] max-w-3xl leading-relaxed">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{actions}</div>}
  </div>
);

// ============================================================================
// 2. STATUS BADGE & STAT CARD
// ============================================================================

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'navy';

export const StatusBadge: React.FC<{
  variant?: BadgeVariant;
  status?: string;
  children?: React.ReactNode;
  dot?: boolean;
  className?: string;
}> = ({ variant, status, children, dot = false, className = '' }) => {
  const autoVariant: BadgeVariant = (() => {
    if (variant) return variant;
    const s = String(status || children || '').toUpperCase();
    if (
      ['ACTIVE', 'VERIFIED', 'COMPLETED', 'PASS', 'HIGH', 'OPEN', 'PAYMENT_CONFIRMED'].some((k) =>
        s.includes(k)
      )
    ) {
      return 'success';
    }
    if (
      ['MANUAL_REVIEW', 'MEDIUM', 'PENDING', 'IN_PROGRESS', 'SCHEDULED', 'ASSIGNED'].some((k) =>
        s.includes(k)
      )
    ) {
      return 'warning';
    }
    if (
      ['REJECTED', 'ERROR', 'CORRECTION', 'CANCELLED', 'DROPPED', 'FAIL', 'MISMATCH'].some((k) =>
        s.includes(k)
      )
    ) {
      return 'error';
    }
    return 'neutral';
  })();

  const styles: Record<BadgeVariant, string> = {
    success: 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]',
    warning: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    error: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    info: 'bg-[#E8F0FF] text-[#1D4ED8] border-[#B3CCFF]',
    navy: 'bg-[#142B4A] text-white border-[#142B4A]',
    neutral: 'bg-[#F8F9FC] text-[#697386] border-[#E6EAF0]',
  };
  const dotColors: Record<BadgeVariant, string> = {
    success: 'bg-[#16A36A]',
    warning: 'bg-[#E6A23C]',
    error: 'bg-[#DC4C4C]',
    info: 'bg-[#2563EB]',
    navy: 'bg-white',
    neutral: 'bg-[#697386]',
  };
  const label = children ?? (status ? status.replace(/_/g, ' ') : '');
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[autoVariant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[autoVariant]}`} />}
      {label}
    </span>
  );
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: { label: string; positive?: boolean };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  trend,
  className = '',
}) => (
  <div
    className={`bg-white border border-[#E6EAF0] rounded-xl p-4 sm:p-5 shadow-card flex flex-col justify-between gap-2 ${className}`}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-[#697386]">{label}</span>
      {icon && (
        <span className="p-2 rounded-lg bg-[#F8F9FC] text-[#142B4A] border border-[#E6EAF0]">
          {icon}
        </span>
      )}
    </div>
    <div>
      <div className="text-xl sm:text-2xl font-semibold text-[#172033] tracking-tight">{value}</div>
      {(subtext || trend) && (
        <div className="flex items-center justify-between gap-2 mt-1 text-xs text-[#697386]">
          {subtext && <span>{subtext}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trend.positive ? 'text-[#16A36A]' : 'text-[#697386]'
              }`}
            >
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  </div>
);

// ============================================================================
// 3. BUTTONS (PRIMARY & SECONDARY)
// ============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'danger' | 'navy';
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  children,
  loading,
  icon,
  size = 'md',
  variant = 'primary',
  className = '',
  disabled,
  ...rest
}) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl',
    lg: 'px-5 py-3 text-sm rounded-xl',
  };
  const variants = {
    primary: 'bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white focus:ring-[#2563EB]/30',
    danger: 'bg-[#DC4C4C] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white focus:ring-[#DC4C4C]/30',
    navy: 'bg-[#142B4A] hover:bg-[#1E3A5F] text-white focus:ring-[#142B4A]/30',
  };
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium shadow-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  children,
  loading,
  icon,
  size = 'md',
  className = '',
  disabled,
  ...rest
}) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl',
    lg: 'px-5 py-3 text-sm rounded-xl',
  };
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium bg-white hover:bg-[#F8F9FC] active:bg-[#E8F0FF]/50 text-[#172033] border border-[#E6EAF0] hover:border-[#D1D8E4] shadow-card transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#697386]" /> : icon}
      {children}
    </button>
  );
};

// ============================================================================
// 4. FORM FIELD & SELECT FIELD
// ============================================================================

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  hint,
  error,
  rightElement,
  className = '',
  ...rest
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="block text-xs font-medium text-[#172033]">{label}</label>
      {hint && <span className="text-[11px] text-[#697386]">{hint}</span>}
    </div>
    <div className="relative flex items-center">
      <input
        className={`w-full px-3.5 py-2 text-sm text-[#172033] bg-white border ${
          error ? 'border-[#DC4C4C] focus:ring-[#DC4C4C]/20' : 'border-[#E6EAF0] focus:border-[#2563EB] focus:ring-[#2563EB]/20'
        } rounded-xl placeholder:text-[#8C96A8] focus:outline-none focus:ring-2 transition-all ${className}`}
        {...rest}
      />
      {rightElement && <div className="ml-2 shrink-0">{rightElement}</div>}
    </div>
    {error && <p className="text-xs text-[#DC4C4C] mt-1">{error}</p>}
  </div>
);

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  hint,
  options,
  className = '',
  ...rest
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="block text-xs font-medium text-[#172033]">{label}</label>
      {hint && <span className="text-[11px] text-[#697386]">{hint}</span>}
    </div>
    <select
      className={`w-full px-3.5 py-2 text-sm text-[#172033] bg-white border border-[#E6EAF0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all ${className}`}
      {...rest}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// ============================================================================
// 5. PROGRESS STEPPER
// ============================================================================

export interface StepItem {
  id: string;
  label: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming' | 'error';
  meta?: string;
}

export const ProgressStepper: React.FC<{
  steps: StepItem[];
  onStepClick?: (idx: number) => void;
  orientation?: 'horizontal' | 'responsive';
}> = ({ steps, onStepClick, orientation = 'responsive' }) => (
  <div
    className={`grid gap-2.5 ${
      orientation === 'horizontal'
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
        : 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-6'
    }`}
  >
    {steps.map((step, idx) => {
      const isCompleted = step.status === 'completed';
      const isCurrent = step.status === 'current';
      const isError = step.status === 'error';
      return (
        <button
          key={step.id}
          type="button"
          onClick={() => onStepClick && onStepClick(idx)}
          disabled={!onStepClick}
          className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
            onStepClick ? 'cursor-pointer' : 'cursor-default'
          } ${
            isCurrent
              ? 'bg-[#E8F0FF]/60 border-[#2563EB] shadow-sm'
              : isCompleted
              ? 'bg-white border-[#E6EAF0] hover:border-[#D1D8E4]'
              : isError
              ? 'bg-[#FEF2F2] border-[#FECACA]'
              : 'bg-[#F8F9FC] border-[#E6EAF0] opacity-75'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${
              isCompleted
                ? 'bg-[#16A36A] text-white'
                : isCurrent
                ? 'bg-[#2563EB] text-white'
                : isError
                ? 'bg-[#DC4C4C] text-white'
                : 'bg-white border border-[#D1D8E4] text-[#697386]'
            }`}
          >
            {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`text-xs font-semibold truncate ${
                isCurrent ? 'text-[#2563EB]' : 'text-[#172033]'
              }`}
            >
              {step.label}
            </div>
            {step.description && (
              <div className="text-[11px] text-[#697386] mt-0.5 line-clamp-2">{step.description}</div>
            )}
            {step.meta && (
              <div className="text-[10px] font-mono text-[#697386] mt-1">{step.meta}</div>
            )}
          </div>
        </button>
      );
    })}
  </div>
);

// ============================================================================
// 6. EMPTY STATE, LOADING SKELETON, CONFIRMATION MODAL & TOAST
// ============================================================================

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="bg-white border border-[#E6EAF0] rounded-2xl p-10 text-center max-w-lg mx-auto my-4 shadow-card">
    {icon && (
      <div className="w-12 h-12 rounded-2xl bg-[#E8F0FF] text-[#2563EB] flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
    )}
    <h3 className="text-base font-semibold text-[#172033]">{title}</h3>
    <p className="text-xs text-[#697386] mt-1.5 leading-relaxed">{description}</p>
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

export const LoadingSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => (
  <div className={`space-y-3 animate-pulse ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-16 bg-[#E6EAF0]/60 rounded-xl" />
    ))}
  </div>
);

export const ConfirmationModal: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'primary' | 'danger';
}> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'primary',
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142B4A]/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#E6EAF0] rounded-2xl max-w-md w-full p-6 shadow-elevated space-y-4 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-[#172033]">{title}</h3>
          <button onClick={onCancel} className="text-[#697386] hover:text-[#172033]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[#697386] leading-relaxed">{description}</p>
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <SecondaryButton size="sm" onClick={onCancel}>
            {cancelLabel}
          </SecondaryButton>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-medium text-white transition ${
              variant === 'danger'
                ? 'bg-[#DC4C4C] hover:bg-[#B91C1C]'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-elevated border border-[#E6EAF0] bg-white animate-fade-in"
      >
        {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#16A36A] shrink-0 mt-0.5" />}
        {t.type === 'error' && <XCircle className="w-4 h-4 text-[#DC4C4C] shrink-0 mt-0.5" />}
        {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#E6A23C] shrink-0 mt-0.5" />}
        {t.type === 'info' && <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[#172033]">{t.title}</div>
          {t.message && <div className="text-xs text-[#697386] mt-0.5 leading-relaxed">{t.message}</div>}
        </div>
        <button
          onClick={() => onDismiss(t.id)}
          className="text-[#8C96A8] hover:text-[#172033] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ))}
  </div>
);

// ============================================================================
// 7. PRICING CARD & PRODUCT ROW
// ============================================================================

export interface PricingCardProps {
  planTitle: string;
  tierBadge?: string;
  description: string;
  monthlyPriceInr: number;
  setupFeeInr: number;
  contractMonths: number;
  estimatedInstallDays: number;
  matchScore?: number;
  bestSuitedFor: string;
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
    lineMonthlyTotalInr: number;
    whyRecommended?: string;
  }>;
  benefits: string[];
  isRecommended?: boolean;
  isSelected?: boolean;
  onSelect: () => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  planTitle,
  tierBadge,
  description,
  monthlyPriceInr,
  setupFeeInr,
  contractMonths,
  estimatedInstallDays,
  matchScore,
  bestSuitedFor,
  products,
  benefits,
  isRecommended,
  isSelected,
  onSelect,
}) => {
  const gstInclMonthly = Math.round(monthlyPriceInr * 1.18);
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl border p-6 flex flex-col justify-between transition-all bg-white relative ${
        isSelected
          ? 'border-[#2563EB] ring-2 ring-[#2563EB]/15 shadow-elevated'
          : isRecommended
          ? 'border-[#2563EB]/50 shadow-card hover:border-[#2563EB]'
          : 'border-[#E6EAF0] shadow-card hover:border-[#D1D8E4]'
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-[#2563EB] text-white text-[11px] font-semibold tracking-wide">
          Recommended for Your Business
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
              {planTitle}
            </span>
            <h3 className="text-base font-semibold text-[#172033] mt-0.5">{tierBadge}</h3>
          </div>
          {matchScore !== undefined && (
            <StatusBadge variant="success">{matchScore}% Fit</StatusBadge>
          )}
        </div>

        <p className="text-xs text-[#697386] leading-relaxed min-h-[34px]">{description}</p>

        {/* Pricing Block */}
        <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#172033]">
              ₹{monthlyPriceInr.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-[#697386]">/ month + GST</span>
          </div>
          <div className="text-xs font-medium text-[#142B4A] mt-0.5">
            ₹{gstInclMonthly.toLocaleString('en-IN')}/mo inclusive of 18% GST
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#697386] mt-2.5 pt-2.5 border-t border-[#E6EAF0]">
            <span>One-time setup: ₹{setupFeeInr.toLocaleString('en-IN')}</span>
            <span>
              {contractMonths}m contract • {estimatedInstallDays}d install
            </span>
          </div>
        </div>

        {/* Best suited for */}
        <div className="text-xs">
          <span className="font-medium text-[#697386]">Best suited for: </span>
          <span className="text-[#172033] font-medium">{bestSuitedFor}</span>
        </div>

        {/* Included Products */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#172033]">
            Included Services ({products.length})
          </div>
          <div className="space-y-1.5">
            {products.map((p) => (
              <div
                key={p.productId}
                className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-[#F8F9FC] border border-[#E6EAF0]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="w-3.5 h-3.5 text-[#16A36A] shrink-0" />
                  <span className="font-medium text-[#172033] truncate">
                    {p.productName} <span className="text-[#697386]">×{p.quantity}</span>
                  </span>
                </div>
                <span className="font-semibold text-[#172033] shrink-0 ml-2">
                  ₹{p.lineMonthlyTotalInr.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Benefits */}
        {benefits.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="text-xs font-semibold text-[#172033]">Key Benefits</div>
            <ul className="space-y-1 text-xs text-[#697386]">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[#2563EB] mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="pt-5 mt-5 border-t border-[#E6EAF0]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
            isSelected
              ? 'bg-[#142B4A] text-white shadow-sm'
              : isRecommended
              ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm'
              : 'bg-[#F8F9FC] hover:bg-[#E8F0FF] text-[#172033] border border-[#E6EAF0]'
          }`}
        >
          {isSelected ? '✓ Plan Selected' : `Select ${planTitle}`}
        </button>
      </div>
    </div>
  );
};

export const ProductRow: React.FC<{
  productId: string;
  productName: string;
  category?: string;
  unit: string;
  unitPriceInr: number;
  setupFeeInr: number;
  quantity: number;
  lineMonthlyTotalInr: number;
  description?: string;
  dependencies?: string[];
  onUpdateQty?: (delta: number) => void;
}> = ({
  productId,
  productName,
  category,
  unit,
  unitPriceInr,
  setupFeeInr,
  quantity,
  lineMonthlyTotalInr,
  description,
  dependencies,
  onUpdateQty,
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-[#E6EAF0] rounded-xl bg-white transition-all hover:border-[#D1D8E4]">
      <div className="p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#E8F0FF] text-[#2563EB] font-mono text-[11px] font-semibold">
              {productId}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-[#172033] truncate">
              {productName}
            </span>
            {category && (
              <span className="hidden md:inline-block text-[11px] text-[#697386]">• {category}</span>
            )}
          </div>
          <div className="text-xs text-[#697386] mt-0.5 flex items-center gap-3">
            <span>
              ₹{unitPriceInr.toLocaleString('en-IN')}/mo ({unit.replace(/_/g, ' ')})
            </span>
            <span>• Setup: ₹{setupFeeInr.toLocaleString('en-IN')}</span>
            {(description || (dependencies && dependencies.length > 0)) && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-[#2563EB] hover:underline inline-flex items-center gap-0.5 font-medium"
              >
                {expanded ? 'Hide details' : 'Details'}
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onUpdateQty && (
            <div className="inline-flex items-center rounded-lg border border-[#E6EAF0] bg-[#F8F9FC]">
              <button
                type="button"
                onClick={() => onUpdateQty(-1)}
                className="p-1.5 text-[#697386] hover:text-[#172033] transition"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center text-xs font-semibold text-[#172033]">{quantity}</span>
              <button
                type="button"
                onClick={() => onUpdateQty(1)}
                className="p-1.5 text-[#697386] hover:text-[#172033] transition"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="w-24 text-right">
            <div className="text-xs sm:text-sm font-semibold text-[#172033]">
              ₹{lineMonthlyTotalInr.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-[#697386]">per month</div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-[#E6EAF0] bg-[#F8F9FC] rounded-b-xl text-xs text-[#697386] space-y-1">
          {description && <p>{description}</p>}
          {dependencies && dependencies.length > 0 && (
            <p>
              <strong className="text-[#172033]">Prerequisite Connectivity:</strong> Requires one of{' '}
              <code className="font-mono text-[#2563EB]">{dependencies.join(' or ')}</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 8. TIMELINE & DOCUMENT UPLOAD
// ============================================================================

export interface TimelineEvent {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  timestamp?: string;
  actor?: string;
  status?: 'completed' | 'current' | 'upcoming';
}

export const Timeline: React.FC<{ events: TimelineEvent[] }> = ({ events }) => (
  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-[#E6EAF0]">
    {events.map((ev) => (
      <div key={ev.id} className="relative pl-8 text-xs">
        <div
          className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${
            ev.status === 'current'
              ? 'bg-[#2563EB] ring-4 ring-[#E8F0FF]'
              : ev.status === 'upcoming'
              ? 'bg-[#D1D8E4]'
              : 'bg-[#16A36A]'
          }`}
        />
        <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[#172033]">{ev.title}</span>
            {ev.timestamp && <span className="text-[11px] text-[#697386] font-mono">{ev.timestamp}</span>}
          </div>
          {ev.subtitle && <div className="text-[11px] font-medium text-[#2563EB]">{ev.subtitle}</div>}
          {ev.description && <p className="text-[#697386] leading-relaxed">{ev.description}</p>}
          {ev.actor && <div className="text-[11px] text-[#8C96A8]">Recorded by {ev.actor}</div>}
        </div>
      </div>
    ))}
  </div>
);

export const DocumentUpload: React.FC<{
  label: string;
  description: string;
  status?: 'VERIFIED' | 'NEEDS_CORRECTION' | 'MANUAL_REVIEW' | 'MISSING';
  extractedSummary?: Array<{ label: string; value: string }>;
  previewUrl?: string;
  onFileSelect: (file: File) => void;
}> = ({ label, description, status = 'VERIFIED', extractedSummary, previewUrl, onFileSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setUploadedFileName(f.name);
      onFileSelect(f);
    }
  };

  return (
    <div className="bg-white border border-[#E6EAF0] rounded-2xl p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[#172033]">{label}</h4>
          <p className="text-xs text-[#697386] mt-0.5">{description}</p>
        </div>
        <StatusBadge
          variant={
            status === 'VERIFIED'
              ? 'success'
              : status === 'MANUAL_REVIEW'
              ? 'warning'
              : 'error'
          }
          dot
        >
          {status === 'VERIFIED'
            ? 'Verified'
            : status === 'MANUAL_REVIEW'
            ? 'In Manual Review'
            : status === 'MISSING'
            ? 'Document Missing'
            : 'Action Needed'}
        </StatusBadge>
      </div>

      {extractedSummary && extractedSummary.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] text-xs">
          {extractedSummary.map((item, i) => (
            <div key={i}>
              <div className="text-[11px] text-[#697386]">{item.label}</div>
              <div className="font-medium text-[#172033] truncate mt-0.5">{item.value || '—'}</div>
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition-all ${
          dragging
            ? 'border-[#2563EB] bg-[#E8F0FF]/50'
            : 'border-[#E6EAF0] hover:border-[#2563EB]/60 bg-[#F8F9FC]/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setUploadedFileName(f.name);
              onFileSelect(f);
            }
          }}
        />
        <div className="flex items-center justify-center gap-2 text-xs text-[#697386]">
          <UploadCloud className="w-4 h-4 text-[#2563EB]" />
          {uploadedFileName ? (
            <span className="font-medium text-[#172033]">
              Uploaded: {uploadedFileName} (Click to replace)
            </span>
          ) : (
            <span>
              <strong className="text-[#2563EB]">Click to upload replacement</strong> or drag and drop PNG, JPG, or PDF (max 5 MB)
            </span>
          )}
        </div>
      </div>

      {previewUrl && status !== 'MISSING' && (
        <div className="flex items-center gap-2 text-xs text-[#697386]">
          <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Active document image loaded in preview</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 9. CHAT MESSAGE & CHAT INPUT
// ============================================================================

export const ChatMessage: React.FC<{
  role: 'user' | 'assistant';
  content: string;
  suggestedQuestions?: string[];
  guardrailTriggered?: boolean;
  channelMode?: 'WEB' | 'VOICE' | 'WHATSAPP';
  onSelectSuggestion?: (q: string) => void;
  onSpeak?: () => void;
}> = ({
  role,
  content,
  suggestedQuestions,
  guardrailTriggered,
  channelMode = 'WEB',
  onSelectSuggestion,
  onSpeak,
}) => (
  <div className={`flex flex-col ${role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
    <div
      className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
        role === 'user'
          ? channelMode === 'WHATSAPP'
            ? 'bg-[#DCF8C6] text-[#172033] rounded-tr-xs border border-[#BEE5A6]'
            : 'bg-[#142B4A] text-white rounded-tr-xs shadow-xs'
          : guardrailTriggered
          ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-tl-xs'
          : 'bg-white border border-[#E6EAF0] text-[#172033] rounded-tl-xs shadow-card'
      }`}
    >
      {guardrailTriggered && (
        <div className="flex items-center gap-1.5 font-semibold text-[#DC4C4C] mb-1.5 text-xs">
          <ShieldAlert className="w-4 h-4" /> Policy & Pricing Protection Active
        </div>
      )}
      <div className="whitespace-pre-line">{content}</div>

      {role === 'assistant' && onSpeak && (
        <div className="mt-2.5 pt-2 border-t border-[#E6EAF0] flex items-center justify-between text-[11px] text-[#697386]">
          <button
            type="button"
            onClick={onSpeak}
            className="inline-flex items-center gap-1 text-[#2563EB] hover:underline font-medium"
          >
            <Volume2 className="w-3.5 h-3.5" /> Listen to response
          </button>
          <span>Verified against product catalogue</span>
        </div>
      )}
    </div>

    {suggestedQuestions && suggestedQuestions.length > 0 && onSelectSuggestion && (
      <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[92%]">
        {suggestedQuestions.map((sq, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectSuggestion(sq)}
            className="text-left px-3 py-1.5 rounded-xl bg-white hover:bg-[#E8F0FF]/60 border border-[#E6EAF0] hover:border-[#2563EB]/40 text-xs text-[#172033] hover:text-[#2563EB] transition-all shadow-2xs"
          >
            {sq}
          </button>
        ))}
      </div>
    )}
  </div>
);

export const ChatInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onVoice: () => void;
  sending?: boolean;
  listening?: boolean;
  placeholder?: string;
}> = ({ value, onChange, onSend, onVoice, sending, listening, placeholder }) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      onSend();
    }}
    className="p-3 bg-white border-t border-[#E6EAF0] flex items-center gap-2.5"
  >
    <button
      type="button"
      onClick={onVoice}
      className={`p-2.5 rounded-xl border transition-all ${
        listening
          ? 'bg-[#DC4C4C] text-white border-[#DC4C4C] animate-pulse'
          : 'bg-[#F8F9FC] hover:bg-[#E8F0FF] text-[#142B4A] border-[#E6EAF0]'
      }`}
      title="Voice input (English or Hindi)"
    >
      <Mic className="w-4 h-4" />
    </button>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Ask about plans, connectivity, billing or security...'}
      className="flex-1 px-4 py-2.5 text-sm text-[#172033] bg-[#F8F9FC] border border-[#E6EAF0] rounded-xl focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
    />
    <PrimaryButton type="submit" disabled={sending || !value.trim()} loading={sending}>
      <Send className="w-3.5 h-3.5" />
      <span>Send</span>
    </PrimaryButton>
  </form>
);

// ============================================================================
// 10. FILTER BAR & DATA TABLE
// ============================================================================

export const FilterBar: React.FC<{
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ searchValue, onSearchChange, searchPlaceholder = 'Search records...', filters, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-[#E6EAF0] rounded-xl shadow-card">
    {onSearchChange !== undefined && (
      <div className="relative flex-1 min-w-[220px] max-w-sm">
        <Search className="w-4 h-4 text-[#8C96A8] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchValue || ''}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-1.5 text-xs text-[#172033] bg-[#F8F9FC] border border-[#E6EAF0] rounded-lg focus:outline-none focus:bg-white focus:border-[#2563EB]"
        />
      </div>
    )}
    <div className="flex flex-wrap items-center gap-2">
      {filters}
      {children}
    </div>
  </div>
);

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T = unknown>({
  columns,
  data,
  rowKey,
  headers,
  children,
  emptyMessage = 'No records match your current filters.',
}: {
  columns?: ColumnDef<T>[];
  data?: T[];
  rowKey?: (row: T) => string;
  headers?: string[];
  children?: React.ReactNode;
  emptyMessage?: string;
}) {
  if (headers) {
    return (
      <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FC] border-b border-[#E6EAF0] text-[#697386] font-medium">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="py-3 px-4 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EAF0]">{children}</tbody>
          </table>
        </div>
      </div>
    );
  }

  const safeCols = columns || [];
  const safeData = data || [];
  return (
    <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8F9FC] border-b border-[#E6EAF0] text-[#697386] font-medium">
            <tr>
              {safeCols.map((col) => (
                <th key={col.key} className={`py-3 px-4 whitespace-nowrap ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EAF0]">
            {safeData.length === 0 ? (
              <tr>
                <td colSpan={safeCols.length} className="py-8 text-center text-[#697386]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              safeData.map((row, idx) => (
                <tr
                  key={rowKey ? rowKey(row) : String(idx)}
                  className="hover:bg-[#F8F9FC]/80 transition-colors"
                >
                  {safeCols.map((col) => (
                    <td key={col.key} className={`py-3 px-4 align-middle ${col.className || ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
