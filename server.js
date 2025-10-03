const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// --- PostgreSQL Pool para RDS ---
const pool = new Pool({
  host:
    process.env.DB_HOST ||
    "inventorydb.cz6imua8gy2g.us-east-1.rds.amazonaws.com",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "inventory",
  database: process.env.DB_NAME || "inventoryb",
  ssl: {
    rejectUnauthorized: false, // Requerido para RDS
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20, // Máximo de conexiones en el pool
  min: 2, // Mínimo de conexiones en el pool
  acquireTimeoutMillis: 10000,
  createTimeoutMillis: 10000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
});

// Logging de conexión mejorado
pool.on("connect", (client) => {
  console.log("✅ Nueva conexión establecida con RDS - PID:", client.processID);
});

pool.on("acquire", (client) => {
  console.log("🔗 Cliente adquirido del pool - PID:", client.processID);
});

pool.on("remove", (client) => {
  console.log("🗑️ Cliente removido del pool - PID:", client.processID);
});

pool.on("error", (err, client) => {
  console.error("❌ Error inesperado en el pool de PostgreSQL:", err.message);
  console.error("Detalles del error:", err);
  // No terminar el proceso, el pool manejará la reconexión
});

// Función para verificar la salud de la conexión
async function checkDatabaseHealth() {
  try {
    const result = await pool.query(
      "SELECT NOW() as current_time, version() as pg_version"
    );
    console.log("💚 Base de datos saludable:", {
      time: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(" ")[0],
    });
    return true;
  } catch (error) {
    console.error("💔 Error de salud de base de datos:", error.message);
    return false;
  }
}

// Verificación periódica de salud cada 30 segundos
setInterval(checkDatabaseHealth, 30000);

// --- Bootstrap DB: crear tabla y seed si no existen ---
async function bootstrap() {
  try {
    console.log("🔄 Conectando a RDS...");

    // Test de conexión
    const testResult = await pool.query("SELECT NOW()");
    console.log("✅ Conexión exitosa a RDS inventorydb");
    console.log("📅 Timestamp servidor:", testResult.rows[0].now);

    // Crear tabla si no existe
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
    console.log("✅ Tabla products verificada/creada");

    // Verificar si hay datos
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM products`
    );

    if (countRows[0].c === 0) {
      console.log("📦 Insertando productos de ejemplo...");
      const sampleProducts = [
        ["Laptop Pro", "Electronics", 15, 1299.99, "High-performance laptop"],
        [
          "Wireless Mouse",
          "Electronics",
          45,
          29.99,
          "Ergonomic wireless mouse",
        ],
        ["Office Chair", "Furniture", 8, 199.99, "Comfortable office chair"],
        ["Coffee Beans", "Food", 120, 12.99, "Premium coffee beans"],
        ["Notebook Set", "Office Supplies", 200, 8.99, "Pack of 3 notebooks"],
      ];

      for (const p of sampleProducts) {
        await pool.query(
          `INSERT INTO products (name, category, quantity, price, description)
           VALUES ($1,$2,$3,$4,$5)`,
          p
        );
      }
      console.log(`✅ ${sampleProducts.length} productos insertados`);
    } else {
      console.log(
        `ℹ️  La base de datos ya contiene ${countRows[0].c} productos`
      );
    }

    console.log("🚀 Base de datos lista!");
  } catch (error) {
    console.error("❌ Error en bootstrap:", error.message);
    console.error("Detalles:", error);
    throw error;
  }
}

// Ejecutar bootstrap
bootstrap().catch((e) => {
  console.error("💥 Error fatal en bootstrap de DB:", e);
  process.exit(1);
});

// ---------------- API ----------------

// GET /api/products
app.get("/api/products", async (req, res) => {
  try {
    console.log("📦 Obteniendo lista de productos...");
    const { rows } = await pool.query(
      `SELECT * FROM products ORDER BY created_at DESC`
    );
    console.log(`✅ ${rows.length} productos obtenidos exitosamente`);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error en GET /api/products:", err.message);
    console.error("Stack trace:", err.stack);
    res.status(500).json({
      error: "Error interno del servidor",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/products/:id
app.get("/api/products/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM products WHERE id = $1`, [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Product not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error en GET /api/products/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
app.post("/api/products", async (req, res) => {
  try {
    const { name, category, quantity, price, description } = req.body;
    console.log("➕ Creando nuevo producto:", {
      name,
      category,
      quantity,
      price,
    });

    if (!name || !category || quantity === undefined || price === undefined) {
      console.log("❌ Campos requeridos faltantes");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { rows } = await pool.query(
      `INSERT INTO products (name, category, quantity, price, description)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [name, category, quantity, price, description]
    );

    console.log(`✅ Producto creado exitosamente con ID: ${rows[0].id}`);
    res.json({ id: rows[0].id, message: "Product created successfully" });
  } catch (err) {
    console.error("❌ Error en POST /api/products:", err.message);
    console.error("Stack trace:", err.stack);
    res.status(500).json({
      error: "Error interno del servidor",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/products/:id
app.put("/api/products/:id", async (req, res) => {
  try {
    const { name, category, quantity, price, description } = req.body;
    const productId = req.params.id;
    console.log(`✏️ Actualizando producto ID: ${productId}`, {
      name,
      category,
      quantity,
      price,
    });

    const { rowCount } = await pool.query(
      `UPDATE products
         SET name=$1, category=$2, quantity=$3, price=$4, description=$5,
             updated_at=NOW()
       WHERE id=$6`,
      [name, category, quantity, price, description, productId]
    );

    if (rowCount === 0) {
      console.log(`❌ Producto con ID ${productId} no encontrado`);
      return res.status(404).json({ error: "Product not found" });
    }

    console.log(`✅ Producto ID ${productId} actualizado exitosamente`);
    res.json({ message: "Product updated successfully" });
  } catch (err) {
    console.error("❌ Error en PUT /api/products/:id:", err.message);
    console.error("Stack trace:", err.stack);
    res.status(500).json({
      error: "Error interno del servidor",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/products/:id
app.delete("/api/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    console.log(`🗑️ Eliminando producto ID: ${productId}`);

    const { rowCount } = await pool.query(`DELETE FROM products WHERE id=$1`, [
      productId,
    ]);

    if (rowCount === 0) {
      console.log(`❌ Producto con ID ${productId} no encontrado`);
      return res.status(404).json({ error: "Product not found" });
    }

    console.log(`✅ Producto ID ${productId} eliminado exitosamente`);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("❌ Error en DELETE /api/products/:id:", err.message);
    console.error("Stack trace:", err.stack);
    res.status(500).json({
      error: "Error interno del servidor",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/stats
app.get("/api/stats", async (req, res) => {
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
    console.error("Error en GET /api/stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint mejorado
app.get("/health", async (req, res) => {
  try {
    const startTime = Date.now();
    const result = await pool.query(
      "SELECT NOW() as current_time, version() as pg_version"
    );
    const responseTime = Date.now() - startTime;

    res.json({
      status: "healthy",
      database: "connected",
      responseTime: `${responseTime}ms`,
      timestamp: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(" ")[0],
      uptime: process.uptime(),
    });
  } catch (err) {
    console.error("Health check failed:", err.message);
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("⚠️  SIGTERM recibido, cerrando conexiones...");
  await pool.end();
  console.log("✅ Pool cerrado");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("⚠️  SIGINT recibido, cerrando conexiones...");
  await pool.end();
  console.log("✅ Pool cerrado");
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api/products`);
  console.log(`💚 Health check en http://localhost:${PORT}/health`);
});
