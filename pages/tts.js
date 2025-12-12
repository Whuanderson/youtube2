import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TTS() {
  const router = useRouter();
  const [roteiro, setRoteiro] = useState('');
  const [legenda, setLegenda] = useState('');
  const [duracaoMinutos, setDuracaoMinutos] = useState('1');
  const [srtInfo, setSrtInfo] = useState(null);
  const [voz, setVoz] = useState('pt-BR-FranciscaNeural');
  const [velocidade, setVelocidade] = useState('1.0');
  const [audioComSilencio, setAudioComSilencio] = useState('');
  const [audioSemSilencio, setAudioSemSilencio] = useState('');
  const [duracaoAudioComSilencio, setDuracaoAudioComSilencio] = useState(0);
  const [duracaoAudioSemSilencio, setDuracaoAudioSemSilencio] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingLegenda, setLoadingLegenda] = useState(false);
  const [loadingRemocao, setLoadingRemocao] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [roteiroData, srtData] = await Promise.all([
        fetch('/api/carregar-roteiro').then(r => r.json()),
        fetch('/api/carregar-srt-info').then(r => r.json())
      ]);

      setRoteiro(roteiroData.roteiro || '');

      if (srtData.success && srtData.srtContent) {
        setLegenda(srtData.srtContent);
        setSrtInfo(srtData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const handleGerarLegenda = async () => {
    if (!roteiro) {
      alert('Digite ou cole um roteiro primeiro');
      return;
    }

    setLoadingLegenda(true);
    try {
      const res = await fetch('/api/gerar-srt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roteiro,
          duracaoMinutos: parseFloat(duracaoMinutos)
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setLegenda(data.srtContent);
      setSrtInfo(data);
      alert(`✅ Legenda gerada!\n\n📊 ${data.blocos} blocos\n⏱️ ${data.duracaoMinutos} minutos`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingLegenda(false);
    }
  };

  const handleSalvarLegenda = async () => {
    try {
      const res = await fetch('/api/salvar-srt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srtContent: legenda }),
      });

      if (!res.ok) throw new Error('Erro ao salvar legenda');

      alert('✅ Legenda salva!');
      await carregarDados(); // Recarrega info
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAudioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setStatus('Enviando áudio...');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload-audio', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setAudioComSilencio(data.audioPath);
      setDuracaoAudioComSilencio(data.duration || 0);
      setStatus(`✅ Áudio carregado: ${data.duration}s`);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverSilencio = async () => {
    if (!audioComSilencio) {
      alert('Faça upload ou gere um áudio primeiro');
      return;
    }

    setLoadingRemocao(true);
    setStatus('Removendo silêncios...');
    try {
      const res = await fetch('/api/remover-silencio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath: audioComSilencio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setAudioSemSilencio(data.audioPath);
      setDuracaoAudioSemSilencio(data.duration);
      setStatus(`✅ Silêncios removidos! Duração real: ${data.duration}s`);
      
      // Redireciona para imagens após alguns segundos
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoadingRemocao(false);
    }
  };

  const handleGerar = async () => {
    if (!legenda) {
      alert('Gere ou cole uma legenda SRT primeiro');
      return;
    }

    setLoading(true);
    setStatus('Gerando áudio com TTS...');
    try {
      const res = await fetch('/api/gerar-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srtContent: legenda, voz, velocidade }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setAudioComSilencio(data.audioPath);
      setDuracaoAudioComSilencio(data.duration);
      setStatus(`✅ Áudio gerado: ${data.duration}s (com silêncios)`);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
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

      {srtInfo && (
        <div className="card">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">📊 Blocos:</span>
              <span className="info-value">{srtInfo.blocos}</span>
            </div>
            <div className="info-item">
              <span className="info-label">⏱️ Duração:</span>
              <span className="info-value">{srtInfo.duracaoMinutos}min</span>
            </div>
            <div className="info-item">
              <span className="info-label">📝 Caracteres:</span>
              <span className="info-value">{roteiro.length}</span>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <p className="label">📝 Roteiro e Legendas</p>
          <p className="tiny">Trabalhe com o roteiro e suas legendas lado a lado</p>
        </div>

        <div className="dual-panel">
          <div className="panel">
            <div className="panel-header">
              <label>Roteiro</label>
              <div className="panel-actions">
                <input
                  type="number"
                  value={duracaoMinutos}
                  onChange={(e) => setDuracaoMinutos(e.target.value)}
                  min="0.5"
                  max="10"
                  step="0.5"
                  placeholder="min"
                  style={{ width: '70px', marginRight: '8px' }}
                />
                <button
                  className="ghost small"
                  onClick={handleGerarLegenda}
                  disabled={loadingLegenda || !roteiro}
                >
                  {loadingLegenda ? 'Gerando...' : '→ Gerar Legenda'}
                </button>
              </div>
            </div>
            <textarea
              value={roteiro}
              onChange={(e) => setRoteiro(e.target.value)}
              rows={15}
              placeholder="Cole ou digite seu roteiro aqui..."
            />
          </div>

          <div className="panel">
            <div className="panel-header">
              <label>Legenda SRT</label>
              <button
                className="ghost small"
                onClick={handleSalvarLegenda}
                disabled={!legenda}
              >
                💾 Salvar
              </button>
            </div>
            <textarea
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              rows={15}
              placeholder="A legenda em formato SRT aparecerá aqui..."
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <p className="tiny">💡 Você pode editar manualmente ou colar uma legenda SRT pronta</p>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE ÁUDIO */}
      <div className="card">
        <div className="card-head">
          <p className="label">🎵 Geração de Áudio</p>
          <p className="tiny">Gere com TTS ou faça upload de um áudio pronto</p>
        </div>

        {/* Gerar com TTS */}
        <div className="audio-section">
          <h3 className="section-title">Opção 1: Gerar com TTS</h3>
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

          <button onClick={handleGerar} disabled={loading || !legenda}>
            {loading ? 'Gerando...' : '✨ Gerar Áudio com IA'}
          </button>
        </div>

        {/* Upload Manual */}
        <div className="audio-section">
          <h3 className="section-title">Opção 2: Upload Manual</h3>
          <div className="form-group">
            <label>📁 Áudio</label>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} disabled={loading} />
            <p className="tiny">Envie um .mp3, .wav ou outro formato de áudio</p>
          </div>
        </div>

        {status && <div className="status">{status}</div>}

        {/* Áudio com Silêncio */}
        {audioComSilencio && (
          <div className="audio-result">
            <div className="result-header">
              <h3>🔊 Áudio Original (Com Silêncios)</h3>
              <span className="duration-badge">{duracaoAudioComSilencio}s</span>
            </div>
            <audio controls src={audioComSilencio} style={{ width: '100%' }} />
            <button 
              onClick={handleRemoverSilencio} 
              disabled={loadingRemocao}
              style={{ marginTop: '1rem' }}
            >
              {loadingRemocao ? 'Processando...' : '✂️ Remover Silêncios'}
            </button>
            <p className="tiny" style={{ marginTop: '0.5rem' }}>
              💡 Remove trechos de silêncio para obter a duração real da narração
            </p>
          </div>
        )}

        {/* Áudio sem Silêncio */}
        {audioSemSilencio && (
          <div className="audio-result success">
            <div className="result-header">
              <h3>✅ Áudio Final (Sem Silêncios)</h3>
              <span className="duration-badge success">{duracaoAudioSemSilencio}s</span>
            </div>
            <audio controls src={audioSemSilencio} style={{ width: '100%' }} />
            <div className="success-message">
              <p>🎯 Duração real do áudio: {duracaoAudioSemSilencio}s</p>
              <p>📊 Economia: {(duracaoAudioComSilencio - duracaoAudioSemSilencio).toFixed(1)}s de silêncio removidos</p>
              <button onClick={() => router.push('/')} style={{ marginTop: '1rem' }}>
                ➡️ Ir para Imagens
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
