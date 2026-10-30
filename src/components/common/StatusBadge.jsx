import React from 'react';
import { ShieldCheck, Clock, UserCheck, AlertOctagon } from 'lucide-react';

/**
 * StatusBadge - Reusable 3/4-way accessible status badge for all listings
 * Statuses: 'verified' | 'pending' | 'in-review' | 'flagged'
 * Fully accessible: Distinguishable by icon, clear label prefix, and distinct shape/border, not color alone.
 */
export const StatusBadge = ({ status, size = "md", showIcon = true, className = "" }) => {
  const configs = {
    verified: {
      symbol: "✓",
      label: "Verified Listing",
      shortLabel: "✓ Verified",
      subText: "Deed & Site Checked",
      bgClass: "bg-seal-tint text-seal-dark border-seal/40 shadow-xs",
      icon: ShieldCheck,
      ariaText: "Status: Verified Listing, Title Deed and On-Site Inspection Passed"
    },
    "in-review": {
      symbol: "⧗",
      label: "In Review (Partner Assigned)",
      shortLabel: "⧗ In-Review",
      subText: "Field Visit Pending",
      bgClass: "bg-ochre-tint text-ochre-dark border-ochre-border",
      icon: UserCheck,
      ariaText: "Status: In-Review, Physical Field Visit Scheduled"
    },
    pending: {
      symbol: "⏳",
      label: "Pending Admin Review",
      shortLabel: "⏳ Pending",
      subText: "Docs Awaiting Check",
      bgClass: "bg-amber-50 text-amber-950 border-amber-300 font-semibold",
      icon: Clock,
      ariaText: "Status: Pending Document Review by Admin"
    },
    flagged: {
      symbol: "⚠",
      label: "Flagged (Discrepancy)",
      shortLabel: "⚠ Flagged",
      subText: "Do Not Transact",
      bgClass: "bg-brick-tint text-brick-dark border-brick-border font-bold",
      icon: AlertOctagon,
      ariaText: "Status: Flagged Discrepancy, Listing Blocked"
    }
  };

  const config = configs[status] || configs.pending;
  const IconComponent = config.icon;

  if (size === "sm") {
    return (
      <span 
        aria-label={config.ariaText}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${config.bgClass} ${className}`}
      >
        {showIcon && <IconComponent className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
        <span>{config.shortLabel}</span>
      </span>
    );
  }

  return (
    <span 
      aria-label={config.ariaText}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono font-semibold border ${config.bgClass} ${className}`}
    >
      {showIcon && <IconComponent className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
};
