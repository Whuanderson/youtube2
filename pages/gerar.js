import { useState, useEffect } from 'react';

export default function Gerar() {
  const [scenes, setScenes] = useState([]);
  const [audioPath, setAudioPath] = useState('');
  const [videoPath, setVideoPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Carrega cenas e áudio
    Promise.all([
      fetch('/api/scenes').then(r => r.json()),
      fetch('/api/carregar-audio').then(r => r.json()),
    ]).then(([scenesData, audioData]) => {
      setScenes(scenesData.scenes || []);
      setAudioPath(audioData.audioPath || '');
    }).catch(console.error);
  }, []);

  const handleRender = async () => {
    setLoading(true);
    setStatus('Renderizando vídeo...');
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVideoPath(data.videoPath);
      setStatus('✅ Vídeo gerado com sucesso!');
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🎬 Gerar Vídeo</h1>
        <p>Renderize o vídeo final com suas cenas e áudio</p>
      </div>

      <div className="card">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Cenas:</span>
            <span className="info-value">{scenes.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Áudio:</span>
            <span className="info-value">{audioPath ? '✅' : '❌'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Duração Total:</span>
            <span className="info-value">
              {scenes.reduce((sum, s) => sum + (s.duration || 0), 0)}s
            </span>
          </div>
        </div>

        <button 
          onClick={handleRender} 
          disabled={loading || !audioPath || scenes.length === 0}
        >
          {loading ? 'Renderizando...' : '🎬 Renderizar Vídeo Final'}
        </button>

        {status && <div className="status">{status}</div>}

        {videoPath && (
          <div style={{ marginTop: '1rem' }}>
            <video controls src={`/api/download?file=final.mp4`} style={{ width: '100%', maxWidth: '800px' }} />
            <a 
              className="download" 
              href={`/api/download?file=final.mp4`}
              style={{ display: 'inline-block', marginTop: '1rem' }}
            >
              📥 Baixar Vídeo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
