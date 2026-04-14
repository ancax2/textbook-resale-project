const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const compression = require('compression');

const app = express();
const PORT = Number(process.env.PORT || 5000, 10);

// Middleware
app.use(compression()); // Gzip all HTTP responses for smaller payloads
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
// Serve uploaded images with 1-day browser cache
app.use('/uploads', express.static('uploads', {
  maxAge: '1d',
  immutable: true
}));
app.use(session({
  secret: 'textbook-resale-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Database connection
// Use a pool so transient MySQL connection drops don't break auth/listing APIs.
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'textbook_resale',
  connectionLimit: 10
});

// Validate the pool once at startup (doesn't keep a single forever-connection).
db.getConnection((err, conn) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  conn.release();
  console.log('Connected to MySQL database (pool)');
});

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const IMAGE_MIME = /^image\/(jpeg|png)$/i;

/** Reject non-image uploads and oversize files before storing on disk. */
function listingImagesUpload(req, res, next) {
  const u = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const mimeOk = IMAGE_MIME.test(file.mimetype || '');
      const extOk = /\.(jpe?g|png)$/i.test(file.originalname || '');
      if (mimeOk && extOk) return cb(null, true);
      // Skip disallowed files (no disk write); handler returns 400 if no valid images.
      cb(null, false);
    }
  }).array('images', 3);

  u(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Each image must be 8MB or smaller' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'At most 3 images are allowed' });
      }
    }
    const msg = err.message || 'Invalid file upload';
    return res.status(400).json({ error: msg });
  });
}

/** Strip HTML tags, trim whitespace, and cap string length for safety. */
function sanitizeText(value, maxLen = 8000) {
  if (value == null) return '';
  let s = String(value).trim();
  s = s.replace(/<[^>]*>/g, '');
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ===== ROUTES =====

// Login — bcrypt verification; legacy plaintext passwords auto-upgraded on first successful login
app.post('/api/login', (req, res) => {
  const email = sanitizeText(req.body?.email, 120);
  const password = req.body?.password != null ? String(req.body.password) : '';

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('[DB] Login user lookup failed:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const row = results[0];
    const sessionUser = {
      user_id: row.user_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      role: row.role
    };

    const done = (ok) => {
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      req.session.user = sessionUser;
      res.json({ success: true, user: sessionUser });
    };

    const stored = row.password;
    if (stored && String(stored).startsWith('$2')) {
      bcrypt.compare(password, stored, (cmpErr, match) => {
        if (cmpErr) return res.status(500).json({ error: 'Authentication error' });
        done(match);
      });
    } else if (stored === password) {
      bcrypt.hash(password, 10, (hErr, hash) => {
        if (!hErr && hash) {
          db.query('UPDATE users SET password = ? WHERE user_id = ?', [hash, row.user_id], () => {});
        }
        done(true);
      });
    } else {
      done(false);
    }
  });
});

