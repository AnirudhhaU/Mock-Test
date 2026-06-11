-- ============================================================
--  Competitive Exam Mock Test Platform — Database Schema
--  CSE 2212 DBS Lab Mini Project
-- ============================================================

DROP DATABASE IF EXISTS mocktest_db;
CREATE DATABASE mocktest_db;
USE mocktest_db;

-- ─────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('student','admin') DEFAULT 'student',
    avatar_url      VARCHAR(255),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 2. CATEGORIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    icon        VARCHAR(50) DEFAULT 'bi-journal',
    color       VARCHAR(20) DEFAULT '#6366f1'
);

-- ─────────────────────────────────────────
-- 3. EXAMS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    category_id      INT NOT NULL,
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    duration_minutes INT DEFAULT 30,
    total_marks      INT NOT NULL,
    pass_marks       INT NOT NULL,
    negative_marking DECIMAL(4,2) DEFAULT 0.00,
    max_attempts     INT DEFAULT 3,
    is_active        BOOLEAN DEFAULT TRUE,
    created_by       INT,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────
-- 4. QUESTIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    exam_id          INT NOT NULL,
    question_text    TEXT NOT NULL,
    option_a         TEXT NOT NULL,
    option_b         TEXT NOT NULL,
    option_c         TEXT NOT NULL,
    option_d         TEXT NOT NULL,
    correct_option   ENUM('A','B','C','D') NOT NULL,
    explanation      TEXT,
    marks            INT DEFAULT 1,
    difficulty       ENUM('easy','medium','hard') DEFAULT 'medium',
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- 5. ATTEMPTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attempts (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    exam_id          INT NOT NULL,
    status           ENUM('in_progress','submitted','timed_out') DEFAULT 'in_progress',
    score            DECIMAL(6,2) DEFAULT 0.00,
    total_marks      INT NOT NULL,
    percentage       DECIMAL(5,2) DEFAULT 0.00,
    correct_count    INT DEFAULT 0,
    wrong_count      INT DEFAULT 0,
    skipped_count    INT DEFAULT 0,
    time_taken_sec   INT DEFAULT 0,
    started_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at     DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- 6. ATTEMPT ANSWERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attempt_answers (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id       INT NOT NULL,
    question_id      INT NOT NULL,
    selected_option  ENUM('A','B','C','D'),
    is_correct       BOOLEAN,
    marks_awarded    DECIMAL(4,2),
    FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- 7. AUDIT LOGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_audits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    old_duration INT,
    new_duration INT,
    old_pass_marks INT,
    new_pass_marks INT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 8. NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- 9. SEED DATA
-- ─────────────────────────────────────────

-- ─── USERS ───
-- Passwords are hashed 'password123' or 'Admin@123'
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin UI', 'admin@mocktest.com', '$2b$10$wNqH.L0.BIn0S3vO8.6a8.fXk3eYmZ.kKzQ3q.rY8aA/m7aF9vV7G', 'admin'),
('Alice Smith', 'alice@mocktest.com', '$2b$10$7Z2.HlO28v119vO8.6a8.fXk3eYmZ.kKzQ3q.rY8aA/m7aF9vV7G', 'student'),
('Bob Johnson', 'bob@mocktest.com', '$2b$10$7Z2.HlO28v119vO8.6a8.fXk3eYmZ.kKzQ3q.rY8aA/m7aF9vV7G', 'student'),
('Charlie Davis', 'charlie@mocktest.com', '$2b$10$7Z2.HlO28v119vO8.6a8.fXk3eYmZ.kKzQ3q.rY8aA/m7aF9vV7G', 'student'),
('Diana Prince', 'diana@mocktest.com', '$2b$10$7Z2.HlO28v119vO8.6a8.fXk3eYmZ.kKzQ3q.rY8aA/m7aF9vV7G', 'student');

-- ─── CATEGORIES ───
INSERT INTO categories (name, description, icon, color) VALUES 
('Mathematics', 'Arithmetic, Algebra, and Geometry', 'bi-calculator', '#6366f1'),
('General Science', 'Physics, Chemistry, and Biology', 'bi-flask', '#10b981'),
('English Language', 'Grammar, Vocabulary, and Comprehension', 'bi-translate', '#f59e0b'),
('Logical Reasoning', 'Analytic and critical thinking puzzles', 'bi-brain', '#8b5cf6'),
('Computer Science', 'IT, Programming, and Database concepts', 'bi-pc-display', '#06b6d4'),
('General Knowledge', 'Current affairs and history', 'bi-globe-americas', '#ec4899');

-- ─── EXAMS ───
INSERT INTO exams (title, description, category_id, duration_minutes, total_marks, pass_marks, negative_marking, created_by) VALUES 
('Quantitative Aptitude - Level 1', 'Arithmetic, percentages, and profit-loss.', 1, 30, 20, 8, 0.25, 1),
('Logical Reasoning - Basic', 'Series, coding-decoding, and puzzles.', 4, 15, 6, 4, 0.25, 1),
('Computer Science Fundamentals', 'Data structures, OS and DBMS basics.', 5, 20, 10, 4, 0.25, 1);

-- ─────────────────────────────────────────
-- 10. PROCEDURES & TRIGGERS
-- ─────────────────────────────────────────

DELIMITER //

-- [PROCEDURE] Get Student Performance Summary
DROP PROCEDURE IF EXISTS sp_GetStudentReport //
CREATE PROCEDURE sp_GetStudentReport(IN student_id INT)
BEGIN
    SELECT 
        COUNT(id) as total_tests,
        ROUND(AVG(percentage), 2) as avg_percentage,
        MAX(percentage) as best_percentage
    FROM attempts
    WHERE user_id = student_id AND status = 'submitted';
END //

-- [TRIGGER] Before Attempt: Data Validation & Percentage Calculation (Insert & Update)
DROP TRIGGER IF EXISTS before_attempt_inserted //
CREATE TRIGGER before_attempt_inserted
BEFORE INSERT ON attempts
FOR EACH ROW
BEGIN
    IF NEW.status = 'submitted' AND NEW.total_marks > 0 THEN
        SET NEW.percentage = (NEW.score / NEW.total_marks) * 100;
    END IF;
END //

DROP TRIGGER IF EXISTS before_attempt_submitted //
CREATE TRIGGER before_attempt_submitted
BEFORE UPDATE ON attempts
FOR EACH ROW
BEGIN
    IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
        IF NEW.total_marks > 0 THEN
            SET NEW.percentage = (NEW.score / NEW.total_marks) * 100;
        END IF;
    END IF;
END //

-- [TRIGGER] After Attempt Submitted: Automated Notification
DROP TRIGGER IF EXISTS after_attempt_submitted //
CREATE TRIGGER after_attempt_submitted
AFTER UPDATE ON attempts
FOR EACH ROW
BEGIN
    IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
        INSERT INTO notifications (user_id, message)
        VALUES (NEW.user_id, CONCAT('Success! You completed your exam with ', ROUND(NEW.percentage, 1), '% Score. Check results for details.'));
    END IF;
END //

-- [TRIGGER] Prevent Active Exam Deletion
DROP TRIGGER IF EXISTS prevent_active_exam_deletion //
CREATE TRIGGER prevent_active_exam_deletion
BEFORE DELETE ON exams
FOR EACH ROW
BEGIN
    DECLARE sub_count INT;
    SELECT COUNT(*) INTO sub_count FROM attempts WHERE exam_id = OLD.id AND status = 'submitted';
    IF sub_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Governance Block: Cannot delete exam while active student attempts exist.';
    END IF;
END //

-- [TRIGGER] Audit Exam Modifications
DROP TRIGGER IF EXISTS audit_exam_modifications //
CREATE TRIGGER audit_exam_modifications
AFTER UPDATE ON exams
FOR EACH ROW
BEGIN
    IF OLD.duration_minutes != NEW.duration_minutes OR OLD.pass_marks != NEW.pass_marks THEN
        INSERT INTO exam_audits (exam_id, old_duration, new_duration, old_pass_marks, new_pass_marks)
        VALUES (OLD.id, OLD.duration_minutes, NEW.duration_minutes, OLD.pass_marks, NEW.pass_marks);
    END IF;
END //

-- [TRIGGER] Prevent Main Admin Account Deletion
DROP TRIGGER IF EXISTS prevent_admin_deletion //
CREATE TRIGGER prevent_admin_deletion
BEFORE DELETE ON users
FOR EACH ROW
BEGIN
    IF OLD.role = 'admin' AND OLD.id = 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Security Block: The primary administrator account cannot be deleted.';
    END IF;
END //

DELIMITER ;
