import React, { useState } from 'react';
import { useRentify } from '../context/RentifyContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { VerificationSeal } from '../components/common/VerificationSeal';
import { 
  ShieldAlert, UserCheck, AlertTriangle, CheckCircle2, 
  FileCheck, Calendar, MapPin, IndianRupee, Eye, History, 
  Layers, Filter, Search, ArrowRight, Shield, Check, X, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

export const AdminDashboard = () => {
  usePageMeta(
    'Admin Registrar Console',
    'Audit submitted title deeds against IGR Maharashtra land registries, assign field verification partners, and flag fraudulent listings.'
  );

  const { 
    listings, 
    currentUser, 
    availablePartners, 
    assignPartner, 
    decideListing,
    auditLogs 
  } = useRentify();

  // Active Admin View Tab: 'queue' (Review Queue) | 'all' (Workflow Documentation Table)
  const [activeTab, setActiveTab] = useState('queue');

  // Inline action state for pending listings (map of listingId -> { partnerId, flagReason, showFlagInput })
  const [inlineActions, setInlineActions] = useState({});

  // All-listings audit table filters
  const [tableStatusFilter, setTableStatusFilter] = useState('all'); // 'all' | 'verified' | 'pending' | 'in-review' | 'flagged'
  const [tableCityFilter, setTableCityFilter] = useState('All');
  const [tableSearchQuery, setTableSearchQuery] = useState('');

  // Segregate Listings
  const pendingListings = listings.filter((l) => l.status === 'pending');
  const inReviewListings = listings.filter((l) => l.status === 'in-review');

  // All Listings Filtered for Workflow Documentation Table
  const filteredAuditListings = listings.filter((l) => {
    if (tableStatusFilter !== 'all' && l.status !== tableStatusFilter) return false;
    if (tableCityFilter !== 'All' && l.city !== tableCityFilter) return false;
    if (tableSearchQuery.trim() !== '') {
      const q = tableSearchQuery.toLowerCase();
      const matchText = `${l.id} ${l.title} ${l.ownerName} ${l.locality} ${l.city}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  // Helper to manage inline partner selection per listing
  const getSelectedPartnerId = (listingId, city) => {
    if (inlineActions[listingId]?.partnerId) return inlineActions[listingId].partnerId;
    // Default to a partner matching city zone
    const matched = availablePartners.find(p => (p.zone || p.cityName || '').toLowerCase().includes((city || '').toLowerCase()));
    return matched ? matched.id : availablePartners[0]?.id;
  };

  const handlePartnerChange = (listingId, partnerId) => {
    setInlineActions(prev => ({
      ...prev,
      [listingId]: {
        ...prev[listingId],
        partnerId
      }
    }));
  };

  // 1. INLINE ACTION: Assign Partner (moves to "in-review")
  const handleAssignPartner = (listing) => {
    const partnerId = getSelectedPartnerId(listing.id, listing.city);
    const partner = availablePartners.find(p => p.id === partnerId) || availablePartners[0];
    assignPartner(
      listing.id,
      partner.id,
      `${partner.name} (${partner.badgeNumber})`,
      'Scheduled within 24-48 Hours',
      `Verify original physical Index II deed, inspect electricity meter, and verify owner in person in ${listing.locality}.`
    );
  };

  // 2. INLINE ACTION: Approve Directly on Documents Alone (moves to "verified")
  const handleApproveDocsDirectly = (listing) => {
    if (window.confirm(`Approve listing "${listing.title}" directly on documents alone without an on-site field visit? (Official seal will be generated)`)) {
      decideListing(
        listing.id, 
        'verified', 
        `Approved directly on conclusive government title registry records & verified e-stamped Index II deed (#${listing.documents[0]?.docNumber || 'REG-DOC'}). Site visit waived per registrar review.`,
        'Direct Registry Clearance'
      );
    }
  };

  // 3. INLINE ACTION: Flag with Required Reason (moves to "flagged")
  const handleToggleFlagInput = (listingId) => {
    setInlineActions(prev => ({
      ...prev,
      [listingId]: {
        ...prev[listingId],
        showFlagInput: !prev[listingId]?.showFlagInput,
        flagReason: prev[listingId]?.flagReason || `Title deed mismatch detected during registrar audit. Document registration credentials do not match lister profile.`
      }
    }));
  };

  const handleConfirmFlag = (listing) => {
    const reason = inlineActions[listing.id]?.flagReason;
    if (!reason || !reason.trim()) {
      alert('A specific flag reason is required to reject or flag this listing.');
      return;
    }

    decideListing(
      listing.id,
      'flagged',
      reason.trim(),
      'Document Mismatch & Registry Anomaly'
    );

    // Close inline input
    setInlineActions(prev => ({
      ...prev,
      [listing.id]: {
        ...prev[listing.id],
        showFlagInput: false
      }
    }));
  };

  return (
    <div className="min-h-screen bg-paper pb-24">
      {/* Admin Top Header */}
      <section className="bg-paper-sheet border-b border-paper-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase tracking-widest text-brick font-bold bg-brick-tint px-2.5 py-0.5 rounded border border-brick/20">
                ROLE: CHIEF VERIFICATION REGISTRAR
              </span>
              <span className="text-xs text-ink-500 font-mono">Desk: {currentUser.department}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">
              Registrar Verification Operations Desk
            </h1>
            <p className="text-xs sm:text-sm text-ink-600 mt-1 font-sans">
              Officer <strong>{currentUser.name}</strong> presiding. Review incoming deed submissions, assign on-site field officers, approve conclusive documents directly, or log fraud flags.
            </p>
          </div>

          {/* Metric Badges */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-right">
              <div className="text-[10px] font-mono text-amber-800 uppercase font-bold">Review Queue</div>
              <div className="text-2xl font-bold font-mono text-amber-900">{pendingListings.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-ochre-tint border border-ochre-border text-right">
              <div className="text-[10px] font-mono text-ochre-dark uppercase font-bold">Active Visits</div>
              <div className="text-2xl font-bold font-mono text-ochre">{inReviewListings.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-seal-tint border border-seal/30 text-right">
              <div className="text-[10px] font-mono text-seal-dark uppercase font-bold">Certified</div>
              <div className="text-2xl font-bold font-mono text-seal">
                {listings.filter(l => l.status === 'verified').length}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="max-w-7xl mx-auto mt-6 flex gap-2 border-b border-paper-border pt-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2.5 font-mono text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'border-seal text-seal bg-paper shadow-sm'
                : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>1. Review Queue ({pendingListings.length}) &amp; Active Field Visits ({inReviewListings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 font-mono text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-seal text-seal bg-paper shadow-sm'
                : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Verification Workflow Documentation (All Listings Table)</span>
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ========================================================= */}
        {/* TAB 1: REVIEW QUEUE & IN-REVIEW DISPATCHES                */}
        {/* ========================================================= */}
        {activeTab === 'queue' && (
          <div className="space-y-10">
            {/* Section A: Pending Review Queue */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-ink-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Review Queue: Pending Document Audits ({pendingListings.length})</span>
                  </h2>
                  <p className="text-xs text-ink-500 font-mono mt-0.5">
                    Every listing submitted by a vendor enters here. Cross-check title deeds and select an inline action.
                  </p>
                </div>
              </div>

              {pendingListings.length === 0 ? (
                <div className="bg-paper-sheet border border-dashed border-paper-border p-8 rounded-xl text-center">
                  <CheckCircle2 className="w-8 h-8 text-seal mx-auto mb-1.5" />
                  <h3 className="font-serif font-bold text-ink-900 text-sm">No Pending Submissions to Review</h3>
                  <p className="text-xs text-ink-600 font-sans mt-1">
                    All submitted rental properties have been checked. When an owner submits a new home, it will appear here for document cross-checking.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingListings.map((listing) => {
                    const selectedPartnerId = getSelectedPartnerId(listing.id, listing.city);
                    const isFlagOpen = inlineActions[listing.id]?.showFlagInput;
                    const currentFlagReason = inlineActions[listing.id]?.flagReason || '';

                    return (
                      <div
                        key={listing.id}
                        className="paper-card rounded-xl p-5 border-l-4 border-l-amber-500 shadow-sheet space-y-4"
                      >
                        {/* Top Metadata Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-paper-border/60 pb-3">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={listing.status} size="sm" />
                            <span className="font-mono text-xs font-bold text-ink-900">
                              Ref: {listing.id}
                            </span>
                            <span className="text-ink-400 font-mono text-xs">•</span>
                            <span className="font-mono text-xs text-ink-600">
                              {listing.city} ({listing.locality})
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-ink-500">
                            Submitted: {new Date(listing.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Middle: Title, Owner & Attached Deeds */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          <div className="lg:col-span-7 space-y-2">
                            <h3 className="font-serif text-lg font-bold text-ink-900 leading-snug">
                              <Link to={`/property/${listing.id}`} className="hover:text-seal">
                                {listing.title}
                              </Link>
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-700">
                              <div>Owner: <strong className="text-ink-900">{listing.ownerName}</strong> ({listing.ownerPhone})</div>
                              <div>Rent: <strong className="text-seal font-bold">₹{listing.rent.toLocaleString()}/mo</strong></div>
                              <div>Deposit: <strong>₹{listing.deposit.toLocaleString()}</strong></div>
                              <div>Type: <strong>{listing.propertyType}</strong> ({listing.carpetArea})</div>
                            </div>
                            <p className="text-xs text-ink-600 font-sans line-clamp-2 pt-1">
                              {listing.description}
                            </p>
                          </div>

                          {/* Attached Deeds Summary */}
                          <div className="lg:col-span-5 bg-paper p-3 rounded-lg border border-paper-border text-xs font-mono space-y-1.5">
                            <span className="text-[10px] font-bold text-ink-500 uppercase block mb-1">
                              Attached Title Records for Registrar Audit:
                            </span>
                            {listing.documents.map((doc, i) => (
                              <div key={i} className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-paper-border/60">
                                <span className="font-semibold text-ink-800 truncate max-w-[150px]">{doc.type}</span>
                                <span className="text-seal font-mono">{doc.docNumber}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ========================================================= */}
                        {/* INLINE ACTION ROW (Assign, Direct Approve, Flag)          */}
                        {/* ========================================================= */}
                        <div className="pt-3 border-t border-paper-border">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <span className="text-[11px] font-mono text-ink-500 font-semibold uppercase">
                              Registrar Decision Actions:
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* 1. ASSIGN PARTNER INLINE (Dropdown + Assign button) */}
                              <div className="flex items-center gap-1.5 bg-paper p-1 rounded-lg border border-paper-border">
                                <select
                                  value={selectedPartnerId}
                                  onChange={(e) => handlePartnerChange(listing.id, e.target.value)}
                                  className="bg-transparent font-mono text-xs font-medium text-ink-900 focus:outline-none px-1 py-1 cursor-pointer"
                                >
                                  {availablePartners.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.zone.slice(0, 15)}...)
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleAssignPartner(listing)}
                                  className="px-3 py-1.5 bg-ochre hover:bg-ochre-dark text-white rounded font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                  title="Dispatch partner for physical visit (Moves to 'in-review')"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Assign Partner</span>
                                </button>
                              </div>

                              {/* 2. APPROVE DIRECTLY ON DOCUMENTS ALONE */}
                              <button
                                type="button"
                                onClick={() => handleApproveDocsDirectly(listing)}
                                className="px-3 py-1.5 bg-seal hover:bg-seal-dark text-white rounded font-mono text-xs font-bold transition-all shadow-stamp flex items-center gap-1"
                                title="Approve directly on documents alone (Moves straight to 'verified')"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-ochre-light" />
                                <span>Approve on Docs Alone</span>
                              </button>

                              {/* 3. FLAG WITH REQUIRED REASON BUTTON */}
                              <button
                                type="button"
                                onClick={() => handleToggleFlagInput(listing.id)}
                                className={`px-3 py-1.5 rounded font-mono text-xs font-bold transition-all border flex items-center gap-1 ${
                                  isFlagOpen
                                    ? 'bg-brick text-white border-brick'
                                    : 'bg-brick-tint text-brick-dark border-brick-border hover:bg-brick hover:text-white'
                                }`}
                                title="Reject / flag fraudulent listing with required reason"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{isFlagOpen ? 'Cancel Flag' : 'Flag Listing'}</span>
                              </button>
                            </div>
                          </div>

                          {/* INLINE EXPANDABLE FLAG REASON INPUT */}
                          {isFlagOpen && (
                            <div className="mt-3 p-3.5 rounded-lg bg-brick-tint border border-brick-border space-y-2.5">
                              <label className="block font-mono font-bold text-xs text-brick">
                                Required Discrepancy Reason for Official Flag: *
                              </label>
                              <textarea
                                rows="2"
                                required
                                placeholder="State the specific document mismatch, forged credential, or below-market rent anomaly..."
                                value={currentFlagReason}
                                onChange={(e) => setInlineActions(prev => ({
                                  ...prev,
                                  [listing.id]: {
                                    ...prev[listing.id],
                                    flagReason: e.target.value
                                  }
                                }))}
                                className="w-full p-2.5 bg-white border border-brick rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-brick"
                              ></textarea>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFlagInput(listing.id)}
                                  className="px-3 py-1 bg-paper border border-paper-border rounded text-ink-700 font-mono text-xs"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmFlag(listing)}
                                  className="px-4 py-1.5 bg-brick text-white rounded font-mono text-xs font-bold hover:bg-brick-dark shadow-sm"
                                >
                                  Confirm Official Flag
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section B: In-Review Listings (Read-Only Status List) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-ink-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-ochre"></span>
                    <span>Currently In-Review: Dispatched Field Inspections ({inReviewListings.length})</span>
                  </h2>
                  <p className="text-xs text-ink-500 font-mono mt-0.5">
                    Read-only status list of listings assigned to Verification Partners, awaiting on-site physical audits.
                  </p>
                </div>
              </div>

              {inReviewListings.length === 0 ? (
                <div className="bg-paper-sheet border border-dashed border-paper-border p-6 rounded-xl text-center text-xs font-sans text-ink-600">
                  <p className="font-semibold text-ink-800">No properties currently awaiting field visits.</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">When you assign a field officer from the review queue above, their scheduled visit will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inReviewListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="paper-card rounded-xl p-4 border-l-4 border-l-ochre flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                          <StatusBadge status={listing.status} size="sm" />
                          <span className="font-semibold text-seal">{listing.city}</span>
                        </div>

                        <h4 className="font-serif font-bold text-ink-900 text-sm">
                          <Link to={`/property/${listing.id}`} className="hover:text-seal">
                            {listing.title}
                          </Link>
                        </h4>

                        <div className="mt-2 space-y-1 text-xs font-mono text-ink-600">
                          <div>Locality: <strong>{listing.locality}</strong></div>
                          <div>Owner: <strong>{listing.ownerName}</strong> ({listing.ownerPhone})</div>
                          <div>Rent: <strong>₹{listing.rent.toLocaleString()} / mo</strong></div>
                        </div>

                        <div className="mt-3 p-2.5 rounded bg-ochre-tint/70 border border-ochre-border text-xs font-mono text-ochre-dark">
                          <div className="font-bold">Assigned Field Officer:</div>
                          <div className="text-ink-900 font-semibold">{listing.assignedPartnerName || 'Verification Partner'}</div>
                          <div className="text-[10px] text-ink-600 mt-1">Visit Slot: {listing.scheduledVisitDate || 'Scheduled within 24-48 Hours'}</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-paper-border flex items-center justify-between text-xs font-mono text-ink-500">
                        <span>Awaiting Field Report</span>
                        <Link to={`/property/${listing.id}`} className="text-seal hover:underline inline-flex items-center gap-1">
                          <span>Inspect Listing</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ALL-LISTINGS WORKFLOW DOCUMENTATION TABLE (Deliverable from synopsis) */}
        {/* ========================================================================= */}
        {activeTab === 'all' && (
          <div className="space-y-6">
            <div className="bg-paper-sheet border border-paper-border rounded-xl p-5 shadow-sheet">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper-border pb-4 mb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-seal bg-seal-tint px-2 py-0.5 rounded border border-seal/30 mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>PROJECT DELIVERABLE • SPECIFICATION 7</span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-ink-900">
                    Verification Workflow Documentation &amp; Audit Registry
                  </h2>
                  <p className="text-xs text-ink-600 font-sans mt-0.5">
                    Interactive audit log showing every property on the platform across all lifecycle stages: Verified, Pending, In-Review, and Flagged.
                  </p>
                </div>

                {/* Status Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                  {['all', 'verified', 'pending', 'in-review', 'flagged'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setTableStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg border capitalize transition-all ${
                        tableStatusFilter === st
                          ? 'bg-seal text-white font-bold border-seal shadow-stamp'
                          : 'bg-paper text-ink-700 border-paper-border hover:bg-paper-subtle'
                      }`}
                    >
                      {st === 'all' ? `All (${listings.length})` : `${st} (${listings.filter(l => l.status === st).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Filters: City & Text Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 text-xs font-mono">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search by ID, title, owner, or locality..."
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-paper border border-paper-border rounded text-xs focus:outline-none focus:border-seal font-sans"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-ink-500">City Filter:</span>
                  <select
                    value={tableCityFilter}
                    onChange={(e) => setTableCityFilter(e.target.value)}
                    className="p-1.5 bg-paper border border-paper-border rounded text-xs font-mono font-semibold"
                  >
                    <option value="All">All Cities</option>
                    <option value="Nagpur">Nagpur</option>
                    <option value="Pune">Pune</option>
                  </select>
                  <span className="text-ink-400">|</span>
                  <span className="text-ink-500">Showing {filteredAuditListings.length} records</span>
                </div>
              </div>

              {/* Interactive Audit Table */}
              <div className="border border-paper-border rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-paper-subtle text-ink-700 uppercase border-b border-paper-border font-bold text-[11px]">
                    <tr>
                      <th className="p-3">Ref ID</th>
                      <th className="p-3">Property Title</th>
                      <th className="p-3">Owner / Lister</th>
                      <th className="p-3">City &amp; Area</th>
                      <th className="p-3">Rent (₹)</th>
                      <th className="p-3">Workflow Status</th>
                      <th className="p-3">Audit Details / Seal ID</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-border">
                    {filteredAuditListings.map((row) => (
                      <tr key={row.id} className="hover:bg-paper-subtle/50 transition-colors">
                        <td className="p-3 font-bold text-seal font-mono whitespace-nowrap">
                          {row.id}
                        </td>
                        <td className="p-3 font-serif font-bold text-ink-900 max-w-xs truncate">
                          <Link to={`/property/${row.id}`} className="hover:underline">
                            {row.title}
                          </Link>
                        </td>
                        <td className="p-3 text-ink-700 whitespace-nowrap">
                          {row.ownerName}
                        </td>
                        <td className="p-3 text-ink-600 whitespace-nowrap">
                          {row.city} • <span className="text-ink-500">{row.locality.slice(0, 16)}</span>
                        </td>
                        <td className="p-3 font-bold text-ink-900 whitespace-nowrap">
                          ₹{row.rent.toLocaleString()}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <StatusBadge status={row.status} size="sm" />
                        </td>
                        <td className="p-3 text-[11px] text-ink-600 max-w-xs">
                          {row.status === 'verified' && (
                            <span className="text-seal font-semibold">
                              Seal #{row.verificationSealId}
                            </span>
                          )}
                          {row.status === 'in-review' && (
                            <span className="text-ochre">
                              Assigned to {row.assignedPartnerName?.slice(0, 18) || 'Field Officer'}
                            </span>
                          )}
                          {row.status === 'pending' && (
                            <span className="text-amber-700">
                              Docs awaiting IGR registry check
                            </span>
                          )}
                          {row.status === 'flagged' && (
                            <span className="text-brick font-semibold truncate block max-w-[200px]" title={row.flagReason}>
                              ⚠️ {row.flagReason}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <Link
                            to={`/property/${row.id}`}
                            className="text-seal hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Platform Audit Trail (Recent Actions) */}
            <div className="bg-paper-sheet border border-paper-border rounded-xl p-5 shadow-sheet">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-4 h-4 text-seal" />
                <h3 className="font-serif font-bold text-base text-ink-900">
                  Immutable Platform Audit Trail (Real-Time Verification Event Log)
                </h3>
              </div>
              <p className="text-xs text-ink-500 font-mono mb-4">
                Chronological log of every submission, registrar decision, partner assignment, and field certification.
              </p>

              <div className="space-y-2 font-mono text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded bg-paper border border-paper-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-ink-900">{log.action}</strong>
                        <span className="text-ink-400">•</span>
                        <span className="text-ink-600">{log.actor}</span>
                      </div>
                      <div className="text-ink-700 text-[11px] mt-0.5">{log.detail}</div>
                      <div className="text-[10px] text-seal font-semibold">Listing: {log.propertyTitle}</div>
                    </div>
                    <div className="text-[10px] text-ink-400 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
