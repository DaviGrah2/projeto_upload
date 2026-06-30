const { Pool } = require("pg");

// Ajuste as credenciais conforme o seu ambiente local
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "upload_db",
  password: process.env.DB_PASSWORD || "senai",
  port: process.env.DB_PORT || 5433,
});

// Cria a tabela automaticamente caso ainda não exista
async function initDb() {
  const query = `
    CREATE TABLE IF NOT EXISTS perfis (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      foto_path VARCHAR(500),
      curriculo_path VARCHAR(500),
      criado_em TIMESTAMP DEFAULT NOW()
    );
  `;
  await pool.query(query);
  console.log("Tabela 'perfis' verificada/criada com sucesso.");
}

module.exports = { pool, initDb };
