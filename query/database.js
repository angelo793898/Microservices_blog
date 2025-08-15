const { Pool } = require('pg');

// Load environment variables from .env file in parent directory (local dev)
// In Kubernetes, environment variables are provided by deployment
try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch (error) {
  // Ignore if .env file doesn't exist (when running in Kubernetes)
}

/**
 * PostgreSQL database connection pool configuration
 * Connects to external PostgreSQL installation
 */
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: String(process.env.DB_PASSWORD),
  port: parseInt(process.env.DB_PORT) || 5432,
});

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

/**
 * Execute a database query with error handling
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = (text, params) => {
  return pool.query(text, params);
};

/**
 * Initialize database connection
 * Verifies connection to existing PostgreSQL tables (query service reads from both)
 */
const initializeDatabase = async () => {
  try {
    // Test connection
    await query('SELECT 1');
    console.log('Database connection verified');
    
    // Verify both tables exist
    const postsResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'posts'
      )
    `);
    
    const commentsResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'comments'
      )
    `);
    
    if (postsResult.rows[0].exists && commentsResult.rows[0].exists) {
      console.log('Posts and Comments tables found - query service ready');
    } else {
      const missing = [];
      if (!postsResult.rows[0].exists) missing.push('posts');
      if (!commentsResult.rows[0].exists) missing.push('comments');
      throw new Error(`Missing tables: ${missing.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  query,
  initializeDatabase,
  pool
};