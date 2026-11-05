import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp, UserRole, AdminSection } from '../context/AppContext';
import { ToastContainer, StatusBadge } from './ui';
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  MessageSquare,
  Layers,
  FileCheck2,
  Truck,
  Wifi,
  ShieldCheck,
  Bell,
  HelpCircle,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  UserCheck,
  Users,
  Sparkles,
  Package,
  Cpu,
  FileText,
  Menu,
  X,
  LogOut,
  KeyRound,
  Play,
  ArrowUpRight,
  CheckCircle2,
  MapPin,
  Wrench,
  Handshake,
} from 'lucide-react';

const GUIDED_TOUR_STEPS = [
  { step: 1, label: '1. Overview', path: '/', desc: 'Commercial SaaS homepage & business status summary' },
  { step: 2, label: '2. Business Profile', path: '/profile', desc: 'Guided firmographics, locations & registry verification' },
  { step: 3, label: '3. Business Assessment', path: '/readiness', desc: 'Guided readiness assessment & 5-dimension report' },
  { step: 4, label: '4. AI Business Advisor', path: '/advisor', desc: 'Bilingual English/Hindi advisor with Voice & WhatsApp modes' },
  { step: 5, label: '5. Plans & Pricing', path: '/bundles', desc: 'Essential, Growth & Secure Scale plans + ROI calculator' },
  { step: 6, label: '6. Feasibility & Checkout', path: '/feasibility', desc: 'PIN coverage check & GST-inclusive quote acceptance' },
  { step: 7, label: '7. Smart KYC', path: '/kyc', desc: 'Step-by-step verification & K01–K12 specimen inspection' },
  { step: 8, label: '8. Orders & Installation', path: '/orders', desc: 'Order tracking timeline & technician slot details' },
  { step: 9, label: '9. Active Services', path: '/active-services', desc: 'Subscriptions, bills, support tickets & referrals' },
  { step: 10, label: '10. Operations Portal', path: '/admin', desc: 'Enterprise admin analytics, leads, KYC queue & AI evaluation' },
];

// ============================================================================
// CUSTOMER SIDEBAR
// ============================================================================

