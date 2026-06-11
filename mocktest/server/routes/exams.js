const express  = require('express');
const db       = require('../db');
const { authenticate } = require('./auth');
const router   = express.Router();

// ─── GET ALL CATEGORIES ────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.*, COUNT(e.id) AS exam_count
             FROM categories c
             LEFT JOIN exams e ON e.category_id = c.id AND e.is_active = 1
             GROUP BY c.id`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET ALL EXAMS (with optional category filter) ─────────────────────────
router.get('/', async (req, res) => {
    const { category_id } = req.query;
    try {
        let sql = `SELECT e.*, c.name AS category_name, c.icon, c.color,
                          COUNT(q.id) AS question_count,
                          u.name AS created_by_name
                   FROM exams e
                   JOIN categories c ON c.id = e.category_id
                   LEFT JOIN questions q ON q.exam_id = e.id
                   LEFT JOIN users u ON u.id = e.created_by
                   WHERE e.is_active = 1`;
        const params = [];
        if (category_id) { sql += ' AND e.category_id = ?'; params.push(category_id); }
        sql += ' GROUP BY e.id ORDER BY e.created_at DESC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET CATEGORY MASTERY ────────────────────────────────────────────────────
router.get('/mastery', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                c.name as category_name, 
                COUNT(DISTINCT a.id) as exams_taken, 
                COALESCE(AVG(a.percentage), 0) as avg_mastery 
            FROM categories c 
            LEFT JOIN exams e ON e.category_id = c.id 
            LEFT JOIN attempts a ON a.exam_id = e.id AND a.user_id = ? AND a.status = 'submitted' 
            GROUP BY c.id
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── GET SINGLE EXAM (meta only, no questions) ─────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
    try {
        const [exam] = await db.query(
            `SELECT e.*, c.name AS category_name, c.icon,
                    COUNT(q.id) AS question_count
             FROM exams e
             JOIN categories c ON c.id = e.category_id
             LEFT JOIN questions q ON q.exam_id = e.id
             WHERE e.id = ?
             GROUP BY e.id`, [req.params.id]
        );
        if (!exam.length) return res.status(404).json({ error: 'Exam not found.' });

        // Check attempt count for this user
        const [attempts] = await db.query(
            `SELECT COUNT(*) AS cnt FROM attempts WHERE user_id = ? AND exam_id = ? AND status != 'in_progress'`,
            [req.user.id, req.params.id]
        );
        res.json({ ...exam[0], user_attempts: attempts[0].cnt });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET NOTIFICATIONS (Database Trigger-driven) ──────────────────────────────
router.get('/notifications', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── GET OVERALL STATS (Student Performance) ─────────────────────────────────
router.get('/stats', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT 
                IFNULL(AVG(percentage), 0) as avgScore,
                IFNULL(MAX(percentage), 0) as bestScore,
                COUNT(id) as totalAttempts
             FROM attempts 
             WHERE user_id = ? AND status = 'submitted'`,
            [req.user.id]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching stats' });
    }
});

