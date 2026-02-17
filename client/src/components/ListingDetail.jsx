import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000';
const CONDITION_BADGES = {
  'New': 'bg-success',
  'Like New': 'bg-info',
  'Good': 'bg-primary',
  'Fair': 'bg-warning text-dark',
  'Poor': 'bg-secondary'
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ListingDetail({ listingId, onBack }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!listingId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/api/listings/${listingId}`, { credentials: 'include' })
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          setListing(null);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setListing(data);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [listingId]);

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="container mt-4">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><button type="button" className="btn btn-link p-0 text-decoration-none" onClick={onBack}>Listings</button></li>
            <li className="breadcrumb-item active">Not found</li>
          </ol>
        </nav>
        <div className="alert alert-warning">
          Listing not found. It may have been removed or the ID is invalid.
        </div>
        <button type="button" className="btn btn-outline-primary" onClick={onBack}>
          ← Back to Listings
        </button>
      </div>
    );
  }

  const imagePaths = [listing.image1_path, listing.image2_path, listing.image3_path].filter(Boolean);
  const conditionClass = CONDITION_BADGES[listing.condition_type] || 'bg-secondary';

  return (
    <div className="container mt-4 mb-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <button type="button" className="btn btn-link p-0 text-decoration-none" onClick={onBack}>
              Listings
            </button>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {listing.book_title}
          </li>
        </ol>
      </nav>

      <div className="row">
        <div className="col-lg-5 mb-4 mb-lg-0">
          {imagePaths.length > 0 ? (
            <div className="card shadow-sm">
              <div className="card-body p-0">
                {imagePaths.length === 1 ? (
                  <img
                    src={`${API_BASE}/${imagePaths[0]}`}
                    alt={listing.book_title}
                    className="img-fluid w-100"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                ) : (
                  <div id="listingCarousel" className="carousel slide" data-bs-ride="carousel">
                    <div className="carousel-indicators">
                      {imagePaths.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          data-bs-target="#listingCarousel"
                          data-bs-slide-to={i}
                          className={i === 0 ? 'active' : ''}
                          aria-label={`Slide ${i + 1}`}
                        />
                      ))}
                    </div>
                    <div className="carousel-inner">
                      {imagePaths.map((path, i) => (
                        <div key={i} className={`carousel-item ${i === 0 ? 'active' : ''}`}>
                          <img
                            src={`${API_BASE}/${path}`}
                            alt={`${listing.book_title} ${i + 1}`}
                            className="d-block w-100"
                            style={{ maxHeight: '400px', objectFit: 'contain' }}
                          />
                        </div>
                      ))}
                    </div>
                    <button className="carousel-control-prev" type="button" data-bs-target="#listingCarousel" data-bs-slide="prev">
                      <span className="carousel-control-prev-icon" aria-hidden="true" />
                      <span className="visually-hidden">Previous</span>
                    </button>
                    <button className="carousel-control-next" type="button" data-bs-target="#listingCarousel" data-bs-slide="next">
                      <span className="carousel-control-next-icon" aria-hidden="true" />
                      <span className="visually-hidden">Next</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card shadow-sm bg-light d-flex align-items-center justify-content-center" style={{ minHeight: '200px' }}>
              <span className="text-muted">No image</span>
            </div>
          )}
        </div>

        <div className="col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h1 className="card-title h3 mb-3">{listing.book_title}</h1>
              <p className="text-muted small mb-3">Posted {formatDate(listing.created_at)}</p>

              <div className="display-5 text-primary mb-3">
                ${parseFloat(listing.price).toFixed(2)} <span className="fs-6 fw-normal text-body">CAD</span>
              </div>

              <p className="mb-2">
                <strong>Condition:</strong>{' '}
                <span className={`badge ${conditionClass}`}>{listing.condition_type}</span>
              </p>
              <p className="mb-2"><strong>Author:</strong> {listing.author}</p>
              <p className="mb-2"><strong>Publish year:</strong> {listing.publish_year}</p>
              <p className="mb-2"><strong>Program:</strong> {listing.program_name}</p>
              <p className="mb-3"><strong>Program year:</strong> Year {listing.program_year}</p>

              {listing.comments && (
                <div className="mb-3">
                  <strong>Description / Comments</strong>
                  <p className="mb-0 mt-1 text-secondary">{listing.comments}</p>
                </div>
              )}

              <hr />

              <div className="mb-3">
                <strong>Seller</strong>
                <p className="mb-0">{listing.first_name} {listing.last_name}</p>
              </div>

              <div className="card bg-light mb-3">
                <div className="card-body">
                  <h6 className="card-title">Contact Seller</h6>
                  <p className="card-text small text-muted mb-2">
                    Have a question about this book? Messaging will be available in a future update.
                  </p>
                  <button type="button" className="btn btn-outline-primary btn-sm" disabled>
                    Message seller (coming soon)
                  </button>
                </div>
              </div>

              <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
                ← Back to Listings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListingDetail;
