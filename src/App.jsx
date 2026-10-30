import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RentifyProvider } from './context/RentifyContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';

// Code Splitting with React.lazy for high performance and reduced initial bundle size
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const CustomerHome = lazy(() => import('./pages/CustomerHome').then(m => ({ default: m.CustomerHome })));
const PropertyDetails = lazy(() => import('./pages/PropertyDetails').then(m => ({ default: m.PropertyDetails })));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard').then(m => ({ default: m.VendorDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PartnerPortal = lazy(() => import('./pages/PartnerPortal').then(m => ({ default: m.PartnerPortal })));
const AssistanceGuide = lazy(() => import('./pages/AssistanceGuide').then(m => ({ default: m.AssistanceGuide })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Accessible loading skeleton for route suspense transitions
const PageLoadingFallback = () => (
  <div 
    role="status" 
    aria-live="polite" 
    className="min-h-screen bg-paper flex flex-col items-center justify-center p-6"
  >
    <div className="w-12 h-12 rounded-xl bg-seal-tint border border-seal/30 flex items-center justify-center animate-pulse mb-4">
      <div className="w-5 h-5 rounded-full border-2 border-seal border-t-transparent animate-spin" />
    </div>
    <p className="font-serif text-sm font-semibold text-ink-800">Loading Rentify Workspace...</p>
    <p className="text-xs text-ink-500 mt-1">Verifying registry cache and interface state</p>
  </div>
);

function App() {
  return (
    <RentifyProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* 1. Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* 2. Public Demo Access & Authentication Console */}
            <Route path="/login" element={<LoginPage />} />

            {/* 3. Public Legal & Disclosure Pages */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsPage />} />

            {/* 4. Protected Authenticated Routes inside Persistent App Shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Customer Routes */}
                <Route path="/customer" element={<CustomerHome />} />
                <Route path="/property/:id" element={<PropertyDetails />} />

                {/* Vendor Dashboard */}
                <Route path="/vendor" element={<VendorDashboard />} />

                {/* Admin Registrar Desk */}
                <Route path="/admin" element={<AdminDashboard />} />

                {/* Verification Partner Portal */}
                <Route path="/partner" element={<PartnerPortal />} />

                {/* Rental Assistance Hub */}
                <Route path="/assistance" element={<AssistanceGuide />} />
              </Route>
            </Route>

            {/* 5. Custom 404 Route for Unmatched Paths */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>

        {/* Global Privacy & Cookie Consent Banner */}
        <CookieConsentBanner />
      </BrowserRouter>
    </RentifyProvider>
  );
}

export default App;
