DROP DATABASE IF EXISTS textbook_resale;
CREATE DATABASE textbook_resale;
USE textbook_resale;

-- Users table
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role ENUM('student', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_email CHECK (email LIKE '%@mynbcc.ca' OR email LIKE '%@nbcc.ca')
);

-- Textbook listings
CREATE TABLE listings (
    listing_id INT PRIMARY KEY AUTO_INCREMENT,
    seller_id INT NOT NULL,
    book_title VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    publish_year INT NOT NULL,
    program_name VARCHAR(100) NOT NULL,
    program_year INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    condition_type ENUM('New', 'Like New', 'Good', 'Fair', 'Poor') NOT NULL,
    comments TEXT,
    image1_path VARCHAR(255), -- Simplified: just store 3 image paths directly
    image2_path VARCHAR(255),
    image3_path VARCHAR(255),
    status ENUM('active', 'sold') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marked_sold_at TIMESTAMP NULL,
    FOREIGN KEY (seller_id) REFERENCES users(user_id)
);

-- Messages (conversation-style between buyer and seller)
CREATE TABLE messages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    listing_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id),
    FOREIGN KEY (sender_id) REFERENCES users(user_id)
);

-- Bookmarks (should have - nice to demonstrate on pj)
CREATE TABLE bookmarks (
    bookmark_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    listing_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id),
    UNIQUE KEY (user_id, listing_id)
);

-- Feedback/ratings (should have)
CREATE TABLE feedback (
    feedback_id INT PRIMARY KEY AUTO_INCREMENT,
    listing_id INT NOT NULL,
    buyer_id INT NOT NULL,
    rating TINYINT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id),
    FOREIGN KEY (buyer_id) REFERENCES users(user_id),
    UNIQUE KEY (listing_id, buyer_id)
);

-- Reports (must have - admin functionality)
CREATE TABLE reports (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    reporter_id INT NOT NULL,
    listing_id INT,
    message_id INT,
    reason TEXT NOT NULL,
    status ENUM('pending', 'resolved') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(user_id),
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id),
    FOREIGN KEY (message_id) REFERENCES messages(message_id)
);

-- ============================================
-- SAMPLE DATA for demonstration
-- ============================================

-- Pre-created users (for testing/demo)
INSERT INTO users (email, password, first_name, last_name, role) VALUES
('admin@nbcc.ca', 'admin123', 'Admin', 'User', 'admin'),
('john.doe@mynbcc.ca', 'password123', 'John', 'Doe', 'student'),
('jane.smith@mynbcc.ca', 'password123', 'Jane', 'Smith', 'student'),
('mike.wilson@mynbcc.ca', 'password123', 'Mike', 'Wilson', 'student'),
('sarah.jones@mynbcc.ca', 'password123', 'Sarah', 'Jones', 'student');

-- Sample listings
INSERT INTO listings (seller_id, book_title, author, publish_year, program_name, program_year, price, condition_type, comments, image1_path) VALUES
(2, 'Introduction to Programming', 'John Smith', 2023, 'Computer Science', 1, 45.00, 'Good', 'Minor highlighting, great condition', 'uploads/book1.jpg'),
(3, 'Calculus Early Transcendentals', 'James Stewart', 2022, 'Engineering', 1, 80.00, 'Like New', 'Only used for one semester', 'uploads/book2.jpg'),
(2, 'Database Systems', 'Elmasri Navathe', 2021, 'Computer Science', 2, 60.00, 'Good', 'Some notes in margins', 'uploads/book3.jpg'),
(4, 'Marketing Principles', 'Philip Kotler', 2023, 'Business Administration', 1, 55.00, 'New', 'Never opened', 'uploads/book4.jpg');

-- Sample messages
INSERT INTO messages (listing_id, sender_id, message_text) VALUES
(1, 3, 'Is this book still available?'),
(1, 2, 'Yes! Still available. Are you on campus?'),
(2, 4, 'Would you accept $70 for this?');

-- Sample bookmark
INSERT INTO bookmarks (user_id, listing_id) VALUES
(3, 2),
(4, 1);