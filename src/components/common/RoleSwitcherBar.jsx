import React from 'react';
import { useRentify } from '../../context/RentifyContext';
import { Users, Building2, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RoleSwitcherBar = () => {
  const { currentRole, switchUserDirectly, currentUser, counts, resetDemo } = useRentify();
  const navigate = useNavigate();

  const roles = [
    {
      id: 'customer',
      label: '1. Customer / Renter',
      badge: `${counts.verified} Verified`,
      icon: Users,
      path: '/customer',
      description: 'Search verified rentals, inspect assistance layers, write feedback'
    },
    {
      id: 'vendor',
      label: '2. Vendor / Owner',
      badge: `${counts.total} Properties`,
      icon: Building2,
      path: '/vendor',
      description: 'Submit listing with Index II / Aadhaar & track verification pipeline'
    },
    {
      id: 'admin',
      label: '3. Admin Registrar',
      badge: `${counts.pending} Needs Review`,
      icon: ShieldAlert,
      badgeAlert: counts.pending > 0,
      path: '/admin',
      description: 'Cross-check registry title documents & assign Field Verification Partner'
    },
    {
      id: 'partner',
      label: '4. Verification Partner',
      badge: `${counts.inReview} Visits Pending`,
      icon: CheckCircle2,
      badgeAlert: counts.inReview > 0,
      path: '/partner',
      description: 'On-site field inspection — only this step marks listing Verified'
    }
  ];

  const handleRoleChange = (roleId, path) => {
    switchUserDirectly(roleId);
    navigate(path);
  };

  return (
    <aside aria-label="Demo role switcher" className="bg-ink-900 text-paper px-3 py-2 text-xs border-b border-ink-700 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Left: Project Branding & Role Indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-mono text-[10px] tracking-wider uppercase bg-seal text-paper-sheet px-2 py-0.5 rounded font-bold">
            IDEA LAB PROTOTYPE
          </span>
          <span className="text-ink-400 hidden sm:inline">|</span>
          <span className="text-xs text-paper/90">
            Active Persona: <strong className="text-white font-serif">{currentUser.name}</strong> ({currentUser.designation})
          </span>
        </div>

        {/* Center: Switcher Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {roles.map((r) => {
            const isActive = currentRole === r.id;
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                onClick={() => handleRoleChange(r.id, r.path)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all text-xs font-mono whitespace-nowrap ${
                  isActive
                    ? 'bg-seal text-paper-sheet font-semibold shadow-stamp ring-1 ring-seal-glow/40'
                    : 'bg-ink-800 text-ink-400 hover:text-paper hover:bg-ink-700'
                }`}
                title={r.description}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-ochre-light' : 'text-ink-500'}`} />
                <span>{r.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-medium ${
                    r.badgeAlert
                      ? 'bg-ochre text-white font-bold'
                      : isActive
                        ? 'bg-seal-dark text-paper/80'
                        : 'bg-ink-900 text-ink-400'
                  }`}
                >
                  {r.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Reset Data */}
        <div className="flex items-center gap-2 flex-shrink-0 justify-end">
          <button
            onClick={() => {
              if (window.confirm('Reset all demo listings and verification records back to seed state?')) {
                resetDemo();
              }
            }}
            className="flex items-center gap-1 text-[11px] font-mono text-ink-400 hover:text-ochre-light transition-colors px-2 py-1 rounded hover:bg-ink-800"
            title="Restore original seed data"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
