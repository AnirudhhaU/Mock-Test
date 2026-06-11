# MockTest Pro — Competitive Exam Platform

A full-stack web application for conducting competitive mock tests, with role-based access for students and admins, timed MCQ exams, negative marking, and a rich analytics dashboard.

## Features

- **Role-based access** — separate student and admin views with JWT authentication
- **Timed MCQ exams** — live countdown timer with auto-submit on expiry
- **Configurable negative marking** — per-exam negative marking and attempt limits
- **Admin dashboard** — create/manage exams, add questions, view attempt analytics
- **Student dashboard** — browse exams, track scores, view detailed results
- **Automated scoring** — BEFORE/AFTER triggers handle percentage calculation, notifications, and audit logging
- **Security** — bcrypt password hashing, Helmet headers, rate limiting, CORS

## Database Design

Normalised MySQL schema with 8 tables and 5 triggers:

| Table | Purpose |
|---|---|
| `users` | Students and admins |
| `exams` | Exam metadata, duration, marking scheme |
| `questions` | MCQ questions with 4 options |
| `attempts` | Per-user exam attempts with scores |
| `attempt_answers` | Individual question responses |
| `categories` | Exam categories |
| `notifications` | Post-submission alerts |
| `audit_logs` | Admin action history |

**Triggers:** auto-percentage on submit, post-submission notification, audit logging, prevent deletion of active exams, prevent admin account deletion.

## Project Structure

```
mocktest-clean/
├── server/
│   ├── server.js          # Express app entry point
│   ├── db.js              # MySQL connection pool
│   └── routes/
│       ├── auth.js        # Login, register, JWT
│       ├── exams.js       # Exam + question CRUD, attempt logic
│       └── admin.js       # Admin-only routes
├── public/
│   ├── index.html         # Landing page
│   ├── login.html
│   ├── dashboard.html     # Student dashboard
│   ├── exam.html          # Live exam with timer
│   ├── results.html       # Score breakdown
│   ├── admin.html         # Admin dashboard
│   ├── css/style.css
│   └── js/app.js
├── database/
│   └── schema.sql         # Full DB schema with triggers
├── scripts/
│   ├── setup-db.js        # DB initialisation script
│   ├── seed.js            # Sample data seeder
│   └── seed-data.sql
└── package.json
```

## Setup

### Prerequisites
- Node.js 18+
- MySQL 8+

### Installation

```bash
git clone https://github.com/AnirudhhaU/mock-test-platform.git
cd mock-test-platform

npm install
```

### Database Setup

```bash
# Create the database and tables
mysql -u root -p < database/schema.sql

# (Optional) Seed sample exams and questions
node scripts/seed.js
```

### Environment Variables

Create a `.env` file in the root:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mocktest_db
JWT_SECRET=your_jwt_secret
PORT=3000
```

### Run

```bash
npm start        # production
npm run dev      # development with auto-reload (nodemon)
```

Open `http://localhost:3000` in your browser.

## Tech Stack

Node.js · Express · MySQL · JWT · bcrypt · Bootstrap · HTML/CSS/JS
