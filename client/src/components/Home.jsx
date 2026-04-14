import React, { useState, useEffect, useCallback, useRef } from 'react';

// Highlights matching search keywords within listing text
function highlightText(text, keyword) {
  if (!text || !keyword || !keyword.trim()) return text;
  const k = keyword.trim();
  const regex = new RegExp(`(${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i} className="nbcc-highlight px-1">{part}</mark> : part
  );
}

const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const PROGRAM_YEAR_OPTIONS = ['1', '2', '3', '4'];
const PAGE_SIZE = 25;

const CONDITION_BADGES = {
  'New': 'bg-success',
  'Like New': 'bg-info',
  'Good': 'bg-primary',
  'Fair': 'bg-warning text-dark',
  'Poor': 'bg-secondary'
};

const API_BASE = 'http://localhost:5000';

function Home({ user, onNavigate, onViewListing }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [programs, setPrograms] = useState([]);
  const [programName, setProgramName] = useState('');
  const [programYear, setProgramYear] = useState('');
  const [conditionType, setConditionType] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [bookmarkIds, setBookmarkIds] = useState(new Set());
  const [bookmarkTogglingId, setBookmarkTogglingId] = useState(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const filterPanelRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/bookmarks`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setBookmarkIds(new Set(list.map((b) => b.listing_id)));
      })
      .catch(() => setBookmarkIds(new Set()));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/programs`)
      .then((res) => res.json())
      .then((data) => setPrograms(Array.isArray(data) ? data : []))
      .catch(() => setPrograms([]));
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (programName) params.set('program_name', programName);
      if (programYear) params.set('program_year', programYear);
      if (conditionType) params.set('condition_type', conditionType);
      if (priceMin !== '') params.set('price_min', priceMin);
      if (priceMax !== '') params.set('price_max', priceMax);
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
  }, [searchTerm, programName, programYear, conditionType, priceMin, priceMax, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, programName, programYear, conditionType, priceMin, priceMax]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchListings]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchListings();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleClearFilters = () => {
    setProgramName('');
    setProgramYear('');
    setConditionType('');
    setPriceMin('');
    setPriceMax('');
  };

  // Close filter panel on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        setFilterPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveSearch = searchTerm.trim() !== '';
  const hasActiveFilters =
    programName !== '' ||
    programYear !== '' ||
    conditionType !== '' ||
    priceMin !== '' ||
    priceMax !== '';

  const activeFilterCount = [programName, programYear, conditionType, priceMin, priceMax]
    .filter((v) => v !== '').length;

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

  const handleToggleBookmark = async (e, listingId) => {
    e.preventDefault();
    e.stopPropagation();
    if (bookmarkTogglingId !== null) return;
    setBookmarkTogglingId(listingId);
    const isBookmarked = bookmarkIds.has(listingId);
    try {
      if (isBookmarked) {
        const res = await fetch(`${API_BASE}/api/bookmarks/listing/${listingId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (res.ok) setBookmarkIds((prev) => { const s = new Set(prev); s.delete(listingId); return s; });
      } else {
        const res = await fetch(`${API_BASE}/api/bookmarks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ listing_id: listingId })
        });
        const json = await res.json();
        if (res.ok && json.success) setBookmarkIds((prev) => new Set([...prev, listingId]));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBookmarkTogglingId(null);
    }
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
    <div className="container mt-4 px-3">
      <div className="app-page-header">
        <h1 className="h2">Browse textbooks</h1>
        <p className="text-muted small mb-0">
          Welcome, {user.first_name} {user.last_name}. Find books by program, condition, or price — or use <strong>Sell a book</strong> in the menu to list yours.
        </p>
      </div>

      {/* ── Unified search bar + collapsible filters ── */}
      <div className="search-filter-bar mb-4" ref={filterPanelRef}>
        <form className="search-bar-row" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by title, author, or program…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search textbooks"
            />
            {hasActiveSearch && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={handleClearSearch}
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            className={`btn filter-toggle-btn${filterPanelOpen ? ' active' : ''}${hasActiveFilters ? ' has-filters' : ''}`}
            onClick={() => setFilterPanelOpen((o) => !o)}
            aria-expanded={filterPanelOpen}
            title="Toggle filters"
          >
            <span aria-hidden="true">⚙</span>
            <span className="d-none d-sm-inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
          </button>
        </form>

        {/* Collapsible filter panel */}
        {filterPanelOpen && (
          <div className="filter-panel">
            <div className="row g-3">
              <div className="col-sm-6 col-lg-3">
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
              <div className="col-sm-6 col-lg-3">
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
              <div className="col-sm-6 col-lg-2">
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
              <div className="col-6 col-lg-2">
                <label className="form-label small text-muted">Min price ($)</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  aria-label="Minimum price"
                />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label small text-muted">Max price ($)</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="Any"
                  min="0"
                  step="0.01"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  aria-label="Maximum price"
                />
              </div>
            </div>
            <div className="filter-panel-actions">
              <span className="small text-muted">Results update instantly</span>
            </div>
          </div>
        )}

        {/* Active filter chips — below filter controls so summary appears after options */}
        {hasActiveFilters && (
          <div className="filter-chips">
            {programName && (
              <span className="filter-chip">Program: {programName}</span>
            )}
            {programYear && (
              <span className="filter-chip">Year: {programYear}</span>
            )}
            {conditionType && (
              <span className="filter-chip">Condition: {conditionType}</span>
            )}
            {priceMin !== '' && (
              <span className="filter-chip">Min ${priceMin}</span>
            )}
            {priceMax !== '' && (
              <span className="filter-chip">Max ${priceMax}</span>
            )}
            <button
              type="button"
              className="filter-chip filter-chip-clear"
              onClick={handleClearFilters}
            >
              ✕ Clear all
            </button>
          </div>
        )}
      </div>

      {!loading && totalResults > 0 && (
        <p className="text-muted small mb-2">
          Showing {startItem}–{endItem} of {totalResults} result{totalResults !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading listings...</p>
        </div>
      ) : showNoResults ? (
        <div className="alert alert-warning app-alert" role="alert">
          <span className="app-alert-icon" aria-hidden="true">⚠️</span>
          <div className="app-alert-message">
            No results found.
            {hasActiveSearch && <> Try different keywords or clear the search.</>}
            {hasActiveFilters && <> Try changing or clearing your filters.</>}
          </div>
        </div>
      ) : showEmptyState ? (
        <div className="alert alert-info app-alert" role="alert">
          <span className="app-alert-icon" aria-hidden="true">ℹ️</span>
          <div className="app-alert-message">
            No listings available. Be the first to post!
          </div>
        </div>
      ) : (
        <div className="row">
          {listings.map((listing) => (
            <div className="col-md-4 mb-3" key={listing.listing_id}>
              <div
                className="card h-100 cursor-pointer listing-card position-relative"
                role="button"
                tabIndex={0}
                onClick={() => onViewListing && onViewListing(listing.listing_id)}
                onKeyDown={(e) => e.key === 'Enter' && onViewListing && onViewListing(listing.listing_id)}
                style={{ cursor: onViewListing ? 'pointer' : 'default' }}
              >
                <button
                  type="button"
                  className="btn btn-sm position-absolute top-0 end-0 m-2 p-1 border-0 bg-white bg-opacity-90 rounded"
                  onClick={(e) => handleToggleBookmark(e, listing.listing_id)}
                  disabled={bookmarkTogglingId === listing.listing_id}
                  aria-label={bookmarkIds.has(listing.listing_id) ? 'Remove bookmark' : 'Add bookmark'}
                  title={bookmarkIds.has(listing.listing_id) ? 'Remove bookmark' : 'Add bookmark'}
                >
                  {bookmarkIds.has(listing.listing_id) ? (
                    <span className="text-warning" style={{ fontSize: '1.1rem' }}>★</span>
                  ) : (
                    <span className="text-muted" style={{ fontSize: '1.1rem' }}>☆</span>
                  )}
                </button>
                <div className="card-body">
                  <h5 className="card-title pe-4">
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
                    <span className={`badge ${CONDITION_BADGES[listing.condition_type] || 'bg-secondary'}`}>{listing.condition_type}</span>
                  </p>
                  <p className="text-muted small mb-0">
                    Seller: {listing.first_name} {listing.last_name}
                    {listing.seller_avg_rating != null && listing.seller_feedback_count > 0 && (
                      <span className="ms-1">
                        · ★ {Number(listing.seller_avg_rating).toFixed(1)}
                        <span className="text-muted"> ({listing.seller_feedback_count})</span>
                      </span>
                    )}
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
            <li className={`page-item${page <= 1 ? ' disabled' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                ← Prev
              </button>
            </li>
            {(() => {
              const pages = pageNumbers();
              return pages.map((p, i) => {
                const prev = i > 0 ? pages[i - 1] : 0;
                const showEllipsis = prev > 0 && p > prev + 1;
                if (p < 1) return null;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && (
                      <li className="page-item disabled">
                        <span className="page-link">…</span>
                      </li>
                    )}
                    <li className={`page-item${p === page ? ' active' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => goToPage(p)}
                        aria-label={`Page ${p}`}
                        aria-current={p === page ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    </li>
                  </React.Fragment>
                );
              });
            })()}
            <li className={`page-item${page >= totalPages ? ' disabled' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                Next →
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

export default Home;