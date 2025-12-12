import { useState, useEffect } from 'react';

export default function Thumbnail() {
  const [frames, setFrames] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [texto, setTexto] = useState('');
  const [estilo, setEstilo] = useState('moderno');
  const [thumbnailPath, setThumbnailPath] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/scenes')
      .then(res => res.json())
      .then(data => setFrames(data.scenes || []))
      .catch(console.error);
  }, []);

  const handleGerar = async () => {
    setLoading(true);
    try {
      // TODO: Integrar com ImageMagick ou Canvas para editar thumbnail
      const res = await fetch('/api/gerar-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          framePath: selectedFrame, 
          texto, 
          estilo 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setThumbnailPath(data.thumbnailPath);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🖼️ Thumbnail</h1>
        <p>Crie uma thumbnail atrativa para seu vídeo</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Selecione o Frame Base</label>
          <div className="thumbnail-grid">
            {frames.map((scene, idx) => (
              <div
                key={idx}
                className={`thumbnail-option ${selectedFrame === scene.framePath ? 'selected' : ''}`}
                onClick={() => setSelectedFrame(scene.framePath)}
              >
                <img src={`/api/frame?path=${encodeURIComponent(scene.framePath)}`} alt={`Frame ${idx + 1}`} />
                <span className="thumbnail-number">#{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Texto da Thumbnail</label>
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex: INCRÍVEL! RESULTADO EM 5 MINUTOS"
          />
        </div>

        <div className="form-group">
          <label>Estilo</label>
          <select value={estilo} onChange={(e) => setEstilo(e.target.value)}>
            <option value="moderno">Moderno</option>
            <option value="minimalista">Minimalista</option>
            <option value="dramatico">Dramático</option>
            <option value="energetico">Energético</option>
          </select>
        </div>

        <button onClick={handleGerar} disabled={loading || !selectedFrame}>
          {loading ? 'Gerando...' : '✨ Gerar Thumbnail'}
        </button>

        {thumbnailPath && (
          <div style={{ marginTop: '1rem' }}>
            <img src={thumbnailPath} alt="Thumbnail gerada" style={{ maxWidth: '100%' }} />
            <a 
              className="download" 
              href={thumbnailPath}
              download="thumbnail.jpg"
              style={{ display: 'inline-block', marginTop: '1rem' }}
            >
              📥 Baixar Thumbnail
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
