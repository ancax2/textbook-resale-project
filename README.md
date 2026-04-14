# NBCC Textbook Resale - A Student Marketplace
## Project Overview
The NBCC Textbook Resale project is a full-stack web application developed as a hands-on learning experience, designed to help students buy and sell used textbooks within their college community. The platform supports the full lifecycle of a textbook listing — from posting and searching to messaging, bookmarking, and leaving seller feedback. An admin panel allows for platform moderation and oversight, reinforcing real-world web development practices across the entire stack.

---

## Features

1. **User Authentication and Session Management**:
   - Secure login and logout with persistent cookie-based sessions.
   - Legacy plaintext passwords are transparently upgraded to bcrypt on login.

2. **Textbook Listings**:
   - Students can create listings with up to 3 images, including title, author, program, condition, and price.
   - Listings can be edited, marked as sold, or soft-deleted by their owner.
   - Browse all active listings with search and filtering by program, year, condition, and price range.

3. **Messaging**:
   - Buyers and sellers can communicate directly through per-listing message threads.

4. **Bookmarks and Feedback**:
   - Users can bookmark listings for later and remove them at any time.
   - Buyers can leave a rating and comment for sellers after a sale is completed.

5. **Reporting and Moderation**:
   - Students can report problematic listings to admins.
   - Admins can review pending reports, resolve them with notes, and soft-delete offending listings.

6. **Admin Dashboard**:
   - Displays platform-wide stats including total users, active and sold listings, pending reports, and recent activity.

---

## Technical Specifications

- **Backend**: Node.js, Express
- **Frontend**: React (Create React App), Bootstrap
- **Database**: MySQL
- **Architecture**:
  - Single Express API service with a MySQL connection pool.
  - React frontend managed by a central `App.js` page-state controller.
  - Soft deletes via listing status fields — no physical row deletion.
  - Adheres to security best practices including parameterized queries, input sanitization, role-based access guards, and upload filtering.
  - Image optimization with `sharp` and response compression with `gzip` for performance.

---

## How to Run

1. Clone the repository:
   ```bash
   git clone https://github.com/ancax2/textbook-resale-project
   ```

2. Set up the database:
   - Run `database/schema.sql` to create the schema.
   - Run `database/demo-seed.sql` to populate demo data.
   - (Optional) Run `database/performance-indexes.sql` for query optimization.

3. Configure the backend:
   - Update your database credentials in the server configuration file.

4. Start the backend server:
   ```bash
   cd server
   npm install
   node server.js
   ```
   Server runs at `http://localhost:5000`

5. Start the frontend:
   ```bash
   cd client
   npm install
   npm start
   ```
   Frontend runs at `http://localhost:3000`

---

## Lessons Learned

This project provided valuable experience in:
- Building a full-stack application with React and Node.js from the ground up.
- Designing a relational MySQL schema with real-world constraints like soft deletes and duplicate-prevention logic.
- Implementing role-based access control and session-based authentication.
- Handling file uploads securely with type validation, size limits, and image compression.
- Applying security best practices including parameterized queries and input sanitization throughout the API.

---

## Author

**Juan Rivera**
Full-stack developer with hands-on experience building web applications using modern technologies including React,
Node.js, Express, and MySQL.