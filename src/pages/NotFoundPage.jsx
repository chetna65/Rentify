import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Home, Compass, ArrowLeft, BookOpen } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export const NotFoundPage = () => {
  usePageMeta(
    'Page Not Found (404)',
    'The requested page on Rentify could not be found. Return to deed-verified listings or platform overview.'
  );

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-paper-border bg-paper-sheet px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-seal flex items-center justify-center text-paper-sheet shadow-stamp group-hover:bg-seal-dark transition-colors">
            <Shield className="w-5 h-5 text-ochre-light" />
          </div>
          <div>
            <span className="font-serif text-xl font-bold text-ink-900 group-hover:text-seal transition-colors">
              Rentify
            </span>
          </div>
        </Link>
        <Link
          to="/"
          className="text-xs font-medium text-ink-600 hover:text-seal flex items-center gap-1.5 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
      </header>

      {/* Main 404 Body */}
      <main className="max-w-xl mx-auto w-full px-4 sm:px-6 py-16 text-center">
        <div className="p-8 sm:p-10 bg-paper-sheet border border-paper-border rounded-2xl shadow-paperRaised space-y-6">
          
          <div className="w-16 h-16 rounded-2xl bg-seal-tint border border-seal/20 text-seal flex items-center justify-center mx-auto shadow-stamp">
            <Shield className="w-8 h-8 text-seal" />
          </div>

          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ochre font-bold">
              HTTP ERROR 404
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-ink-600 max-w-md mx-auto leading-relaxed">
              The deed or destination you were looking for doesn't exist or has moved. Explore verified properties or return to the platform overview.
            </p>
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-ink-700 bg-paper border border-paper-border hover:bg-paper-subtle transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <Link
              to="/"
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-ink-800 bg-paper-subtle border border-paper-border hover:bg-paper transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4 text-seal" />
              Platform Overview
            </Link>
            <Link
              to="/customer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-seal hover:bg-seal-dark transition-colors shadow-stamp flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4 text-ochre-light" />
              Explore Listings
            </Link>
          </div>

          {/* Secondary Links */}
          <div className="pt-4 border-t border-paper-border text-xs text-ink-500 flex items-center justify-center gap-4">
            <Link to="/assistance" className="hover:text-seal flex items-center gap-1 underline">
              <BookOpen className="w-3 h-3" />
              Rental Legal Guide
            </Link>
            <span>•</span>
            <Link to="/login" className="hover:text-seal underline">
              Demo Access
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-paper-border py-4 text-center text-xs text-ink-500">
        <p>Rentify — One-Stop Rental Assistance Platform • Academic Idea Lab Project</p>
      </footer>
    </div>
  );
};
