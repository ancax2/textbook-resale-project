import React, { useState, useEffect, useCallback } from 'react';

// Optional: highlight search keywords in text (SEARCH-12)
function highlightText(text, keyword) {
  if (!text || !keyword || !keyword.trim()) return text;
  const k = keyword.trim();
  const regex = new RegExp(`(${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i} className="bg-warning px-1">{part}</mark> : part
  );
}

const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const PROGRAM_YEAR_OPTIONS = ['1', '2', '3', '4'];
const PAGE_SIZE = 25;

function Home({ user, onLogout, onNavigate, onViewListing }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [programs, setPrograms] = useState([]);
  const [programName, setProgramName] = useState('');
  const [programYear, setProgramYear] = useState('');
  const [conditionType, setConditionType] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/programs')
      .then((res) => res.json())
      .then((data) => setPrograms(Array.isArray(data) ? data : []))
      .catch(() => setPrograms([]));
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (appliedFilters.program_name) params.set('program_name', appliedFilters.program_name);
      if (appliedFilters.program_year) params.set('program_year', appliedFilters.program_year);
      if (appliedFilters.condition_type) params.set('condition_type', appliedFilters.condition_type);
      if (appliedFilters.price_min !== '' && appliedFilters.price_min != null) params.set('price_min', appliedFilters.price_min);
      if (appliedFilters.price_max !== '' && appliedFilters.price_max != null) params.set('price_max', appliedFilters.price_max);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      const url = `http://localhost:5000/api/listings?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data)) {
        setListings(data);
        setTotalResults(data.length);
      } else {
        setListings(data.listings || []);
        setTotalResults(data.total ?? 0);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setListings([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, appliedFilters, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, appliedFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, appliedFilters, page, fetchListings]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchListings();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      program_name: programName || '',
      program_year: programYear || '',
      condition_type: conditionType || '',
      price_min: priceMin !== '' ? priceMin : '',
      price_max: priceMax !== '' ? priceMax : ''
    });
  };

  const handleClearFilters = () => {
    setProgramName('');
    setProgramYear('');
    setConditionType('');
    setPriceMin('');
    setPriceMax('');
    setAppliedFilters({});
  };

  const hasActiveSearch = searchTerm.trim() !== '';
  const hasActiveFilters =
    (appliedFilters.program_name && appliedFilters.program_name !== '') ||
    (appliedFilters.program_year && appliedFilters.program_year !== '') ||
    (appliedFilters.condition_type && appliedFilters.condition_type !== '') ||
    (appliedFilters.price_min !== '' && appliedFilters.price_min != null) ||
    (appliedFilters.price_max !== '' && appliedFilters.price_max != null);
  const showNoResults = !loading && listings.length === 0 && (hasActiveSearch || hasActiveFilters);
  const showEmptyState = !loading && listings.length === 0 && !hasActiveSearch && !hasActiveFilters;

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const startItem = totalResults === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalResults);
  const showPagination = !loading && totalResults > 0 && (totalPages > 1 || totalResults > PAGE_SIZE);

  const goToPage = (p) => {
    const next = Math.max(1, Math.min(p, totalPages));
    setPage(next);
  };

  const pageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set([1, totalPages, page]);
    if (page > 1) pages.add(page - 1);
    if (page < totalPages) pages.add(page + 1);
    return Array.from(pages).sort((a, b) => a - b);
  };

  return (
    <div className="container mt-4">
      <nav className="navbar navbar-light bg-light mb-4">
        <div className="container-fluid flex-wrap">
          <span className="navbar-brand mb-0">
            Welcome, {user.first_name} {user.last_name}
          </span>
          <div className="d-flex align-items-center flex-grow-1 flex-md-grow-0 justify-content-md-end gap-2 mt-2 mt-md-0">
            <form
              className="d-flex me-2"
              onSubmit={handleSearchSubmit}
              style={{ minWidth: '200px', maxWidth: '320px' }}
            >
              <input
                type="text"
                className="form-control"
                placeholder="Search by title, author, or program..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search textbooks"
              />
              <button type="submit" className="btn btn-outline-primary ms-1" title="Search">
                Search
              </button>
              {hasActiveSearch && (
                <button
                  type="button"
                  className="btn btn-outline-secondary ms-1"
                  onClick={handleClearSearch}
                  title="Clear search"
                >
                  Clear
                </button>
              )}
            </form>
            <button
              className="btn btn-success me-2"
              onClick={() => onNavigate('create')}
            >
              + Create Listing
            </button>
            <button className="btn btn-outline-danger" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <h2>Available Textbooks</h2>

      {!loading && totalResults > 0 && (
        <p className="text-muted small mb-2">
          Showing {startItem}–{endItem} of {totalResults} result{totalResults !== 1 ? 's' : ''}
        </p>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Filters</h5>
          <div className="row g-3">
            <div className="col-md-6 col-lg-2">
              <label className="form-label small text-muted">Program</label>
              <select
                className="form-select form-select-sm"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                aria-label="Filter by program"
              >
                <option value="">All programs</option>
                {programs.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6 col-lg-2">
              <label className="form-label small text-muted">Program Year</label>
              <select
                className="form-select form-select-sm"
                value={programYear}
                onChange={(e) => setProgramYear(e.target.value)}
                aria-label="Filter by program year"
              >
                <option value="">All years</option>
                {PROGRAM_YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6 col-lg-2">
              <label className="form-label small text-muted">Condition</label>
              <select
                className="form-select form-select-sm"
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value)}
                aria-label="Filter by condition"
              >
                <option value="">All conditions</option>
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6 col-lg-2">
              <label className="form-label small text-muted">Min price ($)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="Min"
                min="0"
                step="0.01"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                aria-label="Minimum price"
              />
            </div>
            <div className="col-md-6 col-lg-2">
              <label className="form-label small text-muted">Max price ($)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="Max"
                min="0"
                step="0.01"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                aria-label="Maximum price"
              />
            </div>
            <div className="col-md-12 col-lg-2 d-flex align-items-end gap-1">
              <button
                type="button"
                className="btn btn-primary btn-sm flex-grow-1"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={handleClearFilters}
                title="Clear all filters"
              >
                Clear
              </button>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 pt-2 border-top">
              <span className="small text-muted me-2">Active:</span>
              {appliedFilters.program_name && (
                <span className="badge bg-primary me-1 mb-1">Program: {appliedFilters.program_name}</span>
              )}
              {appliedFilters.program_year && (
                <span className="badge bg-primary me-1 mb-1">Year: {appliedFilters.program_year}</span>
              )}
              {appliedFilters.condition_type && (
                <span className="badge bg-primary me-1 mb-1">Condition: {appliedFilters.condition_type}</span>
              )}
              {(appliedFilters.price_min !== '' && appliedFilters.price_min != null) && (
                <span className="badge bg-primary me-1 mb-1">Min $ {appliedFilters.price_min}</span>
              )}
              {(appliedFilters.price_max !== '' && appliedFilters.price_max != null) && (
                <span className="badge bg-primary me-1 mb-1">Max $ {appliedFilters.price_max}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading listings...</p>
        </div>
      ) : showNoResults ? (
        <div className="alert alert-warning" role="alert">
          No results found.
          {hasActiveSearch && <> Try different keywords or clear the search.</>}
          {hasActiveFilters && <> Try changing or clearing your filters.</>}
        </div>
      ) : showEmptyState ? (
        <div className="alert alert-info">
          No listings available. Be the first to post!
        </div>
      ) : (
        <div className="row">
          {listings.map((listing) => (
            <div className="col-md-4 mb-3" key={listing.listing_id}>
              <div
                className="card h-100 cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => onViewListing && onViewListing(listing.listing_id)}
                onKeyDown={(e) => e.key === 'Enter' && onViewListing && onViewListing(listing.listing_id)}
                style={{ cursor: onViewListing ? 'pointer' : 'default' }}
              >
                <div className="card-body">
                  <h5 className="card-title">
                    {highlightText(listing.book_title, searchTerm) || listing.book_title}
                  </h5>
                  <p className="card-text">
                    <strong>Author:</strong>{' '}
                    {highlightText(listing.author, searchTerm) || listing.author}
                    <br />
                    <strong>Program:</strong>{' '}
                    {highlightText(listing.program_name, searchTerm) || listing.program_name}
                    <br />
                    <strong>Year:</strong> Year {listing.program_year}
                    <br />
                    <strong>Price:</strong> ${parseFloat(listing.price).toFixed(2)}
                    <br />
                    <strong>Condition:</strong>{' '}
                    <span className="badge bg-secondary">{listing.condition_type}</span>
                  </p>
                  <p className="text-muted small mb-0">
                    Seller: {listing.first_name} {listing.last_name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPagination && (
        <nav className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-4" aria-label="Listing pagination">
          <div className="small text-muted">
            Page {page} of {totalPages}
          </div>
          <ul className="pagination pagination-sm mb-0 flex-wrap">
            <li className="page-item">
              <button
                type="button"
                className="page-link"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                Previous
              </button>
            </li>
            {pageNumbers().map((p, i) => {
              const prev = i > 0 ? pageNumbers()[i - 1] : 0;
              const showEllipsis = prev && p > prev + 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && (
                    <li className="page-item disabled">
                      <span className="page-link">…</span>
                    </li>
                  )}
                  <li className="page-item">
                    <button
                      type="button"
                      className={`page-link ${p === page ? 'active' : ''}`}
                      onClick={() => goToPage(p)}
                      aria-label={`Page ${p}`}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  </li>
                </React.Fragment>
              );
            })}
            <li className="page-item">
              <button
                type="button"
                className="page-link"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

export default Home;