import { useState, useEffect } from 'react';

const defaultPrompts = [
  { prompt: 'Cena inicial vibrante com logo' },
  { prompt: 'Explicacao visual do produto' },
  { prompt: 'Call to action final' },
];

export default function Home() {
  // Separação: prompts vs cenas geradas
  const [prompts, setPrompts] = useState(defaultPrompts);
  const [generatedScenes, setGeneratedScenes] = useState([]);
  
  const [status, setStatus] = useState('');
  const [audioPath, setAudioPath] = useState('');
  const [videoPath, setVideoPath] = useState('');
  const [loading, setLoading] = useState(false);

  // Carrega as cenas geradas ao montar o componente
  useEffect(() => {
    syncScenesFromServer();
  }, []);

  const syncScenesFromServer = async () => {
    try {
      const res = await fetch('/api/scenes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar cenas do servidor');

      // Atualiza as cenas geradas com framePath e duração
      if (Array.isArray(data.scenes) && data.scenes.length > 0) {
        setGeneratedScenes(
          data.scenes.map((scene) => ({
            prompt: scene.prompt || '',
            duration: Number(scene.duration) > 0 ? Number(scene.duration) : 4,
            framePath: scene.framePath || null,
            effect: scene.effect || 'none',
            animation: scene.animation || 'none',
          })),
        );
      }
    } catch (err) {
      console.error('syncScenesFromServer erro:', err);
    }
  };

  // Funções para manipular PROMPTS (antes de gerar)
  const updatePrompt = (index, value) => {
    const next = prompts.map((p, i) => (i === index ? { ...p, prompt: value } : p));
    setPrompts(next);
  };

  const addPrompt = () => {
    setPrompts([...prompts, { prompt: '' }]);
  };

  const removePrompt = (index) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  // Funções para manipular CENAS GERADAS (depois de importar)
  const updateGeneratedScene = (index, key, value) => {
    const next = generatedScenes.map((scene, i) => 
      (i === index ? { ...scene, [key]: value } : scene)
    );
    setGeneratedScenes(next);
  };

  const removeGeneratedScene = (index) => {
    setGeneratedScenes(generatedScenes.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    setStatus('Gerando frames...');
    setLoading(true);
    try {
      // Converte prompts para formato de scenes com duração padrão
      const scenesToGenerate = prompts.map(p => ({
        prompt: p.prompt,
        duration: 4
      }));

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: scenesToGenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar frames');

      setStatus(`Frames gerados! Aguarde o download das imagens...`);

      // 🔔 AVISA A EXTENSÃO: "roda o batch com essas cenas"
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('MY_WHISK_RUN_BATCH', {
            detail: { scenes: scenesToGenerate },
          }),
        );
      }

      // Após alguns segundos, importa automaticamente
      setTimeout(async () => {
        await handleAutoImport();
      }, 3000);

    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoImport = async () => {
    setStatus('Importando imagens do Whisk automaticamente...');
    setLoading(true);
    try {
      const res = await fetch('/api/import-whisk', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao importar imagens do Whisk');

      setStatus(`✅ ${data.imported || 0} imagens importadas! Configure duração e efeitos abaixo.`);
      await syncScenesFromServer();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAudioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('Enviando audio...');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload-audio', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar audio');
      setAudioPath(data.audioPath);
      setStatus(`Audio armazenado em ${data.audioPath}`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRender = async () => {
    if (!audioPath) {
      setStatus('Envie um audio antes de renderizar.');
      return;
    }

    if (generatedScenes.length === 0) {
      setStatus('Gere e importe as cenas antes de renderizar.');
      return;
    }

    setStatus('Renderizando video...');
    setLoading(true);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath, scenes: generatedScenes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao renderizar video');
      setVideoPath(data.videoPath);
      setStatus(`Video criado em ${data.videoPath}`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="hero">
        <div>
          <p className="eyebrow">YouTube 1080p30</p>
          <h1>Studio Whisk → Vídeo</h1>
          <p className="lede">
            Crie prompts, gere imagens com Whisk e renderize vídeos automáticos.
          </p>
          <div className="actions">
            <button type="button" onClick={handleGenerate} disabled={loading || prompts.length === 0}>
              🎨 Gerar e Baixar Imagens
            </button>
            <button type="button" className="ghost" onClick={handleRender} disabled={loading || !audioPath || generatedScenes.length === 0}>
              🎬 Renderizar Vídeo
            </button>
          </div>
          {status && <div className="status">{status}</div>}
        </div>
        <div className="card upload">
          <p className="label">Áudio</p>
          <input type="file" accept="audio/*" onChange={handleAudioUpload} />
          {audioPath ? <p className="tiny">Usando: {audioPath}</p> : <p className="tiny">Envie um .mp3/.wav</p>}
          {videoPath && (
            <a className="download" href={`/api/download?file=${encodeURIComponent('final.mp4')}`}>
              📥 Baixar vídeo
            </a>
          )}
        </div>
      </div>

      {/* SEÇÃO 1: PROMPTS */}
      <div className="card">
        <div className="card-head">
          <div>
            <p className="label">📝 Prompts para Gerar Imagens</p>
            <p className="tiny">Adicione ou edite os prompts que serão enviados ao Whisk.</p>
          </div>
          <button type="button" onClick={addPrompt} className="ghost">
            + Adicionar prompt
          </button>
        </div>

        <div className="prompts-list">
          {prompts.map((p, idx) => (
            <div key={idx} className="prompt-row">
              <span className="prompt-number">{idx + 1}</span>
              <input
                value={p.prompt}
                onChange={(e) => updatePrompt(idx, e.target.value)}
                placeholder="Digite o prompt para o Whisk..."
                className="prompt-input"
              />
              <button 
                type="button" 
                className="ghost danger small" 
                onClick={() => removePrompt(idx)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 2: CENAS GERADAS */}
      {generatedScenes.length > 0 && (
        <div className="card scenes-section">
          <div className="card-head">
            <div>
              <p className="label">🎬 Cenas Geradas</p>
              <p className="tiny">Configure duração, efeitos e animações para cada cena.</p>
            </div>
          </div>

          <div className="scenes-grid">
            {generatedScenes.map((scene, idx) => (
              <div key={idx} className="scene-card">
                {/* Thumbnail */}
                <div className="scene-thumb">
                  {scene.framePath ? (
                    <img
                      src={`/api/frame?index=${idx}`}
                      alt={`Cena ${idx + 1}`}
                    />
                  ) : (
                    <div className="thumb-placeholder">Carregando...</div>
                  )}
                  <span className="scene-number">#{idx + 1}</span>
                </div>

                {/* Controles */}
                <div className="scene-controls">
                  <div className="control-group">
                    <label>Prompt:</label>
                    <p className="scene-prompt">{scene.prompt}</p>
                  </div>

                  <div className="control-row">
                    <div className="control-group">
                      <label>Duração (s):</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={scene.duration}
                        onChange={(e) => updateGeneratedScene(idx, 'duration', Number(e.target.value))}
                        className="duration-input"
                      />
                    </div>

                    <div className="control-group">
                      <label>Efeito:</label>
                      <select
                        value={scene.effect}
                        onChange={(e) => updateGeneratedScene(idx, 'effect', e.target.value)}
                        className="effect-select"
                      >
                        <option value="none">Nenhum</option>
                        <option value="fade">Fade</option>
                        <option value="blur">Blur</option>
                        <option value="brightness">Brilho</option>
                        <option value="sepia">Sépia</option>
                      </select>
                    </div>

                    <div className="control-group">
                      <label>Animação:</label>
                      <select
                        value={scene.animation}
                        onChange={(e) => updateGeneratedScene(idx, 'animation', e.target.value)}
                        className="animation-select"
                      >
                        <option value="none">Nenhuma</option>
                        <option value="zoom-in">Zoom In</option>
                        <option value="zoom-out">Zoom Out</option>
                        <option value="pan-left">Pan Esquerda</option>
                        <option value="pan-right">Pan Direita</option>
                        <option value="pan-up">Pan Cima</option>
                        <option value="pan-down">Pan Baixo</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="ghost danger" 
                    onClick={() => removeGeneratedScene(idx)}
                  >
                    Remover cena
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          background: radial-gradient(circle at 20% 20%, #0f172a, #05070d 60%);
          font-family: 'DM Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
          color: #f3f4f6;
        }
        input,
        button,
        select {
          font-family: inherit;
        }
        a {
          color: inherit;
          text-decoration: none;
        }
      `}</style>

      <style jsx>{`
        .page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 20px 60px;
        }
        .hero {
          display: grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 18px;
          align-items: start;
          margin-bottom: 24px;
        }
        h1 {
          margin: 4px 0 8px;
          font-size: 38px;
          letter-spacing: -0.5px;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 2px;
          font-size: 12px;
          color: #7dd3fc;
        }
        .lede {
          max-width: 640px;
          color: #cbd5e1;
          margin: 0 0 16px;
          line-height: 1.5;
        }
        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        button {
          border: none;
          border-radius: 10px;
          padding: 12px 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
          background: linear-gradient(135deg, #0ea5e9, #0f766e);
          color: #04131a;
          box-shadow: 0 8px 16px rgba(14, 165, 233, 0.25);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .ghost {
          background: transparent;
          color: #e2e8f0;
          border: 1px solid #1f2937;
          box-shadow: none;
        }
        .ghost:hover:not(:disabled) {
          border-color: #0ea5e9;
        }
        .ghost.danger {
          border-color: #ef4444;
          color: #fca5a5;
        }
        .ghost.danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
        }
        .ghost.small {
          padding: 8px 12px;
          font-size: 14px;
        }
        .card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(6px);
          margin-bottom: 20px;
        }
        .card-head {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 20px;
        }
        .upload {
          min-height: 140px;
        }
        .label {
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 11px;
          color: #94a3b8;
          margin: 0 0 6px;
          font-weight: 600;
        }
        .tiny {
          margin: 6px 0 0;
          color: #cbd5e1;
          font-size: 13px;
        }
        input[type='file'] {
          width: 100%;
          margin-top: 4px;
        }
        .download {
          display: inline-block;
          margin-top: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          background: #0ea5e9;
          color: #04131a;
          font-weight: 600;
        }
        .status {
          margin-top: 8px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.2);
          color: #c6f6ff;
          font-size: 14px;
        }

        /* PROMPTS */
        .prompts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .prompt-row {
          display: grid;
          grid-template-columns: 40px 1fr auto;
          gap: 12px;
          align-items: center;
        }
        .prompt-number {
          width: 32px;
          height: 32px;
          background: rgba(14, 165, 233, 0.15);
          border: 1px solid rgba(14, 165, 233, 0.3);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          color: #7dd3fc;
        }
        .prompt-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #1f2937;
          background: rgba(255, 255, 255, 0.03);
          color: #e5e7eb;
          font-size: 14px;
        }
        .prompt-input:focus {
          outline: none;
          border-color: #0ea5e9;
        }

        /* CENAS GERADAS */
        .scenes-section {
          background: rgba(14, 165, 233, 0.03);
          border-color: rgba(14, 165, 233, 0.15);
        }
        .scenes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }
        .scene-card {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid #1f2937;
          border-radius: 14px;
          overflow: hidden;
          transition: transform 0.2s ease;
        }
        .scene-card:hover {
          transform: translateY(-2px);
          border-color: #0ea5e9;
        }
        .scene-thumb {
          position: relative;
          width: 100%;
          height: 180px;
          background: #0f172a;
        }
        .scene-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .thumb-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #64748b;
        }
        .scene-number {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(14, 165, 233, 0.9);
          color: #04131a;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
        }
        .scene-controls {
          padding: 16px;
        }
        .control-group {
          margin-bottom: 12px;
        }
        .control-group label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #94a3b8;
          margin-bottom: 6px;
          font-weight: 600;
        }
        .scene-prompt {
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.4;
          margin: 0;
        }
        .control-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }
        .duration-input,
        .effect-select,
        .animation-select {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #1f2937;
          background: rgba(255, 255, 255, 0.03);
          color: #e5e7eb;
          font-size: 13px;
        }
        .duration-input:focus,
        .effect-select:focus,
        .animation-select:focus {
          outline: none;
          border-color: #0ea5e9;
        }

        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
          }
          .scenes-grid {
            grid-template-columns: 1fr;
          }
          .control-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