// Get current user (never return password hash)
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    const u = req.session.user;
    res.json({
      user: {
        user_id: u.user_id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role
      }
    });
  } else {
    res.status(401).json({ message: 'Not logged in' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// In-memory cache for program names (refreshes every 60 seconds)
let _programsCache = { data: null, expiry: 0 };

// Canonical NBCC program labels (merged with DB so browse/create filters stay consistent even with no listings yet)
const CANONICAL_PROGRAM_NAMES = [
  'Business Administration',
  'Computer Science',
  'Criminal Justice',
  'Engineering',
  'Engineering Technology',
  'Human Services',
  'IT Programmer Analyst',
  'Mathematics',
  'Nursing',
  'Science',
  'Social Sciences'
];

// Get unique program names for the filter dropdown and create-listing select
app.get('/api/programs', (req, res) => {
  const now = Date.now();
  if (_programsCache.data && now < _programsCache.expiry) {
    return res.json(_programsCache.data);
  }

  const query = `
    SELECT DISTINCT program_name 
    FROM listings 
    WHERE status = 'active' AND program_name IS NOT NULL AND TRIM(program_name) <> ''
    ORDER BY program_name ASC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('[DB] /api/programs query failed:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const fromDb = results.map((r) => r.program_name).filter(Boolean);
    const merged = [...new Set([...CANONICAL_PROGRAM_NAMES, ...fromDb])].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    _programsCache = { data: merged, expiry: Date.now() + 60_000 };
    res.json(merged);
  });
});

// Get all active listings (optional search + filters, pagination: limit/offset)
app.get('/api/listings', (req, res) => {
  const search = (req.query.search || '').trim();
  const programName = (req.query.program_name || '').trim();
  const programYear = (req.query.program_year || '').trim();
  const conditionType = (req.query.condition_type || '').trim();
  const priceMin = req.query.price_min != null && req.query.price_min !== '' ? parseFloat(req.query.price_min) : null;
  const priceMax = req.query.price_max != null && req.query.price_max !== '' ? parseFloat(req.query.price_max) : null;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const offset = (page - 1) * limit;

  let whereClause = `
    FROM listings l 
    JOIN users u ON l.seller_id = u.user_id 
    WHERE l.status = 'active'
  `;
  const params = [];

  if (search) {
    const escaped = search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    const likePattern = `%${escaped}%`;
    whereClause += ` AND (l.book_title LIKE ? OR l.author LIKE ? OR l.program_name LIKE ?)`;
    params.push(likePattern, likePattern, likePattern);
  }

  if (programName) {
    whereClause += ` AND l.program_name = ?`;
    params.push(programName);
  }
  if (programYear) {
    whereClause += ` AND l.program_year = ?`;
    params.push(programYear);
  }
  if (conditionType) {
    whereClause += ` AND l.condition_type = ?`;
    params.push(conditionType);
  }
  if (priceMin != null && !Number.isNaN(priceMin)) {
    whereClause += ` AND l.price >= ?`;
    params.push(priceMin);
  }
  if (priceMax != null && !Number.isNaN(priceMax)) {
    whereClause += ` AND l.price <= ?`;
    params.push(priceMax);
  }

  const countQuery = `SELECT COUNT(*) as total ${whereClause}`;
  const dataQuery = `
    SELECT l.*, u.first_name, u.last_name,
      (SELECT ROUND(AVG(f.rating), 2) FROM feedback f
        INNER JOIN listings sl ON f.listing_id = sl.listing_id
        WHERE sl.seller_id = l.seller_id) AS seller_avg_rating,
      (SELECT COUNT(*) FROM feedback f
        INNER JOIN listings sl ON f.listing_id = sl.listing_id
        WHERE sl.seller_id = l.seller_id) AS seller_feedback_count
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const dataParams = [...params, limit, offset];

  db.query(countQuery, params, (errCount, countResult) => {
    if (errCount) {
      return res.status(500).json({ error: 'Database error' });
    }
    const total = countResult[0].total;

    db.query(dataQuery, dataParams, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ listings: results, total });
    });
  });
});

// ===== MY LISTINGS =====

// Get current user's listings (active + sold) with message count
app.get('/api/listings/mine', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in' });
  }
  const userId = Number(req.session.user.user_id);
  const query = `
    SELECT l.*,
           (SELECT COUNT(*) FROM messages m WHERE m.listing_id = l.listing_id) AS message_count
    FROM listings l
    WHERE l.seller_id = ?
    ORDER BY l.status ASC, l.created_at DESC
  `;
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const active = results.filter((r) => r.status === 'active');
    const sold = results.filter((r) => r.status === 'sold');
    const deleted = results.filter((r) => r.status === 'deleted');
    res.json({ active, sold, deleted });
  });
});

// Get single listing (exclude soft-deleted)
app.get('/api/listings/:id', (req, res) => {
  const query = `
    SELECT l.*, u.first_name, u.last_name, u.email,
      (SELECT ROUND(AVG(f.rating), 2) FROM feedback f
        INNER JOIN listings sl ON f.listing_id = sl.listing_id
        WHERE sl.seller_id = l.seller_id) AS seller_avg_rating,
      (SELECT COUNT(*) FROM feedback f
        INNER JOIN listings sl ON f.listing_id = sl.listing_id
        WHERE sl.seller_id = l.seller_id) AS seller_feedback_count
    FROM listings l
    JOIN users u ON l.seller_id = u.user_id
    WHERE l.listing_id = ? AND l.status <> 'deleted'
  `;

  db.query(query, [req.params.id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: 'Listing not found' });
    }
  });
});

