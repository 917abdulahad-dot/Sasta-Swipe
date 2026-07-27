import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        bank_id TEXT,
        card_type TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS saved_cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        bank_id TEXT NOT NULL,
        card_type TEXT NOT NULL,
        custom_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('[DB] PostgreSQL initialized successfully.');
  } catch (error) {
    console.error('[DB] Error initializing PostgreSQL:', error);
  }
}

// Auto-initialize (in a production environment, you might want to use a proper migration script)
initDb();

export default pool;
