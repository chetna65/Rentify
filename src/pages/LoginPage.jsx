import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRentify } from '../context/RentifyContext';
import { 
  Users, Building2, ShieldAlert, CheckCircle2, 
  ArrowRight, Shield, AlertTriangle, ArrowLeft, User, Sparkles
} from 'lucide-react';
import { seededUserList } from '../data/mockUsers';
import { usePageMeta } from '../hooks/usePageMeta';
import { trackEvent } from '../utils/analytics';

const getRoleHome = (role) => {
  switch (role) {
    case 'vendor':
      return '/vendor';
    case 'admin':
      return '/admin';
    case 'partner':
      return '/partner';
    case 'customer':
    default:
      return '/customer';
  }
};

export const LoginPage = () => {
  usePageMeta(
    'Demo Access Console',
    'Explore the Rentify prototype as a Customer, Vendor, Admin Registrar, or Verification Partner.'
  );

  const { loginAsDemoUser, loginAsGuest, authUser } = useRentify();
  const navigate = useNavigate();

  const [guestName, setGuestName] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState('user-customer-01');

  // Auto-redirect if already logged in
  useEffect(() => {
    if (authUser) {
      const destination = getRoleHome(authUser.role);
      navigate(destination, { replace: true });
    }
  }, [authUser, navigate]);

  const handleLaunchPersona = async (user) => {
    trackEvent('demo_login_persona', { role: user.role, personaId: user.id });
    const res = await loginAsDemoUser(user.role || user.id);
    if (res?.success) {
      const destination = getRoleHome(user.role);
      navigate(destination, { replace: true });
    }
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    trackEvent('demo_login_guest', { guestName: guestName || 'Guest' });
    loginAsGuest(guestName);
    navigate('/customer', { replace: true });
  };

  const personaMeta = {
    customer: {
      icon: Users,
      badgeText: 'Seeker Workspace',
      badgeClass: 'bg-seal-tint text-seal-dark border-seal/20',
      themeBorder: 'border-seal/30 hover:border-seal',
      btnClass: 'bg-seal hover:bg-seal-dark text-white',
      destination: '/customer',
      highlights: [
        'Search listings backed by Index II title deed extracts',
        'Compare civic safety ratings & transit corridor distances',
        'Audit Model Tenancy Act deposit compliance (max 2 months)'
      ]
    },
    vendor: {
      icon: Building2,
      badgeText: 'Owner Portal',
      badgeClass: 'bg-ochre-tint text-ochre-dark border-ochre-border',
      themeBorder: 'border-ochre/30 hover:border-ochre',
      btnClass: 'bg-ochre hover:bg-ochre-dark text-white',
      destination: '/vendor',
      highlights: [
        'Submit listings with deed documents & tax receipts',
        'Auto-calculate MTA 2-month security deposit caps',
        'Track audit pipeline: Pending → In-Review → Inked Seal'
      ]
    },
    admin: {
      icon: ShieldAlert,
      badgeText: 'Integrity Desk',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      themeBorder: 'border-amber-400/50 hover:border-amber-600',
      btnClass: 'bg-ink-900 hover:bg-ink-800 text-white',
      destination: '/admin',
      highlights: [
        'Cross-check deeds against IGR Maharashtra land records',
        'Directly flag fraudulent listings & deposit baiting',
        'Dispatch field inspection partners to property locations'
      ]
    },
    partner: {
      icon: CheckCircle2,
      badgeText: 'Field Officer',
      badgeClass: 'bg-seal text-white border-seal',
      themeBorder: 'border-seal/40 hover:border-seal',
      btnClass: 'bg-seal hover:bg-seal-dark text-white',
      destination: '/partner',
      highlights: [
        'Conduct mandatory physical on-site inspections',
        'Record GPS tags, key handovers, and meter readings',
        'Officially issue the Rentify Inked Verification Seal'
      ]
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-paper-border bg-paper-sheet px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-seal flex items-center justify-center text-paper-sheet shadow-stamp group-hover:bg-seal-dark transition-colors">
            <Shield className="w-5 h-5 text-ochre-light" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-bold text-ink-900 group-hover:text-seal transition-colors">
                Rentify
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-seal font-semibold bg-seal-tint px-1.5 py-0.5 rounded border border-seal/20">
                PROTOTYPE ACCESS
              </span>
            </div>
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

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Academic Prototype Notice */}
        <div className="mb-8 p-4 rounded-xl bg-ochre-tint border border-ochre-border text-ochre-dark flex items-start gap-3 shadow-sheet">
          <AlertTriangle className="w-5 h-5 text-ochre flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-ink-900 uppercase tracking-wide">
              Academic Demonstration Environment
            </p>
            <p className="text-ink-700 leading-relaxed">
              This prototype is built for evaluation and research into deed-verified rental housing. <strong>It does not authenticate real users or send SMS verification codes.</strong> Role selection simulates each persona's interface locally on your device.
            </p>
          </div>
        </div>

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-seal-tint border border-seal/20 text-seal-dark text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Select a Role to Explore
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900">
            Choose Your Demonstration Persona
          </h1>
          <p className="text-xs sm:text-sm text-ink-600 mt-2 leading-relaxed">
            Rentify features four interconnected stakeholder interfaces. Choose any persona below to experience their dedicated portal, or enter your own name for a guest session.
          </p>
        </div>

        {/* 4 Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {seededUserList.map((user) => {
            const meta = personaMeta[user.role] || personaMeta.customer;
            const Icon = meta.icon;
            const isSelected = selectedPersonaId === user.id;

            return (
              <div
                key={user.id}
                onClick={() => setSelectedPersonaId(user.id)}
                className={`p-5 rounded-xl bg-paper-sheet border-2 transition-all cursor-pointer relative shadow-sheet hover:shadow-paperRaised ${
                  isSelected ? `${meta.themeBorder} ring-2 ring-seal/20 bg-paper-sheet` : 'border-paper-border hover:border-paper-darkBorder'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-paper-subtle border border-paper-border flex items-center justify-center text-ink-800">
                      <Icon className="w-5 h-5 text-seal" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-ink-900">
                        {user.name}
                      </h2>
                      <p className="text-xs text-ink-500">
                        {user.designation}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${meta.badgeClass}`}>
                    {meta.badgeText}
                  </span>
                </div>

                {/* Key Duties / Features */}
                <ul className="text-xs text-ink-600 space-y-1.5 mb-4 pl-1">
                  {meta.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-seal font-bold text-sm leading-none">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                {/* Launch Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchPersona(user);
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${meta.btnClass}`}
                >
                  <span>Launch as {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Alternative: Guest Renter Option */}
        <div className="p-5 rounded-xl bg-paper-sheet border border-paper-border shadow-sheet max-w-xl mx-auto">
          <div className="flex items-center gap-2.5 mb-3">
            <User className="w-4 h-4 text-seal" />
            <h2 className="text-sm font-bold text-ink-900">
              Or Try as an Individual Guest Seeker
            </h2>
          </div>
          <p className="text-xs text-ink-600 mb-4 leading-relaxed">
            Prefer not to use a pre-seeded account? Enter your name to start a personalized demo session with customer privileges:
          </p>

          <form onSubmit={handleGuestSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Priyanshu / Guest Evaluator"
              className="flex-1 px-3 py-2 text-xs bg-paper border border-paper-border rounded-lg text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-seal"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-seal hover:bg-seal-dark text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span>Start Guest Session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
          <p className="text-[11px] text-ink-400 mt-2">
            Session data is preserved in your local browser only.
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-paper-border py-4 text-center text-xs text-ink-500">
        <p>Rentify — One-Stop Rental Assistance Platform • Academic Idea Lab Project</p>
        <div className="flex items-center justify-center gap-4 mt-1 text-[11px]">
          <Link to="/privacy" className="hover:text-seal underline">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-seal underline">Terms &amp; Conditions</Link>
          <Link to="/assistance" className="hover:text-seal underline">Legal Assistance Guide</Link>
        </div>
      </footer>
    </div>
  );
};
