const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'textbook_resale'
});

const listings = [
  [3, 'Organic Chemistry', 'Paula Bruice', 2023, 'Science', 2, 120.00, 'Like New', 'Clean, no writing', 'uploads/book5.jpg'],
  [5, 'Human Anatomy & Physiology', 'Elaine Marieb', 2022, 'Nursing', 1, 95.00, 'Good', 'Used for two semesters', 'uploads/book6.jpg'],
  [2, 'Data Structures and Algorithms', 'Michael Goodrich', 2021, 'Computer Science', 2, 75.00, 'Fair', 'Some wear on cover', 'uploads/book7.jpg'],
  [4, 'Financial Accounting', 'Jerry Weygandt', 2023, 'Business Administration', 1, 65.00, 'New', 'Access code unused', 'uploads/book8.jpg'],
  [5, 'Criminal Law', 'Joel Samaha', 2022, 'Criminal Justice', 2, 85.00, 'Like New', 'Highlighting in first 3 chapters only', 'uploads/book9.jpg'],
  [3, 'Physics for Scientists and Engineers', 'Raymond Serway', 2022, 'Engineering', 1, 110.00, 'Good', 'Includes study guide', 'uploads/book10.jpg'],
  [2, 'Operating System Concepts', 'Abraham Silberschatz', 2021, 'Computer Science', 3, 70.00, 'Good', 'Ninth edition', 'uploads/book11.jpg'],
  [4, 'Principles of Microeconomics', 'N. Gregory Mankiw', 2023, 'Business Administration', 1, 58.00, 'New', 'Sealed', 'uploads/book12.jpg'],
  [5, 'Introduction to Psychology', 'James Kalat', 2023, 'Social Sciences', 1, 52.00, 'Like New', 'Minimal highlighting', 'uploads/book13.jpg'],
  [3, 'Linear Algebra and Its Applications', 'David Lay', 2022, 'Mathematics', 2, 88.00, 'Good', 'Worked examples inside', 'uploads/book14.jpg'],
  [2, 'Networking Essentials', 'Jeffrey Beasley', 2021, 'Computer Science', 2, 62.00, 'Fair', 'Previous edition', 'uploads/book15.jpg'],
  [4, 'Strategic Management', 'Fred David', 2022, 'Business Administration', 3, 78.00, 'Like New', 'Case studies unmarked', 'uploads/book16.jpg'],
  [5, 'Introduction to Sociology', 'Anthony Giddens', 2023, 'Social Sciences', 1, 48.00, 'Good', 'Few pages bent', 'uploads/book17.jpg'],
  [3, 'Statics and Mechanics of Materials', 'Ferdinand Beer', 2022, 'Engineering', 2, 125.00, 'Like New', 'Comes with access', 'uploads/book18.jpg'],
  [2, 'Software Engineering', 'Ian Sommerville', 2021, 'Computer Science', 3, 68.00, 'Good', 'Tenth edition', 'uploads/book19.jpg'],
  [5, 'Medical-Surgical Nursing', 'Donna Ignatavicius', 2022, 'Nursing', 2, 98.00, 'Good', 'Heavy use but intact', 'uploads/book20.jpg']
];

const sql = `INSERT INTO listings (seller_id, book_title, author, publish_year, program_name, program_year, price, condition_type, comments, image1_path) VALUES ?`;

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  db.query(sql, [listings], (err, result) => {
    if (err) {
      console.error('Seed failed:', err.message);
      process.exit(1);
    }
    console.log('Seed complete. Rows inserted:', result.affectedRows);
    db.end();
  });
});
