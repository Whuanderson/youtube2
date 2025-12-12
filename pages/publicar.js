import { useState, useEffect } from 'react';

export default function Publicar() {
  const [videoPath, setVideoPath] = useState('');
  const [thumbnailPath, setThumbnailPath] = useState('');
  const [seo, setSeo] = useState({});
  const [privacidade, setPrivacidade] = useState('private');
  const [agendamento, setAgendamento] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    // Carrega dados salvos
    Promise.all([
      fetch('/api/carregar-video').then(r => r.json()),
      fetch('/api/carregar-thumbnail').then(r => r.json()),
      fetch('/api/carregar-seo').then(r => r.json()),
    ]).then(([video, thumb, seoData]) => {
      setVideoPath(video.videoPath || '');
      setThumbnailPath(thumb.thumbnailPath || '');
      setSeo(seoData || {});
    }).catch(console.error);
  }, []);

  const handlePublicar = async () => {
    setLoading(true);
    setStatus('Publicando no YouTube...');
    try {
      // TODO: Integrar com YouTube Data API v3
      const res = await fetch('/api/publicar-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath,
          thumbnailPath,
          titulo: seo.titulo,
          descricao: seo.descricao,
          tags: seo.tags,
          categoria: seo.categoria,
          privacidade,
          agendamento,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVideoUrl(data.videoUrl);
      setStatus('✅ Vídeo publicado com sucesso!');
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isReady = videoPath && seo.titulo;

  return (
    <div className="page">
      <div className="page-header">
        <h1>🚀 Publicar no YouTube</h1>
        <p>Envie seu vídeo para o YouTube automaticamente</p>
      </div>

      <div className="card">
        <div className="checklist">
          <div className={`checklist-item ${videoPath ? 'done' : ''}`}>
            <span className="check-icon">{videoPath ? '✅' : '⏳'}</span>
            <span>Vídeo renderizado</span>
          </div>
          <div className={`checklist-item ${thumbnailPath ? 'done' : ''}`}>
            <span className="check-icon">{thumbnailPath ? '✅' : '⏳'}</span>
            <span>Thumbnail criada</span>
          </div>
          <div className={`checklist-item ${seo.titulo ? 'done' : ''}`}>
            <span className="check-icon">{seo.titulo ? '✅' : '⏳'}</span>
            <span>SEO configurado</span>
          </div>
        </div>

        {isReady && (
          <>
            <div className="info-box">
              <h3>{seo.titulo}</h3>
              <p className="tiny">{seo.descricao?.substring(0, 200)}...</p>
              <p className="tiny" style={{ marginTop: '0.5rem' }}>
                <strong>Tags:</strong> {seo.tags}
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Privacidade</label>
                <select value={privacidade} onChange={(e) => setPrivacidade(e.target.value)}>
                  <option value="private">Privado</option>
                  <option value="unlisted">Não listado</option>
                  <option value="public">Público</option>
                </select>
              </div>

              <div className="form-group">
                <label>Agendar Publicação (Opcional)</label>
                <input
                  type="datetime-local"
                  value={agendamento}
                  onChange={(e) => setAgendamento(e.target.value)}
                />
              </div>
            </div>

            <button onClick={handlePublicar} disabled={loading}>
              {loading ? 'Publicando...' : '🚀 Publicar no YouTube'}
            </button>

            {status && <div className="status">{status}</div>}

            {videoUrl && (
              <div className="success-box">
                <h3>🎉 Vídeo publicado!</h3>
                <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                  Ver no YouTube →
                </a>
              </div>
            )}
          </>
        )}

        {!isReady && (
          <div className="warning-box">
            ⚠️ Complete todas as etapas anteriores antes de publicar
          </div>
        )}
      </div>
    </div>
  );
}
