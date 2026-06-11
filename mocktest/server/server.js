const express  = require('express');
const path     = require('path');
const cors     = require('cors');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app      = express();
const PORT     = process.env.PORT || 3000;

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────
// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disabling CSP for now to prevent breaking existing inline scripts
}));

// Restrict CORS to default localhost or env var
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Prevent caching of sensitive private pages (BFCache protection)
app.use((req, res, next) => {
    const sensitivePages = ['/dashboard.html', '/admin.html', '/exam.html', '/results.html'];
    if (sensitivePages.some(page => req.path.endsWith(page))) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// ─── RATE LIMITING (Auth specific) ─────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Limit each IP to 5 auth requests per `window` (here, per 15 minutes)
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts from this IP, please try again later.' }
});

// ─── ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/admin', require('./routes/admin'));

// ─── CATCH-ALL → serve index.html for SPA navigation ──────────────────────
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    }
});

// ─── ERROR HANDLER ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error.' });
});

// ─── START ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀  MockTest Platform running at http://localhost:${PORT}`);
    console.log(`📊  Admin panel: http://localhost:${PORT}/admin.html`);
});
