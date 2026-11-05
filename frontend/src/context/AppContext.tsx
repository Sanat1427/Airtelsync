import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export type UserRole = 'Customer' | 'Sales Executive' | 'Channel Partner' | 'Admin' | 'KYC Reviewer';

export type AdminSection =
  | 'OVERVIEW'
  | 'LEADS'
  | 'SCORING'
  | 'KYC_REVIEW'
  | 'ORDER_OPS'
  | 'INSTALLATIONS'
  | 'PARTNERS'
  | 'CATALOGUE'
  | 'AI_EVAL'
  | 'AUDIT_LOGS';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  user: { id: string; email: string; name: string; role: UserRole; preferredLanguage?: string } | null;
  scenarios: any[];
  activeScenario: any | null;
  activeBusiness: any | null;
  activeAssessment: any | null;
  activeRecommendation: any | null;
  activeQuote: any | null;
  activeKyc: any | null;
  activeOrder: any | null;
  products: any[];
  notifications: any[];
  toasts: ToastMessage[];
  loadingScenario: boolean;
  guidedStepIndex: number;
  setGuidedStepIndex: (idx: number) => void;
  demoControlsOpen: boolean;
  setDemoControlsOpen: (open: boolean) => void;
  adminSection: AdminSection;
  setAdminSection: (sec: AdminSection) => void;
  showToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  dismissToast: (id: string) => void;
  switchRole: (role: UserRole) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<boolean>;
  loadScenario: (scenarioId: string) => Promise<any>;
  resetDemoData: () => Promise<void>;
  refreshBusinessData: (businessId?: string) => Promise<void>;
  setActiveBusiness: (b: any) => void;
  setActiveAssessment: (a: any) => void;
  setActiveRecommendation: (r: any) => void;
  setActiveQuote: (q: any) => void;
  setActiveKyc: (k: any) => void;
  setActiveOrder: (o: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppContextType['user']>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [activeScenario, setActiveScenario] = useState<any | null>(null);
  const [activeBusiness, setActiveBusiness] = useState<any | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<any | null>(null);
  const [activeRecommendation, setActiveRecommendation] = useState<any | null>(null);
  const [activeQuote, setActiveQuote] = useState<any | null>(null);
  const [activeKyc, setActiveKyc] = useState<any | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loadingScenario, setLoadingScenario] = useState<boolean>(false);
  const [guidedStepIndex, setGuidedStepIndex] = useState<number>(0);
  const [demoControlsOpen, setDemoControlsOpen] = useState<boolean>(false);
  const [adminSection, setAdminSection] = useState<AdminSection>('OVERVIEW');

  const showToast = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchNotifications = useCallback(async (businessId?: string) => {
    try {
      const res = await api.get('/notifications', {
        params: businessId ? { businessId } : undefined,
      });
      setNotifications(res.data.notifications || []);
    } catch {
      // ignore
    }
  }, []);

  const switchRole = useCallback(
    async (role: UserRole) => {
      try {
        const res = await api.post('/auth/switch-role', { role });
        localStorage.setItem('udyam_one_token', res.data.token);
        setUser(res.data.user);
        showToast('info', `Switched Role to ${role}`, `Signed in as ${res.data.user.name}`);
      } catch (err: any) {
        showToast('error', 'Role Switch Failed', err.response?.data?.error || err.message);
      }
    },
    [showToast]
  );

  const loginWithCredentials = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('udyam_one_token', res.data.token);
        setUser(res.data.user);
        showToast('success', 'Authenticated Successfully', `Welcome back, ${res.data.user.name}`);
        return true;
      } catch (err: any) {
        showToast('error', 'Login Failed', err.response?.data?.error || 'Invalid credentials');
        return false;
      }
    },
    [showToast]
  );

  const loadScenario = useCallback(
    async (scenarioId: string) => {
      setLoadingScenario(true);
      try {
        const res = await api.post(`/demo/scenarios/${scenarioId}/load`);
        const { scenario, business, assessment, recommendation, quote, kyc, order } = res.data;
        setActiveScenario(scenario);
        setActiveBusiness(business);
        setActiveAssessment(assessment);
        setActiveRecommendation(recommendation);
        setActiveQuote(quote);
        setActiveKyc(kyc);
        setActiveOrder(order);
        await fetchNotifications(business?.businessId);
        showToast(
          'success',
          `Loaded ${scenario.title}`,
          `${business?.businessName} (${business?.city}, Tier-${business?.cityTier})`
        );
        return res.data;
      } catch (err: any) {
        showToast('error', 'Failed to Load Scenario', err.response?.data?.error || err.message);
        return null;
      } finally {
        setLoadingScenario(false);
      }
    },
    [fetchNotifications, showToast]
  );

  const refreshBusinessData = useCallback(
    async (businessId?: string) => {
      const targetId = businessId || activeBusiness?.businessId || 'BIZ-SCEN-01';
      try {
        const [bizRes, quoteRes, kycRes, ordRes] = await Promise.all([
          api.get(`/business/${targetId}`).catch(() => null),
          api.get(`/quotes/${targetId}`).catch(() => null),
          api.get(`/kyc/${targetId}/status`).catch(() => null),
          api.get(`/orders/${targetId}`).catch(() => null),
        ]);
        if (bizRes?.data?.business) setActiveBusiness(bizRes.data.business);
        if (quoteRes?.data?.quote) setActiveQuote(quoteRes.data.quote);
        if (kycRes?.data?.kycApplication) setActiveKyc(kycRes.data.kycApplication);
        if (ordRes?.data?.order) setActiveOrder(ordRes.data.order);
        await fetchNotifications(targetId);
      } catch {
        // ignore
      }
    },
    [activeBusiness?.businessId, fetchNotifications]
  );

  const resetDemoData = useCallback(async () => {
    setLoadingScenario(true);
    try {
      await api.post('/demo/reset');
      await loadScenario('SCENARIO_1');
      showToast('success', 'Demo Environment Reset', 'All 8 seeded scenarios restored to clean state.');
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.message);
    } finally {
      setLoadingScenario(false);
    }
  }, [loadScenario, showToast]);

  // Initial bootstrap
  useEffect(() => {
    (async () => {
      try {
        const [scenRes, prodRes, authRes] = await Promise.all([
          api.get('/demo/scenarios'),
          api.get('/products'),
          api.post('/auth/switch-role', { role: 'Customer' }),
        ]);
        setScenarios(scenRes.data.scenarios || []);
        setProducts(prodRes.data.products || []);
        if (authRes.data.token) {
          localStorage.setItem('udyam_one_token', authRes.data.token);
          setUser(authRes.data.user);
        }
        await loadScenario('SCENARIO_1');
      } catch (err) {
        console.error('Initial bootstrap error:', err);
      }
    })();
  }, []);

  // Keyboard shortcut Alt+D to toggle Demo Controls panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'd') || ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        setDemoControlsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        scenarios,
        activeScenario,
        activeBusiness,
        activeAssessment,
        activeRecommendation,
        activeQuote,
        activeKyc,
        activeOrder,
        products,
        notifications,
        toasts,
        loadingScenario,
        guidedStepIndex,
        setGuidedStepIndex,
        demoControlsOpen,
        setDemoControlsOpen,
        adminSection,
        setAdminSection,
        showToast,
        dismissToast,
        switchRole,
        loginWithCredentials,
        loadScenario,
        resetDemoData,
        refreshBusinessData,
        setActiveBusiness,
        setActiveAssessment,
        setActiveRecommendation,
        setActiveQuote,
        setActiveKyc,
        setActiveOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
