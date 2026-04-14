-- Performance Indexes for Textbook Resale
-- PERF-5: Add indexes on frequently queried columns
-- Run once after schema. If you see ER_DUP_KEYNAME, indexes already exist.

USE textbook_resale;

-- listings: filter by status (used in every browse/search/admin query)
ALTER TABLE listings ADD INDEX idx_listings_status (status);

-- listings: filter/sort by seller_id + status (My Listings, feedback aggregation)
ALTER TABLE listings ADD INDEX idx_listings_seller (seller_id, status);

-- listings: combined index for browse page sort
ALTER TABLE listings ADD INDEX idx_listings_browse (status, created_at);

-- messages: fetch conversation for a listing (heavily used on detail page)
ALTER TABLE messages ADD INDEX idx_messages_listing (listing_id, sent_at);

-- feedback: aggregate ratings per seller (subquery in browse + detail)
ALTER TABLE feedback ADD INDEX idx_feedback_listing (listing_id);
ALTER TABLE feedback ADD INDEX idx_feedback_buyer (buyer_id);

-- reports: admin panel filter by status
ALTER TABLE reports ADD INDEX idx_reports_status (status, created_at);
ALTER TABLE reports ADD INDEX idx_reports_listing (listing_id, status);
