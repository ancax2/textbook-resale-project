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
(4, 'Marketing Principles', 'Philip Kotler', 2023, 'Business Administration', 1, 55.00, 'New', 'Never opened', 'uploads/book4.jpg'),
(3, 'Organic Chemistry', 'Paula Bruice', 2023, 'Science', 2, 120.00, 'Like New', 'Clean, no writing', 'uploads/book5.jpg'),
(5, 'Human Anatomy & Physiology', 'Elaine Marieb', 2022, 'Nursing', 1, 95.00, 'Good', 'Used for two semesters', 'uploads/book6.jpg'),
(2, 'Data Structures and Algorithms', 'Michael Goodrich', 2021, 'Computer Science', 2, 75.00, 'Fair', 'Some wear on cover', 'uploads/book7.jpg'),
(4, 'Financial Accounting', 'Jerry Weygandt', 2023, 'Business Administration', 1, 65.00, 'New', 'Access code unused', 'uploads/book8.jpg'),
(5, 'Criminal Law', 'Joel Samaha', 2022, 'Criminal Justice', 2, 85.00, 'Like New', 'Highlighting in first 3 chapters only', 'uploads/book9.jpg'),
(3, 'Physics for Scientists and Engineers', 'Raymond Serway', 2022, 'Engineering', 1, 110.00, 'Good', 'Includes study guide', 'uploads/book10.jpg'),
(2, 'Operating System Concepts', 'Abraham Silberschatz', 2021, 'Computer Science', 3, 70.00, 'Good', 'Ninth edition', 'uploads/book11.jpg'),
(4, 'Principles of Microeconomics', 'N. Gregory Mankiw', 2023, 'Business Administration', 1, 58.00, 'New', 'Sealed', 'uploads/book12.jpg'),
(5, 'Introduction to Psychology', 'James Kalat', 2023, 'Social Sciences', 1, 52.00, 'Like New', 'Minimal highlighting', 'uploads/book13.jpg'),
(3, 'Linear Algebra and Its Applications', 'David Lay', 2022, 'Mathematics', 2, 88.00, 'Good', 'Worked examples inside', 'uploads/book14.jpg'),
(2, 'Networking Essentials', 'Jeffrey Beasley', 2021, 'Computer Science', 2, 62.00, 'Fair', 'Previous edition', 'uploads/book15.jpg'),
(4, 'Strategic Management', 'Fred David', 2022, 'Business Administration', 3, 78.00, 'Like New', 'Case studies unmarked', 'uploads/book16.jpg'),
(5, 'Introduction to Sociology', 'Anthony Giddens', 2023, 'Social Sciences', 1, 48.00, 'Good', 'Few pages bent', 'uploads/book17.jpg'),
(3, 'Statics and Mechanics of Materials', 'Ferdinand Beer', 2022, 'Engineering', 2, 125.00, 'Like New', 'Comes with access', 'uploads/book18.jpg'),
(2, 'Software Engineering', 'Ian Sommerville', 2021, 'Computer Science', 3, 68.00, 'Good', 'Tenth edition', 'uploads/book19.jpg'),
(5, 'Medical-Surgical Nursing', 'Donna Ignatavicius', 2022, 'Nursing', 2, 98.00, 'Good', 'Heavy use but intact', 'uploads/book20.jpg');

-- Sample messages
INSERT INTO messages (listing_id, sender_id, message_text) VALUES
(1, 3, 'Is this book still available?'),
(1, 2, 'Yes! Still available. Are you on campus?'),
(2, 4, 'Would you accept $70 for this?');

-- Sample bookmark
INSERT INTO bookmarks (user_id, listing_id) VALUES
(3, 2),
(4, 1);