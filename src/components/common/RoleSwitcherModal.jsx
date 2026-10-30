import React from 'react';
import { useRentify } from '../../context/RentifyContext';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, ShieldAlert, CheckCircle2, X } from 'lucide-react';

export const RoleSwitcherModal = ({ isOpen, onClose }) => {
  const { currentRole, switchUserDirectly, counts } = useRentify();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const roleOptions = [
    {
      id: 'customer',
      title: 'Customer (Tenant / Student / Relocating Renter)',
      user: 'Aarav Sharma (Final Year Scholar / IT Intern)',
      phone: '+91 98222 33410',
      desc: 'Browse verified listings with government deed proof, view safety scores, check MTA legal clauses, and leave move-in feedback.',
      icon: Users,
      path: '/customer',
      badge: `${counts.verified} Verified Units`,
      badgeColor: 'bg-seal-tint text-seal-dark border-seal/30'
    },
    {
      id: 'vendor',
      title: 'Vendor (Independent Property Owner)',
      user: 'Rajesh M. Sharma (Property Owner, Nagpur)',
      phone: '+91 98230 44120',
      desc: 'Submit property with Index II title deeds & Aadhaar KYC, then monitor the 4-stage verification review pipeline.',
      icon: Building2,
      path: '/vendor',
      badge: `${counts.total} Properties Listed`,
      badgeColor: 'bg-ochre-tint text-ochre-dark border-ochre-border'
    },
    {
      id: 'admin',
      title: 'Admin (Chief Verification Registrar)',
      user: 'Arvind Mehta (Directorate of Housing Integrity)',
      phone: '+91 94220 11980',
      desc: 'Audit submitted title deeds against IGR land registries, flag document mismatches, or assign an on-site Verification Partner.',
      icon: ShieldAlert,
      path: '/admin',
      badge: `${counts.pending} Awaiting Review`,
      badgeColor: counts.pending > 0 ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' : 'bg-paper text-ink-500'
    },
    {
      id: 'partner',
      title: 'Verification Partner (Field Inspection Officer)',
      user: 'Amit Patil (Senior Field Officer, Badge #VP-042)',
      phone: '+91 98500 77123',
      desc: 'Conduct physical on-site inspections — verifying keys, occupancy, and GPS. This step officially issues the Rentify Verification Seal.',
      icon: CheckCircle2,
      path: '/partner',
      badge: `${counts.inReview} Visits Scheduled`,
      badgeColor: counts.inReview > 0 ? 'bg-ochre text-white font-bold' : 'bg-paper text-ink-500'
    }
  ];

  const handleSelectRole = async (roleId, path) => {
    await switchUserDirectly(roleId);
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-paper-sheet border border-paper-border rounded-xl max-w-2xl w-full p-6 shadow-paperRaised animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-paper-border pb-3 mb-4">
          <div>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-seal bg-seal-tint px-2 py-0.5 rounded">
              PROTOTYPE PERSONA CONTROLLER
            </span>
            <h3 className="font-serif font-bold text-xl text-ink-900 mt-1">
              Switch Active User Account
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-paper-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-ink-600 font-sans mb-4">
          Instantly switch between the four authenticated accounts to evaluate their permissions and live dashboard workflows:
        </p>

        <div className="space-y-3">
          {roleOptions.map((role) => {
            const Icon = role.icon;
            const isCurrent = currentRole === role.id;

            return (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role.id, role.path)}
                className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-start justify-between gap-4 ${
                  isCurrent
                    ? 'bg-seal-tint/40 border-seal shadow-stamp ring-1 ring-seal/20'
                    : 'bg-paper hover:bg-paper-subtle border-paper-border hover:border-paper-darkBorder'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${isCurrent ? 'bg-seal text-white' : 'bg-paper-subtle text-seal'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-ink-900">
                        {role.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono text-seal font-bold bg-seal-tint px-1.5 py-0.2 rounded border border-seal/20">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-ink-600 mt-0.5 font-medium">
                      {role.user} • {role.phone}
                    </div>
                    <p className="text-xs text-ink-500 font-sans mt-1 line-clamp-2 leading-relaxed">
                      {role.desc}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${role.badgeColor}`}>
                    {role.badge}
                  </span>
                  <span className="text-xs font-mono text-seal font-bold underline">
                    {isCurrent ? 'Resume &rarr;' : 'Switch &rarr;'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
