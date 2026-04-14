import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';

const API_BASE = 'http://localhost:5000';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function MyListings({ user, onNavigate, onViewListing, onEditListing }) {
  const [data, setData] = useState({ active: [], sold: [], deleted: [] });
  const [loading, setLoading] = useState(true);
  const [markingSoldId, setMarkingSoldId] = useState(null);

  const fetchMine = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/listings/mine`, { credentials: 'include' })
      .then((res) => res.json())
      .then((body) => {
        if (body.active !== undefined && body.sold !== undefined) {
          setData({
            active: body.active || [],
            sold: body.sold || [],
            deleted: body.deleted || []
          });
        } else {
          setData({ active: [], sold: [], deleted: [] });
        }
      })
      .catch(() => setData({ active: [], sold: [], deleted: [] }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMine();
  }, []);

  const handleMarkSold = async (listingId) => {
    const confirmMark = window.confirm('Mark this listing as sold?');
    if (!confirmMark) return;
    setMarkingSoldId(listingId);
    try {
      const res = await fetch(`${API_BASE}/api/listings/${listingId}/sold`, {
        method: 'PATCH',
        credentials: 'include'
      });
      const json = await res.json();
      if (res.ok && json.success) {
        fetchMine();
        if (typeof onNavigate === 'function') onNavigate('home');
      } else {
        window.alert(json.error || 'Failed to mark as sold');
      }
    } catch (e) {
      window.alert('Connection error. Please try again.');
    } finally {
      setMarkingSoldId(null);
    }
  };

  const renderListingCard = (listing, showMarkSold = false) => (
    <div className="col-md-6 col-lg-4 mb-3" key={listing.listing_id}>
      <div className="card h-100 listing-card">
        <div className="card-body d-flex flex-column">
          <h5 className="card-title">{listing.book_title}</h5>
          <p className="card-text small text-muted mb-1">
            {listing.author} · ${parseFloat(listing.price).toFixed(2)} · {listing.condition_type}
          </p>
          <p className="card-text small mb-2">
            Program: {listing.program_name}, Year {listing.program_year}
          </p>
          {listing.message_count != null && listing.message_count > 0 && (
            <p className="small text-primary mb-2">
              {listing.message_count} message{listing.message_count !== 1 ? 's' : ''}
            </p>
          )}
          <div className="mt-auto d-flex flex-wrap gap-1">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => onViewListing && onViewListing(listing.listing_id)}
            >
              View
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => onEditListing && onEditListing(listing.listing_id)}
            >
              Edit
            </button>
            {showMarkSold && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                disabled={markingSoldId === listing.listing_id}
                onClick={() => handleMarkSold(listing.listing_id)}
              >
                {markingSoldId === listing.listing_id ? '...' : 'Mark as Sold'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mt-4 px-3">
      <PageHeader
        title="My listings"
        subtitle="Active books appear in Browse. Sold books stay visible here for your records."
      >
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-nbcc-sell btn-sm"
            onClick={() => onNavigate && onNavigate('create')}
          >
            + New listing
          </button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your listings...</p>
        </div>
      ) : (
        <>
          <h5 className="mt-4 mb-2">Active</h5>
          {data.active.length === 0 ? (
            <p className="text-muted">No active listings. Create one from Home.</p>
          ) : (
            <div className="row">{data.active.map((l) => renderListingCard(l, true))}</div>
          )}

          <h5 className="mt-4 mb-2">Sold</h5>
          {data.sold.length === 0 ? (
            <p className="text-muted">No sold listings yet.</p>
          ) : (
            <div className="row">
              {data.sold.map((l) => (
                <div className="col-md-6 col-lg-4 mb-3" key={l.listing_id}>
                  <div className="card h-100 listing-card opacity-75">
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <h5 className="card-title mb-0">{l.book_title}</h5>
                        <span className="badge bg-secondary">Sold</span>
                      </div>
                      <p className="card-text small text-muted mb-1">
                        {l.author} · ${parseFloat(l.price).toFixed(2)}
                      </p>
                      {l.marked_sold_at && (
                        <p className="small text-muted mb-2">Sold {formatDate(l.marked_sold_at)}</p>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm mt-auto align-self-start"
                        onClick={() => onViewListing && onViewListing(l.listing_id)}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h5 className="mt-4 mb-2">Removed (moderation)</h5>
          {(!data.deleted || data.deleted.length === 0) ? (
            <p className="text-muted">No removed listings.</p>
          ) : (
            <div className="row">
              {data.deleted.map((l) => (
                <div className="col-md-6 col-lg-4 mb-3" key={l.listing_id}>
                  <div className="card h-100 border-danger opacity-75">
                    <div className="card-body">
                      <span className="badge bg-danger mb-2">Removed</span>
                      <h5 className="card-title h6">{l.book_title}</h5>
                      <p className="small text-muted mb-0">No longer visible to buyers.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyListings;
