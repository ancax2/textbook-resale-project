import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:5000';
const CONDITION_BADGES = {
  'New': 'bg-success',
  'Like New': 'bg-info',
  'Good': 'bg-primary',
  'Fair': 'bg-warning text-dark',
  'Poor': 'bg-secondary'
};

const REPORT_TYPES = [
  { value: 'Inappropriate content', label: 'Inappropriate content' },
  { value: 'Spam or scam', label: 'Spam or scam' },
  { value: 'Misleading information', label: 'Misleading information' },
  { value: 'Harassment', label: 'Harassment' },
  { value: 'Other', label: 'Other' }
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ListingDetail({ listingId, user, onBack, onNavigate }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [messageSuccess, setMessageSuccess] = useState('');
  const messagesEndRef = useRef(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkMessage, setBookmarkMessage] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState(REPORT_TYPES[0].value);
  const [reportReason, setReportReason] = useState('');
  const [reportMessageId, setReportMessageId] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportThanks, setReportThanks] = useState(false);
  const [feedbackMine, setFeedbackMine] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [postSoldNotice, setPostSoldNotice] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!listingId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setActiveImageIndex(0);
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
        if (data) {
          setListing(data);
          loadMessages(data.listing_id);
          fetch(`${API_BASE}/api/bookmarks`, { credentials: 'include' })
            .then((r) => r.json())
            .then((bookmarks) => {
              const list = Array.isArray(bookmarks) ? bookmarks : [];
              setIsBookmarked(list.some((b) => Number(b.listing_id) === Number(data.listing_id)));
            })
            .catch(() => setIsBookmarked(false));
        }
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [listingId]);

  useEffect(() => {
    if (!listing || !user) {
      setFeedbackMine(null);
      return;
    }
    if (Number(listing.seller_id) === Number(user.user_id)) {
      setFeedbackMine(null);
      return;
    }
    if (listing.status !== 'sold') {
      setFeedbackMine(null);
      return;
    }
    fetch(`${API_BASE}/api/feedback/mine/${listing.listing_id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setFeedbackMine)
      .catch(() => setFeedbackMine(null));
  }, [listing, user]);

  const loadMessages = (id) => {
    if (!id) return;
    setMessagesLoading(true);
    fetch(`${API_BASE}/api/messages/listing/${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          setMessages([]);
        }
      })
      .catch(() => {
        setMessages([]);
      })
      .finally(() => {
        setMessagesLoading(false);
      });
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setMessageError('');
    setMessageSuccess('');

    const trimmed = messageText.trim();
    if (!trimmed) {
      setMessageError('Please enter a message before sending.');
      return;
    }
    if (trimmed.length > 1000) {
      setMessageError('Message is too long (max 1000 characters).');
      return;
    }

    if (!listing) return;

    try {
      setMessageSending(true);
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          listing_id: listing.listing_id,
          message_text: trimmed
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setMessageError(data.error || 'Failed to send message. Please try again.');
        return;
      }

      setMessageText('');
      setMessageSuccess('Message sent!');
      // Refresh messages so conversation stays in sync
      loadMessages(listing.listing_id);
    } catch (err) {
      console.error('Send message failed:', err);
      setMessageError('Connection error. Please try again.');
    } finally {
      setMessageSending(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!listing || bookmarkLoading) return;
    setBookmarkMessage('');
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        const res = await fetch(`${API_BASE}/api/bookmarks/listing/${listing.listing_id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (res.ok) {
          setIsBookmarked(false);
          setBookmarkMessage('Removed from bookmarks.');
        }
      } else {
        const res = await fetch(`${API_BASE}/api/bookmarks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ listing_id: listing.listing_id })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setIsBookmarked(true);
          setBookmarkMessage('Added to bookmarks!');
        } else {
          setBookmarkMessage(data.error || 'Could not add bookmark.');
        }
      }
    } catch (err) {
      setBookmarkMessage('Connection error.');
    } finally {
      setBookmarkLoading(false);
    }
  };

  const openReportModal = (messageId = null) => {
    setReportMessageId(messageId);
    setReportType(REPORT_TYPES[0].value);
    setReportReason('');
    setReportError('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!listing || !user) return;
    const detail = reportReason.trim();
    if (!detail) {
      setReportError('Please add details.');
      return;
    }
    setReportSubmitting(true);
    setReportError('');
    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          listing_id: listing.listing_id,
          message_id: reportMessageId,
          report_type: reportType,
          reason: detail
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setReportError(data.error || 'Could not submit report.');
        return;
      }
      setShowReportModal(false);
      setReportReason('');
      setReportMessageId(null);
      setReportThanks(true);
      setTimeout(() => setReportThanks(false), 6000);
    } catch (err) {
      setReportError('Connection error.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!listing || !user) return;
    setFeedbackSubmitting(true);
    setFeedbackMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          listing_id: listing.listing_id,
          rating: feedbackRating,
          comment: feedbackComment.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackMessage(data.error || 'Could not save feedback.');
        return;
      }
      setFeedbackMessage('Thank you for your feedback!');
      setFeedbackMine({ hasFeedback: true, feedback: { rating: feedbackRating, comment: feedbackComment } });
      setFeedbackComment('');
    } catch (err) {
      setFeedbackMessage('Connection error.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleMarkSold = async () => {
    if (!listing) return;
    const confirmMark = window.confirm('Mark this listing as sold? Buyers will no longer see it in search results.');
    if (!confirmMark) return;

    try {
      const response = await fetch(`${API_BASE}/api/listings/${listing.listing_id}/sold`, {
        method: 'PATCH',
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        window.alert(data.error || 'Failed to mark listing as sold.');
        return;
      }

      setListing((prev) => prev ? { ...prev, status: 'sold', marked_sold_at: new Date().toISOString() } : prev);
      setPostSoldNotice(true);
      setTimeout(() => {
        setPostSoldNotice(false);
        if (typeof onNavigate === 'function') {
          onNavigate('home');
        } else if (typeof onBack === 'function') {
          onBack();
        }
      }, 2800);
    } catch (err) {
      console.error('Mark sold failed:', err);
      window.alert('Connection error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container mt-4 px-3">
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
      <div className="container mt-4 px-3">
        <nav className="mb-3" aria-label="Listing navigation">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            ← Back to Listings
          </button>
        </nav>
        <div className="alert alert-warning app-alert" role="alert">
          <span className="app-alert-icon" aria-hidden="true">⚠️</span>
          <div className="app-alert-message">
            Listing not found. It may have been removed or the ID is invalid.
          </div>
        </div>
      </div>
    );
  }

  const imagePaths = [listing.image1_path, listing.image2_path, listing.image3_path].filter(Boolean);
  const conditionClass = CONDITION_BADGES[listing.condition_type] || 'bg-secondary';
  const isSeller = user && listing && Number(user.user_id) === Number(listing.seller_id);
  const isSold = listing.status === 'sold';

  return (
    <div className="container mt-4 mb-4 px-3">
      {postSoldNotice && (
        <div className="alert alert-success app-alert app-alert-success mb-3" role="alert">
          <span className="app-alert-icon" aria-hidden="true">✅</span>
          <div className="app-alert-message">
            Listing marked as sold. Buyers can leave feedback on this page until you leave. Redirecting to home…
          </div>
        </div>
      )}
      <nav className="mb-3" aria-label="Listing navigation">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
          ← Back to Listings
        </button>
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
                    loading="lazy"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                ) : (
                  <div className="listing-gallery">
                    <div className="listing-gallery-main">
                      <img
                        src={`${API_BASE}/${imagePaths[activeImageIndex]}`}
                        alt={`${listing.book_title} ${activeImageIndex + 1}`}
                        className="d-block w-100"
                        loading="lazy"
                        style={{ maxHeight: '400px', objectFit: 'contain' }}
                      />
                      <button
                        type="button"
                        className="gallery-nav gallery-prev"
                        onClick={() => setActiveImageIndex((prev) => (prev - 1 + imagePaths.length) % imagePaths.length)}
                        aria-label="Previous image"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="gallery-nav gallery-next"
                        onClick={() => setActiveImageIndex((prev) => (prev + 1) % imagePaths.length)}
                        aria-label="Next image"
                      >
                        ›
                      </button>
                    </div>
                    <div className="gallery-indicators">
                      {imagePaths.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`gallery-dot${i === activeImageIndex ? ' active' : ''}`}
                          onClick={() => setActiveImageIndex(i)}
                          aria-label={`View image ${i + 1}`}
                        />
                      ))}
                    </div>
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
              <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                <h1 className="card-title h3 mb-0">{listing.book_title}</h1>
                {isSold && (
                  <span className="badge bg-secondary align-self-center">
                    Sold
                  </span>
                )}
              </div>
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
                <p className="mb-0">
                  {listing.first_name} {listing.last_name}
                  {listing.seller_avg_rating != null && Number(listing.seller_feedback_count) > 0 && (
                    <span className="ms-2 small text-muted">
                      ★ {Number(listing.seller_avg_rating).toFixed(1)} ({listing.seller_feedback_count} reviews)
                    </span>
                  )}
                </p>
              </div>

              {user && !isSeller && listing.status !== 'deleted' && (
                <div className="mb-3">
                  <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => openReportModal(null)}>
                    Report listing
                  </button>
                  {reportThanks && (
                    <div className="alert alert-success app-alert app-alert-success py-2 mt-2 mb-0 small" role="status">
                      Thanks — your report was submitted. We will review it shortly.
                    </div>
                  )}
                </div>
              )}

              {user && !isSeller && (
                <div className="mb-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleToggleBookmark}
                    disabled={bookmarkLoading}
                  >
                    {bookmarkLoading ? (
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                    ) : isBookmarked ? (
                      '★ Saved'
                    ) : (
                      '☆ Add to bookmarks'
                    )}
                  </button>
                  {bookmarkMessage && (
                    <span className="ms-2 small text-success">{bookmarkMessage}</span>
                  )}
                </div>
              )}

              {isSold && user && !isSeller && (
                <div className="card border-primary mb-3">
                  <div className="card-body">
                    <h6 className="card-title">Rate this seller</h6>
                    {feedbackMine?.hasFeedback ? (
                      <p className="small text-muted mb-0">
                        You rated this transaction ★{feedbackMine.feedback?.rating}/5.
                        {feedbackMine.feedback?.comment && (
                          <span className="d-block mt-1">&ldquo;{feedbackMine.feedback.comment}&rdquo;</span>
                        )}
                      </p>
                    ) : (
                      <form onSubmit={handleSubmitFeedback}>
                        <label className="form-label small">Your rating (1–5)</label>
                        <div className="d-flex gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`btn btn-sm ${feedbackRating >= n ? 'btn-warning' : 'btn-outline-secondary'}`}
                              onClick={() => setFeedbackRating(n)}
                              aria-label={`${n} stars`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="form-control form-control-sm mb-2"
                          rows="2"
                          placeholder="Optional comment"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          maxLength={2000}
                        />
                        {feedbackMessage && (
                          <p className="small text-success mb-2">{feedbackMessage}</p>
                        )}
                        <button type="submit" className="btn btn-primary btn-sm" disabled={feedbackSubmitting}>
                          {feedbackSubmitting ? 'Sending…' : 'Submit feedback'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              <div className="card bg-light mb-3">
                <div className="card-body">
                  <h6 className="card-title mb-3">Messages</h6>

                  {messagesLoading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading messages...</span>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="small text-muted mb-3">No messages yet. Be the first to reach out!</p>
                  ) : (
                    <div
                      className="mb-3 p-2 border rounded bg-white"
                      style={{ maxHeight: '220px', overflowY: 'auto' }}
                    >
                      {messages.map((msg) => {
                        const fromSeller = msg.sender_id === listing.seller_id;
                        const isCurrentUser = user && msg.sender_id === user.user_id;
                        return (
                          <div
                            key={msg.message_id}
                            className={`mb-2 d-flex ${isCurrentUser ? 'justify-content-end' : 'justify-content-start'}`}
                          >
                            <div
                              className={`p-2 rounded-3 small ${
                                fromSeller
                                  ? 'bg-primary text-white'
                                  : 'bg-secondary bg-opacity-10'
                              }`}
                              style={{ maxWidth: '75%' }}
                            >
                              <div className="fw-semibold mb-1">
                                {msg.first_name} {msg.last_name}{' '}
                                {fromSeller && <span className="badge bg-light text-dark ms-1">Seller</span>}
                                {user && msg.sender_id === user.user_id && !fromSeller && (
                                  <span className="badge bg-light text-dark ms-1">You</span>
                                )}
                              </div>
                              <div className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>
                                {msg.message_text}
                              </div>
                              <div className="d-flex justify-content-between align-items-center mt-1" style={{ fontSize: '0.7rem' }}>
                                <span className="text-muted">{new Date(msg.sent_at).toLocaleString()}</span>
                                {user && Number(msg.sender_id) !== Number(user.user_id) && (
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 text-danger"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openReportModal(msg.message_id);
                                    }}
                                  >
                                    Report
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}

                  {messageError && (
                    <div className="alert alert-danger app-alert py-2 mb-2" role="alert">
                      <span className="app-alert-icon" aria-hidden="true">⚠️</span>
                      <div className="app-alert-message small">
                        {messageError}
                      </div>
                    </div>
                  )}
                  {messageSuccess && (
                    <div className="alert alert-success app-alert app-alert-success py-2 mb-2" role="alert">
                      <span className="app-alert-icon" aria-hidden="true">✅</span>
                      <div className="app-alert-message small">
                        {messageSuccess}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage}>
                    <label className="form-label small text-muted">
                      {isSold
                        ? 'This listing is marked as sold. Messaging is disabled.'
                        : 'Send a message to start or continue the conversation.'}
                    </label>
                    <textarea
                      className="form-control mb-2"
                      rows="3"
                      maxLength={1000}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      disabled={messageSending || isSold}
                      placeholder={isSold ? 'Sold listings cannot receive new messages.' : 'Type your message here...'}
                    />
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {messageText.length}/1000 characters
                      </small>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={messageSending || isSold}
                      >
                        {messageSending ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-1"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            Sending...
                          </>
                        ) : (
                          'Send Message'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {isSeller && !isSold && (
                <div className="mb-3">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleMarkSold}
                  >
                    Mark as Sold
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReportModal && listing && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSubmitReport}>
                <div className="modal-header">
                  <h5 className="modal-title">{reportMessageId ? 'Report message' : 'Report listing'}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowReportModal(false)}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Report type</label>
                    <select
                      className="form-select"
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                    >
                      {REPORT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Details</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      required
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Describe what is wrong…"
                      maxLength={4000}
                    />
                  </div>
                  {reportError && (
                    <div className="alert alert-danger small py-2">{reportError}</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReportModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning" disabled={reportSubmitting}>
                    {reportSubmitting ? 'Submitting…' : 'Submit report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListingDetail;
