import React, { useState, useMemo } from 'react';
import { useRentify } from '../context/RentifyContext';
import { VerificationSeal } from '../components/common/VerificationSeal';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  ShieldCheck, MapPin, IndianRupee, Search, Filter, 
  RotateCcw, ArrowRight, AlertTriangle, CheckCircle2,
  SlidersHorizontal, Check, ChevronRight, Grid, List,
  Shield, Building, Navigation, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

export const CustomerHome = () => {
  usePageMeta(
    'Search Verified Rentals',
    'Browse deed-verified rental apartments in Nagpur and Pune with Model Tenancy Act deposit caps and on-site audit seals.'
  );

  const { listings, counts } = useRentify();

  // Filters State
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedTypes, setSelectedTypes] = useState([]); // ['1RK', '1BHK', '2BHK', '3BHK']
  const [maxRent, setMaxRent] = useState(40000);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [mtaCompliantOnly, setMtaCompliantOnly] = useState(false);
  const [selectedLocalities, setSelectedLocalities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recommender'); // 'recommender' | 'price-asc' | 'price-desc' | 'safety'
  const [viewLayout, setViewLayout] = useState('list'); // 'list' | 'grid'

  // Extract localities for current city/all
  const availableLocalities = useMemo(() => {
    const locs = new Map();
    listings.forEach(l => {
      if (selectedCity === 'All' || l.city === selectedCity) {
        const count = locs.get(l.locality) || 0;
        locs.set(l.locality, count + 1);
      }
    });
    return Array.from(locs.entries()).map(([name, count]) => ({ name, count }));
  }, [listings, selectedCity]);

  // Handle multi-select BHK types
  const toggleType = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Handle multi-select localities
  const toggleLocality = (loc) => {
    setSelectedLocalities(prev => 
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  // Filter logic
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (selectedCity !== 'All' && item.city !== selectedCity) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(item.propertyType)) return false;
      if (selectedLocalities.length > 0 && !selectedLocalities.includes(item.locality)) return false;
      if (verifiedOnly && item.status !== 'verified') return false;
      if (mtaCompliantOnly && item.deposit > item.rent * 2) return false;
      if (item.rent > maxRent) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchText = `${item.title} ${item.locality} ${item.city} ${item.ownerName} ${item.propertyType}`.toLowerCase();
        if (!matchText.includes(q)) return false;
      }
      return true;
    });
  }, [listings, selectedCity, selectedTypes, selectedLocalities, verifiedOnly, mtaCompliantOnly, maxRent, searchQuery]);

  // Ranking & Sorting Logic
  const sortedListings = useMemo(() => {
    const list = [...filteredListings];
    if (sortBy === 'price-asc') {
      return list.sort((a, b) => a.rent - b.rent);
    }
    if (sortBy === 'price-desc') {
      return list.sort((a, b) => b.rent - a.rent);
    }
    if (sortBy === 'safety') {
      return list.sort((a, b) => (b.safetyScore || 0) - (a.safetyScore || 0));
    }
    // Default: 'recommender' (Verified listings first, then credibility score descending, then rent ascending)
    return list.sort((a, b) => {
      if (a.status === 'verified' && b.status !== 'verified') return -1;
      if (a.status !== 'verified' && b.status === 'verified') return 1;
      const scoreA = a.credibilityScore ?? 50;
      const scoreB = b.credibilityScore ?? 50;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.rent - b.rent;
    });
  }, [filteredListings, sortBy]);

  const hasActiveFilters = selectedCity !== 'All' || 
    selectedTypes.length > 0 || 
    selectedLocalities.length > 0 || 
    maxRent < 40000 || 
    verifiedOnly || 
    mtaCompliantOnly || 
    searchQuery.trim() !== '';

  const resetFilters = () => {
    setSelectedCity('All');
    setSelectedTypes([]);
    setSelectedLocalities([]);
    setMaxRent(40000);
    setVerifiedOnly(false);
    setMtaCompliantOnly(false);
    setSearchQuery('');
    setSortBy('recommender');
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-ink-900 pb-20">
      {/* 1. Breadcrumb & Operational Summary Strip */}
      <div className="bg-white border-b border-paper-border px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs font-sans text-ink-600 gap-2">
          <nav className="flex items-center space-x-1.5" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-seal">Home</Link>
            <ChevronRight className="w-3 h-3 text-ink-400" />
            <span className="text-ink-500">Maharashtra</span>
            <ChevronRight className="w-3 h-3 text-ink-400" />
            <span className="font-semibold text-ink-900">
              {selectedCity === 'All' ? 'Nagpur & Pune Rentals' : `${selectedCity} Rentals`}
            </span>
          </nav>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-seal font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{counts.verified} Title-Verified Listings</span>
            </span>
            <span className="text-paper-darkBorder">|</span>
            <Link to="/assistance" className="text-ink-600 hover:text-seal underline">
              Model Tenancy Rights &amp; Scam Alerts
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Search & Utility Bar */}
      <div className="bg-white border-b border-paper-border py-3 px-4 sm:px-6 lg:px-8 shadow-xs sticky top-16 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input Box */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search by area, society, landmark, or owner (e.g. Dharampeth, Viman Nagar, Hinjewadi)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F8F9F7] border border-paper-border rounded text-xs font-sans placeholder-ink-400 focus:outline-none focus:border-seal focus:bg-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-ink-400 hover:text-ink-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* City Selector Quick Radios / Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-ink-500 hidden sm:inline">Pilot City:</span>
            <div className="inline-flex rounded border border-paper-border bg-[#F8F9F7] p-0.5 text-xs font-sans">
              {['All', 'Nagpur', 'Pune'].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setSelectedCity(city);
                    setSelectedLocalities([]); // Reset localities when switching city
                  }}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    selectedCity === city
                      ? 'bg-seal text-white font-semibold shadow-xs'
                      : 'text-ink-700 hover:text-ink-900'
                  }`}
                >
                  {city === 'All' ? 'All (Nagpur & Pune)' : city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout (Faceted Sidebar + Results Column) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Faceted Filters (Amazon / Flipkart Style) */}
          <aside className="lg:col-span-3 space-y-5">
            <div className="surface-card p-4 rounded border border-paper-border space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-paper-border">
                <span className="text-xs font-bold font-sans uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-seal" />
                  <span>Filters</span>
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-ochre hover:text-ochre-dark font-medium flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear all</span>
                  </button>
                )}
              </div>

              {/* Verified Only Fast Toggle */}
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs font-sans text-ink-800">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="mt-0.5 rounded border-paper-border text-seal focus:ring-seal"
                  />
                  <div>
                    <span className="font-semibold flex items-center gap-1 text-seal">
                      <ShieldCheck className="w-3.5 h-3.5 text-seal" />
                      <span>Deed-Verified Only</span>
                    </span>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      Government registry check + on-site physical audit completed.
                    </p>
                  </div>
                </label>

                {/* MTA 2-Month Deposit Cap Toggle */}
                <label className="flex items-start gap-2.5 cursor-pointer text-xs font-sans text-ink-800 pt-2 border-t border-paper-border/60">
                  <input
                    type="checkbox"
                    checked={mtaCompliantOnly}
                    onChange={(e) => setMtaCompliantOnly(e.target.checked)}
                    className="mt-0.5 rounded border-paper-border text-seal focus:ring-seal"
                  />
                  <div>
                    <span className="font-semibold text-ink-900">
                      MTA-Capped Deposit Only
                    </span>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      Security deposit strictly ≤ 2 months rent (Model Tenancy Act).
                    </p>
                  </div>
                </label>
              </div>

              {/* BHK / Configuration Checkboxes */}
              <div className="pt-3 border-t border-paper-border space-y-2">
                <span className="text-xs font-bold text-ink-900 uppercase tracking-wider block">
                  Configuration
                </span>
                <div className="space-y-1.5">
                  {['1RK', '1BHK', '2BHK', '3BHK'].map((type) => {
                    const count = listings.filter(l => 
                      l.propertyType === type && (selectedCity === 'All' || l.city === selectedCity)
                    ).length;
                    return (
                      <label key={type} className="flex items-center justify-between text-xs text-ink-700 hover:text-ink-900 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(type)}
                            onChange={() => toggleType(type)}
                            className="rounded border-paper-border text-seal focus:ring-seal"
                          />
                          <span>{type === '1RK' ? '1 RK Studio' : type}</span>
                        </span>
                        <span className="text-[11px] font-mono text-ink-400">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Price / Monthly Rent Slider & Presets */}
              <div className="pt-3 border-t border-paper-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                    Max Monthly Rent
                  </span>
                  <span className="font-mono font-bold text-xs text-seal">
                    ₹{maxRent.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="8000"
                  max="40000"
                  step="1000"
                  value={maxRent}
                  onChange={(e) => setMaxRent(Number(e.target.value))}
                  className="w-full accent-seal cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-ink-400">
                  <span>₹8,000</span>
                  <span>₹20,000</span>
                  <span>₹40,000</span>
                </div>

                {/* Quick budget pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[12000, 18000, 25000, 40000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMaxRent(preset)}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                        maxRent === preset
                          ? 'bg-seal-tint text-seal-dark border-seal font-bold'
                          : 'bg-[#F8F9F7] text-ink-600 border-paper-border hover:border-ink-400'
                      }`}
                    >
                      ≤ ₹{(preset / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Locality Checkboxes */}
              {availableLocalities.length > 0 && (
                <div className="pt-3 border-t border-paper-border space-y-2">
                  <span className="text-xs font-bold text-ink-900 uppercase tracking-wider block">
                    Neighborhood / Locality
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {availableLocalities.map(({ name, count }) => (
                      <label key={name} className="flex items-center justify-between text-xs text-ink-700 hover:text-ink-900 cursor-pointer">
                        <span className="flex items-center gap-2 truncate pr-1">
                          <input
                            type="checkbox"
                            checked={selectedLocalities.includes(name)}
                            onChange={() => toggleLocality(name)}
                            className="rounded border-paper-border text-seal focus:ring-seal"
                          />
                          <span className="truncate">{name}</span>
                        </span>
                        <span className="text-[11px] font-mono text-ink-400">({count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Informational Assistance Callout */}
              <div className="pt-3 border-t border-paper-border">
                <div className="p-2.5 rounded bg-seal-tint border border-seal/20 text-xs font-sans text-seal-dark space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-seal" />
                    <span>Rentify Verification Gate</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-ink-700">
                    Title records checked against IGR Maharashtra Index II and audited on-site before issuing official seals.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: Results Section */}
          <main className="lg:col-span-9 space-y-4">
            {/* Header Control Bar: Item count, sort dropdown, list/grid toggle */}
            <div className="bg-white p-3 rounded border border-paper-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-900">
                  {sortedListings.length} {sortedListings.length === 1 ? 'property' : 'properties'} available
                </span>
                {hasActiveFilters && (
                  <span className="text-ink-500 font-mono text-[11px]">
                    (filtered from {listings.length})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Sort dropdown */}
                <div className="flex items-center gap-1.5 font-sans">
                  <span className="text-ink-500 text-[11px]">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-[#F8F9F7] border border-paper-border rounded px-2.5 py-1 text-xs font-medium text-ink-900 focus:outline-none focus:border-seal cursor-pointer"
                  >
                    <option value="recommender">Verified First (Recommended)</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="safety">Civic Safety Score</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="hidden sm:inline-flex rounded border border-paper-border bg-[#F8F9F7] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewLayout('list')}
                    className={`p-1 rounded ${viewLayout === 'list' ? 'bg-white shadow-xs text-seal' : 'text-ink-500 hover:text-ink-900'}`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewLayout('grid')}
                    className={`p-1 rounded ${viewLayout === 'grid' ? 'bg-white shadow-xs text-seal' : 'text-ink-500 hover:text-ink-900'}`}
                    title="Grid View"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State with Actionable Guidance */}
            {sortedListings.length === 0 ? (
              <div className="bg-white border border-paper-border p-8 rounded text-center max-w-xl mx-auto my-8">
                <div className="w-10 h-10 rounded-full bg-ochre-tint text-ochre flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-ink-900">
                  No properties match your current filters
                </h3>
                <p className="text-xs text-ink-600 font-sans mt-1.5 leading-relaxed">
                  We couldn't find any rentals meeting all of your selected criteria. Try adjusting your parameters:
                </p>

                <div className="mt-4 p-3 rounded bg-[#F8F9F7] text-left max-w-md mx-auto border border-paper-border space-y-1.5 text-xs text-ink-700">
                  {maxRent < 30000 && (
                    <div className="flex items-start gap-2">
                      <span className="text-seal font-bold">•</span>
                      <span>Increase maximum rent threshold (currently ₹{maxRent.toLocaleString()}).</span>
                    </div>
                  )}
                  {verifiedOnly && (
                    <div className="flex items-start gap-2">
                      <span className="text-seal font-bold">•</span>
                      <span>Uncheck "Deed-Verified Only" to preview listings currently undergoing physical field audit.</span>
                    </div>
                  )}
                  {mtaCompliantOnly && (
                    <div className="flex items-start gap-2">
                      <span className="text-seal font-bold">•</span>
                      <span>Uncheck "MTA-Capped Deposit Only" to view all market submissions.</span>
                    </div>
                  )}
                  {selectedCity !== 'All' && (
                    <div className="flex items-start gap-2">
                      <span className="text-seal font-bold">•</span>
                      <span>Switch city to "All" to view both Nagpur and Pune pilot locations.</span>
                    </div>
                  )}
                  {searchQuery && (
                    <div className="flex items-start gap-2">
                      <span className="text-seal font-bold">•</span>
                      <span>Remove search keyword "{searchQuery}".</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={resetFilters}
                  className="mt-5 px-4 py-1.5 bg-seal text-white rounded text-xs font-semibold hover:bg-seal-dark inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : viewLayout === 'list' ? (
              /* LIST VIEW (Amazon/Flipkart Dense Row Style) */
              <div className="space-y-3">
                {sortedListings.map((property) => {
                  const isVerified = property.status === 'verified';
                  const isFlagged = property.status === 'flagged';
                  const isPending = property.status === 'pending';
                  const isInReview = property.status === 'in-review';

                  return (
                    <article
                      key={property.id}
                      className={`surface-card rounded border p-4 transition-all hover:border-ink-400 ${
                        isVerified
                          ? 'border-status-verified'
                          : isFlagged
                            ? 'border-status-flagged bg-brick-tint/15'
                            : 'border-status-pending'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        {/* Thumbnail */}
                        <div className="relative w-full md:w-52 h-36 rounded overflow-hidden bg-ink-800 flex-shrink-0">
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            <StatusBadge status={property.status} size="sm" />
                          </div>

                          {isVerified && (
                            <div className="absolute bottom-2 right-2 bg-white/95 p-1 rounded-full shadow-xs">
                              <VerificationSeal sealId={property.verificationSealId} size="sm" showLabel={false} />
                            </div>
                          )}

                          {isFlagged && (
                            <div className="absolute inset-x-0 bottom-0 bg-brick text-white text-center py-0.5 text-[9px] font-mono font-bold tracking-wider">
                              AUDIT REJECTED
                            </div>
                          )}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-seal bg-seal-tint px-1.5 py-0.5 rounded">
                              {property.propertyType}
                            </span>
                            <span className="text-xs text-ink-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-seal" />
                              <span>{property.locality}, {property.city}</span>
                            </span>
                            {isVerified && (
                              <span className="font-mono text-[10px] text-seal font-semibold">
                                • Seal #{property.verificationSealId}
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-sm sm:text-base text-ink-900 leading-snug hover:text-seal">
                            <Link to={`/property/${property.id}`}>
                              {property.title}
                            </Link>
                          </h3>

                          {/* Flag Discrepancy Note OR Verified Specifications */}
                          {isFlagged ? (
                            <div className="p-2 rounded bg-brick-tint border border-brick-border text-xs text-brick-dark">
                              <span className="font-mono font-bold text-[10px] uppercase block text-brick">
                                Document Discrepancy Warning:
                              </span>
                              <p className="line-clamp-2 text-[11px] mt-0.5">
                                {property.flagReason}
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-600 pt-0.5">
                              <div>
                                <span className="text-ink-500">Transit: </span>
                                <span className="text-ink-800 font-medium">
                                  {property.amenities[2]?.detail || property.amenities[0]?.detail} ({property.amenities[2]?.distance || property.amenities[0]?.distance})
                                </span>
                              </div>
                              <div>
                                <span className="text-ink-500">Civic Safety: </span>
                                <span className="font-bold text-seal">{property.safetyScore} / 10</span>
                                <span className="text-[10px] text-ink-400 ml-1">(Illuminated)</span>
                              </div>
                              <div>
                                <span className="text-ink-500">Area: </span>
                                <span className="text-ink-800">{property.carpetArea} • {property.furnishing}</span>
                              </div>
                              <div>
                                <span className="text-ink-500">Lister: </span>
                                <span className="text-ink-800">{property.ownerName} ({property.ownerRole})</span>
                              </div>
                            </div>
                          )}

                          {/* Quick Proximity Chips */}
                          {!isFlagged && property.amenities && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {property.amenities.slice(0, 3).map((am, i) => (
                                <span key={i} className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-[#F8F9F7] border border-paper-border text-ink-600">
                                  {am.name}: {am.distance}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Right Pricing & Actions Box */}
                        <div className="w-full md:w-44 flex-shrink-0 flex md:flex-col justify-between items-start md:items-end border-t md:border-t-0 md:border-l border-paper-border pt-3 md:pt-0 md:pl-4">
                          <div className="text-left md:text-right">
                            <div className="flex items-center md:justify-end text-xl font-bold font-mono text-ink-900">
                              <IndianRupee className="w-4 h-4 text-seal" />
                              <span>{property.rent.toLocaleString()}</span>
                              <span className="text-xs font-normal text-ink-500 ml-0.5">/mo</span>
                            </div>
                            <div className="text-[11px] font-mono text-ink-500">
                              Deposit: ₹{property.deposit.toLocaleString()}
                            </div>
                            <div className="text-[10px] font-mono text-seal mt-0.5">
                              Zero Brokerage Direct
                            </div>

                            {/* Credibility score */}
                            <div className="mt-1.5 text-[10px] font-mono text-ink-500">
                              Credibility: <strong className={isVerified ? 'text-seal' : isFlagged ? 'text-brick' : 'text-ochre'}>
                                {property.credibilityScore} / 100
                              </strong>
                            </div>
                          </div>

                          <Link
                            to={`/property/${property.id}`}
                            className={`w-full mt-3 py-1.5 px-3 rounded text-xs font-medium text-center transition-colors ${
                              isVerified 
                                ? 'bg-seal text-white hover:bg-seal-dark' 
                                : isFlagged 
                                  ? 'bg-brick text-white hover:bg-brick-dark' 
                                  : 'bg-ink-900 text-white hover:bg-ink-800'
                            }`}
                          >
                            {isFlagged ? 'Inspect Warning' : 'View Property'}
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* GRID VIEW (Amazon / Flipkart Card Grid) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedListings.map((property) => {
                  const isVerified = property.status === 'verified';
                  const isFlagged = property.status === 'flagged';

                  return (
                    <article
                      key={property.id}
                      className={`surface-card rounded border overflow-hidden flex flex-col justify-between transition-all hover:border-ink-400 ${
                        isVerified
                          ? 'border-status-verified'
                          : isFlagged
                            ? 'border-status-flagged bg-brick-tint/15'
                            : 'border-status-pending'
                      }`}
                    >
                      <div>
                        {/* Image */}
                        <div className="relative h-44 bg-ink-800">
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute top-2 left-2">
                            <StatusBadge status={property.status} size="sm" />
                          </div>
                          {isVerified && (
                            <div className="absolute bottom-2 right-2 bg-white/95 p-1 rounded-full shadow-xs">
                              <VerificationSeal sealId={property.verificationSealId} size="sm" showLabel={false} />
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-seal bg-seal-tint px-1.5 py-0.5 rounded">
                              {property.propertyType}
                            </span>
                            <span className="text-ink-500 truncate">
                              {property.locality}, {property.city}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-ink-900 line-clamp-1 hover:text-seal">
                            <Link to={`/property/${property.id}`}>
                              {property.title}
                            </Link>
                          </h3>

                          {isFlagged ? (
                            <div className="p-2 rounded bg-brick-tint text-[11px] text-brick-dark border border-brick-border line-clamp-2">
                              {property.flagReason}
                            </div>
                          ) : (
                            <div className="text-xs text-ink-600 space-y-0.5">
                              <div>{property.carpetArea} • {property.furnishing}</div>
                              <div>Safety Score: <strong className="text-seal">{property.safetyScore} / 10</strong></div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer / Pricing */}
                      <div className="p-3.5 pt-0 border-t border-paper-border/60 mt-2">
                        <div className="flex items-baseline justify-between pt-2">
                          <div>
                            <div className="flex items-center text-lg font-bold font-mono text-ink-900">
                              <IndianRupee className="w-3.5 h-3.5 text-seal" />
                              <span>{property.rent.toLocaleString()}</span>
                              <span className="text-[10px] font-normal text-ink-500 ml-0.5">/mo</span>
                            </div>
                            <div className="text-[10px] font-mono text-ink-400">
                              Dep: ₹{property.deposit.toLocaleString()}
                            </div>
                          </div>

                          <Link
                            to={`/property/${property.id}`}
                            className={`py-1 px-3 rounded text-xs font-medium text-center ${
                              isVerified ? 'bg-seal text-white hover:bg-seal-dark' : 'bg-ink-900 text-white hover:bg-ink-800'
                            }`}
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
