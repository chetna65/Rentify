import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';
import * as listingsApi from '../api/listings';
import * as vendorApi from '../api/vendor';
import * as adminApi from '../api/admin';
import * as partnerApi from '../api/partner';
import * as feedbackApi from '../api/feedback';
import { rentalAssistanceData } from '../data/rentalAssistanceData';

const RentifyContext = createContext(null);

// Demo seeded accounts mapped to real database credentials
export const DEMO_ACCOUNTS = [
  {
    id: 'customer',
    role: 'customer',
    name: 'Aarav Sharma',
    phone: '+910000000001',
    displayPhone: '+91 00000 00001',
    designation: 'Tenant / Student Intern',
    city: 'Pune',
  },
  {
    id: 'vendor',
    role: 'vendor',
    name: 'Rajesh M. Sharma',
    phone: '+910000000002',
    displayPhone: '+91 00000 00002',
    designation: 'Independent Owner',
    city: 'Nagpur',
  },
  {
    id: 'admin',
    role: 'admin',
    name: 'Arvind Mehta',
    phone: '+910000000003',
    displayPhone: '+91 00000 00003',
    designation: 'Chief Verification Registrar',
    city: 'Nagpur',
  },
  {
    id: 'partner',
    role: 'partner',
    name: 'Amit Patil',
    phone: '+910000000004',
    displayPhone: '+91 00000 00004',
    badgeNumber: 'VP-042',
    zone: 'Nagpur Central & Civil Lines',
    designation: 'Senior Field Officer',
    city: 'Nagpur',
  },
  {
    id: 'partner-pune',
    role: 'partner',
    name: 'Pooja Kulkarni',
    phone: '+910000000005',
    displayPhone: '+91 00000 00005',
    badgeNumber: 'VP-108',
    zone: 'Pune East / Viman Nagar',
    designation: 'Field Inspection Partner',
    city: 'Pune',
  },
];

