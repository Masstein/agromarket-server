import pg from 'pg';

// Тип DATE отдаём строкой 'YYYY-MM-DD', иначе из-за часового пояса дата «уедет» на день
pg.types.setTypeParser(1082, (value) => value);

// Пул: несколько готовых соединений с базой, которые переиспользуются
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});