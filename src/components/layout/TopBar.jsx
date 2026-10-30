import React, { useState } from 'react';
import { useRentify } from '../../context/RentifyContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, LogOut, UserCheck, ShieldAlert, Building2, 
  Users, Menu, ArrowLeftRight 
} from 'lucide-react';
import { RoleSwitcherModal } from '../common/RoleSwitcherModal';

export const TopBar = ({ onToggleMobileMenu }) => {
  const { currentRole, currentUser, logout } = useRentify();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const roleMeta = {
    customer: {
      label: 'Customer / Renter',
      icon: Users,
      badgeClass: 'bg-seal-tint text-seal-dark border-seal/30',
      tag: 'Verified Seeker'
    },
    vendor: {
      label: 'Vendor / Owner',
      icon: Building2,
      badgeClass: 'bg-ochre-tint text-ochre-dark border-ochre-border',
      tag: 'Property Lister'
    },
    admin: {
      label: 'Admin Registrar',
      icon: ShieldAlert,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      tag: 'Chief Registrar'
    },
    partner: {
      label: 'Verification Partner',
      icon: UserCheck,
      badgeClass: 'bg-seal text-white border-seal',
      tag: 'Field Officer'
    }
  };

  const activeMeta = roleMeta[currentRole] || roleMeta.customer;
  const RoleIcon = activeMeta.icon;

  return (
    <>
      <header className="bg-paper-sheet border-b border-paper-border sticky top-0 z-40 shadow-sheet">
        <div className="px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile Menu Toggle & Brand Identity */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile Hamburger Button */}
              {onToggleMobileMenu && (
                <button
                  type="button"
                  onClick={onToggleMobileMenu}
                  className="lg:hidden p-2 rounded-lg text-ink-700 hover:text-seal hover:bg-paper-subtle transition-colors focus-visible:ring-2 focus-visible:ring-seal"
                  aria-label="Toggle navigation drawer"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group hover:opacity-95 transition-opacity" title="Return to Overview">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-seal flex items-center justify-center text-paper-sheet shadow-stamp flex-shrink-0 group-hover:bg-seal-dark transition-colors">
                  <Shield className="w-5 h-5 text-ochre-light" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-ink-900 group-hover:text-seal transition-colors">
                      Rentify
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-seal font-semibold bg-seal-tint px-1.5 py-0.5 rounded border border-seal/20">
                      DEED-VERIFIED
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-ink-500 font-sans -mt-0.5 hidden md:block">
                    Independent-Owner Rental Assistance &amp; Document Audit
                  </p>
                </div>
              </Link>
            </div>

            {/* Right: Active Role User Pill, Switcher & Logout Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Active User Pill */}
              {currentUser && (
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-paper border border-paper-border">
                  <div className={`p-1.5 rounded-md flex-shrink-0 ${activeMeta.badgeClass}`}>
                    <RoleIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left text-xs font-mono">
                    <div className="flex items-center gap-1">
                      <span className="text-ink-500 text-[10px] uppercase">{activeMeta.tag}:</span>
                      <strong className="text-ink-900 font-bold">{currentUser.name}</strong>
                    </div>
                    <div className="text-[10px] text-ink-500 truncate max-w-[140px]">
                      {currentUser.designation || activeMeta.label}
                    </div>
                  </div>
                </div>
              )}

              {/* Fast Switch Persona Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-paper border border-paper-border text-ink-700 hover:bg-paper-subtle hover:text-ink-900 text-xs font-mono font-semibold transition-all"
                title="Switch persona to test another user workflow"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-ochre" />
                <span className="hidden xs:inline">Switch Role</span>
                <span className="xs:hidden">Switch</span>
              </button>

              {/* LOGOUT ACTION */}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-brick-tint border border-brick-border text-brick-dark hover:bg-brick hover:text-white text-xs font-mono font-bold transition-all shadow-xs"
                title="Log out of current session and return to login page"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Role Switcher Modal */}
      <RoleSwitcherModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