// ─── GET STUDENT REPORT (Stored Procedure) ───────────────────────────────────
router.get('/report/me', authenticate, async (req, res) => {
    try {
        // [SP CALL] - Uses the stored procedure we created in the schema
        const [result] = await db.query('CALL sp_GetStudentReport(?)', [req.user.id]);
        // MySQL returns results in an array of arrays when calling procedures
        res.json(result[0][0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error querying procedure' });
    }
});

// ─── START ATTEMPT ─────────────────────────────────────────────────────────
router.post('/:id/start', authenticate, async (req, res) => {
    const examId = req.params.id;
    const userId = req.user.id;
    try {
        // Check max attempts
        const [exam] = await db.query('SELECT * FROM exams WHERE id = ? AND is_active = 1', [examId]);
        if (!exam.length) return res.status(404).json({ error: 'Exam not found.' });

        const [cnt] = await db.query(
            `SELECT COUNT(*) AS cnt FROM attempts WHERE user_id = ? AND exam_id = ? AND status != 'in_progress'`,
            [userId, examId]
        );
        if (cnt[0].cnt >= exam[0].max_attempts)
            return res.status(403).json({ error: `Maximum ${exam[0].max_attempts} attempts reached.` });

        // Cancel any in-progress attempt
        await db.query(
            `UPDATE attempts SET status='timed_out' WHERE user_id=? AND exam_id=? AND status='in_progress'`,
            [userId, examId]
        );

        // Create new attempt
        const [result] = await db.query(
            'INSERT INTO attempts (user_id, exam_id, total_marks) VALUES (?, ?, ?)',
            [userId, examId, exam[0].total_marks]
        );

        // Fetch shuffled questions (without correct_option)
        const [questions] = await db.query(
            `SELECT id, question_text, option_a, option_b, option_c, option_d, marks, difficulty
             FROM questions WHERE exam_id = ? ORDER BY RAND()`, [examId]
        );

        res.json({
            attempt_id: result.insertId,
            exam: exam[0],
            questions,
            started_at: new Date()
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── SUBMIT ATTEMPT ────────────────────────────────────────────────────────
router.post('/attempt/:attemptId/submit', authenticate, async (req, res) => {
    const { answers, time_taken_sec } = req.body; // answers: { question_id: selected_option }
    const attemptId = req.params.attemptId;

    try {
        const [attempt] = await db.query(
            'SELECT * FROM attempts WHERE id = ? AND user_id = ? AND status = "in_progress"',
            [attemptId, req.user.id]
        );
        if (!attempt.length) return res.status(404).json({ error: 'Attempt not found or already submitted.' });

        const [exam] = await db.query(
            `SELECT e.*, c.name AS category_name FROM exams e
             JOIN categories c ON c.id = e.category_id
             WHERE e.id = ?`, [attempt[0].exam_id]
        );
        const [questions] = await db.query('SELECT * FROM questions WHERE exam_id = ?', [attempt[0].exam_id]);

        let score = 0, correct = 0, wrong = 0, skipped = 0;
        const neg = parseFloat(exam[0].negative_marking) || 0;

        const answerRows = questions.map(q => {
            const selected = answers[q.id] || null;
            let isCorrect = false;
            let marksAwarded = 0;

            if (!selected) {
                skipped++;
            } else if (selected === q.correct_option) {
                isCorrect = true;
                marksAwarded = q.marks;
                score += q.marks;
                correct++;
            } else {
                marksAwarded = -(q.marks * neg);
                score += marksAwarded;
                wrong++;
            }
            return [attemptId, q.id, selected, isCorrect, marksAwarded];
        });

        // Insert all answers
        await db.query(
            `INSERT INTO attempt_answers (attempt_id, question_id, selected_option, is_correct, marks_awarded) VALUES ?`,
            [answerRows]
        );

        const finalScore = Math.max(0, score);
        const percentage = ((finalScore / attempt[0].total_marks) * 100).toFixed(2);

        await db.query(
            `UPDATE attempts SET status='submitted', submitted_at=NOW(),
             score=?, correct_count=?, wrong_count=?, skipped_count=?,
             percentage=?, time_taken_sec=? WHERE id=?`,
            [finalScore, correct, wrong, skipped, percentage, time_taken_sec || 0, attemptId]
        );

        // Fetch detailed result with correct answers
        const [detailedAnswers] = await db.query(
            `SELECT aa.question_id, aa.selected_option, aa.is_correct, aa.marks_awarded,
                    q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                    q.correct_option, q.explanation, q.marks, q.difficulty
             FROM attempt_answers aa
             JOIN questions q ON q.id = aa.question_id
             WHERE aa.attempt_id = ?`, [attemptId]
        );

        res.json({
            id: parseInt(attemptId),
            exam_id: attempt[0].exam_id,
            exam_title: exam[0].title,
            category_name: exam[0].category_name,
            score: finalScore,
            total_marks: attempt[0].total_marks,
            percentage,
            correct_count: correct,
            wrong_count: wrong,
            skipped_count: skipped,
            pass_marks: exam[0].pass_marks,
            passed: finalScore >= exam[0].pass_marks,
            time_taken_sec: time_taken_sec || 0,
            answers: detailedAnswers
        });
    } catch (err) {
        console.error(err);
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET RESULT ────────────────────────────────────────────────────────────
router.get('/attempt/:attemptId/result', authenticate, async (req, res) => {
    try {
        const [attempt] = await db.query(
            `SELECT a.*, e.title AS exam_title, e.pass_marks, e.negative_marking,
                    c.name AS category_name
             FROM attempts a
             JOIN exams e ON e.id = a.exam_id
             JOIN categories c ON c.id = e.category_id
             WHERE a.id = ? AND a.user_id = ?`,
            [req.params.attemptId, req.user.id]
        );
        if (!attempt.length) return res.status(404).json({ error: 'Result not found.' });

        const [answers] = await db.query(
            `SELECT aa.question_id, aa.selected_option, aa.is_correct, aa.marks_awarded,
                    q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                    q.correct_option, q.explanation, q.marks, q.difficulty
             FROM attempt_answers aa
             JOIN questions q ON q.id = aa.question_id
             WHERE aa.attempt_id = ?`, [req.params.attemptId]
        );

        res.json({ ...attempt[0], answers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── USER HISTORY ──────────────────────────────────────────────────────────
router.get('/history/me', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT a.*, e.title AS exam_title, c.name AS category_name, c.icon, c.color
             FROM attempts a
             JOIN exams e ON e.id = a.exam_id
             JOIN categories c ON c.id = e.category_id
             WHERE a.user_id = ? AND a.status != 'in_progress'
             ORDER BY a.submitted_at DESC`, [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── LEADERBOARD ───────────────────────────────────────────────────────────
router.get('/:id/leaderboard', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.name, u.email,
                    MAX(a.score) AS best_score,
                    MAX(a.percentage) AS best_percentage,
                    COUNT(a.id) AS attempts,
                    MIN(a.time_taken_sec) AS fastest_sec
             FROM attempts a
             JOIN users u ON u.id = a.user_id
             WHERE a.exam_id = ? AND a.status = 'submitted'
             GROUP BY a.user_id
             ORDER BY best_score DESC, fastest_sec ASC
             LIMIT 10`, [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ─── GET GLOBAL RANKING (Window Function) ────────────────────────────────────
router.get('/attempt/:attemptId/global-rank', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM (
                SELECT 
                    a.id, 
                    a.user_id, 
                    a.exam_id, 
                    a.percentage,
                    RANK() OVER (PARTITION BY a.exam_id ORDER BY a.percentage DESC, a.submitted_at ASC) as pos,
                    COUNT(*) OVER (PARTITION BY a.exam_id) as total
                FROM attempts a
                WHERE a.status = 'submitted'
            ) ranked
            WHERE id = ?
        `, [req.params.attemptId]);
        
        if (!rows.length) return res.json({ pos: '-', total: '-' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
