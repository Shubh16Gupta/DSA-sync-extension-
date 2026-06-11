import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isPostgres = !!process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  console.log('Database Client: Using PostgreSQL');
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
} else {
  console.log('Database Client: DATABASE_URL not set. Falling back to SQLite.');
  const dbPath = path.join(__dirname, 'dsa_sync.db');
  sqliteDb = new sqlite3.Database(dbPath);
}

// Helper to run query with promise wrapper
export async function query(text, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(text, params);
    return res;
  } else {
    // Translate PG parameterized queries ($1, $2) to SQLite format (?)
    // Wait, regex replace needs to match positional parameters correctly.
    // If the input text has $1, $2, etc., we can replace them in order.
    // In sqlite, we can use standard ? or we can bind by index if we use ?
    const sqliteText = text.replace(/\$\d+/g, '?');
    
    return new Promise((resolve, reject) => {
      const isSelect = sqliteText.trim().toLowerCase().startsWith('select');
      
      if (isSelect) {
        sqliteDb.all(sqliteText, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows });
        });
      } else {
        sqliteDb.run(sqliteText, params, function (err) {
          if (err) return reject(err);
          // Return format similar to PG result
          resolve({
            rows: [],
            rowCount: this.changes,
            lastID: this.lastID
          });
        });
      }
    });
  }
}

// Initialize tables
export async function initDb() {
  const schemaQueries = [
    // 1. Users Table
    `CREATE TABLE IF NOT EXISTS users (
      id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
      github_username VARCHAR(255) UNIQUE NOT NULL,
      github_token VARCHAR(255) NOT NULL,
      repo_name VARCHAR(255) DEFAULT 'DSA-Sync-Solutions',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 2. Submissions Table
    `CREATE TABLE IF NOT EXISTS submissions (
      id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
      user_id INTEGER NOT NULL,
      platform VARCHAR(50) NOT NULL,
      problem_id VARCHAR(100) NOT NULL,
      problem_title VARCHAR(255) NOT NULL,
      problem_url TEXT NOT NULL,
      difficulty VARCHAR(20) NOT NULL,
      language VARCHAR(50) NOT NULL,
      code TEXT NOT NULL,
      notes TEXT,
      solved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 3. Tags Table
    `CREATE TABLE IF NOT EXISTS tags (
      id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
      submission_id INTEGER NOT NULL,
      tag_name VARCHAR(100) NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    )`,

    // 4. Daily Planner Table
    `CREATE TABLE IF NOT EXISTS daily_planner (
      id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
      user_id INTEGER NOT NULL,
      task_description VARCHAR(255) NOT NULL,
      target_date DATE NOT NULL,
      is_completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 5. Contests Table
    `CREATE TABLE IF NOT EXISTS contests (
      id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
      user_id INTEGER NOT NULL,
      platform VARCHAR(50) NOT NULL,
      contest_name VARCHAR(255) NOT NULL,
      rank INTEGER NOT NULL,
      rating_after INTEGER,
      solved_count INTEGER,
      contest_date TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  ];

  console.log('Initializing database tables...');
  for (const q of schemaQueries) {
    await query(q);
  }
  console.log('Database initialization complete!');
}
