const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const router  = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// ─── REGISTER ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'All fields are required.' });

    try {
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length)
            return res.status(409).json({ error: 'Email already registered.' });

        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, hash]
        );
        const token = jwt.sign(
            { id: result.insertId, name, email, role: 'student' },
            JWT_SECRET, { expiresIn: '7d' }
        );
        res.cookie('mt_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.status(201).json({ user: { id: result.insertId, name, email, role: 'student' } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── LOGIN ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required.' });

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!rows.length)
            return res.status(401).json({ error: 'Invalid credentials.' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match)
            return res.status(401).json({ error: 'Invalid credentials.' });

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET, { expiresIn: '7d' }
        );
        res.cookie('mt_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    res.clearCookie('mt_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ success: true });
});

// ─── GET PROFILE ───────────────────────────────────────────────────────────
router.get('/profile', authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────
function authenticate(req, res, next) {
    const token = req.cookies.mt_token;
    if (!token)
        return res.status(401).json({ error: 'Unauthorized.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token.' });
    }
}

module.exports = router;
module.exports.authenticate = authenticate;
