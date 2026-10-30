import React, { useState, useEffect } from 'react';
import { Shield, Settings, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'rentify_cookie_consent_v1';

export const CookieConsentBanner = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.analytics || false;
      }
    } catch {
      // default
    }
    return false;
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Show banner after brief delay so initial page loads smoothly
        const timer = setTimeout(() => setIsOpen(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const consent = {
      essential: true,
      analytics: true,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (e) {
      console.warn('Could not save consent preference', e);
    }
    setAnalyticsEnabled(true);
    setIsOpen(false);
  };

  const handleRejectNonEssential = () => {
    const consent = {
      essential: true,
      analytics: false,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (e) {
      console.warn('Could not save consent preference', e);
    }
    setAnalyticsEnabled(false);
    setIsOpen(false);
  };

  const handleSavePreferences = () => {
    const consent = {
      essential: true,
      analytics: analyticsEnabled,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (e) {
      console.warn('Could not save consent preference', e);
    }
    setShowPreferences(false);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Browser Storage and Privacy Preferences"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-ink-900/95 backdrop-blur-md text-paper border-t border-ink-700 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left Information */}
        <div className="flex items-start gap-3 max-w-3xl">
          <div className="w-9 h-9 rounded-lg bg-seal flex items-center justify-center flex-shrink-0 mt-0.5 text-paper">
            <Shield className="w-5 h-5 text-ochre-light" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-paper tracking-wide">
              Browser Storage &amp; Privacy Choices
            </h2>
            <p className="text-xs text-ink-400 mt-1 leading-relaxed">
              Rentify uses browser <code className="font-mono text-ochre-light bg-ink-800 px-1 py-0.5 rounded">localStorage</code> to maintain demo listings, audit trails, and role selection on your device. We do not use third-party advertising cookies. Optional anonymous analytics help us evaluate interface usability. Read our{' '}
              <Link to="/privacy" className="text-seal-glow underline hover:text-white transition-colors">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowPreferences(true)}
            className="px-3 py-1.5 text-xs font-medium text-ink-300 hover:text-white bg-ink-800 hover:bg-ink-700 rounded-md border border-ink-600 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-seal"
          >
            <Settings className="w-3.5 h-3.5" />
            Preferences
          </button>
          <button
            type="button"
            onClick={handleRejectNonEssential}
            className="px-3 py-1.5 text-xs font-medium text-paper bg-ink-700 hover:bg-ink-600 rounded-md border border-ink-500 transition-colors focus:outline-none focus:ring-2 focus:ring-seal"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-seal hover:bg-seal-light rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-seal-glow"
          >
            Accept All
          </button>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 bg-ink-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-sheet text-ink-900 rounded-xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-paper-border space-y-4">
            <div className="flex items-center justify-between border-b border-paper-border pb-3">
              <h3 className="font-serif text-lg font-bold text-ink-900">
                Storage &amp; Privacy Preferences
              </h3>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="text-ink-400 hover:text-ink-700 p-1 rounded-md"
                aria-label="Close preferences"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-ink-600">
              Customize how Rentify stores data in your browser. Essential storage cannot be deactivated as it powers demo state and UI preferences.
            </p>

            <div className="space-y-3">
              {/* Essential Storage */}
              <div className="p-3 bg-paper rounded-lg border border-paper-border flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink-900">Essential Local Storage</span>
                    <span className="text-[10px] font-mono uppercase bg-seal-tint text-seal-dark font-semibold px-1.5 py-0.5 rounded border border-seal/20">
                      Required
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-500 mt-1">
                    Stores seeded property listings, local submission drafts, and simulated role state on your browser.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked
                  disabled
                  aria-label="Essential local storage is always active"
                  className="rounded text-seal cursor-not-allowed mt-1"
                />
              </div>

              {/* Analytics */}
              <div className="p-3 bg-paper rounded-lg border border-paper-border flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-ink-900">Prototype Analytics &amp; Diagnostics</span>
                  <p className="text-[11px] text-ink-500 mt-1">
                    Anonymously records button clicks and search filters to optimize UI accessibility. Never records phone numbers or personal credentials.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="opt-analytics"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  aria-label="Toggle anonymous prototype analytics"
                  className="rounded text-seal focus:ring-seal cursor-pointer mt-1 h-4 w-4"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-paper-border">
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="px-3 py-1.5 text-xs text-ink-600 hover:text-ink-900 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-seal hover:bg-seal-dark rounded-md transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
