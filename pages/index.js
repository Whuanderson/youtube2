import { useState } from 'react';

const defaultScenes = [
  { prompt: 'Cena inicial vibrante com logo', duration: 5 },
  { prompt: 'Explicacao visual do produto', duration: 6 },
  { prompt: 'Call to action final', duration: 4 },
];

export default function Home() {
  const [scenes, setScenes] = useState(defaultScenes);
  const [status, setStatus] = useState('');
  const [audioPath, setAudioPath] = useState('');
  const [videoPath, setVideoPath] = useState('');
  const [loading, setLoading] = useState(false);

  const updateScene = (index, key, value) => {
    const next = scenes.map((scene, i) => (i === index ? { ...scene, [key]: value } : scene));
    setScenes(next);
  };

  const addScene = () => {
    setScenes([...scenes, { prompt: '', duration: 4 }]);
  };

  const removeScene = (index) => {
    setScenes(scenes.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    setStatus('Gerando frames...');
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar frames');
      setStatus(`Frames prontos em ${data.framesDir}. Ajuste as duracoes se quiser e depois renderize.`);
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

    setStatus('Renderizando video...');
    setLoading(true);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath, scenes }),
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
            Gere frames com a sua automação Whisk, ajuste a sequência e renderize com ffmpeg — tudo em um painel só.
          </p>
          <div className="actions">
            <button type="button" onClick={handleGenerate} disabled={loading}>
              Gerar frames
            </button>
            <button type="button" className="ghost" onClick={handleRender} disabled={loading || !audioPath}>
              Renderizar vídeo
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
              Baixar vídeo
            </a>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <p className="label">Cenas</p>
            <p className="tiny">Edite prompts e durações, adicione ou remova linhas.</p>
          </div>
          <button type="button" onClick={addScene} className="ghost">
            + Adicionar cena
          </button>
        </div>

        <div className="table">
          {scenes.map((scene, idx) => (
            <div key={idx} className="row">
              <div className="col prompt">
                <input
                  value={scene.prompt}
                  onChange={(e) => updateScene(idx, 'prompt', e.target.value)}
                  placeholder="Prompt para o Whisk"
                />
              </div>
              <div className="col duration">
                <input
                  type="number"
                  min="1"
                  value={scene.duration}
                  onChange={(e) => updateScene(idx, 'duration', Number(e.target.value))}
                />
                <span>s</span>
              </div>
              <button type="button" className="ghost danger" onClick={() => removeScene(idx)}>
                Remover
              </button>
            </div>
          ))}
        </div>
      </div>

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
        button {
          font-family: inherit;
        }
        a {
          color: inherit;
          text-decoration: none;
        }
      `}</style>

      <style jsx>{`
        .page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 20px 60px;
        }
        .hero {
          display: grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 18px;
          align-items: start;
          margin-bottom: 18px;
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
        .card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          backdrop-filter: blur(6px);
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
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.2);
          color: #c6f6ff;
        }
        .table {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .row {
          display: grid;
          grid-template-columns: 1fr 140px 110px;
          gap: 10px;
          align-items: center;
        }
        .col.prompt input {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #1f2937;
          background: rgba(255, 255, 255, 0.03);
          color: #e5e7eb;
        }
        .col.duration {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid #1f2937;
          padding: 8px 10px;
          color: #e5e7eb;
        }
        .col.duration input {
          width: 80px;
          background: transparent;
          border: none;
          color: inherit;
        }
        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
          }
          .row {
            grid-template-columns: 1fr;
          }
          .col.duration {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
