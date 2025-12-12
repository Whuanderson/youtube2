import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AI_PROVIDERS, DEFAULT_PROVIDER, DEFAULT_MODEL } from '../src/ai-config';

export default function Roteiro() {
  const router = useRouter();
  const [tema, setTema] = useState('');
  const [duracao, setDuracao] = useState('1');
  const [quantidadeImagens, setQuantidadeImagens] = useState('4');
  const [tom, setTom] = useState('profissional');
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [roteiro, setRoteiro] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState(AI_PROVIDERS[DEFAULT_PROVIDER].models);

  useEffect(() => {
    setAvailableModels(AI_PROVIDERS[provider].models);
    setModel(AI_PROVIDERS[provider].models[0].id);
  }, [provider]);

  const handleGerar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gerar-roteiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tema, 
          duracao: parseInt(duracao), 
          quantidadeImagens: parseInt(quantidadeImagens),
          tom, 
          provider, 
          model 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setRoteiro(data.roteiro);
      setPrompts(data.prompts || []);
      
      // Salva os prompts gerados
      if (data.prompts && data.prompts.length > 0) {
        await fetch('/api/salvar-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompts: data.prompts }),
        });
      }
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
      
      // Redireciona para página de imagens
      router.push('/');
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
            <label>⏱️ Duração (minutos)</label>
            <input
              type="number"
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
              min="1"
              max="10"
              step="0.5"
            />
          </div>

          <div className="form-group">
            <label>🖼️ Quantidade de Imagens</label>
            <input
              type="number"
              value={quantidadeImagens}
              onChange={(e) => setQuantidadeImagens(e.target.value)}
              min="3"
              max="10"
            />
          </div>

          <div className="form-group">
            <label>🎭 Tom</label>
            <select value={tom} onChange={(e) => setTom(e.target.value)}>
              <option value="profissional">Profissional</option>
              <option value="casual">Casual</option>
              <option value="energetico">Energético</option>
              <option value="educativo">Educativo</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>🤖 Provedor de IA</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              {Object.entries(AI_PROVIDERS).map(([key, value]) => (
                <option key={key} value={key}>{value.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>🎯 Modelo</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleGerar} disabled={loading || !tema}>
          {loading ? 'Gerando...' : '✨ Gerar Roteiro com IA'}
        </button>
      </div>

      {roteiro && (
        <>
          <div className="card">
            <div className="card-head">
              <p className="label">Roteiro Gerado</p>
              <button onClick={handleSalvar}>💾 Salvar e Ir para Imagens →</button>
            </div>
            <textarea
              value={roteiro}
              onChange={(e) => setRoteiro(e.target.value)}
              rows={15}
              placeholder="O roteiro gerado aparecerá aqui..."
            />
          </div>

          {prompts.length > 0 && (
            <div className="card">
              <div className="card-head">
                <p className="label">🎨 Prompts para Imagens Gerados</p>
                <p className="tiny">Estes prompts serão automaticamente carregados na aba de imagens</p>
              </div>
              <div className="prompts-preview">
                {prompts.map((p, idx) => (
                  <div key={idx} className="prompt-preview-item">
                    <span className="prompt-number">{idx + 1}</span>
                    <span className="prompt-text">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
