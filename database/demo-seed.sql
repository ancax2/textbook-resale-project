-- ============================================
-- NBCC Textbook Resale — Demo Seed Data
-- Covers every feature for live presentation
--
-- This script DELETEs all rows and reloads demo users/listings/messages/etc.
-- If you ran server API tests (npm run test:api), re-run this file to remove
-- rows like "E2E Three Img …" and get a clean demo catalog again.
-- ============================================

USE textbook_resale;

-- Clear existing data (reverse FK order)
DELETE FROM feedback;
DELETE FROM reports;
DELETE FROM bookmarks;
DELETE FROM messages;
DELETE FROM listings;
DELETE FROM users;

-- Reset auto-increment counters
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE listings AUTO_INCREMENT = 1;
ALTER TABLE messages AUTO_INCREMENT = 1;
ALTER TABLE bookmarks AUTO_INCREMENT = 1;
ALTER TABLE feedback AUTO_INCREMENT = 1;
ALTER TABLE reports AUTO_INCREMENT = 1;

-- ============================================
-- USERS (5 accounts)
-- Admin: admin123 | Students: password123
-- ============================================
INSERT INTO users (email, password, first_name, last_name, role) VALUES
('admin@nbcc.ca',         'admin123', 'Admin',   'User',     'admin'),
('john.doe@mynbcc.ca',    'password123', 'John',    'Doe',      'student'),
('jane.smith@mynbcc.ca',  'password123', 'Jane',    'Smith',    'student'),
('mike.wilson@mynbcc.ca', 'password123', 'Mike',    'Wilson',   'student'),
('sarah.jones@mynbcc.ca', 'password123', 'Sarah',   'Jones',    'student');

-- ============================================
-- LISTINGS — Mix of active, sold, and deleted
-- Uses 3 demo images in different combos
-- ============================================

-- John Doe's listings (user_id = 2) — 6 active, 2 sold
INSERT INTO listings (seller_id, book_title, author, publish_year, program_name, program_year, price, condition_type, comments, image1_path, image2_path, image3_path, status) VALUES
(2, 'Introduction to Programming with Python', 'Tony Gaddis', 2023, 'IT Programmer Analyst', 1, 65.00, 'Like New',
 'Used for one semester only. No highlighting or markings. Comes with online access code (unused).',
 'uploads/demo_book_blue.png', 'uploads/demo_book_green.png', NULL, 'active'),

(2, 'Database Systems: Design and Implementation', 'Elmasri Navathe', 2022, 'IT Programmer Analyst', 2, 55.00, 'Good',
 'Some notes in the margins from studying for exams. Cover in good shape.',
 'uploads/demo_book_blue.png', NULL, NULL, 'active'),

(2, 'Networking Essentials: A CompTIA Approach', 'Jeffrey Beasley', 2023, 'IT Programmer Analyst', 2, 70.00, 'New',
 'Brand new, still in shrink wrap. Bought an extra copy by mistake.',
 'uploads/demo_book_blue.png', 'uploads/demo_book_gold.png', NULL, 'active'),

(2, 'Software Engineering Principles', 'Ian Sommerville', 2021, 'IT Programmer Analyst', 3, 48.00, 'Fair',
 'Older edition but still relevant for the course. Some wear on spine.',
 'uploads/demo_book_green.png', NULL, NULL, 'active'),

(2, 'Web Development with JavaScript and React', 'Marijn Haverbeke', 2023, 'IT Programmer Analyst', 2, 72.00, 'Like New',
 'Great book for learning modern web development. Clean pages throughout.',
 'uploads/demo_book_blue.png', 'uploads/demo_book_green.png', 'uploads/demo_book_gold.png', 'active'),

(2, 'Data Structures and Algorithms in Java', 'Michael Goodrich', 2022, 'IT Programmer Analyst', 2, 60.00, 'Good',
 'Used for Data Structures course. All practice problems solved in pencil (erasable).',
 'uploads/demo_book_gold.png', NULL, NULL, 'active'),

(2, 'Operating System Concepts', 'Abraham Silberschatz', 2021, 'IT Programmer Analyst', 3, 45.00, 'Good',
 'Ninth edition. Solid reference book.',
 'uploads/demo_book_blue.png', NULL, NULL, 'sold'),

