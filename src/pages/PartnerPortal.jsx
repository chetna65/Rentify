import React, { useState } from 'react';
import { useRentify } from '../context/RentifyContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { VerificationSeal } from '../components/common/VerificationSeal';
import { 
  CheckCircle2, AlertOctagon, ArrowRight, AlertTriangle, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

export const PartnerPortal = () => {
  usePageMeta(
    'Verification Partner Portal',
    'Conduct mandatory physical on-site audits, GPS tagging, and issue official Inked Verification Seals.'
  );

  const { listings, currentUser, verifyListing } = useRentify();

  // Inline action state: { [listingId]: { showFlag: boolean, flagNote: string } }
  const [inlineActions, setInlineActions] = useState({});

  // Feedback Toast
  const [actionNotice, setActionNotice] = useState(null);

  // Filter listings assigned to this partner (or all in-review if assigned broadly)
  const myAssignedVisits = listings.filter((l) => {
    if (l.status !== 'in-review') return false;
    if (l.assignedPartnerId === currentUser.id) return true;
    if (l.assignedPartnerName && l.assignedPartnerName.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0])) return true;
    // Fallback if no specific partner ID was tagged
    return true;
  });

  // "Completed by you" list showing listings this partner has already verified
  const completedByMe = listings.filter((l) => {
    if (l.status !== 'verified') return false;
    if (l.verifiedBy && l.verifiedBy.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0])) return true;
    if (l.fieldReport?.officer && l.fieldReport.officer.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0])) return true;
    if (l.assignedPartnerId === currentUser.id) return true;
    // Fallback so the completed section is never empty in prototype
    return l.status === 'verified';
  });

  // ACTION 1: CONFIRM (Marks verified, stamps today's date & partner's name, issues seal)
  const handleConfirmVisit = (listing) => {
    const today = new Date().toISOString().split('T')[0];
    const gpsLocation = listing.city === 'Pune' 
      ? '18.5679° N, 73.9143° E (Pune East Hub)' 
      : '21.1441° N, 79.0688° E (Nagpur Central)';

    verifyListing(listing.id, 'verified', {
      cityCode: listing.city === 'Pune' ? 'PUN' : 'NGP',
      gpsCoords: gpsLocation,
      ownerMetInPerson: true,
      notes: `On-site physical inspection completed on ${today} by Officer ${currentUser.name} (${currentUser.badgeNumber || 'VP-042'}). Inspected original watermarked title deeds, matched owner identity in-person, verified physical door locks and keys, and confirmed flat is vacant and ready for tenancy.`
    });

    setActionNotice({
      type: 'verified',
      text: `Listing "${listing.title}" successfully confirmed as VERIFIED! Official seal stamped with Officer ${currentUser.name}.`
    });
    setTimeout(() => setActionNotice(null), 6000);
  };

  // ACTION 2: FLAG DISCREPANCY (Requires note describing what didn't match)
  const handleToggleFlag = (listingId) => {
    setInlineActions(prev => ({
      ...prev,
      [listingId]: {
        ...prev[listingId],
        showFlag: !prev[listingId]?.showFlag,
        flagNote: prev[listingId]?.flagNote || `On-site visit failed: flat is already occupied by existing registered tenants; lister was attempting an unauthorized sub-letting transaction.`
      }
    }));
  };

  const handleConfirmFlag = (listing) => {
    const note = inlineActions[listing.id]?.flagNote;
    if (!note || !note.trim()) {
      alert('A required note describing what did not match on-site must be provided.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const gpsLocation = listing.city === 'Pune' 
      ? '18.5679° N, 73.9143° E' 
      : '21.1441° N, 79.0688° E';

    verifyListing(listing.id, 'flagged', {
      cityCode: listing.city === 'Pune' ? 'PUN' : 'NGP',
      gpsCoords: gpsLocation,
      flagReason: `Physical On-Site Audit Failure (${today}): ${note.trim()}`,
      flagCategory: 'Physical Discrepancy & Site Failure',
      notes: `Field officer ${currentUser.name} visited premises on ${today}. Inspection failed: ${note.trim()}`
    });

    setInlineActions(prev => ({
      ...prev,
      [listing.id]: { showFlag: false, flagNote: '' }
    }));

    setActionNotice({
      type: 'flagged',
      text: `Discrepancy logged for "${listing.title}". Listing moved to FLAGGED status.`
    });
    setTimeout(() => setActionNotice(null), 6000);
  };

  return (
    <div className="min-h-screen bg-paper pb-24">
      {/* Partner Top Header */}
      <section className="bg-paper-sheet border-b border-paper-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase tracking-widest text-seal font-bold bg-seal-tint px-2.5 py-0.5 rounded border border-seal/20">
                ROLE: VERIFICATION PARTNER (FIELD INSPECTOR)
              </span>
              <span className="text-xs text-ink-500 font-mono">
                Badge #{currentUser.badgeNumber || 'VP-042'} | Zone: {currentUser.zone || 'Nagpur Central'}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">
              Field Officer Inspection Portal
            </h1>
            <p className="text-xs sm:text-sm text-ink-600 mt-1 font-sans">
              Officer <strong>{currentUser.name}</strong>. Your physical on-site inspection is the <strong>exclusive path</strong> that issues the official Rentify Inked Verification Seal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-ochre-tint border border-ochre-border text-right">
              <div className="text-[10px] font-mono text-ochre-dark uppercase font-bold">Assigned Visits</div>
              <div className="text-2xl font-bold font-mono text-ochre">{myAssignedVisits.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-seal-tint border border-seal/30 text-right">
              <div className="text-[10px] font-mono text-seal-dark uppercase font-bold">Completed By You</div>
              <div className="text-2xl font-bold font-mono text-seal">{completedByMe.length}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-10">
        {/* Feedback Alert Toast */}
        {actionNotice && (
          <div className={`p-4 rounded-xl text-xs font-mono flex items-start gap-3 shadow-sm ${
            actionNotice.type === 'verified' 
              ? 'bg-seal-tint border border-seal text-seal-dark' 
              : 'bg-brick-tint border border-brick text-brick-dark'
          }`}>
            {actionNotice.type === 'verified' ? (
              <CheckCircle2 className="w-5 h-5 text-seal flex-shrink-0 mt-0.5" />
            ) : (
              <AlertOctagon className="w-5 h-5 text-brick flex-shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="block font-bold mb-0.5">
                {actionNotice.type === 'verified' ? 'Property Successfully Verified!' : 'Discrepancy Logged & Listing Flagged'}
              </strong>
              {actionNotice.text}
            </div>
          </div>
        )}

        {/* Section 1: Assigned Visits ("in-review") */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-ochre animate-pulse"></span>
                <span>Assigned Visits: Properties Awaiting Physical Audit ({myAssignedVisits.length})</span>
              </h2>
              <p className="text-xs text-ink-500 font-mono mt-0.5">
                Listings assigned by the Admin Registrar. Visit the site, inspect original title documents, check locks and keys, then confirm or flag.
              </p>
            </div>
          </div>

          {myAssignedVisits.length === 0 ? (
            <div className="bg-paper-sheet border border-dashed border-paper-border p-8 rounded-xl text-center">
              <CheckCircle2 className="w-8 h-8 text-seal mx-auto mb-1.5" />
              <h3 className="font-serif font-bold text-ink-900 text-sm">No Property Visits Scheduled Right Now</h3>
              <p className="text-xs text-ink-600 font-sans mt-1">
                You are all caught up on field audits. When the Admin Registrar assigns a new property in your area for an on-site inspection, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myAssignedVisits.map((listing) => {
                const isFlagOpen = inlineActions[listing.id]?.showFlag;
                const flagNote = inlineActions[listing.id]?.flagNote || '';

                return (
                  <div
                    key={listing.id}
                    className="paper-card rounded-xl p-5 border-l-4 border-l-ochre shadow-sheet space-y-4"
                  >
                    {/* Top Status & Location */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-paper-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={listing.status} size="sm" />
                        <span className="font-mono text-xs font-bold text-ink-900">
                          Ref: {listing.id}
                        </span>
                        <span className="text-ink-400 font-mono text-xs">•</span>
                        <span className="font-mono text-xs text-seal font-semibold">
                          {listing.city} ({listing.locality})
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-ochre-dark font-bold bg-ochre-tint px-2.5 py-0.5 rounded border border-ochre-border">
                        Visit Slot: {listing.scheduledVisitDate || 'Scheduled Today'}
                      </div>
                    </div>

                    {/* Middle: Title & Specs */}
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

                        {listing.adminAssignmentNotes && (
                          <div className="p-2.5 rounded bg-ochre-tint/50 border border-ochre-border text-xs text-ochre-dark font-sans">
                            <strong>Registrar Directives:</strong> {listing.adminAssignmentNotes}
                          </div>
                        )}
                      </div>

                      {/* On-Site Verification Checklist Points */}
                      <div className="lg:col-span-5 bg-paper p-3.5 rounded-lg border border-paper-border text-xs font-mono space-y-2">
                        <span className="text-[10px] font-bold text-ink-500 uppercase block mb-1">
                          On-Site Protocol Checklist:
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-ink-800">
                          <Check className="w-3.5 h-3.5 text-seal flex-shrink-0" />
                          <span>GPS Geotag confirmed matching locality</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-ink-800">
                          <Check className="w-3.5 h-3.5 text-seal flex-shrink-0" />
                          <span>Original Index II paper deed inspected face-to-face</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-ink-800">
                          <Check className="w-3.5 h-3.5 text-seal flex-shrink-0" />
                          <span>Physical keys tested &amp; vacant unit confirmed</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-ink-800">
                          <Check className="w-3.5 h-3.5 text-seal flex-shrink-0" />
                          <span>Society secretary / guard confirmed ownership</span>
                        </div>
                      </div>
                    </div>

                    {/* ========================================================= */}
                    {/* TWO ACTIONS: CONFIRM (ISSUE SEAL) OR FLAG DISCREPANCY     */}
                    {/* ========================================================= */}
                    <div className="pt-3 border-t border-paper-border">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-[11px] font-mono text-ink-500 font-semibold uppercase">
                          Field Audit Decision:
                        </span>

                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* ACTION 1: CONFIRM */}
                          <button
                            type="button"
                            onClick={() => handleConfirmVisit(listing)}
                            className="px-4 py-2 bg-seal hover:bg-seal-dark text-white rounded-lg font-mono text-xs font-bold shadow-stamp transition-all flex items-center gap-1.5"
                            title="Confirm physical verification — stamps today's date, partner name, and issues official seal"
                          >
                            <CheckCircle2 className="w-4 h-4 text-ochre-light" />
                            <span>Confirm (Issue Official Stamp)</span>
                          </button>

                          {/* ACTION 2: FLAG DISCREPANCY */}
                          <button
                            type="button"
                            onClick={() => handleToggleFlag(listing.id)}
                            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all border flex items-center gap-1.5 ${
                              isFlagOpen
                                ? 'bg-brick text-white border-brick'
                                : 'bg-brick-tint text-brick-dark border-brick-border hover:bg-brick hover:text-white'
                            }`}
                            title="Flag a physical discrepancy with required note"
                          >
                            <AlertOctagon className="w-4 h-4" />
                            <span>{isFlagOpen ? 'Cancel Flag' : 'Flag Discrepancy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* INLINE REQUIRED DISCREPANCY NOTE */}
                      {isFlagOpen && (
                        <div className="mt-3 p-4 rounded-xl bg-brick-tint border border-brick space-y-3">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-brick">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Required Field Discrepancy Note (What didn't match on-site?): *</span>
                          </div>
                          <textarea
                            rows="3"
                            required
                            placeholder="Describe what didn't match on-site (e.g. locks didn't match, lister is not the legal owner, unit is already rented to another tenant, or missing original deed)..."
                            value={flagNote}
                            onChange={(e) => setInlineActions(prev => ({
                              ...prev,
                              [listing.id]: {
                                ...prev[listing.id],
                                flagNote: e.target.value
                              }
                            }))}
                            className="w-full p-2.5 bg-white border border-brick rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-brick"
                          ></textarea>

                          <div className="flex items-center justify-end gap-2 text-xs font-mono">
                            <button
                              type="button"
                              onClick={() => handleToggleFlag(listing.id)}
                              className="px-3 py-1 bg-paper border border-paper-border rounded text-ink-700"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmFlag(listing)}
                              className="px-4 py-1.5 bg-brick text-white rounded font-bold hover:bg-brick-dark shadow-sm"
                            >
                              Submit Official Discrepancy Flag
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

        {/* Section 2: "Completed by you" list */}
        <div className="border-t border-paper-border pt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-seal" />
                <span>Completed by You: Verified Property Certificates ({completedByMe.length})</span>
              </h2>
              <p className="text-xs text-ink-500 font-mono mt-0.5">
                Listings officially certified by your field audit. These listings carry your name, inspection date, and the official Rentify Inked Seal.
              </p>
            </div>
          </div>

          {completedByMe.length === 0 ? (
            <div className="bg-paper-sheet border border-dashed border-paper-border p-8 rounded-xl text-center">
              <CheckCircle2 className="w-8 h-8 text-ink-300 mx-auto mb-1.5" />
              <h3 className="font-serif font-bold text-ink-800 text-sm">No Completed Verifications Yet</h3>
              <p className="text-xs text-ink-600 font-sans mt-0.5">
                When you conduct an on-site audit and confirm a property from your assigned queue above, its official certificate will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedByMe.map((listing) => (
                <div
                  key={listing.id}
                  className="paper-card rounded-xl p-5 border-l-4 border-l-seal shadow-sheet flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold uppercase text-seal bg-seal-tint px-2 py-0.5 rounded border border-seal/20">
                          OFFICIAL SEAL ISSUED
                        </span>
                        <div className="font-mono text-[11px] text-ink-500 mt-1">
                          Cert #{listing.verificationSealId}
                        </div>
                      </div>
                      <VerificationSeal sealId={listing.verificationSealId} size="sm" showLabel={false} />
                    </div>

                    <h3 className="font-serif font-bold text-base text-ink-900 line-clamp-2 hover:text-seal">
                      <Link to={`/property/${listing.id}`}>
                        {listing.title}
                      </Link>
                    </h3>

                    <div className="mt-2 text-xs font-mono text-ink-600 space-y-1">
                      <div>Locality: <strong>{listing.locality}, {listing.city}</strong></div>
                      <div>Rent: <strong className="text-seal">₹{listing.rent.toLocaleString()} / mo</strong></div>
                      <div>Owner: <strong>{listing.ownerName}</strong></div>
                      <div className="text-[11px] text-ink-500 pt-1 border-t border-paper-border/60">
                        Certified on: <strong className="text-ink-900">{listing.fieldReport?.inspectionDate || listing.verifiedAt?.split('T')[0] || '2026-08-16'}</strong>
                      </div>
                      <div className="text-[11px] text-seal-dark font-medium">
                        Auditor: {listing.fieldReport?.officer || currentUser.name} ({listing.fieldReport?.badgeNumber || 'VP-042'})
                      </div>
                    </div>

                    {listing.fieldReport?.notes && (
                      <p className="mt-3 p-2 rounded bg-paper text-[11px] text-ink-700 font-sans line-clamp-3 border border-paper-border">
                        "{listing.fieldReport.notes}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-paper-border">
                    <Link
                      to={`/property/${listing.id}`}
                      className="w-full py-1.5 px-3 rounded bg-seal-tint hover:bg-seal hover:text-white text-seal-dark font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>View Public Certificate</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
