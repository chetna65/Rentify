import React from 'react';
import { useRentify } from '../context/RentifyContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Building2, ShieldAlert, CheckCircle2, Shield,
  ArrowRight, Check, Compass, BookOpen
} from 'lucide-react';
import { VerificationSeal } from '../components/common/VerificationSeal';
import { usePageMeta } from '../hooks/usePageMeta';
import { trackEvent } from '../utils/analytics';

export const LandingPage = () => {
  usePageMeta(
    'Verified Rental Housing & Tenant Assistance',
    'Rentify connects renters with deed-verified properties, Model Tenancy Act deposit compliance, and physical on-site partner audits.'
  );

  const { loginAsDemoUser, counts } = useRentify();
  const navigate = useNavigate();

  const handleRoleSelect = (roleId, targetPath) => {
    trackEvent('landing_role_select', { roleId, targetPath });
    loginAsDemoUser(roleId);
    navigate(targetPath);
  };

  const handlePrimaryCta = () => {
    trackEvent('landing_primary_cta_click', { destination: '/customer' });
    loginAsDemoUser('customer');
    navigate('/customer');
  };

  const roleCards = [
    {
      id: 'customer',
      title: 'Customer / Renter Workspace',
      persona: 'Rahul Verma (Scholar / Tech Intern)',
      oneLiner: 'Search deed-verified listings, evaluate proximity & safety scores, check Model Tenancy Act deposit caps, and read scam alerts.',
      icon: Users,
      path: '/customer',
      badgeText: `${counts.verified} Verified Listings`,
      badgeStyle: 'bg-seal-tint text-seal-dark border-seal/30',
      btnLabel: 'Launch Customer Search',
      btnStyle: 'bg-seal hover:bg-seal-dark text-white',
      duties: [
        'Explore rentals with verified Index II / 7/12 land registry dockets',
        'Compare civic safety ratings and transit corridor distances',
        'Audit MTA 2-month deposit compliance & post move-in reviews'
      ]
    },
    {
      id: 'vendor',
      title: 'Vendor / Owner Dashboard',
      persona: 'Rajesh M. Sharma (Property Owner, Nagpur)',
      oneLiner: 'Submit rental flats with ownership documents (Index II deed, 7/12 extract, tax receipts) and Aadhaar KYC, then track verification milestones.',
      icon: Building2,
      path: '/vendor',
      badgeText: `${counts.total} Properties Managed`,
      badgeStyle: 'bg-ochre-tint text-ochre-dark border-ochre-border',
      btnLabel: 'Launch Vendor Dashboard',
      btnStyle: 'bg-ochre hover:bg-ochre-dark text-white',
      duties: [
        'Attach simulated Index II deed & electricity utility receipts',
        'Auto-calculate MTA-capped 2-month security deposits',
        'Track live audit stages: Pending → In-Review → Inked Seal'
      ]
    },
    {
      id: 'admin',
      title: 'Admin Registrar Console',
      persona: 'Arvind Mehta (Chief Registrar, Integrity Desk)',
      oneLiner: 'Audit submitted title deeds against government land registries (IGR Maharashtra), waive or assign field inspection visits, and flag fraudulent listings.',
      icon: ShieldAlert,
      path: '/admin',
      badgeText: `${counts.pending} Awaiting Review`,
      badgeAlert: counts.pending > 0,
      badgeStyle: counts.pending > 0 ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' : 'bg-paper-subtle text-ink-600 border-paper-border',
      btnLabel: 'Launch Admin Review Console',
      btnStyle: 'bg-ink-900 hover:bg-ink-800 text-white',
      duties: [
        'Cross-check ownership deeds against IGR Maharashtra public registries',
        'Directly flag fraudulent listings (fake owners / token deposit bait)',
        'Assign field verification officers based on locality zones'
      ]
    },
    {
      id: 'partner',
      title: 'Verification Partner Portal',
      persona: 'Amit Patil (Field Officer, VP-042)',
      oneLiner: 'Conduct mandatory on-site physical audits (GPS tagging, original deed check, vacancy inspection, owner meeting) to issue the official Rentify Inked Seal.',
      icon: CheckCircle2,
      path: '/partner',
      badgeText: `${counts.inReview} Visits Pending`,
      badgeAlert: counts.inReview > 0,
      badgeStyle: counts.inReview > 0 ? 'bg-seal-tint text-seal-dark border-seal/30 font-bold' : 'bg-paper-subtle text-ink-600 border-paper-border',
      btnLabel: 'Launch Field Partner Portal',
      btnStyle: 'bg-seal hover:bg-seal-dark text-white',
      duties: [
        'Perform on-site GPS verification and physical key testing',
        'Verify registered owner identity face-to-face',
        'Officially stamp the unique Inked Seal certificate or flag discrepancies'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-paper text-ink-900 flex flex-col justify-between">
      <div>
        {/* Academic & Institutional Header Bar */}
        <div className="bg-paper-sheet border-b border-paper-border py-2.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-ink-600">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold text-seal bg-seal-tint px-2 py-0.5 rounded border border-seal/30">
                IDEA LAB PROJECT • SEMESTER V
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-ink-300">|</span>
              <Link to="/assistance" className="text-seal hover:underline font-medium">
                Legal &amp; Research Dossier
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Section with ONE CLEAR PRIMARY CALL TO ACTION */}
        <section className="bg-paper-sheet border-b border-paper-border py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-seal-tint border border-seal/20 text-seal-dark text-xs font-semibold shadow-sm">
              <Shield className="w-3.5 h-3.5 text-ochre-light" />
              <span>Deed-Verified Rentals • Model Tenancy Act Compliance</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-ink-900 tracking-tight leading-[1.15]">
              Renter-Centric Housing Backed by <br className="hidden sm:inline" />
              <span className="text-seal">Government Land Registry</span> Proof
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-lg text-ink-600 max-w-3xl mx-auto leading-relaxed">
              Rentify eliminates token deposit scams, absentee sub-letting, and inflated deposits by combining 
              <strong> Index II title deed cross-checks</strong>, strict <strong>2-month MTA security deposit caps</strong>, and <strong>mandatory on-site partner audits</strong>.
            </p>

            {/* PRIMARY CALL TO ACTION BLOCK (Requirement 22) */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {/* The Dominant Primary Call to Action */}
              <button
                type="button"
                onClick={handlePrimaryCta}
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm sm:text-base font-bold text-white bg-seal hover:bg-seal-dark shadow-xl shadow-seal/25 transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-seal/30 flex items-center justify-center gap-2.5 group"
              >
                <Compass className="w-5 h-5 text-ochre-light group-hover:rotate-45 transition-transform" />
                <span>Explore Verified Properties</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              {/* Subordinate Secondary Action */}
              <a
                href="#switchboard"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-xs sm:text-sm font-semibold text-ink-800 bg-paper hover:bg-paper-subtle border border-paper-border transition-colors flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4 text-seal" />
                <span>View Role Switchboard</span>
              </a>

              {/* Tertiary Action */}
              <Link
                to="/assistance"
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-xs sm:text-sm font-medium text-ink-600 hover:text-seal transition-colors flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-4 h-4 text-ink-400" />
                <span>MTA Legal Guide</span>
              </Link>
            </div>

            {/* Quick Proof Points */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
              <div className="p-3 bg-paper rounded-lg border border-paper-border">
                <span className="font-mono text-xs font-bold text-seal block">100% Index II</span>
                <span className="text-[11px] text-ink-600">IGR Maharashtra verification</span>
              </div>
              <div className="p-3 bg-paper rounded-lg border border-paper-border">
                <span className="font-mono text-xs font-bold text-ochre-dark block">Max 2-Mo Deposit</span>
                <span className="text-[11px] text-ink-600">Strict Model Tenancy Act cap</span>
              </div>
              <div className="p-3 bg-paper rounded-lg border border-paper-border">
                <span className="font-mono text-xs font-bold text-seal-dark block">Field Inked Seal</span>
                <span className="text-[11px] text-ink-600">GPS &amp; keys checked in person</span>
              </div>
              <div className="p-3 bg-paper rounded-lg border border-paper-border">
                <span className="font-mono text-xs font-bold text-ink-800 block">Zero Fake Brokerage</span>
                <span className="text-[11px] text-ink-600">Direct owner-to-tenant trust</span>
              </div>
            </div>

          </div>
        </section>

        {/* Operational Role Switchboard Section */}
        <main id="switchboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] uppercase font-bold text-ochre bg-ochre-tint px-2 py-0.5 rounded border border-ochre-border">
                  DEMO WORKSPACE SWITCHBOARD
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-ink-900 font-serif">
                Select an Operational Role to Test
              </h2>
              <p className="text-xs sm:text-sm text-ink-600 font-sans mt-0.5">
                Simulate end-to-end multi-role workflows. State updates in any role persist locally across sessions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-ink-600 bg-paper-sheet px-3 py-1.5 rounded-lg border border-paper-border shadow-sheet">
                System Registry: <strong className="text-ink-900">{counts.total} Properties ({counts.verified} Verified)</strong>
              </span>
            </div>
          </div>

          {/* 4 Role Consoles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            {roleCards.map((role) => {
              const Icon = role.icon;

              return (
                <div
                  key={role.id}
                  className="bg-paper-sheet rounded-xl border border-paper-border p-6 flex flex-col justify-between hover:border-paper-darkBorder hover:shadow-paperRaised transition-all shadow-sheet"
                >
                  <div className="space-y-4">
                    {/* Top Bar: Persona + Live Badge */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-ink-500 font-medium">
                        Persona: <strong className="text-ink-800">{role.persona}</strong>
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${role.badgeStyle}`}>
                        {role.badgeText}
                      </span>
                    </div>

                    {/* Role Header */}
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-paper-subtle border border-paper-border text-seal">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-base text-ink-900 font-serif">
                        {role.title}
                      </h3>
                    </div>

                    {/* One-Liner */}
                    <p className="text-xs text-ink-700 font-sans leading-relaxed">
                      {role.oneLiner}
                    </p>

                    {/* Capabilities List */}
                    <div className="p-3.5 rounded-lg bg-paper border border-paper-border space-y-2 text-xs text-ink-700">
                      <span className="text-[10px] font-mono uppercase font-bold text-ink-500 block">
                        Core Operations in Prototype:
                      </span>
                      {role.duties.map((duty, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-seal flex-shrink-0 mt-0.5" />
                          <span className="text-[11px] font-sans text-ink-800 leading-snug">{duty}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Launch Button */}
                  <div className="pt-4 mt-5 border-t border-paper-border">
                    <button
                      type="button"
                      onClick={() => handleRoleSelect(role.id, role.path)}
                      className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${role.btnStyle}`}
                    >
                      <span>{role.btnLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verification Gate Architecture Explainer */}
          <div className="bg-paper-sheet rounded-xl border border-paper-border p-6 shadow-sheet">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-shrink-0 bg-paper p-3 rounded-xl border border-paper-border">
                <VerificationSeal size="lg" />
              </div>
              <div className="space-y-2 text-xs font-sans text-ink-700">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase text-seal bg-seal-tint px-2 py-0.5 rounded border border-seal/30">
                    SYSTEM INTEGRITY ARCHITECTURE
                  </span>
                  <span className="text-ink-400">•</span>
                  <span className="font-bold text-ink-900 text-sm font-serif">
                    Why only the Verification Partner issues the Official Inked Seal
                  </span>
                </div>
                <p className="leading-relaxed">
                  As proven in rental security research, digital deed uploads alone can be manipulated (e.g. forged Aadhaar cards matching public registry excerpts, or caretakers illegally leasing premises). Rentify eliminates this vulnerability by enforcing a <strong>two-stage gate</strong>: Admin registrar document cross-check followed by mandatory physical on-site audit by an authorized field partner who checks physical keys, inspects unit vacancy with the housing society, and confirms owner identity face-to-face.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-paper-border bg-paper-sheet py-8 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-500">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-seal flex items-center justify-center text-paper-sheet">
              <Shield className="w-4 h-4 text-ochre-light" />
            </div>
            <div>
              <p className="font-semibold text-ink-800">Rentify — One-Stop Rental Assistance Platform</p>
              <p className="text-[11px] text-ink-500">Idea Lab Academic Prototype • Built with React 19 &amp; Tailwind CSS</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <Link to="/customer" className="hover:text-seal transition-colors font-medium">Explore Listings</Link>
            <Link to="/assistance" className="hover:text-seal transition-colors font-medium">Rental Legal Guide</Link>
            <Link to="/login" className="hover:text-seal transition-colors font-medium">Demo Access</Link>
            <Link to="/privacy" className="hover:text-seal transition-colors font-medium underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-seal transition-colors font-medium underline">Terms &amp; Conditions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
