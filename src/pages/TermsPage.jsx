import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Scale, AlertOctagon, FileCheck, CheckCircle2, HelpCircle } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export const TermsPage = () => {
  usePageMeta(
    'Terms and Conditions',
    'Terms of use, academic demonstration boundaries, and property verification disclaimers for the Rentify platform.'
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
              TERMS &amp; CONDITIONS
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
          
          {/* Header */}
          <div className="border-b border-paper-border pb-6">
            <span className="text-[11px] font-mono uppercase tracking-widest text-ochre font-bold">
              ACADEMIC PROTOTYPE TERMS OF SERVICE
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mt-2">
              Terms &amp; Conditions
            </h1>
            <p className="text-xs text-ink-500 mt-2">
              Version 1.0 • Academic Research Release 2026
            </p>
          </div>

          {/* Prototype Limitation Banner */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-700" />
              Evaluation Disclaimer
            </p>
            <p>
              Rentify is a concept evaluation and coursework project. It does not execute legally binding tenancy contracts, process real banking transactions, or replace official state land registry searches (IGR Maharashtra).
            </p>
          </div>

          {/* Section 1: Permitted Use */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-seal" />
              1. Permitted Demonstration Use
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              By accessing Rentify, you acknowledge that you are interacting with a software prototype created to evaluate renter-centric verification mechanisms, Model Tenancy Act (MTA) compliance calculators, and civic safety scoring. Access is granted solely for testing, demonstration, and academic review.
            </p>
          </section>

          {/* Section 2: Verification Statuses */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-seal" />
              2. Meaning and Scope of "Verification" Statuses
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              The verification badges ("Verified Title Deed", "Inked Verification Seal", "IGR Maharashtra Cross-Checked") displayed on properties reflect the simulated output of our prototype audit pipeline:
            </p>
            <ul className="text-xs sm:text-sm text-ink-600 space-y-1.5 list-disc pl-5">
              <li>
                <strong>Pending Review:</strong> Listing submitted by vendor with uploaded document metadata; pending registrar cross-examination.
              </li>
              <li>
                <strong>In-Review:</strong> Assigned to a simulated field verification partner for physical inspection.
              </li>
              <li>
                <strong>Verified:</strong> Demonstrates successful completion of the simulated multi-tier check (Index II deed match, meter reading, owner KYC).
              </li>
            </ul>
            <p className="text-xs text-ink-500 mt-2 italic">
              Notice: The prototype does not guarantee actual property ownership, physical safety, or freedom from title defects in the real world. Real estate transactions must always be validated via official government registry portals.
            </p>
          </section>

          {/* Section 3: Model Tenancy Act Guidelines */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-ochre" />
              3. Model Tenancy Act (MTA) &amp; Legal Guidance
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              Information provided in the <em>Rental Assistance &amp; Legal Guide</em> regarding deposit caps (maximum two months' rent for residential properties), notice periods, and rent tribunal processes is for educational guidance only. It does not constitute formal legal counsel.
            </p>
          </section>

          {/* Section 4: Prohibited Conduct */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-brick" />
              4. Prohibited Submissions
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              Users and evaluators agree not to submit authentic personal documents, unmasked government Aadhaar numbers, real banking passwords, or defamatory reviews into the demonstration forms.
            </p>
          </section>

          {/* Section 5: Limitation of Liability */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-seal" />
              5. Limitation of Liability
            </h2>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              The project creators, faculty advisors, and institution make no warranties, express or implied, regarding the platform's suitability for commercial leasing. In no event shall the authors be liable for damages resulting from reliance on mock data or simulated audit results.
            </p>
          </section>

          {/* Section 6: Contact */}
          <section className="space-y-3 border-t border-paper-border pt-6">
            <h2 className="font-serif text-lg font-bold text-ink-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-seal" />
              6. Governance &amp; Contact
            </h2>
            <div className="p-4 bg-paper rounded-xl border border-paper-border text-xs text-ink-700 space-y-1">
              <p><strong>Institution:</strong> Idea Lab Academic Initiative</p>
              <p><strong>Jurisdiction of Research:</strong> Maharashtra, India</p>
              <p><strong>Legal Review Status:</strong> Coursework Demonstration Prototype [Pre-Commercial Review Pending]</p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-paper-border py-4 text-center text-xs text-ink-500">
        <p>Rentify — One-Stop Rental Assistance Platform • Academic Idea Lab Project</p>
        <div className="flex items-center justify-center gap-4 mt-1 text-[11px]">
          <Link to="/" className="hover:text-seal underline">Overview</Link>
          <Link to="/privacy" className="hover:text-seal underline">Privacy Policy</Link>
          <Link to="/assistance" className="hover:text-seal underline">Rental Legal Guide</Link>
        </div>
      </footer>
    </div>
  );
};
