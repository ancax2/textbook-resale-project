import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from './PageHeader';

const API_BASE = 'http://localhost:5000';

function EditListing({ listingId, user, onSuccess, onCancel }) {
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(true);

  const [formData, setFormData] = useState({
    book_title: '',
    author: '',
    publish_year: '',
    program_name: '',
    program_year: '',
    price: '',
    condition_type: '',
    comments: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setProgramsLoading(true);
    fetch(`${API_BASE}/api/programs`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPrograms(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setPrograms([]);
      })
      .finally(() => {
        if (!cancelled) setProgramsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!listingId) {
      setError('No listing ID provided.');
      setFetching(false);
      return;
    }
    fetch(`${API_BASE}/api/listings/${listingId}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        if (Number(data.seller_id) !== Number(user?.user_id)) {
          setError('You can only edit your own listings.');
          return;
        }
        if (data.status !== 'active') {
          setError('Only active listings can be edited.');
          return;
        }
        setFormData({
          book_title: data.book_title || '',
          author: data.author || '',
          publish_year: data.publish_year || '',
          program_name: data.program_name || '',
          program_year: String(data.program_year || ''),
          price: data.price || '',
          condition_type: data.condition_type || '',
          comments: data.comments || ''
        });
      })
      .catch(() => setError('Could not load listing.'))
      .finally(() => setFetching(false));
  }, [listingId, user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const programSelectOptions = useMemo(() => {
    const current = (formData.program_name || '').trim();
    if (current && !programs.includes(current)) {
      return [...programs, current].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
    }
    return programs;
  }, [programs, formData.program_name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Listing updated successfully!');
        if (onSuccess) setTimeout(() => onSuccess(), 1500);
      } else {
        setError(data.error || 'Failed to update listing');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  if (fetching) {
    return (
      <div className="container mt-4 px-3">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-2">Loading listing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 px-3">
      <PageHeader
        title="Edit listing"
        subtitle={`Update the details for this listing. Images cannot be changed.`}
      >
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel and return
        </button>
      </PageHeader>

      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-header">Listing details</div>
            <div className="card-body">

              {error && (
                <div className="alert alert-danger alert-dismissible fade show app-alert" role="alert">
                  <span className="app-alert-icon" aria-hidden="true">⚠️</span>
                  <div className="app-alert-message">{error}</div>
                  <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Close" />
                </div>
              )}

              {success && (
                <div className="alert alert-success alert-dismissible fade show app-alert app-alert-success" role="alert">
                  <span className="app-alert-icon" aria-hidden="true">✅</span>
                  <div className="app-alert-message">{success}</div>
                  <button type="button" className="btn-close" onClick={() => setSuccess('')} aria-label="Close" />
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">
                    Book Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="book_title"
                    value={formData.book_title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Author <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Publish Year <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    name="publish_year"
                    value={formData.publish_year}
                    onChange={handleInputChange}
                    min="1900"
                    max="2026"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Program <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="program_name"
                    value={formData.program_name}
                    onChange={handleInputChange}
                    required
                    disabled={programsLoading}
                    aria-label="Program"
                  >
                    <option value="">
                      {programsLoading ? 'Loading programs…' : 'Select program…'}
                    </option>
                    {programSelectOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Year of Program <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="program_year"
                    value={formData.program_year}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select year...</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Price (CAD) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Condition <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="condition_type"
                    value={formData.condition_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select condition...</option>
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Comments (Optional)</label>
                  <textarea
                    className="form-control"
                    name="comments"
                    value={formData.comments}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Any additional information about the book..."
                  />
                </div>

                <p className="text-muted small mb-3">
                  <em>📷 Images cannot be changed after listing creation.</em>
                </p>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Saving Changes…
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-muted text-center mt-3 small">
                  <span className="text-danger">*</span> Required fields
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditListing;
