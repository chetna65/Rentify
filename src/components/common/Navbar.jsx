import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRentify } from '../../context/RentifyContext';
import { Shield, BookOpen, Building2, ClipboardCheck, Compass } from 'lucide-react';

export const Navbar = () => {
  const location = useLocation();
  const { counts } = useRentify();

  const navItems = [
    { label: 'Explore Listings', path: '/customer', icon: Compass },
    { label: 'Rental Assistance & Legal Guide', path: '/assistance', icon: BookOpen },
    { label: 'Owner Portal', path: '/vendor', icon: Building2 },
    { 
      label: 'Admin Desk', 
      path: '/admin', 
      icon: Shield, 
      counter: counts.pending > 0 ? counts.pending : null 
    },
    { 
      label: 'Field Verification', 
      path: '/partner', 
      icon: ClipboardCheck, 
      counter: counts.inReview > 0 ? counts.inReview : null 
    },
  ];

  return (
    <header className="bg-paper-sheet border-b border-paper-border sticky top-0 z-40 shadow-sheet">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-seal flex items-center justify-center text-paper-sheet shadow-stamp group-hover:bg-seal-dark transition-colors">
              <Shield className="w-5 h-5 text-ochre-light" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl font-bold tracking-tight text-ink-900 group-hover:text-seal transition-colors">
                  Rentify
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-seal font-semibold bg-seal-tint px-1.5 py-0.5 rounded border border-seal/20">
                  DEED-VERIFIED
                </span>
              </div>
              <p className="text-[11px] text-ink-500 font-sans -mt-0.5 hidden sm:block">
                Independent-Owner Rental Assistance &amp; Registry Verification
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-seal text-white font-semibold shadow-sm'
                      : 'text-ink-700 hover:text-seal-dark hover:bg-paper-subtle'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-ochre-light' : 'text-ink-500'}`} />
                  <span className="hidden md:inline">{item.label}</span>
                  {item.counter && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-ochre text-white">
                      {item.counter}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
