// DSA Sync - Database Verification Script
import { query, initDb } from './db.js';

async function testDb() {
  console.log('--- Starting Database Diagnostics ---');
  try {
    // 1. Initialize schema
    await initDb();
    
    // 2. Perform test insert
    console.log('Testing User creation...');
    await query(
      'INSERT INTO users (github_username, github_token, repo_name) VALUES ($1, $2, $3)',
      ['test_user', 'token_123', 'My-Test-Repo']
    );

    // 3. Perform test query
    const userRes = await query('SELECT * FROM users WHERE github_username = $1', ['test_user']);
    if (userRes.rows.length > 0) {
      console.log('✅ User table verification successful. User found:', userRes.rows[0].github_username);
    } else {
      throw new Error('User was inserted but could not be fetched.');
    }

    // 4. Perform test clean up
    console.log('Cleaning up test data...');
    await query('DELETE FROM users WHERE github_username = $1', ['test_user']);
    console.log('✅ Database clean up successful.');
    
    console.log('--- Database Diagnostics: SUCCESS ---');
  } catch (error) {
    console.error('❌ Database Diagnostics: FAILED');
    console.error(error);
    process.exit(1);
  }
}

testDb();
