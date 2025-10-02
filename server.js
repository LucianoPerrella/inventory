const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- PostgreSQL Pool ---
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false } // descomentar si tu RDS lo requiere
});

// --- Bootstrap DB: crear tabla y seed si no existen ---
async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ¿Hay datos? Si no, insertar seed
  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS c FROM products`);
  if (countRows[0].c === 0) {
    const sampleProducts = [
      ['Laptop Pro', 'Electronics', 15, 1299.99, 'High-performance laptop'],
      ['Wireless Mouse', 'Electronics', 45, 29.99, 'Ergonomic wireless mouse'],
      ['Office Chair', 'Furniture', 8, 199.99, 'Comfortable office chair'],
      ['Coffee Beans', 'Food', 120, 12.99, 'Premium coffee beans'],
      ['Notebook Set', 'Office Supplies', 200, 8.99, 'Pack of 3 notebooks'],
    ];
    for (const p of sampleProducts) {
      await pool.query(
        `INSERT INTO products (name, category, quantity, price, description)
         VALUES ($1,$2,$3,$4,$5)`,
        p
      );
    }
  }
}
bootstrap().catch((e) => {
  console.error('DB bootstrap error:', e);
  process.exit(1);
});

// ---------------- API ----------------

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM products ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM products WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, quantity, price, description } = req.body;
    if (!name || !category || quantity === undefined || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const { rows } = await pool.query(
      `INSERT INTO products (name, category, quantity, price, description)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [name, category, quantity, price, description]
    );
    res.json({ id: rows[0].id, message: 'Product created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, category, quantity, price, description } = req.body;
    const { rowCount } = await pool.query(
      `UPDATE products
         SET name=$1, category=$2, quantity=$3, price=$4, description=$5,
             updated_at=NOW()
       WHERE id=$6`,
      [name, category, quantity, price, description, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM products WHERE id=$1`,
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_products,
         COALESCE(SUM(quantity),0)::int AS total_items,
         COUNT(DISTINCT category)::int AS categories,
         COALESCE(SUM(quantity * price),0)::numeric AS total_value
       FROM products`
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => pool.end().then(() => process.exit(0)));
process.on('SIGINT',  () => pool.end().then(() => process.exit(0)));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
