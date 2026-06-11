/**
 * scripts/seed.js
 * Seeds demo attempts for testing the leaderboard and results pages.
 * Run once after setting up the database: node scripts/seed.js
 */

const db = require('../server/db');

async function seed() {
    const userIds = [3, 4, 5, 6, 7];
    const exams = [
        { id: 1, total_marks: 20 },
        { id: 2, total_marks: 15 },
        { id: 3, total_marks: 30 },
        { id: 4, total_marks: 10 },
    ];

    try {
        console.log('Seeding demo attempts...');

        for (const userId of userIds) {
            // Pick 2 random exams per user
            const picked = [...exams].sort(() => 0.5 - Math.random()).slice(0, 2);
            for (const exam of picked) {
                const score    = parseFloat((Math.random() * exam.total_marks * 0.9).toFixed(2));
                const correct  = Math.floor(score / (exam.total_marks / 10));
                const wrong    = Math.max(0, correct - 1);
                const pct      = ((score / exam.total_marks) * 100).toFixed(2);
                const daysAgo  = Math.floor(Math.random() * 7);
                const timeSec  = Math.floor(Math.random() * 900) + 300;

                await db.query(
                    `INSERT INTO attempts
                        (user_id, exam_id, status, score, total_marks, correct_count, wrong_count,
                         percentage, submitted_at, time_taken_sec)
                     VALUES (?, ?, 'submitted', ?, ?, ?, ?, ?,
                             DATE_SUB(NOW(), INTERVAL ? DAY), ?)`,
                    [userId, exam.id, score, exam.total_marks, correct, wrong, pct, daysAgo, timeSec]
                );
            }
        }

        console.log('✅ Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
