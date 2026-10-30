import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, Database, Cookie, Eye, UserCheck, HelpCircle } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export const PrivacyPolicy = () => {
  usePageMeta(
    'Privacy Policy',
    'Understand how the Rentify academic prototype manages browser storage, user-submitted demo data, and privacy boundaries.'
  );

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-paper-border bg-paper-sheet px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-seal flex items-center justify-center text-paper-sheet shadow-stamp group-hover:bg-seal-dark transition-colors">
            <Shield className="w-5 h-5 text-ochre-light" />
          </div>
          <div>
            <span className="font-serif text-xl font-bold text-ink-900 group-hover:text-seal transition-colors">
              Rentify
            </span>
            <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-seal font-semibold bg-seal-tint px-1.5 py-0.5 rounded border border-seal/20">
              PRIVACY POLICY
            </span>
          </div>
        </Link>
        <Link
          to="/"
          className="text-xs font-medium text-ink-600 hover:text-seal flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Overview
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        <div className="bg-paper-sheet border border-paper-border rounded-2xl p-6 sm:p-10 shadow-sheet space-y-8">
          
          {/* Title & Metadata */}
          <div className="border-b border-paper-border pb-6">
            <span className="text-[11px] font-mono uppercase tracking-widest text-ochre font-bold">
              PROTOTYPE DATA POLICY &amp; DISCLOSURE
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mt-2">
              Privacy Policy
            </h1>
            <p className="text-xs text-ink-500 mt-2">
              Effective Date: Academic Session 2026 • Platform Status: Demonstration Prototype
            </p>
          </div>

          {/* Prototype Transparency Notice */}
          <div className="p-4 rounded-xl bg-seal-tint border border-seal/20 text-seal-dark text-xs leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-2 text-ink-900">
              <Lock className="w-4 h-4 text-seal" />
              Honest Prototype Notice
            </p>
            <p className="text-ink-700">
              Rentify is currently operated as an academic idea lab prototype. This document transparently explains how your data is handled on the client side. We do not claim server-side encryption or automatic cloud deletion where backend infrastructure has not yet been deployed.
            </p>
          </div>

          {/* Section 1: Information Collected */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-seal" />
              1. Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              In this prototype release, information is entered locally for demonstration purposes:
            </p>
            <ul className="text-xs sm:text-sm text-ink-600 space-y-2 list-disc pl-5">
              <li>
                <strong>Demonstration Profile Selection:</strong> Selected demo personas (Customer, Vendor, Admin Registrar, or Verification Partner) or custom guest names entered in the demo access console.
              </li>
              <li>
                <strong>Property Submission Mock Data:</strong> Property title, locality, expected rent, Model Tenancy Act deposit amounts, simulated Index II document reference numbers, and simulated utility bill details submitted in the Vendor portal.
              </li>
              <li>
                <strong>Renter Feedback &amp; Inquiries:</strong> Simulated move-in reviews, landlord rating notes, and inquiry messages submitted in the Customer workspace.
              </li>
            </ul>
          </section>

          {/* Section 2: Storage Mechanisms */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <Cookie className="w-5 h-5 text-ochre" />
              2. Cookies &amp; Browser Local Storage
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              Rentify currently uses browser <code className="font-mono text-xs bg-paper-subtle px-1.5 py-0.5 rounded border border-paper-border">localStorage</code> rather than HTTP cookies for session continuity. Specifically, the following storage keys are maintained on your machine:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-paper rounded-lg border border-paper-border">
                <code className="font-mono font-bold text-seal">rentify_listings_storage_v1</code>
                <p className="text-ink-600 mt-1">Preserves property listings and status transitions (Pending → In-Review → Verified).</p>
              </div>
              <div className="p-3 bg-paper rounded-lg border border-paper-border">
                <code className="font-mono font-bold text-seal">rentify_auth_user_v1</code>
                <p className="text-ink-600 mt-1">Remembers your active demo persona between page reloads.</p>
              </div>
              <div className="p-3 bg-paper rounded-lg border border-paper-border">
                <code className="font-mono font-bold text-seal">rentify_audit_log_storage_v1</code>
                <p className="text-ink-600 mt-1">Stores the simulated registrar and partner deed verification logs.</p>
              </div>
              <div className="p-3 bg-paper rounded-lg border border-paper-border">
                <code className="font-mono font-bold text-seal">rentify_cookie_consent_v1</code>
                <p className="text-ink-600 mt-1">Stores your privacy choices for essential storage and anonymous analytics.</p>
              </div>
            </div>
          </section>

          {/* Section 3: Analytics */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-seal" />
              3. Analytics &amp; Diagnostics
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              If enabled via the consent banner, Rentify may log anonymous interaction events (such as filter searches or assistance guide tab views) to optimize usability. We strictly do not record phone numbers, Aadhaar credentials, financial values, or identifying document numbers in analytics events.
            </p>
          </section>

          {/* Section 4: Data Retention & Reset */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-seal" />
              4. Data Retention &amp; User Control
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              Because all state is held client-side in your local browser, you retain full control over your data:
            </p>
            <ul className="text-xs sm:text-sm text-ink-600 space-y-1.5 list-disc pl-5">
              <li>You can reset the demo state at any time by clicking the <strong>"Reset Demo"</strong> action in the top role bar.</li>
              <li>You can clear your browser storage or site cookies via your browser settings at any time to purge all local records.</li>
            </ul>
          </section>

          {/* Section 5: Security Limitations */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-brick" />
              5. Security Boundaries of the Prototype
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              Please note that frontend route guards do not substitute for server-side authorization. Do not enter real government document numbers, real bank account numbers, or authentic Aadhaar credentials into this demonstration environment.
            </p>
          </section>

          {/* Section 6: Contact Information */}
          <section className="space-y-3 border-t border-paper-border pt-6">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-seal" />
              6. Contact &amp; Academic Inquiries
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              For questions regarding the architecture, verification workflow research, or feedback on this prototype, please contact the development team at:
            </p>
            <div className="p-4 bg-paper rounded-xl border border-paper-border text-xs text-ink-700 space-y-1">
              <p><strong>Project:</strong> Rentify – One-Stop Rental Assistance Platform</p>
              <p><strong>Department:</strong> Idea Lab / Computer Science &amp; Engineering</p>
              <p><strong>Faculty Advisor / Project Lead:</strong> [Academic Review Board / Faculty Guide Placeholder]</p>
              <p><strong>Contact Email:</strong> [contact@rentify-academic-demo.internal placeholder]</p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-paper-border py-4 text-center text-xs text-ink-500">
        <p>Rentify — One-Stop Rental Assistance Platform • Academic Idea Lab Project</p>
        <div className="flex items-center justify-center gap-4 mt-1 text-[11px]">
          <Link to="/" className="hover:text-seal underline">Overview</Link>
          <Link to="/terms" className="hover:text-seal underline">Terms &amp; Conditions</Link>
          <Link to="/assistance" className="hover:text-seal underline">Rental Legal Guide</Link>
        </div>
      </footer>
    </div>
  );
};
