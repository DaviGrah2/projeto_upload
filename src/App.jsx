import React, { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://localhost:3001";

function App() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [foto, setFoto] = useState(null);
  const [curriculo, setCurriculo] = useState(null);

  // DESAFIO 2: estado para guardar a URL temporária do preview da imagem
  const [previewFoto, setPreviewFoto] = useState(null);

  const [perfis, setPerfis] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    buscarPerfis();
  }, []);

  async function buscarPerfis() {
    try {
      const resposta = await fetch(`${API_URL}/perfis`);
      const dados = await resposta.json();
      setPerfis(dados);
    } catch (err) {
      console.error("Erro ao buscar perfis:", err);
    }
  }

  // DESAFIO 2: gera a miniatura assim que o usuário seleciona o arquivo
  function handleFotoChange(e) {
    const arquivo = e.target.files[0];
    setFoto(arquivo);

    if (arquivo) {
      const urlTemporaria = URL.createObjectURL(arquivo);
      setPreviewFoto(urlTemporaria);
    } else {
      setPreviewFoto(null);
    }
  }

  function handleCurriculoChange(e) {
    setCurriculo(e.target.files[0]);
  }

  function limparFormulario() {
    setNome("");
    setEmail("");
    setFoto(null);
    setCurriculo(null);

    // Limpa a URL de preview da memória do navegador e o estado
    if (previewFoto) {
      URL.revokeObjectURL(previewFoto);
    }
    setPreviewFoto(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const formData = new FormData();
    formData.append("nome", nome);
    formData.append("email", email);
    if (foto) formData.append("foto", foto);
    if (curriculo) formData.append("curriculo", curriculo);

    try {
      const resposta = await fetch(`${API_URL}/perfis`, {
        method: "POST",
        body: formData,
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        // Mensagens de erro vindas da validação do backend (Desafio 1)
        setErro(dados.erro || "Erro ao enviar o formulário.");
        return;
      }

      limparFormulario();
      buscarPerfis();
    } catch (err) {
      console.error(err);
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
  }

  // DESAFIO 3: exclusão lógica e física via DELETE
  async function handleExcluir(id) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este perfil e seus arquivos?"
    );
    if (!confirmar) return;

    try {
      const resposta = await fetch(`${API_URL}/perfis/${id}`, {
        method: "DELETE",
      });

      if (!resposta.ok) {
        const dados = await resposta.json();
        setErro(dados.erro || "Erro ao excluir o perfil.");
        return;
      }

      setPerfis((perfisAtuais) => perfisAtuais.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      setErro("Não foi possível conectar ao servidor.");
    }
  }

  return (
    <div className="container">
      <h1>Cadastro de Perfil</h1>

      <form onSubmit={handleSubmit} className="formulario">
        <label>
          Nome
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Foto de perfil (JPEG ou PNG, máx. 2MB)
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFotoChange}
          />
        </label>

        {/* DESAFIO 2: miniatura exibida imediatamente após a seleção */}
        {previewFoto && (
          <div className="preview-wrapper">
            <img src={previewFoto} alt="Pré-visualização" className="preview-img" />
          </div>
        )}

        <label>
          Currículo (PDF, máx. 2MB)
          <input type="file" accept="application/pdf" onChange={handleCurriculoChange} />
        </label>

        {erro && <p className="mensagem-erro">{erro}</p>}

        <button type="submit" disabled={carregando}>
          {carregando ? "Enviando..." : "Salvar Perfil"}
        </button>
      </form>

      <hr />

      <h2>Perfis Cadastrados</h2>
      <ul className="lista-perfis">
        {perfis.map((perfil) => (
          <li key={perfil.id} className="item-perfil">
            {perfil.foto_path && (
              <img
                src={`${API_URL}/uploads/${perfil.foto_path}`}
                alt={perfil.nome}
                className="thumb"
              />
            )}
            <div className="info-perfil">
              <strong>{perfil.nome}</strong>
              <span>{perfil.email}</span>
              {perfil.curriculo_path && (
                <a
                  href={`${API_URL}/uploads/${perfil.curriculo_path}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver currículo
                </a>
              )}
            </div>
            <button
              className="botao-excluir"
              onClick={() => handleExcluir(perfil.id)}
            >
              Excluir Perfil
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
