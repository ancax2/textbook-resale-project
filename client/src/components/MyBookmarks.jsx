import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';

const API_BASE = 'http://localhost:5000';

function MyBookmarks({ user, onNavigate, onViewListing, onBookmarkRemoved }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/bookmarks`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setListings(Array.isArray(data) ? data : []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const handleRemove = async (e, bookmarkId, listingId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setListings((prev) => prev.filter((l) => l.listing_id !== listingId));
        if (typeof onBookmarkRemoved === 'function') onBookmarkRemoved(listingId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mt-4 px-3">
      <PageHeader
        title="Bookmarks"
        subtitle="Listings you saved for later. Open Browse to find more."
      />

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading bookmarks...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="alert alert-info app-alert">
          <span className="app-alert-icon" aria-hidden="true">ℹ️</span>
          <div className="app-alert-message">
            No bookmarks yet. Browse listings on the home page and click the bookmark icon to save them here.
          </div>
        </div>
      ) : (
        <div className="row">
          {listings.map((listing) => (
            <div className="col-md-4 mb-3" key={listing.listing_id}>
              <div
                className="card h-100 listing-card"
                role="button"
                tabIndex={0}
                onClick={() => onViewListing && onViewListing(listing.listing_id)}
                onKeyDown={(e) => e.key === 'Enter' && onViewListing && onViewListing(listing.listing_id)}
              >
                <div className="card-body position-relative">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-2"
                    onClick={(e) => handleRemove(e, listing.bookmark_id, listing.listing_id)}
                    aria-label="Remove bookmark"
                    title="Remove bookmark"
                  >
                    ✕
                  </button>
                  <h5 className="card-title pe-4">{listing.book_title}</h5>
                  <p className="card-text small">
                    <strong>Author:</strong> {listing.author}<br />
                    <strong>Program:</strong> {listing.program_name} · Year {listing.program_year}<br />
                    <strong>Price:</strong> ${parseFloat(listing.price).toFixed(2)}<br />
                    <strong>Condition:</strong> <span className="badge bg-secondary">{listing.condition_type}</span>
                  </p>
                  <p className="text-muted small mb-0">Seller: {listing.first_name} {listing.last_name}</p>
                  {listing.status === 'sold' && (
                    <span className="badge bg-secondary mt-2">Sold</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyBookmarks;