(2, 'Calculus: Early Transcendentals', 'James Stewart', 2022, 'Engineering Technology', 1, 90.00, 'Like New',
 'Used for Math 1 only. No writing inside.',
 'uploads/demo_book_gold.png', 'uploads/demo_book_blue.png', NULL, 'sold');

-- Jane Smith's listings (user_id = 3) — 4 active, 1 sold
INSERT INTO listings (seller_id, book_title, author, publish_year, program_name, program_year, price, condition_type, comments, image1_path, image2_path, image3_path, status) VALUES
(3, 'Organic Chemistry: Structure and Function', 'K. Peter Vollhardt', 2023, 'Science', 2, 110.00, 'Like New',
 'Clean copy, no highlighting. Includes solutions manual.',
 'uploads/demo_book_green.png', 'uploads/demo_book_blue.png', NULL, 'active'),

(3, 'Human Anatomy and Physiology', 'Elaine Marieb', 2022, 'Nursing', 1, 95.00, 'Good',
 'Highlighted in chapters 1-8. Rest is clean. Great for first-year nursing students.',
 'uploads/demo_book_green.png', NULL, NULL, 'active'),

(3, 'Physics for Scientists and Engineers', 'Raymond Serway', 2023, 'Engineering Technology', 1, 105.00, 'New',
 'Never opened. Changed programs before using it.',
 'uploads/demo_book_blue.png', 'uploads/demo_book_gold.png', 'uploads/demo_book_green.png', 'active'),

(3, 'Linear Algebra and Its Applications', 'David Lay', 2022, 'IT Programmer Analyst', 2, 78.00, 'Good',
 'Worked examples inside. Useful for the linear algebra course.',
 'uploads/demo_book_gold.png', NULL, NULL, 'active'),

(3, 'Introduction to Psychology', 'James Kalat', 2023, 'Human Services', 1, 52.00, 'Like New',
 'Minor wear on cover, pages are clean.',
 'uploads/demo_book_green.png', NULL, NULL, 'sold');

-- Mike Wilson's listings (user_id = 4) — 3 active, 1 sold, 1 deleted
INSERT INTO listings (seller_id, book_title, author, publish_year, program_name, program_year, price, condition_type, comments, image1_path, image2_path, image3_path, status) VALUES
(4, 'Marketing Management', 'Philip Kotler', 2023, 'Business Administration', 1, 68.00, 'Like New',
 'Barely used. Perfect for first-year Business students.',
 'uploads/demo_book_gold.png', 'uploads/demo_book_green.png', NULL, 'active'),

(4, 'Financial Accounting Fundamentals', 'Jerry Weygandt', 2023, 'Business Administration', 1, 75.00, 'New',
 'Still sealed. Includes WileyPLUS access code. Selling because I dropped the course.',
 'uploads/demo_book_gold.png', NULL, NULL, 'active'),

(4, 'Microeconomics: Principles and Policy', 'N. Gregory Mankiw', 2022, 'Business Administration', 2, 58.00, 'Good',
 'Some tabs and highlighting in the first half. Solid textbook.',
 'uploads/demo_book_gold.png', 'uploads/demo_book_blue.png', 'uploads/demo_book_green.png', 'active'),

(4, 'Strategic Management: Concepts', 'Fred David', 2022, 'Business Administration', 3, 65.00, 'Good',
 'Case studies unmarked. Good condition overall.',
 'uploads/demo_book_gold.png', NULL, NULL, 'sold'),

(4, 'Inappropriate Listing Example', 'Test Author', 2023, 'Business Administration', 1, 10.00, 'Poor',
 'This listing was removed by an admin for violating community guidelines.',
 'uploads/demo_book_gold.png', NULL, NULL, 'deleted');

-- Sarah Jones's listings (user_id = 5) — 3 active
INSERT INTO listings (seller_id, book_title, author, publish_year, program_name, program_year, price, condition_type, comments, image1_path, image2_path, image3_path, status) VALUES
(5, 'Medical-Surgical Nursing: Clinical Reasoning', 'Donna Ignatavicius', 2023, 'Nursing', 2, 98.00, 'Good',
 'Heavily used but all pages intact. Great reference for second-year nursing.',
 'uploads/demo_book_green.png', 'uploads/demo_book_blue.png', 'uploads/demo_book_gold.png', 'active'),

