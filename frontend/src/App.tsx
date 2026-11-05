import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { BusinessProfilePage } from './pages/BusinessProfilePage';
import { ReadinessAssessmentPage } from './pages/ReadinessAssessmentPage';
import { AIAdvisorPage } from './pages/AIAdvisorPage';
import { BundleComparisonPage } from './pages/BundleComparisonPage';
import { FeasibilityAndCheckoutPage } from './pages/FeasibilityAndCheckoutPage';
import { SmartKYCPage } from './pages/SmartKYCPage';
import { OrderTrackerPage } from './pages/OrderTrackerPage';
import { ActiveServicesPage } from './pages/ActiveServicesPage';
import { AdminPortalPage } from './pages/AdminPortalPage';
import { PrivacySecurityPage } from './pages/PrivacySecurityPage';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/profile" element={<BusinessProfilePage />} />
            <Route path="/readiness" element={<ReadinessAssessmentPage />} />
            <Route path="/advisor" element={<AIAdvisorPage />} />
            <Route path="/recommendations" element={<BundleComparisonPage />} />
            <Route path="/bundles" element={<BundleComparisonPage />} />
            <Route path="/feasibility" element={<FeasibilityAndCheckoutPage />} />
            <Route path="/kyc" element={<SmartKYCPage />} />
            <Route path="/orders" element={<OrderTrackerPage />} />
            <Route path="/active-services" element={<ActiveServicesPage />} />
            <Route path="/admin" element={<AdminPortalPage />} />
            <Route path="/privacy" element={<PrivacySecurityPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
