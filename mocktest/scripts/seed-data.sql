-- ============================================================
--  mocktest_db — Seed Data (Users, Categories, Exams)
--  Passwords: admin → Admin@123 | students → password123
-- ============================================================

-- Users (admin + 4 students)
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin',          'admin@mocktest.com',   '$2a$10$n1y8VV1xGmFjnRYo2V5h1.y1YIHtKgdWtCxcshoLTFankzbxvOF5C', 'admin'),
('Alice Smith',    'alice@mocktest.com',   '$2a$10$UPJ5nOuuYvG4VrpOTq0I3.ag49LjK1vC8x5CBglaEaZJeYBixcYc.', 'student'),
('Bob Johnson',    'bob@mocktest.com',     '$2a$10$UPJ5nOuuYvG4VrpOTq0I3.ag49LjK1vC8x5CBglaEaZJeYBixcYc.', 'student'),
('Charlie Davis',  'charlie@mocktest.com', '$2a$10$UPJ5nOuuYvG4VrpOTq0I3.ag49LjK1vC8x5CBglaEaZJeYBixcYc.', 'student'),
('Diana Prince',   'diana@mocktest.com',   '$2a$10$UPJ5nOuuYvG4VrpOTq0I3.ag49LjK1vC8x5CBglaEaZJeYBixcYc.', 'student');

-- Categories
INSERT INTO categories (name, description, icon, color) VALUES
('Mathematics',       'Arithmetic, Algebra, and Geometry',            'bi-calculator',     '#6366f1'),
('General Science',   'Physics, Chemistry, and Biology',              'bi-flask',          '#10b981'),
('English Language',  'Grammar, Vocabulary, and Comprehension',       'bi-translate',      '#f59e0b'),
('Logical Reasoning', 'Analytic and critical thinking puzzles',       'bi-brain',          '#8b5cf6'),
('Computer Science',  'IT, Programming, and Database concepts',       'bi-pc-display',     '#06b6d4'),
('General Knowledge', 'Current affairs and history',                  'bi-globe-americas', '#ec4899');

-- Exams (created_by = 1 → admin)
INSERT INTO exams (title, description, category_id, duration_minutes, total_marks, pass_marks, negative_marking, created_by) VALUES
('Quantitative Aptitude - Level 1', 'Arithmetic, percentages, and profit-loss.',  1, 30, 20, 8,  0.25, 1),
('Logical Reasoning - Basic',       'Series, coding-decoding, and puzzles.',      4, 15,  6, 4,  0.25, 1),
('Computer Science Fundamentals',   'Data structures, OS and DBMS basics.',       5, 20, 10, 4,  0.25, 1);
