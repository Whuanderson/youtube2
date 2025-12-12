import { useState, useEffect } from 'react';

export default function TTS() {
  const [roteiro, setRoteiro] = useState('');
  const [voz, setVoz] = useState('pt-BR-FranciscaNeural');
  const [velocidade, setVelocidade] = useState('1.0');
  const [audioPath, setAudioPath] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Carrega o roteiro salvo
    fetch('/api/carregar-roteiro')
      .then(res => res.json())
      .then(data => setRoteiro(data.roteiro || ''))
      .catch(console.error);
  }, []);

  const handleGerar = async () => {
    setLoading(true);
    try {
      // TODO: Integrar com Azure TTS, ElevenLabs, etc
      const res = await fetch('/api/gerar-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: roteiro, voz, velocidade }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAudioPath(data.audioPath);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🎙️ Text-to-Speech</h1>
        <p>Transforme seu roteiro em narração</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Roteiro</label>
          <textarea
            value={roteiro}
            onChange={(e) => setRoteiro(e.target.value)}
            rows={10}
            placeholder="Cole ou edite seu roteiro aqui..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Voz</label>
            <select value={voz} onChange={(e) => setVoz(e.target.value)}>
              <optgroup label="Português (BR)">
                <option value="pt-BR-FranciscaNeural">Francisca (Feminina)</option>
                <option value="pt-BR-AntonioNeural">Antonio (Masculina)</option>
              </optgroup>
              <optgroup label="Inglês (US)">
                <option value="en-US-JennyNeural">Jenny (Feminina)</option>
                <option value="en-US-GuyNeural">Guy (Masculina)</option>
              </optgroup>
            </select>
          </div>

          <div className="form-group">
            <label>Velocidade</label>
            <select value={velocidade} onChange={(e) => setVelocidade(e.target.value)}>
              <option value="0.8">Lenta (0.8x)</option>
              <option value="1.0">Normal (1.0x)</option>
              <option value="1.2">Rápida (1.2x)</option>
              <option value="1.5">Muito Rápida (1.5x)</option>
            </select>
          </div>
        </div>

        <button onClick={handleGerar} disabled={loading || !roteiro}>
          {loading ? 'Gerando...' : '🎤 Gerar Áudio'}
        </button>

        {audioPath && (
          <div style={{ marginTop: '1rem' }}>
            <audio controls src={audioPath} style={{ width: '100%' }} />
            <p className="tiny" style={{ marginTop: '0.5rem' }}>
              ✅ Áudio gerado: {audioPath}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