(5, 'Criminal Law in Canada', 'Joel Samaha', 2022, 'Criminal Justice', 2, 82.00, 'Like New',
 'Highlighting in first 3 chapters only.',
 'uploads/demo_book_blue.png', NULL, NULL, 'active'),

(5, 'Introduction to Sociology', 'Anthony Giddens', 2023, 'Human Services', 1, 48.00, 'Fair',
 'Cover shows wear, pages are clean inside. Previous edition but still used for the course.',
 'uploads/demo_book_green.png', 'uploads/demo_book_gold.png', NULL, 'active');

-- Additional unique textbook listings for richer demos
-- Uses the same three demo images in varied combinations
INSERT INTO listings (seller_id, book_title, author, publish_year, program_name, program_year, price, condition_type, comments, image1_path, image2_path, image3_path, status) VALUES
(2, 'Discrete Mathematics for Computing', 'Kenneth Rosen', 2023, 'IT Programmer Analyst', 1, 58.00, 'Good',
 'Great prep for logic and algorithm courses. A few notes in chapter 2.',
 'uploads/demo_book_blue.png', 'uploads/demo_book_green.png', NULL, 'active'),
(2, 'Computer Organization and Design', 'David Patterson', 2022, 'IT Programmer Analyst', 2, 69.00, 'Like New',
 'Clean copy with no annotations. Used briefly for architecture class.',
 'uploads/demo_book_blue.png', NULL, NULL, 'active'),
(2, 'Linux Administration Handbook', 'Evi Nemeth', 2021, 'IT Programmer Analyst', 3, 50.00, 'Fair',
 'Wear on the cover but very useful command references inside.',
 'uploads/demo_book_green.png', 'uploads/demo_book_gold.png', NULL, 'active'),
(2, 'Cloud Computing Concepts', 'Rajkumar Buyya', 2023, 'IT Programmer Analyst', 3, 74.00, 'New',
 'Never used. Bought before switching electives.',
 'uploads/demo_book_gold.png', NULL, NULL, 'active'),
(2, 'Applied Cybersecurity Fundamentals', 'Chuck Easttom', 2022, 'IT Programmer Analyst', 2, 62.00, 'Good',
 'Some highlighting in security policy chapters.',
 'uploads/demo_book_blue.png', 'uploads/demo_book_gold.png', 'uploads/demo_book_green.png', 'sold'),
(2, 'Mobile App Development with Flutter', 'Carmine Zaccagnino', 2023, 'IT Programmer Analyst', 2, 66.00, 'Like New',
 'Used for one project. Includes sticky tabs for key sections.',
 'uploads/demo_book_green.png', NULL, NULL, 'active'),

(3, 'Biochemistry: The Molecular Basis of Life', 'Trudy McKee', 2022, 'Science', 2, 102.00, 'Good',
 'Excellent condition. A few solved examples marked in pencil.',
 'uploads/demo_book_green.png', 'uploads/demo_book_blue.png', NULL, 'active'),
(3, 'General Microbiology', 'Gerard Tortora', 2023, 'Science', 1, 88.00, 'Like New',
 'No writing. Includes lab prep notes as loose sheets.',
 'uploads/demo_book_gold.png', 'uploads/demo_book_green.png', NULL, 'active'),
(3, 'Pathophysiology Essentials', 'Tommie Norris', 2022, 'Nursing', 2, 93.00, 'Good',
 'Used through midterms. Binder and pages are still solid.',
 'uploads/demo_book_blue.png', NULL, NULL, 'active'),
(3, 'Pharmacology for Nursing Practice', 'Susan Lilley', 2023, 'Nursing', 2, 99.00, 'New',
 'Unopened package, includes online resources.',
 'uploads/demo_book_blue.png', 'uploads/demo_book_gold.png', NULL, 'active'),
(3, 'Research Methods in Social Work', 'Allen Rubin', 2021, 'Human Services', 2, 57.00, 'Fair',
 'Readable with moderate cover wear.',
 'uploads/demo_book_green.png', NULL, NULL, 'active'),
