-- ============================================================
--  mocktest_db — Table Creation (DDL only, no triggers)
-- ============================================================

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

CREATE TABLE IF NOT EXISTS categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    icon        VARCHAR(50) DEFAULT 'bi-journal',
    color       VARCHAR(20) DEFAULT '#6366f1'
);

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
    FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL
);

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

CREATE TABLE IF NOT EXISTS attempt_answers (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id       INT NOT NULL,
    question_id      INT NOT NULL,
    selected_option  ENUM('A','B','C','D'),
    is_correct       BOOLEAN,
    marks_awarded    DECIMAL(4,2),
    FOREIGN KEY (attempt_id)  REFERENCES attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_audits (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    exam_id        INT NOT NULL,
    old_duration   INT,
    new_duration   INT,
    old_pass_marks INT,
    new_pass_marks INT,
    changed_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
