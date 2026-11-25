const PG_CLIENT_ERRORS = {
  '22P02': 'Неверный формат значения',
  '23502': 'Не заполнено обязательное поле',
  '23503': 'Связанная запись не найдена',
  '23514': 'Значение не проходит проверку в БД',
};

export function errorHandler(err, req, res, next) {
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Запись с такими данными уже существует' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Слишком большой запрос' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
  }

  if (PG_CLIENT_ERRORS[err.code]) {
    return res.status(400).json({
      error: PG_CLIENT_ERRORS[err.code],
      detail: err.message,
    });
  }

  const status = err.status || err.statusCode || 500;
  console.error(`[${req.method} ${req.originalUrl}]`, err);

  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: status >= 500 && isProd ? 'Внутренняя ошибка сервера' : err.message,
  });
}