import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';

const API_BASE = 'http://localhost:5000';

function Profile({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/profile/me`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mt-4 mb-5 px-3">
      <PageHeader
        title="My profile"
        subtitle="Summary of your account on Textbook Resale."
      />

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : data?.user ? (
        <div className="row">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm">
              <div className="card-header">Account</div>
              <div className="card-body">
                <h4 className="h5 card-title">{data.user.first_name} {data.user.last_name}</h4>
                <p className="text-muted mb-4">{data.user.email}</p>
                <dl className="row small mb-0">
                  <dt className="col-sm-6">Active listings</dt>
                  <dd className="col-sm-6">{data.listingsActive}</dd>
                  <dt className="col-sm-6">Sold listings</dt>
                  <dd className="col-sm-6">{data.listingsSold}</dd>
                  <dt className="col-sm-6">Removed (admin)</dt>
                  <dd className="col-sm-6">{data.listingsDeleted}</dd>
                  <dt className="col-sm-6">Seller rating (avg)</dt>
                  <dd className="col-sm-6">
                    {data.sellerAvgRating != null ? `${data.sellerAvgRating} / 5` : '—'}
                    {data.sellerFeedbackCount > 0 && (
                      <span className="text-muted"> ({data.sellerFeedbackCount} reviews)</span>
                    )}
                  </dd>
                  <dt className="col-sm-6">Listings you rated</dt>
                  <dd className="col-sm-6">{data.purchasesRated}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning">Could not load profile.</div>
      )}
    </div>
  );
}

export default Profile;
