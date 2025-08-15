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
 * Verifies connection to existing PostgreSQL tables
 */
const initializeDatabase = async () => {
  try {
    // Test connection
    await query('SELECT 1');
    console.log('Database connection verified');
    
    // Verify posts table exists
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'posts'
      )
    `);
    
    if (result.rows[0].exists) {
      console.log('Posts table found - ready to use');
    } else {
      throw new Error('Posts table not found in database');
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