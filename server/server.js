const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(session({
  secret: 'textbook-resale-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root123', // CHANGE THIS to your MySQL password!
  database: 'textbook_resale'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
  }
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
const upload = multer({ storage: storage });

// ===== ROUTES =====

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.query(
    'SELECT * FROM users WHERE email = ? AND password = ?',
    [email, password],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length > 0) {
        req.session.user = results[0];
        res.json({ 
          success: true, 
          user: { 
            user_id: results[0].user_id,
            email: results[0].email,
            first_name: results[0].first_name,
            last_name: results[0].last_name,
            role: results[0].role
          }
        });
      } else {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
    }
  );
});

// Get current user
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'Not logged in' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get all active listings
app.get('/api/listings', (req, res) => {
  const query = `
    SELECT l.*, u.first_name, u.last_name 
    FROM listings l 
    JOIN users u ON l.seller_id = u.user_id 
    WHERE l.status = 'active'
    ORDER BY l.created_at DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get single listing
app.get('/api/listings/:id', (req, res) => {
  const query = `
    SELECT l.*, u.first_name, u.last_name, u.email 
    FROM listings l 
    JOIN users u ON l.seller_id = u.user_id 
    WHERE l.listing_id = ?
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

// Create new listing (with image upload)
app.post('/api/listings', upload.array('images', 3), (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in' });
  }

  const {
    book_title,
    author,
    publish_year,
    program_name,
    program_year,
    price,
    condition_type,
    comments
  } = req.body;

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

  // Get image paths (max 3)
  const image1 = req.files[0] ? `uploads/${req.files[0].filename}` : null;
  const image2 = req.files[1] ? `uploads/${req.files[1].filename}` : null;
  const image3 = req.files[2] ? `uploads/${req.files[2].filename}` : null;

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});