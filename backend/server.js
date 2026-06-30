const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool, initDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

// ---------------------------------------------------------------------------
// DESAFIO 1: Validação de segurança
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 1024 * 1024 * 2; // 2MB em bytes

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const sufixoUnico = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extensao = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${sufixoUnico}${extensao}`);
  },
});

// não apenas a extensão do nome do arquivo (que pode ser falsificada)
function fileFilter(req, file, cb) {
  if (file.fieldname === "foto") {
    const tiposPermitidos = ["image/jpeg", "image/png"];
    if (!tiposPermitidos.includes(file.mimetype)) {
      return cb(
        new Error("O campo 'foto' aceita apenas arquivos JPEG ou PNG.")
      );
    }
  }

  if (file.fieldname === "curriculo") {
    if (file.mimetype !== "application/pdf") {
      return cb(
        new Error("O campo 'curriculo' aceita apenas arquivos PDF.")
      );
    }
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Middleware para capturar erros do Multer (tamanho excedido, tipo inválido etc.)
function handleUploadErrors(req, res, next) {
  const uploadFields = upload.fields([
    { name: "foto", maxCount: 1 },
    { name: "curriculo", maxCount: 1 },
  ]);

  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ erro: "Arquivo excede o limite de 2MB permitido." });
      }
      return res.status(400).json({ erro: `Erro no upload: ${err.message}` });
    } else if (err) {
      // Erros lançados manualmente dentro do fileFilter
      return res.status(415).json({ erro: err.message });
    }
    next();
  });
}

// ---------------------------------------------------------------------------
// ROTAS
// ---------------------------------------------------------------------------

// Criar perfil (upload de foto + currículo)
app.post("/perfis", handleUploadErrors, async (req, res) => {
  try {
    const { nome, email } = req.body;

    if (!nome || !email) {
      return res.status(400).json({ erro: "Nome e email são obrigatórios." });
    }

    const fotoPath = req.files?.foto ? req.files.foto[0].filename : null;
    const curriculoPath = req.files?.curriculo
      ? req.files.curriculo[0].filename
      : null;

    const resultado = await pool.query(
      `INSERT INTO perfis (nome, email, foto_path, curriculo_path)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nome, email, fotoPath, curriculoPath]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro interno ao salvar o perfil." });
  }
});

// Listar todos os perfis
app.get("/perfis", async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT * FROM perfis ORDER BY id DESC"
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao buscar perfis." });
  }
});

// -----------------------------------------------------------------------
// DESAFIO 3: Exclusão lógica e física de perfis e arquivos
// -----------------------------------------------------------------------
app.delete("/perfis/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1) Descobrir os caminhos dos arquivos gravados para aquele ID
    const resultadoBusca = await pool.query(
      "SELECT * FROM perfis WHERE id = $1",
      [id]
    );

    if (resultadoBusca.rows.length === 0) {
      return res.status(404).json({ erro: "Perfil não encontrado." });
    }

    const perfil = resultadoBusca.rows[0];

    // 2) Deletar os arquivos físicos da foto e do currículo
    const arquivosParaRemover = [perfil.foto_path, perfil.curriculo_path];

    arquivosParaRemover.forEach((nomeArquivo) => {
      if (!nomeArquivo) return;

      const caminhoCompleto = path.join(UPLOADS_DIR, nomeArquivo);

      if (fs.existsSync(caminhoCompleto)) {
        fs.unlink(caminhoCompleto, (err) => {
          if (err) {
            console.error(`Falha ao excluir arquivo ${caminhoCompleto}:`, err);
          } else {
            console.log(`Arquivo removido: ${caminhoCompleto}`);
          }
        });
      }
    });

    // 3) Remover a linha correspondente no PostgreSQL
    await pool.query("DELETE FROM perfis WHERE id = $1", [id]);

    res.status(200).json({ mensagem: "Perfil e arquivos excluídos com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro interno ao excluir o perfil." });
  }
});

// ---------------------------------------------------------------------------
// INICIALIZAÇÃO
// ---------------------------------------------------------------------------
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao inicializar o banco de dados:", err);
  });
