/**
 * scripts/setup-db.js
 * Creates and populates the mocktest_db database from schema.sql.
 * Run: node scripts/setup-db.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'mocktest_db';

async function setup() {
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const raw = fs.readFileSync(schemaPath, 'utf8');

    // ── Step 1: Connect without selecting a database, create DB if needed ──
    const root = await mysql.createConnection({
        host: DB_HOST, port: DB_PORT,
        user: DB_USER, password: DB_PASS,
    });
    console.log('✅ Connected to MySQL server.');

    try {
        await root.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
        await root.query(`CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Database '${DB_NAME}' created fresh.`);
    } catch (e) {
        console.error('❌ Could not create database:', e.message);
        process.exit(1);
    }
    await root.end();

    // ── Step 2: Connect to the new database ──
    const conn = await mysql.createConnection({
        host: DB_HOST, port: DB_PORT,
        user: DB_USER, password: DB_PASS,
        database: DB_NAME,
    });
    console.log(`✅ Connected to '${DB_NAME}'.`);

    // ── Step 3: Parse and execute statements ──
    const statements = parseSQL(raw);
    console.log(`📋 ${statements.length} statements to execute...\n`);

    let ok = 0, skipped = 0, failed = 0;
    for (const stmt of statements) {
        const preview = stmt.replace(/\s+/g, ' ').trim().substring(0, 80);
        try {
            await conn.query(stmt);
            ok++;
        } catch (err) {
            // Skip "table already exists" and "database exists" type harmless errors
            if ([1007, 1050, 1062].includes(err.errno)) {
                console.warn(`  ⚠️  Skipped (already exists): ${preview}`);
                skipped++;
            } else {
                console.error(`  ❌ FAILED: ${err.message}`);
                console.error(`     SQL  : ${preview}`);
                failed++;
            }
        }
    }

    await conn.end();

    console.log('\n─────────────────────────────────────────');
    console.log(`✅ Done  : ${ok}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`❌ Failed : ${failed}`);
    console.log('─────────────────────────────────────────');

    if (failed > 0) {
        console.log('\n⚠️  Some statements failed. Review errors above.');
        process.exit(1);
    } else {
        console.log(`\n🚀 '${DB_NAME}' is ready! Run: npm start`);
        process.exit(0);
    }
}

/**
 * Splits SQL source into executable statements.
 * - Strips comment-only lines
 * - Handles DELIMITER // blocks (stored procs / triggers)
 * - Skips USE and DROP/CREATE DATABASE lines (handled above)
 */
function parseSQL(sql) {
    const stmts = [];
    const lines  = sql.split(/\r?\n/);

    let inCompound = false;
    let buf = '';

    for (const line of lines) {
        const t = line.trim();

        // Skip blank lines and full-line comments
        if (!t || t.startsWith('--')) continue;

        // Skip database-level commands (handled in Step 1)
        if (/^(DROP|CREATE)\s+DATABASE/i.test(t)) continue;
        if (/^USE\s+/i.test(t)) continue;

        // DELIMITER // → enter compound mode
        if (/^DELIMITER\s+\/\//i.test(t)) {
            inCompound = true;
            buf = '';
            continue;
        }

        // DELIMITER ; → exit compound mode
        if (/^DELIMITER\s+;/i.test(t)) {
            inCompound = false;
            buf = '';
            continue;
        }

        if (inCompound) {
            // The // line marks end of a compound statement
            if (t === '//') {
                const s = buf.trim();
                if (s) stmts.push(s);
                buf = '';
            } else {
                buf += line + '\n';
            }
        } else {
            // Normal mode: collect chars until we hit a ; that closes a statement
            buf += line + '\n';
            // Extract all complete statements ended by ;
            let semi;
            while ((semi = buf.indexOf(';')) !== -1) {
                const s = buf.slice(0, semi).trim();
                if (s) stmts.push(s);
                buf = buf.slice(semi + 1);
            }
        }
    }

    // Flush leftover
    const tail = buf.trim();
    if (tail) stmts.push(tail);

    return stmts;
}

setup().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
