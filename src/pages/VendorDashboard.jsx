import React, { useState, useRef } from 'react';
import { useRentify } from '../context/RentifyContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { VerificationSeal } from '../components/common/VerificationSeal';
import { 
  Building2, PlusCircle, CheckCircle2, Clock, AlertTriangle, 
  UploadCloud, ArrowRight, ArrowLeft, MapPin, AlertOctagon, UserCheck, 
  ShieldCheck, FileCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import { trackEvent } from '../utils/analytics';

export const VendorDashboard = () => {
  usePageMeta(
    'Vendor & Owner Portal',
    'Submit rental flats with deed documents (Index II, 7/12 extract) and monitor the registrar verification pipeline.'
  );

  const { listings, currentUser, submitListing } = useRentify();

  // Screen mode: 'list' (My Properties) | 'new' (New Listing Form)
  const [viewMode, setViewMode] = useState('list');
  const [submissionSuccessMessage, setSubmissionSuccessMessage] = useState(null);

  // Bot Protection: Honeypot & Submission Throttling
  const [honeypot, setHoneypot] = useState('');
  const lastSubmitRef = useRef(0);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    city: 'Nagpur',
    area: '',
    propertyType: '2BHK',
    rent: '',
    deposit: '',
    description: '',
    docType: 'Index II Title Deed',
    docNumber: '',
    idNumber: '',
    // Verification Checkboxes (simulating document attachment)
    hasOwnershipProof: false,
    hasGovtId: false,
  });

  // Inline Validation Error State
  const [formErrors, setFormErrors] = useState([]);

  // Auto-calculate MTA 2-month deposit cap when rent changes
  const handleRentChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      rent: val,
      deposit: val ? String(Number(val) * 2) : ''
    }));
  };

  // Form Validation & Submission
  const handleFormSubmit = (e) => {
    e.preventDefault();

    // 1. Anti-bot honeypot check
    if (honeypot) {
      console.warn('Bot submission blocked via honeypot field');
      return;
    }

    // 2. Submission rate throttle (prevent rapid multiple submissions within 3 seconds)
    const now = Date.now();
    if (now - lastSubmitRef.current < 3000) {
      setFormErrors(['Please wait a few seconds before resubmitting.']);
      return;
    }
    lastSubmitRef.current = now;

    const errors = [];

    if (!formData.title.trim()) errors.push('Property title is required.');
    if (!formData.city.trim()) errors.push('City must be selected.');
    if (!formData.area.trim()) errors.push('Area / Locality is required.');
    if (!formData.rent || Number(formData.rent) <= 0) errors.push('A valid positive monthly rent must be specified.');
    if (!formData.deposit || Number(formData.deposit) <= 0) errors.push('Security deposit amount must be positive.');
    if (!formData.description.trim()) errors.push('Property description is required.');

    // Critical Document Requirements
    if (!formData.hasOwnershipProof) {
      errors.push('Ownership Proof Document must be attached (check the box to attach your Index II / 7/12 / Tax Receipt).');
    }
    if (!formData.hasGovtId) {
      errors.push('Government ID must be attached (check the box to attach your Aadhaar / PAN card).');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Clear errors and submit
    setFormErrors([]);

    trackEvent('vendor_listing_submitted', {
      city: formData.city,
      propertyType: formData.propertyType,
      rent: Number(formData.rent)
    });

    submitListing({
      title: formData.title.trim(),
      city: formData.city,
      locality: formData.area.trim(),
      area: formData.area.trim(),
      propertyType: formData.propertyType,
      rent: Number(formData.rent),
      deposit: Number(formData.deposit),
      description: formData.description.trim(),
      docType: formData.docType,
      docNumber: formData.docNumber.trim() || `${formData.city.slice(0, 3).toUpperCase()}-REG-${Math.floor(1000 + Math.random() * 9000)}/2024`,
      idNumber: formData.idNumber.trim() || 'XXXX-XXXX-9942',
      hasOwnershipProof: true,
      hasGovtId: true,
    });

    // Reset Form
    setFormData({
      title: '',
      city: 'Nagpur',
      area: '',
      propertyType: '2BHK',
      rent: '',
      deposit: '',
      description: '',
      docType: 'Index II Title Deed',
      docNumber: '',
      idNumber: '',
      hasOwnershipProof: false,
      hasGovtId: false,
    });

    // Switch back to Dashboard with feedback
    setViewMode('list');
    setSubmissionSuccessMessage(`Listing "${formData.title}" was successfully submitted with status "Pending". It has entered the Admin registrar review queue.`);
    setTimeout(() => setSubmissionSuccessMessage(null), 7000);
  };

  // Filter listings belonging to this vendor persona
  const myProperties = listings.filter(
    (l) => l.ownerName?.toLowerCase().includes('sharma') || l.ownerName === currentUser.name || l.submittedAt
  );

  return (
    <div className="min-h-screen bg-paper pb-24">
      {/* Top Header */}
      <section className="bg-paper-sheet border-b border-paper-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase tracking-widest text-seal font-bold bg-seal-tint px-2.5 py-0.5 rounded border border-seal/20">
                ROLE: VENDOR (INDEPENDENT PROPERTY OWNER)
              </span>
              <span className="text-xs text-ink-500 font-mono">KYC: {currentUser.kycStatus || 'Aadhaar e-KYC Verified'}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">
              {viewMode === 'new' ? 'Submit Property for Title Verification' : 'Vendor Property Portfolio & Verification Queue'}
            </h1>
            <p className="text-xs sm:text-sm text-ink-600 mt-1 font-sans">
              Welcome back, <strong>{currentUser.name}</strong>. Independent owners submit registered deeds to earn the <strong>Rentify Verification Stamp</strong> and eliminate broker fees.
            </p>
          </div>

          <div>
            {viewMode === 'new' ? (
              <button
                onClick={() => { setViewMode('list'); setFormErrors([]); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-paper border border-paper-border text-ink-700 text-xs font-mono font-semibold hover:bg-paper-subtle transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to My Properties</span>
              </button>
            ) : (
              <button
                onClick={() => setViewMode('new')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-seal text-white text-xs font-mono font-bold shadow-stamp hover:bg-seal-dark transition-all"
              >
                <PlusCircle className="w-4 h-4 text-ochre-light" />
                <span>Submit New Property</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Success Toast */}
        {submissionSuccessMessage && (
          <div className="mb-6 p-4 rounded-xl bg-seal-tint border border-seal text-seal-dark text-xs font-mono flex items-start gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-seal flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Submission Received Successfully!</strong>
              {submissionSuccessMessage}
            </div>
          </div>
        )}

        {/* VIEW 1: MY PROPERTIES DASHBOARD */}
        {viewMode === 'list' && (
          <div className="space-y-6">
            {/* Quick Stats Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-lg bg-paper-sheet border border-paper-border">
                <span className="text-ink-500 text-[10px] uppercase block">Total Managed</span>
                <span className="text-xl font-bold text-ink-900 mt-1 block">{myProperties.length}</span>
              </div>
              <div className="p-3.5 rounded-lg bg-seal-tint/60 border border-seal/30">
                <span className="text-seal text-[10px] uppercase font-bold block">Verified Active</span>
                <span className="text-xl font-bold text-seal-dark mt-1 block">
                  {myProperties.filter(p => p.status === 'verified').length}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-ochre-tint/60 border border-ochre-border">
                <span className="text-ochre-dark text-[10px] uppercase font-bold block">In Pipeline (Pending/Field)</span>
                <span className="text-xl font-bold text-ochre mt-1 block">
                  {myProperties.filter(p => p.status === 'pending' || p.status === 'in-review').length}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-brick-tint/60 border border-brick-border">
                <span className="text-brick text-[10px] uppercase font-bold block">Flagged Discrepancies</span>
                <span className="text-xl font-bold text-brick mt-1 block">
                  {myProperties.filter(p => p.status === 'flagged').length}
                </span>
              </div>
            </div>

            {/* Verification Lifecycle Guidance Legend */}
            <div className="bg-paper-sheet border border-paper-border rounded-xl p-4 text-xs font-mono">
              <div className="text-ink-500 font-bold uppercase text-[10px] mb-2">
                What the 4 Verification Statuses Mean for You (Property Owner):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded bg-amber-50 border border-amber-200">
                  <span className="text-amber-800 font-bold block">1. Pending</span>
                  <span className="text-[11px] text-ink-700 font-sans mt-0.5 block">Waiting on Admin's document review against government land records.</span>
                </div>
                <div className="p-2.5 rounded bg-ochre-tint border border-ochre-border">
                  <span className="text-ochre-dark font-bold block">2. In-Review</span>
                  <span className="text-[11px] text-ink-700 font-sans mt-0.5 block">Assigned to a local Field Officer for scheduled physical site visit.</span>
                </div>
                <div className="p-2.5 rounded bg-seal-tint border border-seal/30">
                  <span className="text-seal font-bold block">3. Verified</span>
                  <span className="text-[11px] text-ink-700 font-sans mt-0.5 block">Certified with Official Inked Stamp &amp; open to customer discovery.</span>
                </div>
                <div className="p-2.5 rounded bg-brick-tint border border-brick-border">
                  <span className="text-brick font-bold block">4. Flagged</span>
                  <span className="text-[11px] text-ink-700 font-sans mt-0.5 block">Document or physical discrepancy detected. Resubmission is possible.</span>
                </div>
              </div>
            </div>

            {/* List of Properties with Role-Appropriate Explanations */}
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-ink-900">
                Your Listings &amp; Real-Time Verification Tracker
              </h2>

              {myProperties.length === 0 ? (
                <div className="bg-paper-sheet border border-dashed border-paper-border p-10 text-center rounded-xl">
                  <Building2 className="w-10 h-10 text-ink-400 mx-auto mb-2" />
                  <h3 className="font-serif font-bold text-ink-900 text-base">No properties listed yet</h3>
                  <p className="text-xs text-ink-600 mt-1">Submit your first rental property with ownership documents to begin.</p>
                  <button
                    onClick={() => setViewMode('new')}
                    className="mt-4 px-4 py-2 bg-seal text-white font-mono text-xs font-bold rounded-lg shadow-stamp"
                  >
                    Submit Property
                  </button>
                </div>
              ) : (
                myProperties.map((property) => {
                  const isVerified = property.status === 'verified';
                  const isInReview = property.status === 'in-review';
                  const isPending = property.status === 'pending';
                  const isFlagged = property.status === 'flagged';

                  return (
                    <div
                      key={property.id}
                      className={`paper-card rounded-xl p-5 transition-all border-l-4 ${
                        isVerified 
                          ? 'border-l-seal' 
                          : isFlagged 
                            ? 'border-l-brick bg-brick-tint/15' 
                            : 'border-l-ochre'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Left: Property Overview */}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <StatusBadge status={property.status} />
                            <span className="font-mono text-xs font-bold text-seal bg-seal-tint px-2 py-0.5 rounded border border-seal/20">
                              {property.propertyType}
                            </span>
                            <span className="font-mono text-xs text-ink-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-seal" />
                              <span>{property.locality}, {property.city}</span>
                            </span>
                          </div>

                          <h3 className="font-serif text-lg font-bold text-ink-900 hover:text-seal transition-colors">
                            <Link to={`/property/${property.id}`}>
                              {property.title}
                            </Link>
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-ink-700">
                            <div>Rent: <strong className="text-seal font-bold">₹{property.rent.toLocaleString()} / mo</strong></div>
                            <div>Deposit: <strong>₹{property.deposit.toLocaleString()}</strong></div>
                            <div>Carpet Area: <strong>{property.carpetArea}</strong></div>
                          </div>

                          {/* ========================================================= */}
                          {/* ROLE-APPROPRIATE EXPLANATION OF WHAT STATUS MEANS & NEXT */}
                          {/* ========================================================= */}
                          <div className="mt-4 p-3.5 rounded-lg border text-xs font-sans space-y-1.5">
                            {/* PENDING STATUS */}
                            {isPending && (
                              <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-md text-amber-950">
                                <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-900 mb-1">
                                  <Clock className="w-4 h-4 text-amber-700" />
                                  <span>Current Status: Waiting on Admin's Document Review</span>
                                </div>
                                <p className="leading-relaxed text-[12px] text-amber-900/90">
                                  <strong>What this means:</strong> The Chief Verification Registrar is actively cross-checking your submitted ownership deed (Index II / 7/12 extract) against the state government IGR land registry.
                                </p>
                                <p className="leading-relaxed text-[12px] text-amber-900/90 font-medium pt-1 border-t border-amber-200/60">
                                  <strong>What happens next:</strong> Once document authenticity is confirmed, the admin will assign a local Field Verification Partner for your area to coordinate an on-site inspection visit.
                                </p>
                              </div>
                            )}

                            {/* IN-REVIEW STATUS */}
                            {isInReview && (
                              <div className="bg-ochre-tint/80 border border-ochre-border p-3 rounded-md text-ochre-dark">
                                <div className="flex items-center gap-2 font-mono text-xs font-bold text-ochre-dark mb-1">
                                  <UserCheck className="w-4 h-4 text-ochre" />
                                  <span>
                                    Current Status: Assigned to {property.assignedPartnerName || 'Verification Partner'}
                                  </span>
                                </div>
                                <p className="leading-relaxed text-[12px] text-ink-800">
                                  <strong>What this means:</strong> Your title deed passed the initial document cross-check. A certified Field Verification Officer has been scheduled to inspect the physical premises.
                                </p>
                                <div className="leading-relaxed text-[12px] text-ink-800 font-medium pt-1 border-t border-ochre-border/60 flex items-center justify-between">
                                  <span><strong>What happens next:</strong> Keep original deeds and physical keys ready for the visit ({property.scheduledVisitDate || 'Within 24-48 hours'}). Upon inspection, the officer will issue the Official Verification Seal.</span>
                                </div>
                              </div>
                            )}

                            {/* VERIFIED STATUS */}
                            {isVerified && (
                              <div className="bg-seal-tint/80 border border-seal/30 p-3 rounded-md text-seal-dark">
                                <div className="flex items-center gap-2 font-mono text-xs font-bold text-seal-dark mb-1">
                                  <CheckCircle2 className="w-4 h-4 text-seal" />
                                  <span>Current Status: Verified &amp; Published (Seal #{property.verificationSealId})</span>
                                </div>
                                <p className="leading-relaxed text-[12px] text-ink-800">
                                  <strong>What this means:</strong> Both government land records and physical on-site inspections were completed with 100% match.
                                </p>
                                <p className="leading-relaxed text-[12px] text-seal-dark font-semibold pt-1 border-t border-seal/20">
                                  <strong>What happens next:</strong> Your listing is active and prioritized in tenant search results. Prospective tenants can directly schedule visits without broker commission.
                                </p>
                              </div>
                            )}

                            {/* FLAGGED STATUS */}
                            {isFlagged && (
                              <div className="bg-brick-tint border border-brick-border p-3.5 rounded-md text-brick-dark">
                                <div className="flex items-center gap-2 font-mono text-xs font-bold text-brick mb-1">
                                  <AlertOctagon className="w-4 h-4 text-brick" />
                                  <span>Current Status: Verification Audit Flagged</span>
                                </div>
                                <div className="p-2.5 rounded bg-white border border-brick-border/70 text-xs text-ink-900 mb-2">
                                  <span className="font-mono font-bold text-brick text-[10px] uppercase block mb-0.5">
                                    Official Discrepancy Reason:
                                  </span>
                                  <p className="leading-relaxed text-[11px] text-brick-dark font-medium">
                                    {property.flagReason}
                                  </p>
                                </div>
                                <div className="p-2 rounded bg-brick/10 text-xs text-brick-dark font-sans leading-relaxed">
                                  <strong>Resubmission is possible:</strong> Review the discrepancy noted above (e.g. name mismatch between Aadhaar and Index II deed, missing power-of-attorney, or occupancy conflict). Once you have corrected title documentation, you can submit an amended listing for fresh registrar review.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Seal or Status Stamp */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center p-3 bg-paper-subtle rounded-xl border border-paper-border min-w-[150px]">
                          {isVerified ? (
                            <VerificationSeal sealId={property.verificationSealId} size="md" />
                          ) : isFlagged ? (
                            <div className="text-center p-3">
                              <AlertTriangle className="w-8 h-8 text-brick mx-auto mb-1" />
                              <span className="text-xs font-mono font-bold text-brick uppercase">Audit Failed</span>
                            </div>
                          ) : isInReview ? (
                            <div className="text-center p-3">
                              <UserCheck className="w-8 h-8 text-ochre mx-auto mb-1" />
                              <span className="text-xs font-mono font-bold text-ochre uppercase">Site Visit</span>
                            </div>
                          ) : (
                            <div className="text-center p-3">
                              <Clock className="w-8 h-8 text-amber-600 mx-auto mb-1" />
                              <span className="text-xs font-mono font-bold text-amber-800 uppercase">Docs Checking</span>
                            </div>
                          )}

                          <Link
                            to={`/property/${property.id}`}
                            className="mt-3 text-xs font-mono text-seal hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <span>Inspect Property</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: NEW LISTING FORM */}
        {viewMode === 'new' && (
          <div className="max-w-3xl mx-auto bg-paper-sheet border border-paper-border rounded-xl p-6 sm:p-8 shadow-paperRaised">
            <div className="border-b border-paper-border pb-4 mb-6">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-seal bg-seal-tint px-2 py-0.5 rounded">
                STAGE 1: VENDOR SUBMISSION
              </span>
              <h2 className="font-display text-2xl font-bold text-ink-900 mt-1">
                Property Details &amp; Ownership Document Attachment
              </h2>
              <p className="text-xs text-ink-600 font-sans mt-1">
                Fill in property specifications and attach required title records. Listings enter the queue with status <strong className="font-mono text-amber-800">"pending"</strong>.
              </p>
            </div>

            {/* INLINE VALIDATION ERROR BOX */}
            {formErrors.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-brick-tint border-2 border-brick text-brick-dark text-xs font-mono">
                <div className="flex items-center gap-2 font-bold text-brick text-sm mb-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Submission Blocked — Missing Required Verification Data:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-ink-900">
                  {formErrors.map((err, idx) => (
                    <li key={idx} className="leading-snug">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6 text-xs font-sans">
              {/* Bot Protection Honeypot Field */}
              <input
                type="text"
                name="website_hp"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex="-1"
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />
              {/* Basic Details Group */}
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-sm text-ink-900 border-b border-paper-border pb-1">
                  1. Property Particulars
                </h3>

                <div>
                  <label className="block font-mono font-semibold text-ink-800 mb-1">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spacious 2 BHK near Coffee House West High Court Road"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2.5 bg-paper border border-paper-border rounded-lg text-xs font-sans focus:outline-none focus:border-seal"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-mono font-semibold text-ink-800 mb-1">
                      City *
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full p-2.5 bg-paper border border-paper-border rounded-lg text-xs font-sans focus:outline-none focus:border-seal"
                    >
                      <option value="Nagpur">Nagpur (Pilot Zone)</option>
                      <option value="Pune">Pune (Pilot Zone)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-mono font-semibold text-ink-800 mb-1">
                      Area / Locality *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dharampeth, Ramdaspeth, Viman Nagar, Kothrud"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full p-2.5 bg-paper border border-paper-border rounded-lg text-xs font-sans focus:outline-none focus:border-seal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-mono font-semibold text-ink-800 mb-1">
                      Configuration *
                    </label>
                    <select
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                      className="w-full p-2.5 bg-paper border border-paper-border rounded-lg text-xs font-sans focus:outline-none focus:border-seal"
                    >
                      <option value="1RK">1 RK Studio</option>
                      <option value="1BHK">1 BHK</option>
                      <option value="2BHK">2 BHK</option>
                      <option value="3BHK">3 BHK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono font-semibold text-ink-800 mb-1">
                      Monthly Rent (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 20000"
                      value={formData.rent}
                      onChange={handleRentChange}
                      className="w-full p-2.5 bg-paper border border-paper-border rounded-lg text-xs font-mono focus:outline-none focus:border-seal"
                    />
                  </div>

                  <div>
                    <label className="block font-mono font-semibold text-ink-800 mb-1">
                      Security Deposit (₹) *
                      <span className="text-[10px] text-seal font-normal ml-1">(MTA Cap: 2x Rent)</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 40000"
                      value={formData.deposit}
                      onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                      className="w-full p-2.5 bg-paper border border-paper-border rounded-lg text-xs font-mono focus:outline-none focus:border-seal"
                    />
                    {formData.rent && formData.deposit && Number(formData.deposit) > Number(formData.rent) * 2 && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-300 text-amber-900 text-[11px] mt-1.5 flex items-start gap-1.5 font-mono">
                        <AlertTriangle className="w-3.5 h-3.5 text-ochre flex-shrink-0 mt-0.5" />
                        <span>MTA 2021 Advisory: ₹{Number(formData.deposit).toLocaleString()} exceeds standard 2-month cap (₹{(Number(formData.rent) * 2).toLocaleString()}).</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-mono font-semibold text-ink-800 mb-1">
                    Property Description *
                  </label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Describe building amenities, lift, water supply, stilt parking, nearby landmarks..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2.5 bg-paper border border-paper-border rounded-lg text-xs font-sans focus:outline-none focus:border-seal"
                  ></textarea>
                </div>
              </div>

              {/* ================================================================ */}
              {/* CRITICAL VERIFICATION DOCUMENTS SECTION (MANDATORY CHECKBOXES)  */}
              {/* ================================================================ */}
              <div className="space-y-4 pt-4 border-t border-paper-border">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-seal" />
                  <h3 className="font-serif font-bold text-base text-ink-900">
                    2. Mandatory Ownership Verification Documents
                  </h3>
                </div>
                <p className="text-xs text-ink-600 font-sans leading-relaxed">
                  Rentify cannot accept listings based on self-declaration alone. You must attach proof of legal title and matching Government ID.
                </p>

                {/* Document Sub-Form Card */}
                <div className="p-4 rounded-xl bg-paper border border-paper-border space-y-4">
                  {/* DOCUMENT CHECKBOX 1: PROOF OF OWNERSHIP */}
                  <div className="p-3.5 rounded-lg bg-white border border-paper-border space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasOwnershipProof}
                        onChange={(e) => setFormData({ ...formData, hasOwnershipProof: e.target.checked })}
                        className="w-4 h-4 mt-0.5 accent-seal rounded cursor-pointer"
                      />
                      <div>
                        <span className="font-mono font-bold text-xs text-ink-900 block">
                          [MANDATORY] Attach Proof of Property Ownership *
                        </span>
                        <span className="text-[11px] text-ink-600 font-sans">
                          Checking this box certifies that you have attached a valid, registered property title document (e.g. Index II deed, 7/12 extract, or municipal property tax assessment receipt).
                        </span>
                      </div>
                    </label>

                    {formData.hasOwnershipProof && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 pl-7 border-t border-paper-border/60">
                        <div>
                          <label className="block font-mono text-[10px] text-ink-500 mb-1">
                            Document Type
                          </label>
                          <select
                            value={formData.docType}
                            onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                            className="w-full p-2 bg-paper border border-paper-border rounded text-xs font-sans focus:outline-none"
                          >
                            <option value="Index II Title Deed">Index II Registered Deed (Sub-Registrar)</option>
                            <option value="7/12 Land Extract">7/12 Mahabhulekh Land Extract</option>
                            <option value="Property Tax Receipt">NMC / PMC Municipal Tax Assessment</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-mono text-[10px] text-ink-500 mb-1">
                            Deed Registration / Roll Number
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. NGP-DHP-3420/2021"
                            value={formData.docNumber}
                            onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
                            className="w-full p-2 bg-paper border border-paper-border rounded text-xs font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* DOCUMENT CHECKBOX 2: GOVERNMENT ID */}
                  <div className="p-3.5 rounded-lg bg-white border border-paper-border space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasGovtId}
                        onChange={(e) => setFormData({ ...formData, hasGovtId: e.target.checked })}
                        className="w-4 h-4 mt-0.5 accent-seal rounded cursor-pointer"
                      />
                      <div>
                        <span className="font-mono font-bold text-xs text-ink-900 block">
                          [MANDATORY] Attach Government Identity Document *
                        </span>
                        <span className="text-[11px] text-ink-600 font-sans">
                          Checking this box certifies that you have attached your official Aadhaar (with e-KYC) or PAN Card matching the legal owner name stated in the property title deed.
                        </span>
                      </div>
                    </label>

                    {formData.hasGovtId && (
                      <div className="pt-2 pl-7 border-t border-paper-border/60">
                        <label className="block font-mono text-[10px] text-ink-500 mb-1">
                          Owner Government ID Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. XXXX-XXXX-9912 (Aadhaar) or ABCDE1234F (PAN)"
                          value={formData.idNumber}
                          onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                          className="w-full sm:w-1/2 p-2 bg-paper border border-paper-border rounded text-xs font-mono focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Simulated Upload Notice */}
                  <div className="p-3 rounded-lg bg-paper-subtle border border-dashed border-paper-border text-center font-mono text-[11px] text-ink-500 flex items-center justify-center gap-2">
                    <UploadCloud className="w-4 h-4 text-seal" />
                    <span>Checking both boxes attaches the simulated digital PDFs to your registrar review docket.</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-paper-border">
                <button
                  type="button"
                  onClick={() => { setViewMode('list'); setFormErrors([]); }}
                  className="px-4 py-2 border border-paper-border rounded-lg text-ink-700 font-mono text-xs hover:bg-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-seal text-white font-mono text-xs font-bold rounded-lg shadow-stamp hover:bg-seal-dark transition-all flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4 text-ochre-light" />
                  <span>Submit for Title Review</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
