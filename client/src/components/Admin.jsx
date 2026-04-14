import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from './PageHeader';

const API_BASE = 'http://localhost:5000';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

function Admin({ user, onNavigate, onViewListing }) {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadStats = () => {
    fetch(`${API_BASE}/api/admin/stats`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  };

  const loadReports = useCallback(() => {
    setLoading(true);
    const q = statusFilter === 'all' ? '' : `?status=${encodeURIComponent(statusFilter)}`;
    fetch(`${API_BASE}/api/reports${q}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const confirmDelete = (report) => {
    setDeleteTarget(report);
    setAdminNotes('');
  };

  const handleDeleteListing = async () => {
    if (!deleteTarget?.listing_id) return;
    if (!window.confirm('Soft-delete this listing? It will disappear from the marketplace.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/listings/${deleteTarget.listing_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ admin_notes: adminNotes })
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || 'Delete failed');
        return;
      }
      setDeleteTarget(null);
      loadReports();
      loadStats();
    } catch (e) {
      window.alert('Connection error');
    } finally {
      setDeleting(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">You do not have access to the admin panel.</div>
        <button type="button" className="btn btn-outline-primary" onClick={() => onNavigate('home')}>
          Home
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4 mb-5 px-3">
      <PageHeader
        title="Admin"
        subtitle="Reports, moderation, and marketplace metrics."
      />

      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100 admin-stat-card">
              <div className="card-body">
                <div className="text-muted small">Users</div>
                <div className="h4 mb-0">{stats.totalUsers}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100 admin-stat-card">
              <div className="card-body">
                <div className="text-muted small">Active listings</div>
                <div className="h4 mb-0">{stats.activeListings}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100 admin-stat-card">
              <div className="card-body">
                <div className="text-muted small">Sold listings</div>
                <div className="h4 mb-0">{stats.soldListings}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100 admin-stat-card">
              <div className="card-body">
                <div className="text-muted small">Pending reports</div>
                <div className="h4 mb-0 text-warning">{stats.pendingReports}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-header">Recent listings</div>
            <ul className="list-group list-group-flush small">
              {(stats?.recentListings || []).map((l) => (
                <li key={l.listing_id} className="list-group-item d-flex justify-content-between">
                  <span>{l.book_title}</span>
                  <span className="text-muted">{formatDate(l.created_at)}</span>
                </li>
              ))}
              {(!stats?.recentListings || stats.recentListings.length === 0) && (
                <li className="list-group-item text-muted">No data</li>
              )}
            </ul>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-header">Recent messages</div>
            <ul className="list-group list-group-flush small">
              {(stats?.recentMessages || []).map((m) => (
                <li key={m.message_id} className="list-group-item">
                  <div className="text-truncate">{m.message_text}</div>
                  <div className="text-muted">{m.first_name} {m.last_name} · {formatDate(m.sent_at)}</div>
                </li>
              ))}
              {(!stats?.recentMessages || stats.recentMessages.length === 0) && (
                <li className="list-group-item text-muted">No data</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <h4 className="mb-3">Reports</h4>
      <div className="mb-3">
        <label className="form-label small text-muted me-2">Status</label>
        <select
          className="form-select form-select-sm d-inline-block w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status" />
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Listing</th>
                <th>Reporter</th>
                <th>Reason</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.report_id}>
                  <td className="small text-nowrap">{formatDate(r.created_at)}</td>
                  <td>{r.book_title || `ID ${r.listing_id}`}</td>
                  <td className="small">{r.reporter_first_name} {r.reporter_last_name}</td>
                  <td className="small" style={{ maxWidth: '220px' }} title={r.reason}>{r.reason}</td>
                  <td>
                    <span className={`badge ${r.status === 'pending' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-nowrap">
                    {r.listing_id && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 me-2"
                        onClick={() => onViewListing && onViewListing(r.listing_id)}
                      >
                        View listing
                      </button>
                    )}
                    {r.status === 'pending' && r.listing_id && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => confirmDelete(r)}
                      >
                        Delete listing
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length === 0 && <p className="text-muted">No reports.</p>}
        </div>
      )}

      {deleteTarget && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete reported listing</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteTarget(null)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="small">Listing: <strong>{deleteTarget.book_title}</strong></p>
                <label className="form-label small">Admin notes (optional)</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal note for this resolution"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={deleting}
                  onClick={handleDeleteListing}
                >
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
