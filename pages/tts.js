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
  const [tipoUpload, setTipoUpload] = useState('para-processar'); // 'para-processar' ou 'final'

  useEffect(() => {
    carregarDados();
    carregarAudioInfo();
  }, []);

  const carregarAudioInfo = async () => {
    try {
      const res = await fetch('/api/carregar-audio-info');
      const data = await res.json();
      if (data.success && data.audioInfo) {
        console.log('📂 Info de áudio carregada:', data.audioInfo);
        setAudioComSilencio(data.audioInfo.audioComSilencio || '');
        setAudioSemSilencio(data.audioInfo.audioSemSilencio || '');
        setDuracaoAudioComSilencio(data.audioInfo.duracaoAudioComSilencio || 0);
        setDuracaoAudioSemSilencio(data.audioInfo.duracaoAudioSemSilencio || 0);
        console.log('✅ Áudio restaurado do rascunho');
      } else {
        console.log('⚠️ Nenhuma info de áudio salva');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar áudio:', err);
    }
  };

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

  const handleAudioUpload = async (event, tipo) => {
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
      
      if (tipo === 'final') {
        // Áudio já está pronto, sem necessidade de remover silêncio
        setAudioSemSilencio(data.audioPath);
        setDuracaoAudioSemSilencio(data.duration || 0);
        setStatus(`✅ Áudio final carregado: ${data.duration}s (pronto para usar)`);
        
        // Salva info
        await fetch('/api/salvar-audio-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioComSilencio: '',
            audioSemSilencio: data.audioPath,
            duracaoAudioComSilencio: 0,
            duracaoAudioSemSilencio: data.duration || 0,
          }),
        });
      } else {
        // Áudio precisa processar para remover silêncio
        setAudioComSilencio(data.audioPath);
        setDuracaoAudioComSilencio(data.duration || 0);
        setStatus(`✅ Áudio carregado: ${data.duration}s (clique em remover silêncios)`);
        
        // Salva info
        await fetch('/api/salvar-audio-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioComSilencio: data.audioPath,
            audioSemSilencio: '',
            duracaoAudioComSilencio: data.duration || 0,
            duracaoAudioSemSilencio: 0,
          }),
        });
      }
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
      
      // Salva info completa
      await fetch('/api/salvar-audio-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioComSilencio,
          audioSemSilencio: data.audioPath,
          duracaoAudioComSilencio,
          duracaoAudioSemSilencio: data.duration,
        }),
      });
      
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

  const handleDeletarAudio = async () => {
    if (!confirm('⚠️ Tem certeza que deseja deletar o áudio?')) {
      return;
    }

    setLoading(true);
    try {
      const audioToDelete = audioSemSilencio || audioComSilencio;
      const res = await fetch('/api/deletar-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath: audioToDelete }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Limpa estados
      setAudioComSilencio('');
      setAudioSemSilencio('');
      setDuracaoAudioComSilencio(0);
      setDuracaoAudioSemSilencio(0);
      setStatus('✅ Áudio deletado com sucesso');
    } catch (err) {
      setStatus(`❌ Erro ao deletar: ${err.message}`);
    } finally {
      setLoading(false);
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
      
      // Salva info
      await fetch('/api/salvar-audio-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioComSilencio: data.audioPath,
          audioSemSilencio: '',
          duracaoAudioComSilencio: data.duration,
          duracaoAudioSemSilencio: 0,
        }),
      });
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

        {/* Upload Manual - COM processamento */}
        <div className="audio-section">
          <h3 className="section-title">Opção 2: Upload para Processar</h3>
          <div className="form-group">
            <label>📁 Áudio Original (com silêncios)</label>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => handleAudioUpload(e, 'para-processar')} 
              disabled={loading} 
            />
            <p className="tiny">⚠️ Upload de áudio que precisa remover silêncios</p>
          </div>
        </div>

        {/* Upload Manual - SEM processamento */}
        <div className="audio-section">
          <h3 className="section-title">Opção 3: Upload Áudio Final</h3>
          <div className="form-group">
            <label>✅ Áudio Pronto (sem silêncios)</label>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => handleAudioUpload(e, 'final')} 
              disabled={loading} 
            />
            <p className="tiny">✨ Áudio já editado e pronto para usar no vídeo</p>
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
            <audio 
              key={audioComSilencio}
              controls 
              preload="auto"
              src={audioComSilencio} 
              style={{ width: '100%' }}
              onError={(e) => {
                console.error('❌ Erro ao carregar áudio:', audioComSilencio);
                console.error('❌ Detalhes:', e.target.error);
                setStatus('❌ Erro ao carregar áudio. Verifique o arquivo.');
              }}
              onLoadedMetadata={(e) => {
                console.log('✅ Áudio carregado:', e.target.duration + 's');
                console.log('   🔗 URL:', audioComSilencio);
              }}
              onCanPlay={() => {
                console.log('▶️ Áudio pronto para reproduzir');
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button 
                onClick={handleRemoverSilencio} 
                disabled={loadingRemocao}
                style={{ flex: 1 }}
              >
                {loadingRemocao ? 'Processando...' : '✂️ Remover Silêncios'}
              </button>
              <button 
                onClick={handleDeletarAudio} 
                disabled={loading}
                className="btn-delete-small"
              >
                🗑️
              </button>
            </div>
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
            <audio 
              key={audioSemSilencio}
              controls 
              preload="auto"
              src={audioSemSilencio} 
              style={{ width: '100%' }}
              onError={(e) => {
                console.error('❌ Erro ao carregar áudio final:', audioSemSilencio);
                console.error('❌ Detalhes:', e.target.error);
                setStatus('❌ Erro ao carregar áudio final. Verifique o arquivo.');
              }}
              onLoadedMetadata={(e) => {
                console.log('✅ Áudio final carregado:', e.target.duration + 's');
                console.log('   🔗 URL:', audioSemSilencio);
              }}
              onCanPlay={() => {
                console.log('▶️ Áudio final pronto para reproduzir');
              }}
            />
            <div className="success-message">
              <p>🎯 Duração real do áudio: {duracaoAudioSemSilencio}s</p>
              <p>📊 Economia: {(duracaoAudioComSilencio - duracaoAudioSemSilencio).toFixed(1)}s de silêncio removidos</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => router.push('/')} style={{ flex: 1 }}>
                  ➡️ Ir para Imagens
                </button>
                <button 
                  onClick={handleDeletarAudio} 
                  disabled={loading}
                  className="btn-delete-small"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
