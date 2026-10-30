import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useRentify } from '../../context/RentifyContext';
import { 
  Compass, BookOpen, ShieldAlert, Building2, UserCheck, 
  RotateCcw, PlusCircle, CheckCircle2, FileText, 
  AlertTriangle, History, LogOut
} from 'lucide-react';

export const Sidebar = () => {
  const { currentRole, counts, resetDemo, logout } = useRentify();
  const navigate = useNavigate();

  // Role-specific navigation items
  const getNavItems = () => {
    switch (currentRole) {
      case 'vendor':
        return [
          {
            label: 'My Properties & Pipeline',
            path: '/vendor',
            icon: Building2,
            badge: counts.total,
          },
          {
            label: 'Submit for Deed Verification',
            path: '/vendor',
            icon: PlusCircle,
            badge: null,
          },
          {
            label: 'Deed Cross-Check Info',
            path: '/assistance',
            icon: FileText,
            badge: null,
          },
        ];

      case 'admin':
        return [
          {
            label: 'Pending Document Queue',
            path: '/admin',
            icon: ShieldAlert,
            badge: counts.pending,
            badgeAlert: counts.pending > 0,
          },
          {
            label: 'Dispatched Field Audits',
            path: '/admin',
            icon: UserCheck,
            badge: counts.inReview,
          },
          {
            label: 'Immutable Audit Trail',
            path: '/admin',
            icon: History,
            badge: null,
          },
          {
            label: 'Fraud Taxonomy Reference',
            path: '/assistance',
            icon: AlertTriangle,
            badge: null,
          },
        ];

      case 'partner':
        return [
          {
            label: 'Assigned Field Inspections',
            path: '/partner',
            icon: UserCheck,
            badge: counts.inReview,
            badgeAlert: counts.inReview > 0,
          },
          {
            label: 'Certified Listings & Seals',
            path: '/partner',
            icon: CheckCircle2,
            badge: counts.verified,
          },
          {
            label: 'Inspection Protocol Guide',
            path: '/assistance',
            icon: FileText,
            badge: null,
          },
        ];

      case 'customer':
      default:
        return [
          {
            label: 'Explore Verified Homes',
            path: '/customer',
            icon: Compass,
            badge: counts.verified,
          },
          {
            label: '5-in-1 Assistance Hub',
            path: '/assistance',
            icon: BookOpen,
            badge: null,
          },
          {
            label: 'Model Tenancy Act Rules',
            path: '/assistance',
            icon: FileText,
            badge: null,
          },
          {
            label: 'Scam Alerts & Red Flags',
            path: '/assistance',
            icon: AlertTriangle,
            badge: counts.flagged,
          },
          {
            label: 'Govt Schemes (ARHC/PMAY)',
            path: '/assistance',
            icon: FileText,
            badge: null,
          },
        ];
    }
  };

  const navItems = getNavItems();

  const handleReset = () => {
    if (window.confirm('Reset all demo listings, verification seals, and audit logs to pristine seed state? You will be returned to the login screen.')) {
      resetDemo();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 bg-paper-sheet border-r border-paper-border h-full flex flex-col justify-between select-none">
      {/* Top Scrollable Navigation Section */}
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Role Badge Heading */}
        <div className="mb-4 pb-3 border-b border-paper-border">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-500 block">
            Workspace Console
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="font-serif font-bold text-sm text-ink-900 capitalize">
              {currentRole ? `${currentRole} Workspace` : 'Guest Session'}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase bg-seal-tint text-seal-dark border border-seal/20">
              {currentRole || 'GUEST'}
            </span>
          </div>
        </div>

        {/* Dynamic Role Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item, idx) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={idx}
                to={item.path}
                className={({ isActive: active }) =>
                  `flex items-center justify-between px-3 py-2 rounded-md text-xs font-mono transition-colors ${
                    active
                      ? 'bg-seal text-white font-bold shadow-sm'
                      : 'text-ink-700 hover:bg-paper hover:text-ink-900'
                  }`
                }
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`ml-2 text-[10px] px-1.5 py-0.2 rounded font-sans font-bold ${
                      item.badgeAlert
                        ? 'bg-ochre text-white'
                        : 'bg-paper text-ink-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Universal Links */}
        <div className="mt-6 pt-4 border-t border-paper-border space-y-1">
          <div className="text-[10px] font-mono text-ink-400 uppercase tracking-wider px-2 py-1">
            Rental Guidance
          </div>
          <NavLink
            to="/assistance"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-mono transition-colors ${
                isActive ? 'bg-paper font-bold text-seal' : 'text-ink-600 hover:bg-paper hover:text-ink-900'
              }`
            }
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>5-in-1 Assistance Guide</span>
          </NavLink>
        </div>
      </div>

      {/* Bottom Footer: Reset Demo & Academic Attribution */}
      <div className="p-4 border-t border-paper-border bg-paper-subtle/60 space-y-3">
        {/* Reset Demo Button */}
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-paper border border-paper-border text-ink-700 hover:text-brick hover:border-brick-border text-xs font-mono transition-colors shadow-sm"
          title="Restore seed properties, logs, and state back to default"
        >
          <RotateCcw className="w-3.5 h-3.5 text-ochre" />
          <span>Reset Demo Data</span>
        </button>

        {/* Log Out Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-md bg-brick-tint/40 border border-brick-border/60 text-brick-dark hover:bg-brick hover:text-white text-xs font-mono font-semibold transition-colors"
          title="End session and return to login"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>

        {/* Academic Project Credits */}
        <div className="text-[10px] font-mono text-ink-500 leading-relaxed pt-1 border-t border-paper-border/60">
          <div className="font-semibold text-ink-700">Ramdeobaba University</div>
          <div>IDEA Lab • Sem V 2026-27</div>
          <div className="text-ink-400">Dr. Purshottam Assudani, Guide</div>
        </div>
      </div>
    </aside>
  );
};