export const RentifyProvider = ({ children }) => {
  const [listings, setListings] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Derived role and user
  const currentRole = authUser ? authUser.role : null;
  const currentUser = authUser;

  // 1. Fetch Listings
  const refreshListings = useCallback(async () => {
    setIsLoadingListings(true);
    try {
      if (authUser?.role === 'vendor') {
        const vendorListings = await vendorApi.fetchVendorListings();
        setListings(vendorListings);
      } else if (authUser?.role === 'partner') {
        const partnerAssignments = await partnerApi.fetchPartnerAssignments();
        setListings(partnerAssignments);
      } else {
        const res = await listingsApi.fetchListings({ limit: 100 });
        setListings(res?.listings || []);
      }
    } catch (err) {
      console.error('Failed to load listings from API:', err);
    } finally {
      setIsLoadingListings(false);
    }
  }, [authUser?.role]);

  // 2. Fetch Admin Partners and Audit Logs
  const refreshAdminData = useCallback(async () => {
    if (authUser?.role !== 'admin') return;
    try {
      const [partners, audit] = await Promise.all([
        adminApi.fetchPartners().catch(() => []),
        adminApi.fetchAuditLogs(null, 50).catch(() => ({ logs: [] })),
      ]);
      setAvailablePartners(partners);
      setAuditLogs(audit?.logs || []);
    } catch (err) {
      console.error('Failed to load admin metadata:', err);
    }
  }, [authUser?.role]);

  // 3. Check Session on App Start (/api/auth/me)
  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const user = await authApi.getMe();
        if (mounted) {
          setAuthUser(user);
        }
      } catch (err) {
        if (mounted) {
          setAuthUser(null);
        }
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    }
    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  // 4. Reload listings and metadata when auth state changes
  useEffect(() => {
    if (!isAuthLoading) {
      refreshListings();
      refreshAdminData();
    }
  }, [isAuthLoading, refreshListings, refreshAdminData]);

  // ==========================================
  // AUTH ACTIONS
  // ==========================================

  /**
   * loginWithPhone:
   * If only phone is passed: calls sendOtp
   * If phone and otp are passed: calls verifyOtp and sets authUser
   */
  const loginWithPhone = async (phoneInput, otpInput = '123456') => {
    try {
      const verifyRes = await authApi.verifyOtp(phoneInput, otpInput);
      if (verifyRes?.user) {
        setAuthUser(verifyRes.user);
        return { success: true, user: verifyRes.user };
      }
      return { success: false, error: 'Invalid verification response from server.' };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Authentication failed. Please verify your number and OTP.',
      };
    }
  };

  /**
   * logout: Revokes session on backend and clears authUser
   */
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout network error (clearing local session):', err.message);
    } finally {
      setAuthUser(null);
      refreshListings();
    }
  };

  /**
   * switchUserDirectly: development helper that logs in as a seeded demo user via the API
   */
  const switchUserDirectly = async (targetRoleOrId) => {
    const normalizedTarget = String(targetRoleOrId || '').toLowerCase();
    const account =
      DEMO_ACCOUNTS.find((u) => u.role === targetRoleOrId || u.id === targetRoleOrId) ||
      DEMO_ACCOUNTS.find((u) => normalizedTarget.includes(u.role) || (u.role === 'vendor' && (normalizedTarget.includes('vend') || normalizedTarget.includes('owner')))) ||
      DEMO_ACCOUNTS[0];

    try {
      await authApi.sendOtp(account.phone);
      const res = await authApi.verifyOtp(account.phone, '123456');
      if (res?.user) {
        setAuthUser(res.user);
        return res.user;
      }
    } catch (err) {
      console.error('switchUserDirectly error:', err);
    }
    return null;
  };

  // Compatibility helpers used by the refreshed frontend. Demo role access still
  // goes through the existing backend OTP flow rather than bypassing authentication.
  const loginAsDemoUser = async (roleOrUserId) => {
    const user = await switchUserDirectly(roleOrUserId);
    return user
      ? { success: true, user }
      : { success: false, error: 'Could not sign in to the demo account. Check that the backend is running.' };
  };

  const loginAsGuest = async (guestName = 'Demo Guest Renter') => {
    // Guests are local-only demo sessions; they do not receive backend permissions.
    const guestUser = {
      id: `guest-${Date.now().toString().slice(-4)}`,
      name: guestName.trim() || 'Demo Guest Renter',
      role: 'customer',
      phone: '+91 (Prototype Demo Session)',
      designation: 'Prospective Tenant (Guest Evaluator)',
      isDemoSession: true,
    };
    setAuthUser(guestUser);
    return { success: true, user: guestUser };
  };

  // ==========================================
  // STORE / WORKFLOW ACTIONS
  // ==========================================

  /**
   * 1. submitListing (Vendor Submits New Listing)
   * Supports FormData (multipart with document files) or plain object.
   */
  const submitListing = async (formDataOrObject) => {
    let payload = formDataOrObject;

    if (!(formDataOrObject instanceof FormData)) {
      // Build FormData from object
      const form = new FormData();
      let hasDoc = false;
      for (const [key, val] of Object.entries(formDataOrObject)) {
        if (key === 'documents') {
          if (Array.isArray(val) && val.length > 0) {
            val.forEach((f) => form.append('documents', f));
            hasDoc = true;
          } else if (val) {
            form.append('documents', val);
            hasDoc = true;
          }
        } else if (key === 'amenities' && Array.isArray(val)) {
          form.append('amenities', JSON.stringify(val));
        } else if (val !== undefined && val !== null) {
          form.append(key, val);
        }
      }
      if (!hasDoc) {
        const mockPdf = new Blob(['%PDF-1.4 Mock Registered Index II Title Deed for Verification'], { type: 'application/pdf' });
        form.append('documents', mockPdf, 'index_ii_deed.pdf');
      }
      payload = form;
    }

    const created = await vendorApi.submitVendorListing(payload);
    await refreshListings();
    return created?.id || created?.data?.id;
  };

  /**
   * 2. assignPartner (Admin Assigns a Verification Partner)
   */
  const assignPartner = async (listingId, partnerId, partnerName, inspectionDate, adminNotes) => {
    let formattedDate = null;
    if (inspectionDate && /^\d{4}-\d{2}-\d{2}$/.test(String(inspectionDate).trim())) {
      formattedDate = String(inspectionDate).trim();
    } else {
      const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      formattedDate = d.toISOString().slice(0, 10);
    }
    const res = await adminApi.assignPartner(listingId, {
      partnerId,
      scheduledFor: formattedDate,
      notes: adminNotes,
    });
    await refreshListings();
    await refreshAdminData();
    return res;
  };

  /**
   * 3. decideListing (Admin Direct Actions: Approve on Docs Alone OR Flag)
   */
  const decideListing = async (listingId, decision, reason, flagCategory) => {
    const res = await adminApi.decideListing(listingId, {
      decision,
      reason,
      flagCategory,
    });
    await refreshListings();
    await refreshAdminData();
    return res;
  };

  /**
   * 3b. getAdminListingDetails (Admin inspects listing with computed fraud signals)
   */
  const getAdminListingDetails = async (listingId) => {
    return await adminApi.fetchAdminListingDetails(listingId);
  };

  /**
   * 3c. getRecommendedListings (Customer personalized recommendations)
   */
  const getRecommendedListings = async (params = {}) => {
    return await listingApi.fetchRecommendedListings(params);
  };

  /**
   * 4. verifyListing (Partner Completes Physical Visit)
   */
  const verifyListing = async (listingOrId, outcome, fieldData = {}) => {
    // Determine target assignment ID
    let assignmentId = fieldData.assignmentId;
    const targetId = typeof listingOrId === 'object' ? listingOrId.id : listingOrId;

    if (!assignmentId) {
      const match = listings.find((l) => l.id === targetId);
      assignmentId = match?.assignment?.id || match?.activeAssignment?.id;
    }

    if (!assignmentId) {
      // Look up partner assignments directly
      const assignments = await partnerApi.fetchPartnerAssignments();
      const match = assignments.find((a) => a.id === targetId || a.assignment?.id === targetId);
      assignmentId = match?.assignment?.id;
    }

    if (!assignmentId) {
      throw new Error(`No active inspection assignment found for listing ID ${targetId}`);
    }

    const res = await partnerApi.submitInspection(assignmentId, {
      outcome,
      gpsLat: fieldData.gpsLat || (fieldData.cityCode === 'PUN' ? 18.5679 : 21.1441),
      gpsLng: fieldData.gpsLng || (fieldData.cityCode === 'PUN' ? 73.9143 : 79.0688),
      physicalKeysVerified: fieldData.physicalKeysVerified ?? true,
      ownerMetInPerson: fieldData.ownerMetInPerson ?? true,
      unitVacantAvailable: fieldData.unitVacantAvailable ?? true,
      notes: fieldData.notes || `${outcome === 'verified' ? 'Physical parity confirmed' : 'Inspection discrepancy flagged'} by officer`,
      flagReason: fieldData.flagReason || fieldData.notes || null,
      flagCategory: fieldData.flagCategory || 'Field Inspection Discrepancy',
    });

    await refreshListings();
    return res;
  };

  /**
   * 5. addFeedback (Customer Move-In Feedback)
   */
  const addFeedback = async (listingId, feedback) => {
    const res = await feedbackApi.submitFeedback(listingId, {
      rating: Number(feedback.rating) || 5,
      comment: feedback.comment || '',
    });
    await refreshListings();
    return res;
  };

  /**
   * 6. resetDemo (Clears session and reloads)
   */
  const resetDemo = async () => {
    await logout();
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = '/login';
    }
  };

  // Helper counters
  const counts = {
    total: listings.length,
    verified: listings.filter((l) => l.status === 'verified').length,
    pending: listings.filter((l) => l.status === 'pending').length,
    inReview: listings.filter((l) => l.status === 'in-review').length,
    flagged: listings.filter((l) => l.status === 'flagged').length,
    myAssignedPartnerCount: listings.filter((l) => l.status === 'in-review').length,
  };

  return (
    <RentifyContext.Provider
      value={{
        listings,
        refreshListings,
        isLoadingListings,
        authUser,
        isAuthLoading,
        currentRole,
        currentUser,
        availablePartners: availablePartners.length > 0 ? availablePartners : DEMO_ACCOUNTS.filter((u) => u.role === 'partner'),
        seededUserList: DEMO_ACCOUNTS,
        rentalAssistanceData,
        auditLogs,
        counts,
        loginWithPhone,
        loginAsDemoUser,
        loginAsGuest,
        logout,
        switchUserDirectly,
        submitListing,
        assignPartner,
        decideListing,
        getAdminListingDetails,
        getRecommendedListings,
        verifyListing,
        addFeedback,
        resetDemo,
      }}
    >
      {children}
    </RentifyContext.Provider>
  );
};

export const useRentify = () => {
  const context = useContext(RentifyContext);
  if (!context) {
    throw new Error('useRentify must be used within a RentifyProvider');
  }
  return context;
};
