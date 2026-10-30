import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useRentify } from '../../context/RentifyContext';

export const ProtectedRoute = () => {
  const { authUser, isAuthLoading } = useRentify();

  if (isAuthLoading) {
    return (
      <div 
        role="status" 
        aria-live="polite" 
        className="min-h-screen bg-paper flex flex-col items-center justify-center p-6"
      >
        <div className="w-12 h-12 rounded-xl bg-seal-tint border border-seal/30 flex items-center justify-center animate-pulse mb-4">
          <div className="w-5 h-5 rounded-full border-2 border-seal border-t-transparent animate-spin" />
        </div>
        <p className="font-serif text-sm font-semibold text-ink-800">Verifying session...</p>
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
