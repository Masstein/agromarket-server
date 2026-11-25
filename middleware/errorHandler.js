export function errorHandler(err, req, res, next) {
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Запись с такими данными уже существует' });
  }

  const status = err.status || err.statusCode || 500;
  console.error(`[${req.method} ${req.originalUrl}]`, err);

  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: status >= 500 && isProd ? 'Внутренняя ошибка сервера' : err.message,
  });
}