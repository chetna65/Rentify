import React, { useState } from 'react';
import { useRentify } from '../context/RentifyContext';
import { 
  BookOpen, ShieldAlert, HeartHandshake, Landmark, 
  AlertTriangle, CheckCircle2, Shield, Info, ArrowRight, ExternalLink 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

export const AssistanceGuide = () => {
  usePageMeta(
    'Rental Assistance & Legal Guide',
    'Comprehensive guide on Model Tenancy Act 2021 deposit limits, IGR deed verification, rental scam prevention, and housing schemes in Maharashtra.'
  );

  const { rentalAssistanceData } = useRentify();
  const [activeSection, setActiveSection] = useState('scams'); // 'scams' | 'legal' | 'schemes'

  return (
    <div className="min-h-screen bg-paper pb-20">
      {/* Header */}
      <section className="bg-paper-sheet border-b border-paper-border py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-seal-tint border border-seal/30 text-seal-dark font-mono text-xs mb-3">
            <BookOpen className="w-4 h-4 text-seal" />
            <span>RENTAL ASSISTANCE &amp; LEGAL INTEGRATION PORTAL</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-900">
            Tenant Guidance, Scam Defense &amp; Housing Schemes
          </h1>
          <p className="mt-2 text-base text-ink-600 font-sans max-w-3xl leading-relaxed">
            Renters in India currently hunt across five separate portals for safety, legal rules, scam awareness, and government subsidies. Rentify centralizes this evidence-backed knowledge in one place.
          </p>

          {/* Section Navigation Tabs */}
          <div className="flex gap-2 mt-6 overflow-x-auto">
            <button
              onClick={() => setActiveSection('scams')}
              className={`px-4 py-2 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeSection === 'scams'
                  ? 'bg-brick text-white shadow-sm'
                  : 'bg-paper text-ink-700 hover:bg-paper-subtle border border-paper-border'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>1. 4 Documented Scam Typologies</span>
            </button>

            <button
              onClick={() => setActiveSection('legal')}
              className={`px-4 py-2 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeSection === 'legal'
                  ? 'bg-seal text-white shadow-stamp'
                  : 'bg-paper text-ink-700 hover:bg-paper-subtle border border-paper-border'
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              <span>2. Model Tenancy Act &amp; Legal Rights</span>
            </button>

            <button
              onClick={() => setActiveSection('schemes')}
              className={`px-4 py-2 rounded text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeSection === 'schemes'
                  ? 'bg-ochre text-white shadow-sm'
                  : 'bg-paper text-ink-700 hover:bg-paper-subtle border border-paper-border'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>3. Government Housing Schemes (ARHCs &amp; PMAY)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* SECTION 1: SCAM DEFENSE */}
        {activeSection === 'scams' && (
          <div className="space-y-6">
            <div className="bg-brick-tint/50 border border-brick-border p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-brick flex-shrink-0 mt-0.5" />
                <div className="text-xs text-brick-dark font-sans leading-relaxed">
                  <strong>Evidence-Backed Fraud Taxonomy (Research Validation Report Section A.3):</strong> Indian cybercrime reports and consumer court filings reveal rental fraud is not abstract — it follows four repeatable behavioral patterns. Rentify's document + biometric verification workflow interrupts these at steps 1 and 2.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rentalAssistanceData.scamAlerts.map((scam) => (
                <div key={scam.id} className="paper-card rounded-lg p-5 border-l-4 border-brick flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-[10px] uppercase font-bold text-brick bg-brick-tint px-2 py-0.5 rounded">
                        {scam.frequency}
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-ink-900 mb-2">
                      {scam.title}
                    </h3>

                    <p className="text-xs text-ink-700 font-sans mb-4 leading-relaxed">
                      {scam.summary}
                    </p>

                    <div className="space-y-2 mb-4">
                      <span className="text-[11px] font-mono font-bold text-brick uppercase block">
                        Critical Red Flags to Spot:
                      </span>
                      <ul className="space-y-1.5 text-xs text-ink-800 font-sans">
                        {scam.redFlags.map((flag, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-brick font-bold">•</span>
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-paper-border bg-seal-tint/40 p-3 rounded text-xs text-seal-dark">
                    <strong className="block font-mono text-[10px] uppercase font-bold text-seal mb-0.5">
                      Rentify Platform Countermeasure:
                    </strong>
                    {scam.rentifyDefense}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: LEGAL & TENANCY GUIDANCE */}
        {activeSection === 'legal' && (
          <div className="space-y-6">
            <div className="bg-seal-tint border border-seal/30 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-seal flex-shrink-0 mt-0.5" />
                <div className="text-xs text-seal-dark font-sans leading-relaxed">
                  <strong>Statutory Protection Framework:</strong> Standardizing rental agreements, putting an end to arbitrary 6-11 month security deposit demands, and educating renters on the vital RERA regulatory gap.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rentalAssistanceData.legalGuidance.map((guide) => (
                <div key={guide.id} className="paper-card rounded-lg p-5 border-l-4 border-seal">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="font-bold text-seal text-xs">{guide.topic}</span>
                    <span className="text-[10px] font-bold text-ink-500 bg-paper-subtle px-2 py-0.5 rounded">
                      {guide.importance}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-ink-900 mb-2">
                    {guide.rule}
                  </h3>

                  <p className="text-xs text-ink-700 font-sans mb-4 leading-relaxed">
                    {guide.details}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-paper-border">
                    <span className="text-[11px] font-mono font-bold text-ink-600 uppercase block">
                      Key Tenancy Mandates:
                    </span>
                    <ul className="space-y-1.5 text-xs text-ink-800 font-sans">
                      {guide.keyClauses.map((clause, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-seal flex-shrink-0 mt-0.5" />
                          <span>{clause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: GOVERNMENT HOUSING SCHEMES */}
        {activeSection === 'schemes' && (
          <div className="space-y-6">
            <div className="bg-ochre-tint border border-ochre-border p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Landmark className="w-5 h-5 text-ochre flex-shrink-0 mt-0.5" />
                <div className="text-xs text-ochre-dark font-sans leading-relaxed">
                  <strong>Institutional Rental Support:</strong> Central and State Government rental initiatives designed to assist urban migrants, students, and low-income workers with dignified, rent-subsidized accommodation.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rentalAssistanceData.governmentSchemes.map((scheme) => (
                <div key={scheme.id} className="paper-card rounded-lg p-5 border-l-4 border-ochre flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-ochre-dark bg-ochre-tint px-2 py-0.5 rounded mb-2 inline-block">
                      {scheme.ministry}
                    </span>

                    <h3 className="font-serif text-xl font-bold text-ink-900 mb-2">
                      {scheme.name}
                    </h3>

                    <div className="text-xs font-mono text-ink-600 mb-3">
                      <strong>Target Group:</strong> {scheme.targetBeneficiaries}
                    </div>

                    <p className="text-xs text-ink-700 font-sans mb-4 leading-relaxed">
                      {scheme.overview}
                    </p>

                    <div className="space-y-2 mb-4">
                      <span className="text-[11px] font-mono font-bold text-ink-800 uppercase block">
                        Key Beneficiary Entitlements:
                      </span>
                      <ul className="space-y-1.5 text-xs text-ink-800 font-sans">
                        {scheme.benefits.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-ochre flex-shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-paper-border bg-paper p-3 rounded text-xs font-mono text-ink-700">
                    <strong className="block text-[10px] uppercase font-bold text-ink-500 mb-0.5">
                      Application &amp; Eligibility Window:
                    </strong>
                    {scheme.howToApply}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA Strip */}
        <div className="mt-12 bg-paper-sheet border border-paper-border rounded-xl p-6 shadow-sheet flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-ink-900">
              Ready to find a deed-verified rental?
            </h3>
            <p className="text-xs text-ink-600 font-sans mt-0.5">
              Browse listings with verified Index II ownership records and protected deposit caps.
            </p>
          </div>
          <Link
            to="/customer"
            className="px-5 py-2.5 bg-seal text-white font-mono text-xs font-bold rounded-lg shadow-stamp hover:bg-seal-dark transition-all inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Explore Verified Homes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
};
