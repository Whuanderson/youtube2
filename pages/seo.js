import { useState, useEffect } from 'react';

export default function SEO() {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tags, setTags] = useState('');
  const [categoria, setCategoria] = useState('22'); // People & Blogs
  const [sugestoes, setSugestoes] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGerarSEO = async () => {
    setLoading(true);
    try {
      // TODO: Integrar com IA para gerar SEO otimizado
      const res = await fetch('/api/gerar-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSugestoes(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      await fetch('/api/salvar-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descricao, tags, categoria }),
      });
      alert('✅ SEO salvo!');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🔍 YouTube SEO</h1>
        <p>Otimize título, descrição e tags para rankeamento</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Título do Vídeo</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Como Criar Vídeos no YouTube com IA em 2025"
            maxLength="100"
          />
          <p className="tiny">{titulo.length}/100 caracteres</p>
        </div>

        <button onClick={handleGerarSEO} disabled={loading || !titulo}>
          {loading ? 'Gerando...' : '✨ Gerar SEO com IA'}
        </button>

        {sugestoes && (
          <>
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                value={descricao || sugestoes.descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={8}
                placeholder="Descrição otimizada..."
                maxLength="5000"
              />
              <p className="tiny">{(descricao || sugestoes.descricao || '').length}/5000 caracteres</p>
            </div>

            <div className="form-group">
              <label>Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={tags || sugestoes.tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="youtube, video, ai, tutorial"
              />
            </div>

            <div className="form-group">
              <label>Categoria</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="1">Film & Animation</option>
                <option value="2">Autos & Vehicles</option>
                <option value="10">Music</option>
                <option value="15">Pets & Animals</option>
                <option value="17">Sports</option>
                <option value="19">Travel & Events</option>
                <option value="20">Gaming</option>
                <option value="22">People & Blogs</option>
                <option value="23">Comedy</option>
                <option value="24">Entertainment</option>
                <option value="25">News & Politics</option>
                <option value="26">Howto & Style</option>
                <option value="27">Education</option>
                <option value="28">Science & Technology</option>
              </select>
            </div>

            <button onClick={handleSalvar}>💾 Salvar SEO</button>
          </>
        )}
      </div>
    </div>
  );
}