(3, 'Child and Youth Care Foundations', 'Garry Hornby', 2022, 'Human Services', 1, 61.00, 'Like New',
 'Used lightly. Great starter text.',
 'uploads/demo_book_gold.png', 'uploads/demo_book_blue.png', NULL, 'sold'),

(4, 'Business Communications in Practice', 'Kitty Locker', 2023, 'Business Administration', 1, 54.00, 'Good',
 'Some highlights in presentation chapters.',
 'uploads/demo_book_gold.png', 'uploads/demo_book_green.png', NULL, 'active'),
(4, 'Entrepreneurship: Theory and Practice', 'Donald Kuratko', 2022, 'Business Administration', 2, 72.00, 'Like New',
 'Very clean copy with minimal wear.',
 'uploads/demo_book_gold.png', NULL, NULL, 'active'),
(4, 'Project Management for Professionals', 'Harold Kerzner', 2021, 'Business Administration', 3, 64.00, 'Good',
 'Useful templates flagged with sticky notes.',
 'uploads/demo_book_blue.png', 'uploads/demo_book_gold.png', NULL, 'active'),
(4, 'Supply Chain Management', 'Sunil Chopra', 2023, 'Business Administration', 2, 79.00, 'New',
 'Brand new and unused.',
 'uploads/demo_book_green.png', 'uploads/demo_book_gold.png', 'uploads/demo_book_blue.png', 'active'),
(4, 'Canadian Business Law', 'Yates Bereznicki', 2022, 'Business Administration', 1, 59.00, 'Good',
 'Small amount of highlighting in early chapters.',
 'uploads/demo_book_blue.png', NULL, NULL, 'active'),
(4, 'Consumer Behaviour in Canada', 'Lucie Vyncke', 2023, 'Business Administration', 2, 67.00, 'Like New',
 'Excellent condition, no notes.',
 'uploads/demo_book_gold.png', NULL, NULL, 'sold'),

(5, 'Mental Health Nursing in Canada', 'Mary Ann Boyd', 2023, 'Nursing', 3, 96.00, 'Good',
 'Great for clinical prep. Notes in margins for key disorders.',
 'uploads/demo_book_green.png', 'uploads/demo_book_blue.png', NULL, 'active'),
(5, 'Community Health and Wellness', 'Nola Pender', 2022, 'Nursing', 2, 84.00, 'Like New',
 'Used one semester and kept clean.',
 'uploads/demo_book_green.png', NULL, NULL, 'active'),
(5, 'Introduction to Criminology', 'Frank Schmalleger', 2023, 'Criminal Justice', 1, 63.00, 'Good',
 'Some folded corners but all pages intact.',
 'uploads/demo_book_blue.png', 'uploads/demo_book_gold.png', NULL, 'active'),
(5, 'Policing in Canadian Society', 'Rick Linden', 2021, 'Criminal Justice', 2, 55.00, 'Fair',
 'Older copy with visible wear but fully usable.',
 'uploads/demo_book_gold.png', NULL, NULL, 'active'),
(5, 'Counselling Techniques for Helpers', 'Bradley Erford', 2022, 'Human Services', 2, 71.00, 'Like New',
 'Almost new, no highlighting.',
 'uploads/demo_book_green.png', 'uploads/demo_book_gold.png', NULL, 'active'),
(5, 'Ethics and Professional Practice', 'Corey Ciocchetti', 2023, 'Human Services', 1, 49.00, 'Poor',
 'Some pages have water marks; still readable.',
 'uploads/demo_book_blue.png', NULL, NULL, 'deleted'),

-- Extra listings for larger browse demos (same image assets + canonical programs)
(2, 'Introduction to Java Programming', 'Y. Daniel Liang', 2023, 'Computer Science', 1, 62.00, 'Like New',
 'No writing inside. Access code not used.',
 'uploads/demo_book_blue.png', 'uploads/demo_book_green.png', NULL, 'active'),
(2, 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 2020, 'IT Programmer Analyst', 2, 42.00, 'Good',
 'Dog-eared corners on a few pages; content is clear.',
 'uploads/demo_book_green.png', NULL, NULL, 'active'),
(3, 'Campbell Biology', 'Jane Reece', 2023, 'Science', 1, 118.00, 'Good',
 'Loose-leaf edition in binder. Highlighting in metabolism unit only.',
 'uploads/demo_book_gold.png', 'uploads/demo_book_blue.png', 'uploads/demo_book_green.png', 'active'),
