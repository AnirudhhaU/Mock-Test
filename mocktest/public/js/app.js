/* ================================================================
   MockTest Platform — Shared Frontend Logic (JS)
   Handles: API calls, Auth, Toast notifications, Modals
================================================================ */

// ─── AUTH HELPERS ──────────────────────────────────────────────
function requireAuth() {
    // Check if mt_user exists (since token is in httpOnly cookie now)
    const user = localStorage.getItem('mt_user');
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function requireAdmin() {
    if (!requireAuth()) return;
    const user = JSON.parse(localStorage.getItem('mt_user') || '{}');
    if (user.role !== 'admin') {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

// ─── API WRAPPERS ─────────────────────────────────────────────
async function authFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
    
    if (response.status === 401) {
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }
    return data;
}

// ─── LOGOUT HANDLER ───────────────────────────────────────────
async function globalLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch(e) {
        console.error('Logout request failed', e);
    }
    localStorage.clear();
    window.location.href = 'login.html';
}

// ─── TOAST NOTIFICATIONS ──────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        const div = document.createElement('div');
        div.id = 'toast-container';
        document.body.appendChild(div);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'bi-check-circle-fill' : 
                 type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-info-circle-fill';
                 
    toast.innerHTML = `<i class="bi ${icon}"></i> <span>${message}</span>`;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // Auto remove after 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ─── DATE FORMATTING ──────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ─── DURATION FORMATTING ──────────────────────────────────────
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

// Handle navigation back from BFCache (Back-Forward Cache)
window.addEventListener('pageshow', (event) => {
    // If page is restored from memory and the user object is missing, force a reload
    // which will trigger the login redirect.
    if (event.persisted && !localStorage.getItem('mt_user')) {
        window.location.reload();
    }
});

// ─── DYNAMIC UI ENHANCEMENTS ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initStatsCountUp();
});

// Scroll Reveal Observer
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
        observer.observe(el);
    });
}

// Numeric Count-Up Animation
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function initStatsCountUp() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const end = parseInt(target.getAttribute('data-count'));
                if (!isNaN(end)) {
                    animateValue(target, 0, end, 1500);
                    observer.unobserve(target); // Only animate once
                }
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
}

// Global errors
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled Promise Rejection:', event.reason);
});
