import pg from 'pg';

// PostgreSQL DATE should stay YYYY-MM-DD; otherwise timezone conversion can shift a day.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({
  // Local development may use localhost; Neon connection strings include sslmode=require.
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Neon may close idle connections. Log the error rather than crashing the whole process.
pool.on('error', (err) => {
  console.error('PostgreSQL: соединение потеряно —', err.message);
});