(3, 'Canadian Fundamentals of Nursing', 'Potter Perry', 2022, 'Nursing', 1, 89.00, 'Like New',
 'Campus bookstore sticker on back. Otherwise excellent.',
 'uploads/demo_book_green.png', NULL, NULL, 'active'),
(4, 'Macroeconomics: Canada in the Global Environment', 'Parkin Bade', 2023, 'Business Administration', 2, 56.00, 'Fair',
 'Practice quizzes filled in pencil; can erase.',
 'uploads/demo_book_blue.png', 'uploads/demo_book_gold.png', NULL, 'active'),
(4, 'Digital Marketing Essentials', 'Jeff Larson', 2022, 'Business Administration', 2, 48.00, 'New',
 'Spiral bound lab manual style. Never used.',
 'uploads/demo_book_gold.png', NULL, NULL, 'active'),
(5, 'Forensic Science: An Introduction', 'Richard Saferstein', 2021, 'Criminal Justice', 2, 74.00, 'Good',
 'Includes access card — verify with seller before purchase.',
 'uploads/demo_book_blue.png', NULL, NULL, 'active'),
(2, 'Discrete Structures for Computer Science', 'Gary Chartrand', 2022, 'Mathematics', 2, 51.00, 'Good',
 'Solutions to selected exercises in appendix.',
 'uploads/demo_book_gold.png', 'uploads/demo_book_green.png', NULL, 'active'),
(3, 'Social Problems in a Diverse Society', 'Diana Kendall', 2023, 'Social Sciences', 2, 44.00, 'Like New',
 'Canadian edition. Minimal highlighting.',
 'uploads/demo_book_green.png', 'uploads/demo_book_blue.png', NULL, 'active'),
(4, 'Engineering Mechanics: Statics', 'Russell Hibbeler', 2022, 'Engineering', 2, 95.00, 'Good',
 'Covers statics course for year 2. Some scuffing on corners.',
 'uploads/demo_book_blue.png', NULL, NULL, 'active'),
(5, 'Addictions Counselling: A Practical Guide', 'Robert W. File', 2021, 'Human Services', 3, 58.00, 'Fair',
 'Instructor notes on sticky tabs; binding tight.',
 'uploads/demo_book_green.png', NULL, NULL, 'active'),
(2, 'IT Project Management: On Track from Start to Finish', 'Joseph Phillips', 2021, 'IT Programmer Analyst', 3, 46.00, 'Poor',
 'Older edition; still referenced in some electives.',
 'uploads/demo_book_gold.png', NULL, NULL, 'sold');

-- ============================================
-- MESSAGES — Realistic buyer/seller conversations
-- ============================================

