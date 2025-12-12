import { useState } from 'react';

export default function Roteiro() {
  const [tema, setTema] = useState('');
  const [duracao, setDuracao] = useState('60');
  const [tom, setTom] = useState('profissional');
  const [roteiro, setRoteiro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGerar = async () => {
    setLoading(true);
    try {
      // TODO: Integrar com API de IA (GPT-4, Claude, etc)
      const res = await fetch('/api/gerar-roteiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema, duracao, tom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoteiro(data.roteiro);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      await fetch('/api/salvar-roteiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roteiro }),
      });
      alert('✅ Roteiro salvo!');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>📝 Roteiro</h1>
        <p>Crie o script do seu vídeo com IA</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Tema do Vídeo</label>
          <input
            type="text"
            placeholder="Ex: Como criar vídeos no YouTube com IA"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Duração (segundos)</label>
            <input
              type="number"
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
              min="30"
              max="600"
            />
          </div>

          <div className="form-group">
            <label>Tom</label>
            <select value={tom} onChange={(e) => setTom(e.target.value)}>
              <option value="profissional">Profissional</option>
              <option value="casual">Casual</option>
              <option value="energetico">Energético</option>
              <option value="educativo">Educativo</option>
            </select>
          </div>
        </div>

        <button onClick={handleGerar} disabled={loading || !tema}>
          {loading ? 'Gerando...' : '✨ Gerar Roteiro com IA'}
        </button>
      </div>

      {roteiro && (
        <div className="card">
          <div className="card-head">
            <p className="label">Roteiro Gerado</p>
            <button onClick={handleSalvar}>💾 Salvar</button>
          </div>
          <textarea
            value={roteiro}
            onChange={(e) => setRoteiro(e.target.value)}
            rows={15}
            placeholder="O roteiro gerado aparecerá aqui..."
          />
        </div>
      )}
    </div>
  );
}
