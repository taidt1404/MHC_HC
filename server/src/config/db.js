const { Pool } = require('pg');
require('dotenv').config();

function createDbPool() {
  const config = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || '192.168.110.42',
        port: Number(process.env.DB_PORT || 4078),
        database: process.env.DB_NAME || 'phuongdong',
        user: process.env.DB_USER || 'hanhnt',
        password: process.env.DB_PASSWORD || '',
      };

  const pool = new Pool({
    ...config,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    // Ensure session is read-only for safety
    options: '-c default_transaction_read_only=on',
  });

  pool.on('error', (err) => {
    console.error('[MHC DB Pool Error]', err.message);
  });

  return pool;
}

module.exports = { createDbPool };