-- Conversation on listing 1 (John's Python book): Jane asks, John replies
INSERT INTO messages (listing_id, sender_id, message_text, sent_at) VALUES
(1, 3, 'Hi John! Is this Python book still available? I need it for the Programming Fundamentals course next semester.', '2026-03-15 10:30:00'),
(1, 2, 'Yes it is! The book is in great shape. Are you on the Moncton campus? We could meet at the library.', '2026-03-15 11:15:00'),
(1, 3, 'Perfect! I am at Moncton campus. Would you be available Wednesday afternoon?', '2026-03-15 12:00:00'),
(1, 2, 'Wednesday works for me. How about 2pm at the second floor study area?', '2026-03-15 14:20:00'),
(1, 3, 'Sounds great, see you then!', '2026-03-15 14:45:00');

-- Conversation on listing 3 (John's Networking book): Mike asks about price
INSERT INTO messages (listing_id, sender_id, message_text, sent_at) VALUES
(3, 4, 'Hi, would you consider $60 for the Networking book? I am on a tight budget this semester.', '2026-03-18 09:00:00'),
(3, 2, 'I could do $65 since it is brand new and still sealed. That is already below the bookstore price.', '2026-03-18 10:30:00'),
(3, 4, 'That is fair. Deal! Where can we meet?', '2026-03-18 11:00:00');

-- Conversation on listing 10 (Jane's Anatomy book): Sarah asks
INSERT INTO messages (listing_id, sender_id, message_text, sent_at) VALUES
(10, 5, 'Hi Jane! Is the Anatomy textbook the latest edition required for Nursing Year 1?', '2026-03-20 13:00:00'),
(10, 3, 'Yes, it is the 2022 edition which is what they use for the current curriculum. The first 8 chapters have some highlighting but the rest is clean.', '2026-03-20 13:45:00'),
(10, 5, 'Great, I will take it! Can we meet on campus tomorrow?', '2026-03-20 14:30:00');

-- Conversation on listing 15 (Mike's Accounting book): Jane inquires
INSERT INTO messages (listing_id, sender_id, message_text, sent_at) VALUES
(15, 3, 'Is the WileyPLUS code for the Accounting book really unused?', '2026-03-25 16:00:00'),
(15, 4, 'Yes, completely unused. I dropped the course in the first week so I never activated it.', '2026-03-25 16:45:00'),
(15, 3, 'That is amazing value then. I would like to buy it.', '2026-03-25 17:15:00');

-- Conversation on listing 19 (Sarah's Med-Surg book): Jane asks about condition
INSERT INTO messages (listing_id, sender_id, message_text, sent_at) VALUES
(19, 3, 'How heavy is the use on this book? I need it for practicum next semester.', '2026-04-01 08:30:00'),
(19, 5, 'It was my main reference for clinical rotations. The binding is solid and all pages are there. Just some tabs and notes in the margins. Very usable!', '2026-04-01 09:15:00');

-- ============================================
-- BOOKMARKS — Show bookmark functionality
-- ============================================
INSERT INTO bookmarks (user_id, listing_id) VALUES
(3, 1),   -- Jane bookmarked John's Python book
(3, 3),   -- Jane bookmarked John's Networking book
(3, 5),   -- Jane bookmarked John's Web Dev book
(3, 19),  -- Jane bookmarked Sarah's Med-Surg book
(4, 9),   -- Mike bookmarked Jane's Organic Chemistry
(4, 11),  -- Mike bookmarked Jane's Physics
(5, 1),   -- Sarah bookmarked John's Python book
(5, 10),  -- Sarah bookmarked Jane's Anatomy book
(2, 14),  -- John bookmarked Mike's Marketing book
(2, 15);  -- John bookmarked Mike's Accounting book

-- ============================================
-- SOLD LISTINGS — Set sold timestamps
-- ============================================
UPDATE listings SET marked_sold_at = '2026-03-22 14:00:00' WHERE listing_id = 7;
UPDATE listings SET marked_sold_at = '2026-03-28 16:30:00' WHERE listing_id = 8;
UPDATE listings SET marked_sold_at = '2026-04-02 10:00:00' WHERE listing_id = 13;
UPDATE listings SET marked_sold_at = '2026-04-05 11:45:00' WHERE listing_id = 17;

-- ============================================
-- FEEDBACK — Ratings on sold listings
-- ============================================
INSERT INTO feedback (listing_id, buyer_id, rating, comment, created_at) VALUES
(7, 4, 5, 'John was very responsive and the book was exactly as described. Quick and easy transaction on campus!', '2026-03-23 09:00:00'),
(8, 3, 4, 'Book was in great condition. Met at the library, very convenient. Would buy from John again.', '2026-03-29 10:00:00'),
(13, 5, 5, 'Jane was super helpful and even gave me study tips for the psych course. Highly recommended seller!', '2026-04-03 14:00:00'),
(17, 3, 3, 'Book was in decent shape. Took a couple days to arrange the meetup but it worked out in the end.', '2026-04-06 08:30:00');

-- ============================================
-- REPORTS — One pending for admin demo
-- ============================================
INSERT INTO reports (reporter_id, listing_id, message_id, report_type, reason, status) VALUES
(3, 16, NULL, 'Misleading information',
 '[Misleading information] The price listed seems unusually low and the description is vague. Could be a scam or the seller may have listed the wrong item.',
 'pending');

-- One resolved report (to show admin history)
INSERT INTO reports (reporter_id, listing_id, message_id, report_type, reason, status, admin_notes, resolved_by_admin_id) VALUES
(5, 18, NULL, 'Inappropriate content',
 '[Inappropriate content] This listing contained content that violated community guidelines.',
 'resolved', 'Listing removed after review. Content was inappropriate for the platform.', 1);
