import { Router } from 'express';
import { products } from '../data/products.js';

const router = Router();

// GET /api/products и /api/products?search=мол
router.get('/', (req, res) => {
  const search = (req.query.search || '').toLowerCase();

  const result = products.filter((p) =>
    p.name.toLowerCase().includes(search)
  );

  res.json(result);
});

// GET /api/products/2
router.get('/:id', (req, res) => {
  const product = products.find((p) => String(p.id) === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  res.json(product);
});

export default router;