export const CustomerSidebar: React.FC<{
  mobileOpen: boolean;
  onCloseMobile: () => void;
}> = ({ mobileOpen, onCloseMobile }) => {
  const location = useLocation();
  const { activeBusiness, activeOrder } = useApp();

  const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/profile', label: 'Business Profile', icon: Building2 },
    { path: '/readiness', label: 'Business Assessment', icon: ClipboardCheck },
    { path: '/advisor', label: 'AI Business Advisor', icon: MessageSquare },
    { path: '/bundles', label: 'Plans & Pricing', icon: Layers, matchPaths: ['/bundles', '/recommendations', '/feasibility'] },
    { path: '/kyc', label: 'Smart KYC', icon: FileCheck2 },
    { path: '/orders', label: 'Orders & Installation', icon: Truck },
    { path: '/active-services', label: 'Active Services', icon: Wifi },
  ];

  const renderContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-[#E6EAF0] w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#E6EAF0]">
        <Link to="/" onClick={onCloseMobile} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#142B4A] flex items-center justify-center text-white font-bold text-sm shadow-xs">
            U1
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-[#142B4A]">Udyam One</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#E8F0FF] text-[#2563EB]">
                Business
              </span>
            </div>
            <p className="text-[11px] text-[#697386] leading-none mt-0.5">Enterprise Connectivity</p>
          </div>
        </Link>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-[#697386] hover:text-[#172033]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Active Business Card */}
      {activeBusiness && (
        <div className="px-4 pt-4 pb-2">
          <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0]">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#697386]">
              Workspace
            </div>
            <div className="text-xs font-semibold text-[#172033] truncate mt-0.5">
              {activeBusiness.businessName}
            </div>
            <div className="text-[11px] text-[#697386] flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-[#2563EB] shrink-0" />
              <span className="truncate">
                {activeBusiness.city} • {activeBusiness.numSites || 1} site(s)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8C96A8]">
          Customer Portal
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPaths
            ? item.matchPaths.includes(location.pathname)
            : location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#E8F0FF] text-[#2563EB] font-semibold'
                  : 'text-[#697386] hover:bg-[#F8F9FC] hover:text-[#172033]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#2563EB]' : 'text-[#697386]'}`} />
                <span>{item.label}</span>
              </div>
              {item.path === '/orders' && activeOrder && (
                <span className="w-2 h-2 rounded-full bg-[#16A36A]" />
              )}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-[#E6EAF0]">
          <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8C96A8]">
            Trust & Support
          </div>
          <Link
            to="/feasibility"
            onClick={onCloseMobile}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              location.pathname === '/feasibility'
                ? 'bg-[#E8F0FF] text-[#2563EB] font-semibold'
                : 'text-[#697386] hover:bg-[#F8F9FC] hover:text-[#172033]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Coverage & Checkout</span>
          </Link>
          <Link
            to="/privacy"
            onClick={onCloseMobile}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              location.pathname === '/privacy'
                ? 'bg-[#E8F0FF] text-[#2563EB] font-semibold'
                : 'text-[#697386] hover:bg-[#F8F9FC] hover:text-[#172033]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy & Security</span>
          </Link>
        </div>
      </nav>

      {/* Bottom Help Card */}
      <div className="p-4 border-t border-[#E6EAF0] bg-[#F8F9FC]/60">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#697386]">
            <HelpCircle className="w-4 h-4 text-[#2563EB]" />
            <span>24×7 Enterprise Desk</span>
          </div>
          <Link
            to="/active-services"
            onClick={onCloseMobile}
            className="text-[#2563EB] font-medium hover:underline text-[11px]"
          >
            Get Help
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{renderContent()}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#142B4A]/40 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10">{renderContent()}</div>
        </div>
      )}
    </>
  );
};

// ============================================================================
// ADMIN SIDEBAR
// ============================================================================

export const AdminSidebar: React.FC<{
  mobileOpen: boolean;
  onCloseMobile: () => void;
}> = ({ mobileOpen, onCloseMobile }) => {
  const { adminSection, setAdminSection, user } = useApp();
  const navigate = useNavigate();

  const adminItems: Array<{ id: AdminSection; label: string; icon: any }> = [
    { id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
    { id: 'LEADS', label: 'Lead Management', icon: Users },
    { id: 'SCORING', label: 'AI Lead Scoring', icon: Sparkles },
    { id: 'KYC_REVIEW', label: 'KYC Review', icon: FileCheck2 },
    { id: 'ORDER_OPS', label: 'Order Operations', icon: Truck },
    { id: 'INSTALLATIONS', label: 'Installation Management', icon: Wrench },
    { id: 'PARTNERS', label: 'Channel Partners', icon: Handshake },
    { id: 'CATALOGUE', label: 'Product Catalogue', icon: Package },
    { id: 'AI_EVAL', label: 'AI Evaluation', icon: Cpu },
    { id: 'AUDIT_LOGS', label: 'Audit Logs', icon: FileText },
  ];

  const renderContent = () => (
    <div className="flex flex-col h-full bg-[#142B4A] text-white w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm">
            U1
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">Udyam One</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-[#B3CCFF]">
                Ops
              </span>
            </div>
            <p className="text-[11px] text-white/60 leading-none mt-0.5">Operations & Governance</p>
          </div>
        </div>
        <button onClick={onCloseMobile} className="lg:hidden p-1.5 text-white/70 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Role indicator */}
      <div className="px-4 pt-4 pb-2">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-[10px] uppercase tracking-wider text-white/60">Active Operator</div>
          <div className="text-xs font-semibold text-white truncate mt-0.5">
            {user?.name || 'Operations Admin'}
          </div>
          <div className="text-[11px] text-[#80ACFF] font-medium mt-0.5">
            Role: {user?.role || 'Admin'}
          </div>
        </div>
      </div>

      {/* Admin Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Operations Console
        </div>
        {adminItems.map((item) => {
          const Icon = item.icon;
          const isActive = adminSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setAdminSection(item.id);
                navigate('/admin');
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-[#2563EB] text-white font-semibold shadow-xs'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Switch back to Customer Portal */}
      <div className="p-4 border-t border-white/10">
        <Link
          to="/"
          onClick={onCloseMobile}
          className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center justify-between transition"
        >
          <span>Customer Portal</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{renderContent()}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#142B4A]/50 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10">{renderContent()}</div>
        </div>
      )}
    </>
  );
};

// ============================================================================
// TOP NAVIGATION BAR
// ============================================================================

export const TopNavigation: React.FC<{
  onOpenMobileNav: () => void;
  isAdminRoute: boolean;
}> = ({ onOpenMobileNav, isAdminRoute }) => {
  const {
    user,
    activeBusiness,
    notifications,
    demoControlsOpen,
    setDemoControlsOpen,
    switchRole,
  } = useApp();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="h-16 bg-white border-b border-[#E6EAF0] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: Mobile Menu Trigger + Context Info */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-lg text-[#697386] hover:text-[#172033] hover:bg-[#F8F9FC]"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {!isAdminRoute && activeBusiness ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-semibold text-[#172033] truncate">
              {activeBusiness.businessName}
            </span>
            <span className="hidden sm:inline-block text-[#D1D8E4]">•</span>
            <span className="hidden sm:inline-block text-xs text-[#697386] truncate">
              {activeBusiness.businessType} ({activeBusiness.city})
            </span>
            {activeBusiness.gstinVerifiedStatus === 'ACTIVE' && (
              <StatusBadge variant="success" className="hidden md:inline-flex">
                GST Verified
              </StatusBadge>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#142B4A]">
              Enterprise Operations & Governance Portal
            </span>
          </div>
        )}
      </div>

      {/* Right: Portal Switcher, Discreet Demo Controls, Notifications, Help, Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Discreet Demo Controls Entry Point */}
        <button
          type="button"
          onClick={() => setDemoControlsOpen(!demoControlsOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#697386] hover:text-[#172033] hover:bg-[#F8F9FC] border border-[#E6EAF0] transition"
          title="Open Demo Controls, Scenarios & Role Switcher (Alt+D)"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#2563EB]" />
          <span className="hidden sm:inline">Demo Controls</span>
        </button>

        {/* Portal Switcher */}
        <Link
          to={isAdminRoute ? '/' : '/admin'}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F8F9FC] hover:bg-[#E8F0FF] text-[#142B4A] hover:text-[#2563EB] border border-[#E6EAF0] transition"
        >
          <span>{isAdminRoute ? 'Customer Portal' : 'Operations Portal'}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            className="relative p-2 rounded-lg text-[#697386] hover:text-[#172033] hover:bg-[#F8F9FC] transition"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2563EB]" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E6EAF0] rounded-2xl shadow-elevated z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 bg-[#F8F9FC] border-b border-[#E6EAF0] flex items-center justify-between">
                <span className="font-semibold text-xs text-[#172033]">
                  Activity & Notifications ({notifications.length})
                </span>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="text-[#697386] hover:text-[#172033]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-[#E6EAF0]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#697386]">
                    No new notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.notificationId} className="p-3.5 hover:bg-[#F8F9FC] transition">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-xs text-[#172033]">{n.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8F0FF] text-[#2563EB] font-medium">
                          {n.channelSimulated?.replace('_SIMULATED', '')}
                        </span>
                      </div>
                      <p className="text-xs text-[#697386] leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl hover:bg-[#F8F9FC] border border-transparent hover:border-[#E6EAF0] transition"
          >
            <div className="w-7 h-7 rounded-full bg-[#E8F0FF] text-[#2563EB] flex items-center justify-center text-xs font-bold">
              {(user?.name || activeBusiness?.contactName || 'U')[0]}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-[#172033] leading-none">
                {user?.role === 'Customer'
                  ? activeBusiness?.contactName || user?.name
                  : user?.name || 'User'}
              </div>
              <div className="text-[10px] text-[#697386] mt-0.5">{user?.role || 'Customer'}</div>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E6EAF0] rounded-2xl shadow-elevated z-50 p-2 animate-fade-in">
              <div className="px-3 py-2 border-b border-[#E6EAF0]">
                <div className="text-xs font-semibold text-[#172033]">{user?.name}</div>
                <div className="text-[11px] text-[#697386]">{user?.email}</div>
                <div className="mt-1">
                  <StatusBadge variant="info">{user?.role}</StatusBadge>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#172033] hover:bg-[#F8F9FC]"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#697386]" />
                  <span>Business Profile</span>
                </Link>
                <Link
                  to="/privacy"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#172033] hover:bg-[#F8F9FC]"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#697386]" />
                  <span>Privacy & Security Centre</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setDemoControlsOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#2563EB] hover:bg-[#E8F0FF]/50 font-medium"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Switch Role or Scenario...</span>
                </button>
              </div>

              <div className="pt-1 border-t border-[#E6EAF0] px-2 py-1">
                <div className="text-[10px] font-semibold uppercase text-[#8C96A8] px-1 mb-1">
                  Quick Role Switch
                </div>
                <div className="flex flex-wrap gap-1">
                  {(['Customer', 'Sales Executive', 'Channel Partner', 'KYC Reviewer', 'Admin'] as UserRole[]).map(
                    (r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          switchRole(r);
                          setProfileOpen(false);
                          if (r !== 'Customer') navigate('/admin');
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                          user?.role === r
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F8F9FC] hover:bg-[#E8F0FF] text-[#172033]'
                        }`}
                      >
                        {r}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// DISCREET DEMO CONTROLS DRAWER
// ============================================================================

export const DemoControlsDrawer: React.FC = () => {
  const {
    demoControlsOpen,
    setDemoControlsOpen,
    scenarios,
    activeScenario,
    activeBusiness,
    loadScenario,
    resetDemoData,
    loadingScenario,
    user,
    switchRole,
    loginWithCredentials,
    guidedStepIndex,
    setGuidedStepIndex,
  } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('customer@udyamone.in');
  const [password, setPassword] = useState('demo123');

  if (!demoControlsOpen) return null;

  const handleSelectScenario = async (scen: any) => {
    const data = await loadScenario(scen.scenarioId);
    setDemoControlsOpen(false);
    if (data?.scenario?.recommendedStepRoute) {
      navigate(data.scenario.recommendedStepRoute);
    }
  };

  const handleGuidedStep = (index: number) => {
    const bounded = Math.max(0, Math.min(GUIDED_TOUR_STEPS.length - 1, index));
    setGuidedStepIndex(bounded);
    navigate(GUIDED_TOUR_STEPS[bounded].path);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await loginWithCredentials(email, password);
    if (ok) setDemoControlsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-[#142B4A]/35 backdrop-blur-xs"
        onClick={() => setDemoControlsOpen(false)}
      />
      <div className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl border-l border-[#E6EAF0] flex flex-col overflow-hidden animate-fade-in">
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-[#142B4A] text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#80ACFF]" />
              <h2 className="text-sm font-semibold">Demo & Environment Controls</h2>
            </div>
            <p className="text-[11px] text-white/70 mt-0.5">
              Switch scenarios, roles, guided tour steps, or reset seed data (Shortcut: Alt+D)
            </p>
          </div>
          <button
            onClick={() => setDemoControlsOpen(false)}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* 1. Role Switcher */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#172033] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#2563EB]" />
                Active Role (Real Signed JWT)
              </span>
              <StatusBadge variant="info">{user?.role || 'Customer'}</StatusBadge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { role: 'Customer', email: 'customer@udyamone.in' },
                  { role: 'Sales Executive', email: 'sales@udyamone.in' },
                  { role: 'Channel Partner', email: 'partner@udyamone.in' },
                  { role: 'KYC Reviewer', email: 'kyc@udyamone.in' },
                  { role: 'Admin', email: 'admin@udyamone.in' },
                ] as const
              ).map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => {
                    switchRole(item.role);
                    setEmail(item.email);
                    if (item.role !== 'Customer') {
                      navigate('/admin');
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    user?.role === item.role
                      ? 'bg-[#E8F0FF] border-[#2563EB] text-[#142B4A] font-semibold'
                      : 'bg-[#F8F9FC] hover:bg-white border-[#E6EAF0] text-[#172033]'
                  }`}
                >
                  <div>{item.role}</div>
                  <div className="text-[10px] text-[#697386] font-mono truncate">{item.email}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Guided Tour Stepper */}
          <div className="space-y-2.5 pt-4 border-t border-[#E6EAF0]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#172033]">Guided Walkthrough</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleGuidedStep(guidedStepIndex - 1)}
                  disabled={guidedStepIndex <= 0}
                  className="p-1 rounded border border-[#E6EAF0] hover:bg-[#F8F9FC] disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[11px] text-[#697386]">
                  {guidedStepIndex + 1} / {GUIDED_TOUR_STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleGuidedStep(guidedStepIndex + 1)}
                  disabled={guidedStepIndex >= GUIDED_TOUR_STEPS.length - 1}
                  className="p-1 rounded border border-[#E6EAF0] hover:bg-[#F8F9FC] disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0]">
              <div className="font-semibold text-[#2563EB]">
                {GUIDED_TOUR_STEPS[guidedStepIndex]?.label}
              </div>
              <p className="text-[11px] text-[#697386] mt-0.5">
                {GUIDED_TOUR_STEPS[guidedStepIndex]?.desc}
              </p>
            </div>
          </div>

          {/* 3. 8 Repeatable Demo Scenarios */}
          <div className="space-y-2.5 pt-4 border-t border-[#E6EAF0]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#172033]">8 Seeded Demo Scenarios</span>
              <button
                type="button"
                onClick={resetDemoData}
                disabled={loadingScenario}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8F9FC] hover:bg-[#E8F0FF] text-[#142B4A] border border-[#E6EAF0] font-medium transition"
              >
                <RotateCcw className={`w-3 h-3 ${loadingScenario ? 'animate-spin' : ''}`} />
                <span>Reset Seed Data</span>
              </button>
            </div>

            <div className="space-y-2">
              {scenarios.map((scen) => {
                const isSelected = activeScenario?.scenarioId === scen.scenarioId;
                return (
                  <button
                    key={scen.scenarioId}
                    type="button"
                    onClick={() => handleSelectScenario(scen)}
                    disabled={loadingScenario}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? 'bg-[#E8F0FF]/70 border-[#2563EB]'
                        : 'bg-white hover:bg-[#F8F9FC] border-[#E6EAF0]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#172033]">{scen.title}</span>
                      <span className="px-2 py-0.5 rounded bg-[#F8F9FC] border border-[#E6EAF0] text-[#2563EB] text-[10px] font-medium shrink-0">
                        {scen.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#697386] mt-0.5">{scen.subtitle}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Direct Credential Login */}
          <form onSubmit={handleLogin} className="space-y-3 pt-4 border-t border-[#E6EAF0]">
            <div className="font-semibold text-[#172033] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#2563EB]" />
              Authenticate with Credentials
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="px-3 py-1.5 border border-[#E6EAF0] rounded-lg text-xs"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="px-3 py-1.5 border border-[#E6EAF0] rounded-lg text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-[#142B4A] hover:bg-[#1E3F6B] text-white font-medium text-xs transition"
            >
              Sign In with Credentials
            </button>
          </form>

          {/* 5. Environment Metadata */}
          <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E6EAF0] text-[11px] text-[#697386] space-y-1">
            <div>
              <strong className="text-[#172033]">Dataset Reference Date:</strong> 2026-07-15
            </div>
            <div>
              <strong className="text-[#172033]">Active Business ID:</strong>{' '}
              <code className="font-mono">{activeBusiness?.businessId || 'BIZ-SCEN-01'}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// APP SHELL (LAYOUT EXPORT)
// ============================================================================

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, dismissToast } = useApp();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex bg-[#F8F9FC] text-[#172033]">
      {/* Sidebar: Strictly separated between Customer and Admin portals */}
      {isAdminRoute ? (
        <AdminSidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      ) : (
        <CustomerSidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavigation
          onOpenMobileNav={() => setMobileNavOpen(true)}
          isAdminRoute={isAdminRoute}
        />

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
          {children}
        </main>

        <footer className="border-t border-[#E6EAF0] bg-white px-4 sm:px-8 py-4 text-xs text-[#697386]">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              <span>
                <strong className="text-[#172033]">Udyam One</strong> — Enterprise Connectivity, Cloud & Security Platform for Indian Businesses
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-[#172033] transition">
                Privacy & DPDP Compliance
              </Link>
              <Link to="/active-services" className="hover:text-[#172033] transition">
                Support Desk
              </Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Discreet Demo Controls Slide-Over */}
      <DemoControlsDrawer />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export const Layout = AppShell;
