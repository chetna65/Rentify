import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRentify } from '../context/RentifyContext';
import { fetchListingById } from '../api/listings';
import { VerificationSeal } from '../components/common/VerificationSeal';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  ShieldCheck, MapPin, IndianRupee, ArrowLeft, AlertTriangle, 
  FileText, CheckCircle2, Shield, AlertOctagon, HeartHandshake,
  Bus, Hospital, GraduationCap, ShoppingCart, Star, ChevronDown, 
  ChevronUp, ExternalLink, Send, Landmark, ShieldAlert, BookOpen,
  Check, Info, Clock, UserCheck
} from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { trackEvent } from '../utils/analytics';

export const PropertyDetails = () => {
  const { id } = useParams();
  const { listings, rentalAssistanceData, addFeedback, currentUser, isLoadingListings } = useRentify();
  const [fetchedProperty, setFetchedProperty] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    const found = listings.find((l) => l.id === id);
    if (!found && id) {
      setIsLoadingDetail(true);
      fetchListingById(id)
        .then((data) => setFetchedProperty(data))
        .catch(() => setFetchedProperty(null))
        .finally(() => setIsLoadingDetail(false));
    }
  }, [id, listings]);

  const property = listings.find((l) => l.id === id) || fetchedProperty;

  usePageMeta(
    property ? `${property.title} (${property.city})` : 'Property Details',
    property ? `${property.propertyType} rental in ${property.locality}, ${property.city}. Deposit: ₹${property.deposit?.toLocaleString()} (MTA Compliant).` : 'View deed-verified property specifications.'
  );

  // Active assistance tab/accordion
  const [expandedSection, setExpandedSection] = useState('scam'); // 'scam' | 'legal' | 'schemes' | null

  // Active gallery photo
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Move-in Feedback Form state
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [reviewerName, setReviewerName] = useState(currentUser?.name || 'Verified Tenant');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [feedbackHp, setFeedbackHp] = useState('');

  if (isLoadingListings || isLoadingDetail) {
    return (
      <div 
        role="status" 
        aria-live="polite" 
        className="min-h-[60vh] flex flex-col items-center justify-center p-6"
      >
        <div className="w-10 h-10 rounded-xl bg-seal-tint border border-seal/30 flex items-center justify-center animate-pulse mb-3">
          <div className="w-4 h-4 rounded-full border-2 border-seal border-t-transparent animate-spin" />
        </div>
        <p className="font-serif text-sm font-semibold text-ink-800">Loading Property Record...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-ochre mx-auto mb-3" />
        <h2 className="text-xl font-bold text-ink-900">Property Listing Not Found</h2>
        <p className="text-xs text-ink-600 font-mono mt-1">The requested listing ID ({id}) does not exist or has been retracted.</p>
        <Link to="/customer" className="inline-block mt-4 text-seal font-sans text-xs underline font-semibold">
          &larr; Return to Verified Listings Search
        </Link>
      </div>
    );
  }

  const isVerified = property.status === 'verified';
  const isFlagged = property.status === 'flagged';
  const isInReview = property.status === 'in-review';
  const isPending = property.status === 'pending';

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    setFeedbackError(null);

    // Bot honeypot check
    if (feedbackHp) return;

    if (!commentInput.trim() || commentInput.trim().length < 5) {
      setFeedbackError('Please enter a review of at least 5 characters.');
      return;
    }

    trackEvent('property_feedback_submitted', { propertyId: property.id, rating: ratingInput });

    addFeedback(property.id, {
      rating: Number(ratingInput),
      comment: commentInput.trim(),
      user: reviewerName || currentUser?.name || 'Verified Move-In'
    });

    setCommentInput('');
    setFeedbackSuccess(true);
    setTimeout(() => setFeedbackSuccess(false), 4500);
  };

  const amenityIcons = [GraduationCap, Hospital, Bus, ShoppingCart];

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-ink-900 pb-24">
      {/* Top Breadcrumbs & Reference Bar */}
      <div className="bg-white border-b border-paper-border py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-ink-600">
          <div className="flex items-center gap-2">
            <Link to="/customer" className="hover:text-seal font-medium inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to search results</span>
            </Link>
            <span className="text-ink-400">/</span>
            <span className="text-ink-500">{property.city}</span>
            <span className="text-ink-400">/</span>
            <span className="text-ink-800 font-medium truncate max-w-[200px]">{property.locality}</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-ink-500">Ref: <strong>{property.id}</strong></span>
            <StatusBadge status={property.status} size="sm" />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Prominent Warning Banner for FLAGGED Listings */}
        {isFlagged && (
          <div className="mb-6 p-4 rounded bg-brick-tint border-l-4 border-brick text-brick-dark shadow-xs">
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-brick flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-brick tracking-wider bg-white px-1.5 py-0.5 rounded border border-brick/30">
                  CRITICAL AUDIT ALERT: FLAGGED DISCREPANCY
                </span>
                <h2 className="font-bold text-base text-brick-dark mt-1">
                  Do Not Transfer Advance Token Money or Sign Agreements
                </h2>
                <p className="text-xs text-ink-900 mt-1 leading-relaxed font-sans">
                  {property.flagReason}
                </p>
                <div className="mt-2 pt-2 border-t border-brick-border/60 flex flex-wrap items-center gap-3 text-[11px] font-mono text-brick font-medium">
                  <span>Auditor: {property.flaggedBy || 'Chief Verification Registrar'}</span>
                  <span>•</span>
                  <span>Category: {property.flagCategory || 'Ownership Deed Mismatch'}</span>
                  <span>•</span>
                  <span>Status: TRANSACTION BLOCKED</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. Header Title & Quick Attributes */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-bold text-seal bg-seal-tint px-2 py-0.5 rounded">
              {property.propertyType} • {property.furnishing}
            </span>
            <span className="text-xs text-ink-500 font-sans">
              {property.locality}, {property.city}, Maharashtra
            </span>
            {isVerified && (
              <span className="font-mono text-[11px] text-seal font-semibold">
                • Registry Docket #{property.verificationSealId}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-900">
            {property.title}
          </h1>
        </div>

        {/* 2. Top Split Layout: Gallery on Left, Pricing & Action Box on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Photos Area */}
          <div className="lg:col-span-8 space-y-3">
            <div className="relative h-80 sm:h-96 rounded bg-ink-900 overflow-hidden border border-paper-border">
              <img
                src={property.images[selectedPhotoIndex] || property.images[0]}
                alt={`${property.title} - Main photograph`}
                width="800"
                height="500"
                loading="eager"
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
              {isVerified && (
                <div className="absolute bottom-3 right-3 bg-white/95 p-2 rounded shadow-sm border border-seal/30">
                  <VerificationSeal sealId={property.verificationSealId} size="md" />
                </div>
              )}
              {isFlagged && (
                <div className="absolute inset-x-0 bottom-0 bg-brick text-white text-center py-1 text-xs font-mono font-bold tracking-wider">
                  TITLE VERIFICATION REJECTED — CONTACT SUPPORT
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {property.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {property.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(idx)}
                    aria-label={`View photo ${idx + 1}`}
                    className={`relative w-20 h-14 rounded overflow-hidden border-2 flex-shrink-0 ${
                      selectedPhotoIndex === idx ? 'border-seal' : 'border-paper-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`${property.title} preview ${idx + 1}`} 
                      width="80"
                      height="56"
                      loading="lazy" 
                      className="w-full h-full object-cover" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pricing, MTA Check, and Lister Card (Amazon / Flipkart Style Buy Box) */}
          <div className="lg:col-span-4">
            <div className="surface-card p-5 rounded border border-paper-border space-y-4 sticky top-20">
              <div>
                <span className="text-[11px] font-mono text-ink-500 uppercase block">Monthly Rental</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <div className="flex items-center text-3xl font-bold font-mono text-ink-900">
                    <IndianRupee className="w-5 h-5 text-seal" />
                    <span>{property.rent.toLocaleString()}</span>
                  </div>
                  <span className="text-xs text-ink-500 font-sans">per month</span>
                </div>
              </div>

              {/* Deposit & Model Tenancy Act Compliance */}
              <div className="p-3 rounded bg-[#F8F9F7] border border-paper-border text-xs space-y-1.5">
                <div className="flex justify-between items-center font-mono">
                  <span className="text-ink-600">Security Deposit:</span>
                  <span className="font-bold text-ink-900">₹{property.deposit.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-paper-border/60">
                  <span className="text-ink-500">MTA Statutory Limit:</span>
                  <span className={`font-semibold font-mono ${property.deposit <= property.rent * 2 ? 'text-seal' : 'text-ochre-dark'}`}>
                    {property.deposit <= property.rent * 2 ? '✓ Compliant (≤ 2 Mo)' : '⚠️ Exceeds 2 Mo Cap'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-500">Brokerage:</span>
                  <span className="text-seal font-bold">₹0 Direct Owner</span>
                </div>
              </div>

              {/* Lister Information */}
              <div className="border-t border-paper-border pt-3 space-y-2 text-xs">
                <span className="text-[10px] font-mono uppercase font-bold text-ink-400 block">
                  Property Ownership &amp; Contact
                </span>
                <div className="flex items-center justify-between font-sans">
                  <span className="text-ink-600">Lister Name:</span>
                  <span className="font-semibold text-ink-900">{property.ownerName}</span>
                </div>
                <div className="flex items-center justify-between font-sans">
                  <span className="text-ink-600">Capacity:</span>
                  <span className="text-ink-800">{property.ownerRole}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-ink-600 font-sans">Direct Contact:</span>
                  <span className="font-semibold text-ink-900">{property.ownerPhone}</span>
                </div>
              </div>

              {/* Status Action CTA */}
              <div className="pt-2">
                {isVerified ? (
                  <button
                    type="button"
                    onClick={() => alert(`Direct contact line for registered owner ${property.ownerName}: ${property.ownerPhone}. Title Index II record has been authenticated by Rentify.`)}
                    className="w-full py-2.5 px-4 bg-seal text-white font-semibold rounded text-xs hover:bg-seal-dark transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Contact Verified Owner</span>
                  </button>
                ) : isFlagged ? (
                  <div className="p-3 rounded bg-brick-tint border border-brick-border text-xs text-brick-dark font-sans text-center">
                    <strong>Transaction Prohibited</strong>
                    <p className="text-[11px] mt-0.5">Rentify has blocked inquiries on this property due to audit discrepancies.</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => alert('This property is currently assigned for on-site verification visit. You may bookmark or wait for official seal issuance.')}
                    className="w-full py-2.5 px-4 bg-ochre text-white font-semibold rounded text-xs hover:bg-ochre-dark transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Audit In Progress (Inquire Later)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Core Specifications Table & Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          <div className="lg:col-span-8 space-y-6">
            
            {/* Key Specs Table (Amazon / Flipkart Attribute Table) */}
            <section className="surface-card rounded border border-paper-border overflow-hidden">
              <div className="px-4 py-3 bg-[#F8F9F7] border-b border-paper-border">
                <h2 className="text-xs font-bold font-sans uppercase tracking-wider text-ink-900">
                  Property Specifications
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 text-xs divide-y sm:divide-y-0 sm:divide-x divide-paper-border">
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-ink-500 block">Carpet Area</span>
                  <span className="font-semibold text-ink-900">{property.carpetArea}</span>
                </div>
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-ink-500 block">Furnishing</span>
                  <span className="font-semibold text-ink-900">{property.furnishing}</span>
                </div>
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-ink-500 block">Floor Level</span>
                  <span className="font-semibold text-ink-900">{property.floor}</span>
                </div>
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-ink-500 block">Civic Safety</span>
                  <span className="font-bold text-seal">{property.safetyScore} / 10</span>
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="surface-card p-5 rounded border border-paper-border space-y-2">
              <h2 className="text-xs font-bold font-sans uppercase tracking-wider text-ink-900">
                Property Overview
              </h2>
              <p className="text-xs text-ink-700 font-sans leading-relaxed">
                {property.description}
              </p>
            </section>

            {/* AMENITIES & AREA SAFETY SECTION */}
            {/* CRITICAL RULE: If the listing is flagged, HIDE/REPLACE amenities section! */}
            {isFlagged ? (
              <section className="p-4 rounded bg-brick-tint/30 border border-dashed border-brick/60 space-y-2">
                <div className="flex items-start gap-2.5 text-brick-dark">
                  <AlertTriangle className="w-5 h-5 text-brick flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-brick-dark">
                      Nearby Amenities &amp; Commute Report Suppressed
                    </h3>
                    <p className="text-xs text-ink-800 font-sans mt-1 leading-relaxed">
                      Because this listing has failed official title or on-site verification, Rentify automatically suppresses transit distance calculations, proximity to schools/hospitals, and locality safety scores.
                    </p>
                    <p className="text-[11px] text-brick-dark font-mono mt-1 font-medium">
                      Publishing verified amenities on an unverified or fraudulent listing could mislead students and tenants.
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              /* Verified or In-Review: Show Full Amenities & Proximity */
              <section className="surface-card p-5 rounded border border-paper-border space-y-5">
                <div>
                  <h2 className="text-xs font-bold font-sans uppercase tracking-wider text-ink-900 mb-1">
                    Nearby Amenities &amp; Commute Proximity
                  </h2>
                  <p className="text-xs text-ink-500 font-sans">
                    Physical distances to transit, colleges, medical care, and daily groceries verified on-site.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {property.amenities.map((amenity, idx) => {
                      const Icon = amenityIcons[idx % amenityIcons.length];
                      return (
                        <div key={idx} className="p-3 rounded bg-[#F8F9F7] border border-paper-border flex items-start gap-3">
                          <div className="p-1.5 rounded bg-seal-tint text-seal flex-shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-[10px] uppercase text-ink-500">{amenity.name}</span>
                              <span className="font-mono font-bold text-seal bg-seal-tint px-1.5 py-0.2 rounded text-[11px]">
                                {amenity.distance}
                              </span>
                            </div>
                            <div className="font-medium text-xs text-ink-900 mt-0.5 truncate">
                              {amenity.detail}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Safety Note */}
                <div className="pt-4 border-t border-paper-border space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-ink-900">
                      Area Safety Profile
                    </h3>
                    <span className="font-mono text-xs font-bold text-seal bg-seal-tint px-2 py-0.5 rounded">
                      Safety Score: {property.safetyScore} / 10
                    </span>
                  </div>
                  <div className="p-3 rounded bg-[#F8F9F7] border border-paper-border text-xs text-ink-700 leading-relaxed">
                    <p>{property.safetyNote}</p>
                    <div className="mt-3 pt-2.5 border-t border-paper-border/60 flex flex-wrap gap-4 text-[11px] font-mono text-ink-600">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-seal"></span>
                        Active Street Illumination
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-seal"></span>
                        Police Station within 1.5 km
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-seal"></span>
                        Transit Corridor Footfall
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Title Deeds & Verification Audit Log */}
            <section className="surface-card p-5 rounded border border-paper-border space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-seal" />
                <h2 className="text-xs font-bold font-sans uppercase tracking-wider text-ink-900">
                  Registered Ownership Documents &amp; Audit Log
                </h2>
              </div>
              <p className="text-xs text-ink-500 font-sans -mt-2">
                Cross-referenced against Inspector General of Registration (IGR Maharashtra) land records.
              </p>

              <div className="border border-paper-border rounded overflow-hidden">
                <table className="w-full text-left text-xs font-sans dense-table">
                  <thead className="bg-[#F8F9F7] text-ink-600 border-b border-paper-border font-mono text-[10px]">
                    <tr>
                      <th>Document</th>
                      <th>Reference / ID</th>
                      <th>Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-border">
                    {property.documents.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-[#F8F9F7]/60">
                        <td className="font-semibold text-ink-900">{doc.type}</td>
                        <td className="font-mono text-ink-600">{doc.docNumber}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono ${
                            doc.status.includes('Verified') || doc.status.includes('Passed')
                              ? 'bg-seal-tint text-seal-dark font-semibold'
                              : doc.status.includes('REJECTED')
                                ? 'bg-brick-tint text-brick-dark font-semibold'
                                : 'bg-amber-50 text-amber-900'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* On-Site Inspection Report Box */}
              {property.fieldReport && (
                <div className={`p-3.5 rounded border text-xs ${
                  property.fieldReport.discrepancyFound ? 'bg-brick-tint/30 border-brick-border' : 'bg-seal-tint/30 border-seal/30'
                }`}>
                  <div className="flex items-center justify-between font-mono mb-2">
                    <span className="font-bold text-ink-900 flex items-center gap-1.5">
                      <CheckCircle2 className={`w-4 h-4 ${property.fieldReport.discrepancyFound ? 'text-brick' : 'text-seal'}`} />
                      <span>Physical On-Site Inspection Report</span>
                    </span>
                    <span className="text-ink-500">Date: {property.fieldReport.inspectionDate}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-ink-700 mb-2">
                    <div>Officer: <strong className="text-ink-900">{property.fieldReport.officer}</strong></div>
                    <div>GPS: <strong className="text-seal">{property.fieldReport.gpsCoords}</strong></div>
                    <div>Key Check: <strong>{property.fieldReport.physicalKeysVerified ? 'Matched' : 'Failed'}</strong></div>
                    <div>Vacancy: <strong>{property.fieldReport.unitVacantAndAvailable ? 'Confirmed' : 'Occupied'}</strong></div>
                  </div>
                  <p className="text-xs font-sans text-ink-800 bg-white/80 p-2.5 rounded border border-paper-border">
                    <strong>Officer Observation:</strong> {property.fieldReport.notes}
                  </p>
                </div>
              )}
            </section>

            {/* Move-in Reviews & Feedback Form */}
            <section className="surface-card p-5 rounded border border-paper-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold font-sans uppercase tracking-wider text-ink-900">
                    Tenant Reviews &amp; Move-In Signals
                  </h2>
                  <p className="text-xs text-ink-500 font-sans mt-0.5">
                    Feedback from verified tenants on maintenance and deposit return.
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-[#F8F9F7] px-2.5 py-1 rounded border border-paper-border font-mono text-xs">
                  <Star className="w-3.5 h-3.5 text-ochre fill-ochre" />
                  <span className="font-bold text-ink-900">
                    {property.ratings?.length > 0 
                      ? (property.ratings.reduce((acc, r) => acc + r.rating, 0) / property.ratings.length).toFixed(1)
                      : 'N/A'}
                  </span>
                  <span className="text-ink-400 text-[11px]">({property.ratings?.length || 0})</span>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-2.5">
                {property.ratings && property.ratings.length > 0 ? (
                  property.ratings.map((rev, idx) => (
                    <div key={idx} className="p-3 rounded bg-[#F8F9F7] border border-paper-border text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink-900">{rev.user}</span>
                          <span className="text-[10px] font-mono bg-seal-tint text-seal px-1.5 py-0.2 rounded font-semibold">
                            {rev.role || 'Verified Tenant'}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-ochre">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < rev.rating ? 'fill-ochre text-ochre' : 'text-paper-darkBorder'}`}
                            />
                          ))}
                          <span className="ml-1.5 text-[10px] font-mono text-ink-400">{rev.date}</span>
                        </div>
                      </div>
                      <p className="text-xs text-ink-700 font-sans leading-relaxed">
                        "{rev.comment}"
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded bg-[#F8F9F7] border border-dashed border-paper-border text-center text-xs text-ink-500">
                    No move-in feedback submitted yet for this listing.
                  </div>
                )}
              </div>

              {/* Add Feedback Form */}
              <div className="pt-4 border-t border-paper-border space-y-3">
                <span className="text-xs font-bold text-ink-900 block">
                  Submit Verified Move-In Feedback
                </span>

                {feedbackSuccess && (
                  <div className="p-2.5 rounded bg-seal-tint border border-seal text-seal-dark text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-seal" />
                    <span>Feedback submitted and credibility score updated!</span>
                  </div>
                )}

                {feedbackError && (
                  <div className="p-2.5 rounded bg-brick-tint border border-brick-border text-brick-dark text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-brick flex-shrink-0" />
                    <span>{feedbackError}</span>
                  </div>
                )}

                <form onSubmit={handleFeedbackSubmit} className="space-y-3 text-xs">
                  {/* Invisible Honeypot for Bot Prevention */}
                  <input
                    type="text"
                    name="website_hp"
                    value={feedbackHp}
                    onChange={(e) => setFeedbackHp(e.target.value)}
                    tabIndex="-1"
                    autoComplete="off"
                    className="hidden"
                    aria-hidden="true"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-ink-700 font-medium mb-1">Name / Alias *</label>
                      <input
                        type="text"
                        required
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        className="w-full p-2 bg-[#F8F9F7] border border-paper-border rounded focus:bg-white focus:outline-none focus:border-seal"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-700 font-medium mb-1">Rating *</label>
                      <div className="flex items-center gap-1 py-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRatingInput(star)}
                            className="p-0.5 text-ochre"
                          >
                            <Star className={`w-4 h-4 ${star <= ratingInput ? 'fill-ochre text-ochre' : 'text-paper-darkBorder'}`} />
                          </button>
                        ))}
                        <span className="text-xs font-mono text-ink-500 ml-2">({ratingInput} Stars)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-ink-700 font-medium mb-1">Experience with Owner &amp; Deposit *</label>
                    <textarea
                      rows="2"
                      required
                      placeholder="Comment on deposit settlement, maintenance response, and utility bills..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      className="w-full p-2 bg-[#F8F9F7] border border-paper-border rounded focus:bg-white focus:outline-none focus:border-seal"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-seal text-white font-medium rounded hover:bg-seal-dark inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Review</span>
                  </button>
                </form>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: 5-in-1 Centralized Rental Assistance Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="surface-card p-4 rounded border border-paper-border sticky top-20 space-y-4">
              <div className="pb-2 border-b border-paper-border">
                <span className="text-[10px] font-mono uppercase font-bold text-seal tracking-wider block">
                  INTEGRATED ASSISTANCE
                </span>
                <h3 className="font-bold text-sm text-ink-900 mt-0.5">
                  Rental Decision Guidance Hub
                </h3>
                <p className="text-xs text-ink-500 font-sans mt-0.5">
                  Critical guidance Indian renters normally have to find across multiple websites.
                </p>
              </div>

              {/* 3 Categories Accordion */}
              <div className="space-y-2.5 text-xs">
                
                {/* 1. SCAM AWARENESS */}
                <div className="border border-paper-border rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSection(expandedSection === 'scam' ? null : 'scam')}
                    className="w-full p-2.5 bg-[#F8F9F7] flex items-center justify-between font-semibold text-ink-900 text-left hover:bg-paper-subtle"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-brick" />
                      <span>1. Scam Alerts (4 Patterns)</span>
                    </span>
                    {expandedSection === 'scam' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {expandedSection === 'scam' && (
                    <div className="p-3 space-y-2.5 bg-white border-t border-paper-border text-xs">
                      {rentalAssistanceData.scamAlerts.slice(0, 3).map((scam) => (
                        <div key={scam.id} className="space-y-1 pb-2 border-b border-paper-border/60 last:border-0 last:pb-0">
                          <div className="font-bold text-ink-900">{scam.title}</div>
                          <div className="text-[10px] font-mono text-brick font-semibold">{scam.frequency}</div>
                          <p className="text-[11px] text-ink-600 leading-snug">{scam.summary}</p>
                          <div className="text-[10px] font-mono text-seal font-medium">
                            ✓ Rentify: {scam.rentifyDefense.slice(0, 60)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. LEGAL & TENANCY RIGHTS */}
                <div className="border border-paper-border rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSection(expandedSection === 'legal' ? null : 'legal')}
                    className="w-full p-2.5 bg-[#F8F9F7] flex items-center justify-between font-semibold text-ink-900 text-left hover:bg-paper-subtle"
                  >
                    <span className="flex items-center gap-2">
                      <HeartHandshake className="w-3.5 h-3.5 text-seal" />
                      <span>2. Model Tenancy Act (MTA)</span>
                    </span>
                    {expandedSection === 'legal' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {expandedSection === 'legal' && (
                    <div className="p-3 space-y-2 bg-white border-t border-paper-border text-xs">
                      {rentalAssistanceData.legalGuidance.map((l) => (
                        <div key={l.id} className="space-y-0.5 pb-2 border-b border-paper-border/60 last:border-0 last:pb-0">
                          <div className="font-bold text-ink-900">{l.topic}</div>
                          <div className="text-[10px] font-mono text-seal font-semibold">{l.rule}</div>
                          <p className="text-[11px] text-ink-600 leading-snug">{l.details}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. GOVERNMENT HOUSING SCHEMES */}
                <div className="border border-paper-border rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSection(expandedSection === 'schemes' ? null : 'schemes')}
                    className="w-full p-2.5 bg-[#F8F9F7] flex items-center justify-between font-semibold text-ink-900 text-left hover:bg-paper-subtle"
                  >
                    <span className="flex items-center gap-2">
                      <Landmark className="w-3.5 h-3.5 text-ochre" />
                      <span>3. Govt Schemes (ARHC/PMAY)</span>
                    </span>
                    {expandedSection === 'schemes' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {expandedSection === 'schemes' && (
                    <div className="p-3 space-y-2 bg-white border-t border-paper-border text-xs">
                      {rentalAssistanceData.governmentSchemes.map((s) => (
                        <div key={s.id} className="space-y-0.5 pb-2 border-b border-paper-border/60 last:border-0 last:pb-0">
                          <div className="font-bold text-ink-900">{s.name}</div>
                          <div className="text-[10px] font-mono text-ochre-dark font-medium">{s.ministry}</div>
                          <p className="text-[11px] text-ink-600 leading-snug">{s.overview}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Full Guidance Link */}
              <div className="pt-2">
                <Link
                  to="/assistance"
                  className="w-full py-1.5 px-3 rounded border border-paper-border bg-[#F8F9F7] hover:bg-white text-seal text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Open Full 5-in-1 Guidance Guide</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