// Mark listing as sold (seller only)
app.patch('/api/listings/:id/sold', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in' });
  }

  const listingId = req.params.id;
  const userId = req.session.user.user_id;

  const selectQuery = 'SELECT seller_id, status FROM listings WHERE listing_id = ?';

  db.query(selectQuery, [listingId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = results[0];
    if (listing.status === 'deleted') {
      return res.status(400).json({ error: 'This listing is no longer available' });
    }
    if (Number(listing.seller_id) !== Number(userId)) {
      return res.status(403).json({ error: 'You can only mark your own listings as sold' });
    }

    if (listing.status === 'sold') {
      return res.json({ success: true, message: 'Listing already marked as sold' });
    }

    const updateQuery = `
      UPDATE listings 
      SET status = 'sold', marked_sold_at = CURRENT_TIMESTAMP 
      WHERE listing_id = ?
    `;
    db.query(updateQuery, [listingId], (updateErr) => {
      if (updateErr) {
        console.error('Database error:', updateErr);
        return res.status(500).json({ error: 'Failed to mark listing as sold' });
      }
      res.json({ success: true, message: 'Listing marked as sold' });
    });
  });
});

// Create new listing (with image upload)
app.post('/api/listings', listingImagesUpload, async (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in' });
  }

  const book_title = sanitizeText(req.body?.book_title, 200);
  const author = sanitizeText(req.body?.author, 100);
  const publish_year = sanitizeText(req.body?.publish_year, 10);
  const program_name = sanitizeText(req.body?.program_name, 100);
  const program_year = sanitizeText(req.body?.program_year, 10);
  const price = req.body?.price;
  const condition_type = sanitizeText(req.body?.condition_type, 50);
  const comments = sanitizeText(req.body?.comments, 5000);

  // Validation - check mandatory fields
  if (!book_title || !author || !publish_year || !program_name || 
      !program_year || !price || !condition_type) {
    return res.status(400).json({ 
      error: 'Please fill in all required fields',
      missing: {
        book_title: !book_title,
        author: !author,
        publish_year: !publish_year,
        program_name: !program_name,
        program_year: !program_year,
        price: !price,
        condition_type: !condition_type
      }
    });
  }

  // Check if at least one image was uploaded
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'At least one image is required' });
  }

  // PERF-1: Compress uploaded images with sharp (max 1200px wide, 80% quality JPEG)
  const compressImage = async (file) => {
    if (!file) return null;
    const outPath = file.path; // overwrite in place
    try {
      const buffer = await sharp(file.path)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
      const fs = require('fs');
      fs.writeFileSync(outPath, buffer);
    } catch (e) {
      console.warn('[SHARP] Could not compress', file.filename, e.message);
    }
    return `uploads/${file.filename}`;
  };

  let image1, image2, image3;
  try {
    image1 = await compressImage(req.files[0]);
    image2 = await compressImage(req.files[1]);
    image3 = await compressImage(req.files[2]);
  } catch (e) {
    console.error('[SHARP] Compression error:', e);
    image1 = req.files[0] ? `uploads/${req.files[0].filename}` : null;
    image2 = req.files[1] ? `uploads/${req.files[1].filename}` : null;
    image3 = req.files[2] ? `uploads/${req.files[2].filename}` : null;
  }

  // Invalidate programs cache since new listing may introduce new program
  _programsCache = { data: null, expiry: 0 };

  // Insert into database
  const query = `
    INSERT INTO listings 
    (seller_id, book_title, author, publish_year, program_name, program_year, 
     price, condition_type, comments, image1_path, image2_path, image3_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    req.session.user.user_id,
    book_title,
    author,
    publish_year,
    program_name,
    program_year,
    price,
    condition_type,
    comments || null,
    image1,
    image2,
    image3
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to create listing' });
    }

    res.json({ 
      success: true, 
      message: 'Listing created successfully!',
      listing_id: result.insertId 
    });
  });
});

// Update listing (seller only, text fields only — images unchanged)
app.put('/api/listings/:id', requireAuth, (req, res) => {
  const listingId = req.params.id;
  const userId = req.session.user.user_id;

  // Verify ownership and active status
  db.query('SELECT seller_id, status FROM listings WHERE listing_id = ?', [listingId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
    if (Number(rows[0].seller_id) !== Number(userId)) {
      return res.status(403).json({ error: 'You can only edit your own listings' });
    }
    if (rows[0].status !== 'active') {
      return res.status(400).json({ error: 'Only active listings can be edited' });
    }

    const book_title = sanitizeText(req.body?.book_title, 200);
    const author = sanitizeText(req.body?.author, 100);
    const publish_year = sanitizeText(req.body?.publish_year, 10);
    const program_name = sanitizeText(req.body?.program_name, 100);
    const program_year = sanitizeText(req.body?.program_year, 10);
    const price = req.body?.price;
    const condition_type = sanitizeText(req.body?.condition_type, 50);
    const comments = sanitizeText(req.body?.comments, 5000);

    if (!book_title || !author || !publish_year || !program_name ||
        !program_year || !price || !condition_type) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    const query = `
      UPDATE listings
      SET book_title = ?, author = ?, publish_year = ?, program_name = ?,
          program_year = ?, price = ?, condition_type = ?, comments = ?
      WHERE listing_id = ?
    `;
    const values = [book_title, author, publish_year, program_name,
                    program_year, price, condition_type, comments || null, listingId];

    db.query(query, values, (updateErr) => {
      if (updateErr) {
        console.error('Database error:', updateErr);
        return res.status(500).json({ error: 'Failed to update listing' });
      }
      res.json({ success: true, message: 'Listing updated successfully!' });
    });
  });
});

// Create message for a listing
app.post('/api/messages', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in to send messages' });
  }

  const { listing_id, message_text } = req.body;
  const trimmed = sanitizeText(message_text, 1000);

  if (!listing_id || !trimmed) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  // Optional character limit (e.g., 1000 chars)
  if (trimmed.length > 1000) {
    return res.status(400).json({ error: 'Message is too long (max 1000 characters)' });
  }

  const getListingQuery = `
    SELECT l.listing_id, l.seller_id, u.email AS seller_email 
    FROM listings l 
    JOIN users u ON l.seller_id = u.user_id 
    WHERE l.listing_id = ?
  `;

  db.query(getListingQuery, [listing_id], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = results[0];
    const senderId = req.session.user.user_id;

    const insertQuery = `
      INSERT INTO messages (listing_id, sender_id, message_text)
      VALUES (?, ?, ?)
    `;
    db.query(insertQuery, [listing_id, senderId, trimmed], (insertErr, result) => {
      if (insertErr) {
        console.error('Database error:', insertErr);
        return res.status(500).json({ error: 'Failed to send message' });
      }

      // Log "email notification" to console (placeholder)
      const senderEmail = req.session.user.email;
      const sellerEmail = listing.seller_email;
      console.log(`[EMAIL] New message for listing ${listing_id}`);
      console.log(`  From: ${senderEmail}`);
      console.log(`  To (seller): ${sellerEmail}`);
      console.log(`  Preview: ${trimmed.substring(0, 120)}${trimmed.length > 120 ? '…' : ''}`);

      res.json({
        success: true,
        message: 'Message sent successfully',
        message_id: result.insertId
      });
    });
  });
});

// Get all messages for a listing (conversation)
app.get('/api/messages/listing/:id', (req, res) => {
  const listingId = req.params.id;
  const query = `
    SELECT m.message_id,
           m.listing_id,
           m.sender_id,
           m.message_text,
           m.sent_at,
           u.first_name,
           u.last_name
    FROM messages m
    JOIN users u ON m.sender_id = u.user_id
    WHERE m.listing_id = ?
    ORDER BY m.sent_at ASC, m.message_id ASC
  `;

  db.query(query, [listingId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// ===== BOOKMARKS =====

// Get current user's bookmarks (with listing + seller info)
app.get('/api/bookmarks', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in' });
  }
  const userId = req.session.user.user_id;
  const query = `
    SELECT b.bookmark_id, b.listing_id, b.created_at,
           l.book_title, l.author, l.publish_year, l.program_name, l.program_year,
           l.price, l.condition_type, l.comments, l.status,
           l.image1_path, l.image2_path, l.image3_path,
           u.first_name, u.last_name
    FROM bookmarks b
    JOIN listings l ON b.listing_id = l.listing_id
    JOIN users u ON l.seller_id = u.user_id
    WHERE b.user_id = ? AND l.status <> 'deleted'
    ORDER BY b.created_at DESC
  `;
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Add bookmark
app.post('/api/bookmarks', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in' });
  }
  const { listing_id } = req.body;
  if (!listing_id) {
    return res.status(400).json({ error: 'listing_id is required' });
  }
  const userId = req.session.user.user_id;
  const insertQuery = 'INSERT INTO bookmarks (user_id, listing_id) VALUES (?, ?)';
  db.query(insertQuery, [userId, listing_id], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        return res.json({ success: true, already: true, message: 'Already bookmarked' });
      }
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(404).json({ error: 'Listing not found' });
      }
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to add bookmark' });
    }
    res.status(201).json({ success: true, bookmark_id: result.insertId, message: 'Bookmarked' });
  });
});

// Remove bookmark by bookmark_id (current user only)
app.delete('/api/bookmarks/:id', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in' });
  }
  const userId = req.session.user.user_id;
  const bookmarkId = req.params.id;
  const query = 'DELETE FROM bookmarks WHERE bookmark_id = ? AND user_id = ?';
  db.query(query, [bookmarkId, userId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to remove bookmark' });
    }
    res.json({ success: true, removed: result.affectedRows > 0 });
  });
});

// Remove bookmark by listing id (current user)
app.delete('/api/bookmarks/listing/:listingId', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in' });
  }
  const userId = req.session.user.user_id;
  const listingId = req.params.listingId;
  const query = 'DELETE FROM bookmarks WHERE user_id = ? AND listing_id = ?';
  db.query(query, [userId, listingId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to remove bookmark' });
    }
    res.json({ success: true, removed: result.affectedRows > 0 });
  });
});

// ===== REPORTS (US11) =====
app.post('/api/reports', requireAuth, (req, res) => {
  const listingId = req.body?.listing_id != null ? parseInt(req.body.listing_id, 10) : null;
  const messageId = req.body?.message_id != null ? parseInt(req.body.message_id, 10) : null;
  const reportType = sanitizeText(req.body?.report_type, 100) || 'Other';
  const reasonDetail = sanitizeText(req.body?.reason, 4000);
  const reporterId = req.session.user.user_id;

  if (!listingId || Number.isNaN(listingId)) {
    return res.status(400).json({ error: 'listing_id is required' });
  }
  if (!reasonDetail) {
    return res.status(400).json({ error: 'Please describe the issue' });
  }

  const fullReason = `[${reportType}] ${reasonDetail}`;

  db.query(
    'SELECT listing_id FROM listings WHERE listing_id = ? AND status <> ?',
    [listingId, 'deleted'],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      const dupSql = `
        SELECT report_id FROM reports
        WHERE reporter_id = ? AND listing_id = ? AND status = 'pending' LIMIT 1
      `;
      db.query(dupSql, [reporterId, listingId], (dupErr, dupRows) => {
        if (dupErr) {
          console.error(dupErr);
          return res.status(500).json({ error: 'Database error' });
        }
        if (dupRows.length > 0) {
          return res.status(409).json({ error: 'You already have a pending report for this listing' });
        }

        const insertSql = `
          INSERT INTO reports (reporter_id, listing_id, message_id, report_type, reason, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `;
        db.query(
          insertSql,
          [reporterId, listingId, messageId || null, reportType, fullReason],
          (insErr, result) => {
            if (insErr) {
              if (insErr.code === 'ER_BAD_FIELD_ERROR' || insErr.errno === 1054) {
                const fallbackSql = `
                  INSERT INTO reports (reporter_id, listing_id, message_id, reason, status)
                  VALUES (?, ?, ?, ?, 'pending')
                `;
                return db.query(
                  fallbackSql,
                  [reporterId, listingId, messageId || null, fullReason],
                  (fbErr, fbRes) => {
                    if (fbErr) {
                      console.error(fbErr);
                      return res.status(500).json({ error: 'Failed to submit report. Run database/sprint5-migration.sql' });
                    }
                    logReportEmailToAdmin(listingId, reporterId, fullReason);
                    return res.status(201).json({ success: true, report_id: fbRes.insertId });
                  }
                );
              }
              console.error(insErr);
              return res.status(500).json({ error: 'Failed to submit report' });
            }
            logReportEmailToAdmin(listingId, reporterId, fullReason);
            res.status(201).json({ success: true, report_id: result.insertId });
          }
        );
      });
    }
  );
});

// Production email: use nodemailer (or SendGrid/AWS SES) with SMTP/API keys;
// replace console.log below with transporter.sendMail({ to: admin@..., subject, html }).

function logReportEmailToAdmin(listingId, reporterId, reason) {
  console.log('[EMAIL] New listing report for admin review');
  console.log(`  Listing ID: ${listingId}, Reporter user_id: ${reporterId}`);
  console.log(`  Reason: ${reason.substring(0, 200)}${reason.length > 200 ? '…' : ''}`);
}

// ===== ADMIN: reports & stats (US12) =====
app.get('/api/reports', requireAuth, requireAdmin, (req, res) => {
  const statusFilter = (req.query.status || 'all').toLowerCase();
  let where = '1=1';
  const params = [];
  if (statusFilter === 'pending' || statusFilter === 'resolved') {
    where = 'r.status = ?';
    params.push(statusFilter);
  }

  const sql = `
    SELECT r.*,
           l.book_title, l.status AS listing_status,
           u.first_name AS reporter_first_name, u.last_name AS reporter_last_name, u.email AS reporter_email
    FROM reports r
    LEFT JOIN listings l ON r.listing_id = l.listing_id
    JOIN users u ON r.reporter_id = u.user_id
    WHERE ${where}
    ORDER BY r.created_at DESC
  `;
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// PERF-4: Combine 4 COUNT queries into a single multi-result query
app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
  const countsSql = `
    SELECT
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM listings WHERE status = 'active') AS activeListings,
      (SELECT COUNT(*) FROM listings WHERE status = 'sold') AS soldListings,
      (SELECT COUNT(*) FROM reports WHERE status = 'pending') AS pendingReports
  `;
  const recentListingsSql = `
    SELECT l.listing_id, l.book_title, l.created_at, u.first_name, u.last_name
    FROM listings l JOIN users u ON l.seller_id = u.user_id
    WHERE l.status <> 'deleted'
    ORDER BY l.created_at DESC LIMIT 5
  `;
  const recentMessagesSql = `
    SELECT m.message_id, m.listing_id, m.message_text, m.sent_at, u.first_name, u.last_name
    FROM messages m JOIN users u ON m.sender_id = u.user_id
    ORDER BY m.sent_at DESC LIMIT 8
  `;

  db.query(countsSql, [], (e1, countsRows) => {
    if (e1) return res.status(500).json({ error: 'Database error' });
    const counts = countsRows[0];
    db.query(recentListingsSql, [], (e2, recentListings) => {
      if (e2) return res.status(500).json({ error: 'Database error' });
      db.query(recentMessagesSql, [], (e3, recentMessages) => {
        if (e3) return res.status(500).json({ error: 'Database error' });
        res.json({
          totalUsers: counts.totalUsers,
          activeListings: counts.activeListings,
          soldListings: counts.soldListings,
          pendingReports: counts.pendingReports,
          recentListings: recentListings || [],
          recentMessages: recentMessages || []
        });
      });
    });
  });
});

// Admin soft-delete listing + resolve reports (US12 Part 2)
app.delete('/api/listings/:id', requireAuth, requireAdmin, (req, res) => {
  const listingId = req.params.id;
  const adminNotes = sanitizeText(req.body?.admin_notes, 2000);
  const adminId = req.session.user.user_id;

  db.query(
    `SELECT l.*, u.email AS seller_email, u.first_name, u.last_name
     FROM listings l JOIN users u ON l.seller_id = u.user_id
     WHERE l.listing_id = ?`,
    [listingId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      const listing = rows[0];

      db.query(
        "UPDATE listings SET status = 'deleted' WHERE listing_id = ?",
        [listingId],
        (upErr) => {
          if (upErr) {
            console.error(upErr);
            return res.status(500).json({ error: 'Failed to update listing' });
          }

          const resolveSql = `
            UPDATE reports
            SET status = 'resolved', admin_notes = ?, resolved_by_admin_id = ?
            WHERE listing_id = ? AND status = 'pending'
          `;
          db.query(resolveSql, [adminNotes || null, adminId, listingId], (rsErr) => {
            if (rsErr) {
              if (rsErr.code === 'ER_BAD_FIELD_ERROR' || rsErr.errno === 1054) {
                db.query(
                  "UPDATE reports SET status = 'resolved' WHERE listing_id = ? AND status = 'pending'",
                  [listingId],
                  () => {}
                );
              } else {
                console.error(rsErr);
              }
            }
          });

          console.log('[EMAIL] Listing removed by admin (soft delete)');
          console.log(`  To seller: ${listing.seller_email} (${listing.first_name} ${listing.last_name})`);
          console.log(`  Listing: ${listing.book_title} (id ${listingId})`);

          res.json({ success: true, message: 'Listing marked as deleted' });
        }
      );
    }
  );
});

// ===== FEEDBACK (US10) =====
app.post('/api/feedback', requireAuth, (req, res) => {
  const listingId = parseInt(req.body?.listing_id, 10);
  const rating = parseInt(req.body?.rating, 10);
  const comment = sanitizeText(req.body?.comment, 2000);
  const buyerId = req.session.user.user_id;

  if (!listingId || Number.isNaN(listingId)) {
    return res.status(400).json({ error: 'listing_id is required' });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  db.query(
    'SELECT seller_id, status FROM listings WHERE listing_id = ? AND status <> ?',
    [listingId, 'deleted'],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      const { seller_id: sellerId, status } = rows[0];
      if (Number(sellerId) === Number(buyerId)) {
        return res.status(400).json({ error: 'You cannot rate your own listing' });
      }
      if (status !== 'sold') {
        return res.status(400).json({ error: 'Feedback is only available for sold listings' });
      }

      const insertSql = 'INSERT INTO feedback (listing_id, buyer_id, rating, comment) VALUES (?, ?, ?, ?)';
      db.query(insertSql, [listingId, buyerId, rating, comment || null], (insErr, result) => {
        if (insErr) {
          if (insErr.code === 'ER_DUP_ENTRY' || insErr.errno === 1062) {
            return res.status(409).json({ error: 'You have already submitted feedback for this listing' });
          }
          console.error(insErr);
          return res.status(500).json({ error: 'Failed to save feedback' });
        }
        res.status(201).json({ success: true, feedback_id: result.insertId });
      });
    }
  );
});

app.get('/api/feedback/mine/:listingId', requireAuth, (req, res) => {
  const listingId = req.params.listingId;
  const buyerId = req.session.user.user_id;
  db.query(
    'SELECT feedback_id, rating, comment FROM feedback WHERE listing_id = ? AND buyer_id = ? LIMIT 1',
    [listingId, buyerId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ hasFeedback: rows.length > 0, feedback: rows[0] || null });
    }
  );
});

app.get('/api/feedback/seller/:id', (req, res) => {
  const sellerId = req.params.id;
  const sql = `
    SELECT f.rating, f.comment, f.created_at, l.book_title,
           buyer.first_name AS buyer_first_name, buyer.last_name AS buyer_last_name
    FROM feedback f
    JOIN listings l ON f.listing_id = l.listing_id
    JOIN users buyer ON f.buyer_id = buyer.user_id
    WHERE l.seller_id = ? AND l.status <> 'deleted'
    ORDER BY f.created_at DESC
  `;
  db.query(sql, [sellerId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    const count = rows.length;
    const avg = count === 0 ? null : Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 100) / 100;
    res.json({ average: avg, count, items: rows });
  });
});

// ===== PROFILE =====
app.get('/api/profile/me', requireAuth, (req, res) => {
  const uid = Number(req.session.user.user_id);
  const user = req.session.user;

  const qListings = `
    SELECT status, COUNT(*) AS c FROM listings WHERE seller_id = ? GROUP BY status
  `;
  db.query(qListings, [uid], (e1, listingCounts) => {
    if (e1) return res.status(500).json({ error: 'Database error' });
    let active = 0;
    let sold = 0;
    let deleted = 0;
    (listingCounts || []).forEach((row) => {
      if (row.status === 'active') active = row.c;
      if (row.status === 'sold') sold = row.c;
      if (row.status === 'deleted') deleted = row.c;
    });

    const qFb = `
      SELECT ROUND(AVG(f.rating), 2) AS avg_rating, COUNT(*) AS cnt
      FROM feedback f
      JOIN listings l ON f.listing_id = l.listing_id
      WHERE l.seller_id = ?
    `;
    db.query(qFb, [uid], (e2, fbRows) => {
      if (e2) return res.status(500).json({ error: 'Database error' });
      const qPurchases = 'SELECT COUNT(DISTINCT listing_id) AS c FROM feedback WHERE buyer_id = ?';
      db.query(qPurchases, [uid], (e3, purRows) => {
        if (e3) return res.status(500).json({ error: 'Database error' });
        res.json({
          user: {
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
          },
          listingsActive: active,
          listingsSold: sold,
          listingsDeleted: deleted,
          sellerAvgRating: fbRows[0]?.avg_rating != null ? Number(fbRows[0].avg_rating) : null,
          sellerFeedbackCount: fbRows[0]?.cnt != null ? Number(fbRows[0].cnt) : 0,
          purchasesRated: purRows[0]?.c != null ? Number(purRows[0].c) : 0,
          totalSalesApprox: sold
        });
      });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});