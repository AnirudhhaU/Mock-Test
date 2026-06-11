const express  = require('express');
const db       = require('../db');
const { authenticate } = require('./auth');
const router   = express.Router();

// Admin-only middleware
function adminOnly(req, res, next) {
    if (req.user.role !== 'admin')
        return res.status(403).json({ error: 'Admin access required.' });
    next();
}

// ─── DASHBOARD STATS ───────────────────────────────────────────────────────
router.get('/stats', authenticate, adminOnly, async (req, res) => {
    try {
        const [[{ total_users }]]    = await db.query('SELECT COUNT(*) AS total_users FROM users WHERE role="student"');
        const [[{ total_exams }]]    = await db.query('SELECT COUNT(*) AS total_exams FROM exams');
        const [[{ total_questions }]]= await db.query('SELECT COUNT(*) AS total_questions FROM questions');
        const [[{ total_attempts }]] = await db.query('SELECT COUNT(*) AS total_attempts FROM attempts WHERE status="submitted"');
        const [[{ avg_score }]]      = await db.query('SELECT ROUND(AVG(percentage),2) AS avg_score FROM attempts WHERE status="submitted"');

        res.json({ total_users, total_exams, total_questions, total_attempts, avg_score: avg_score || 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── PERFORMANCE STATS (for Chart.js) ──────────────────────────────────────
router.get('/performance-stats', authenticate, adminOnly, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT e.title AS exam_name, ROUND(AVG(a.percentage), 2) AS avg_score, COUNT(a.id) AS taker_count
             FROM exams e
             LEFT JOIN attempts a ON e.id = a.exam_id AND a.status = 'submitted'
             GROUP BY e.id
             ORDER BY taker_count DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET ALL USERS ─────────────────────────────────────────────────────────
router.get('/users', authenticate, adminOnly, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.name, u.email, u.role, u.created_at,
                    COUNT(a.id) AS attempts_count
             FROM users u
             LEFT JOIN attempts a ON a.user_id = u.id AND a.status='submitted'
             GROUP BY u.id ORDER BY u.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET USER ATTEMPTS (Detailed history for Admin) ────────────────────────
router.get('/users/:id/attempts', authenticate, adminOnly, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT a.*, e.title AS exam_title
             FROM attempts a
             JOIN exams e ON e.id = a.exam_id
             WHERE a.user_id = ? AND a.status != 'in_progress'
             ORDER BY a.submitted_at DESC`, [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── CREATE EXAM ───────────────────────────────────────────────────────────
router.post('/exams', authenticate, adminOnly, async (req, res) => {
    const { title, description, category_id, duration_minutes, total_marks, pass_marks, negative_marking, max_attempts } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO exams (title, description, category_id, duration_minutes, total_marks, pass_marks, negative_marking, max_attempts, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, category_id, duration_minutes, total_marks, pass_marks, negative_marking || 0.25, max_attempts || 3, req.user.id]
        );
        res.status(201).json({ id: result.insertId, message: 'Exam created.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── UPDATE EXAM ───────────────────────────────────────────────────────────
router.put('/exams/:id', authenticate, adminOnly, async (req, res) => {
    const { title, description, duration_minutes, total_marks, pass_marks, negative_marking, is_active } = req.body;
    try {
        await db.query(
            `UPDATE exams SET title=?, description=?, duration_minutes=?, total_marks=?,
             pass_marks=?, negative_marking=?, is_active=? WHERE id=?`,
            [title, description, duration_minutes, total_marks, pass_marks, negative_marking, is_active, req.params.id]
        );
        res.json({ message: 'Exam updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── DELETE EXAM ───────────────────────────────────────────────────────────
router.delete('/exams/:id', authenticate, adminOnly, async (req, res) => {
    try {
        await db.query('UPDATE exams SET is_active=0 WHERE id=?', [req.params.id]);
        res.json({ message: 'Exam deactivated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET QUESTIONS FOR EXAM ────────────────────────────────────────────────
router.get('/exams/:id/questions', authenticate, adminOnly, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM questions WHERE exam_id = ? ORDER BY id',
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── ADD QUESTION ──────────────────────────────────────────────────────────
router.post('/exams/:id/questions', authenticate, adminOnly, async (req, res) => {
    const { question_text, option_a, option_b, option_c, option_d, correct_option, explanation, marks, difficulty } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, marks, difficulty)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, marks || 1, difficulty || 'medium']
        );
        res.status(201).json({ id: result.insertId, message: 'Question added.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── UPDATE QUESTION ───────────────────────────────────────────────────────
router.put('/questions/:id', authenticate, adminOnly, async (req, res) => {
    const { question_text, option_a, option_b, option_c, option_d, correct_option, explanation, marks, difficulty } = req.body;
    try {
        await db.query(
            `UPDATE questions SET question_text=?, option_a=?, option_b=?, option_c=?, option_d=?,
             correct_option=?, explanation=?, marks=?, difficulty=? WHERE id=?`,
            [question_text, option_a, option_b, option_c, option_d, correct_option, explanation, marks, difficulty, req.params.id]
        );
        res.json({ message: 'Question updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── DELETE QUESTION ───────────────────────────────────────────────────────
router.delete('/questions/:id', authenticate, adminOnly, async (req, res) => {
    try {
        await db.query('DELETE FROM questions WHERE id=?', [req.params.id]);
        res.json({ message: 'Question deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── CREATE CATEGORY ───────────────────────────────────────────────────────
router.post('/categories', authenticate, adminOnly, async (req, res) => {
    const { name, description, icon, color } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO categories (name, description, icon, color) VALUES (?, ?, ?, ?)',
            [name, description, icon || 'bi-book-fill', color || '#6366f1']
        );
        res.status(201).json({ id: result.insertId, message: 'Category created.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET TOP PERFORMERS ──────────────────────────────────────────────────────
router.get('/top-performers', authenticate, adminOnly, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                u.name, 
                u.email, 
                COUNT(a.id) as exams_taken, 
                COALESCE(AVG(a.percentage), 0) as average_score
            FROM users u
            JOIN attempts a ON u.id = a.user_id
            WHERE a.status = 'submitted'
            GROUP BY u.id
            HAVING exams_taken >= 1 AND average_score >= 50
            ORDER BY average_score DESC
            LIMIT 5
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
