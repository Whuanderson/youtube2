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
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioInfo, setAudioInfo] = useState(null);
  const [videoPath, setVideoPath] = useState('');
  const [loading, setLoading] = useState(false);

  // Carrega as cenas geradas e prompts salvos ao montar o componente
  useEffect(() => {
    syncScenesFromServer();
    loadSavedPrompts();
    loadAudioInfo();
  }, []);

  const loadAudioInfo = async () => {
    try {
      const res = await fetch('/api/carregar-audio-info');
      const data = await res.json();
      if (data.success && data.audioInfo) {
        setAudioInfo(data.audioInfo);
        console.log('🎵 Info de áudio carregada:', data.audioInfo.duracaoAudioSemSilencio + 's');
      }
    } catch (err) {
      console.error('Erro ao carregar info de áudio:', err);
    }
  };

  const loadSavedPrompts = async () => {
    try {
      const res = await fetch('/api/carregar-prompts');
      const data = await res.json();
      if (data.prompts && data.prompts.length > 0) {
        const formattedPrompts = data.prompts.map(p => ({ prompt: p }));
        setPrompts(formattedPrompts);
        console.log('✅ Prompts carregados do roteiro:', data.prompts.length);
      }
    } catch (err) {
      console.error('Erro ao carregar prompts:', err);
    }
  };

  const syncScenesFromServer = async () => {
    try {
      console.log('🔄 Sincronizando cenas do servidor...');
      const res = await fetch('/api/scenes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar cenas do servidor');

      console.log('📦 Cenas recebidas:', data.scenes?.length || 0);
      
      // Atualiza as cenas geradas com framePath e duração
      if (Array.isArray(data.scenes) && data.scenes.length > 0) {
        const scenes = data.scenes.map((scene, idx) => ({
          id: scene.framePath || `scene-${idx}-${Date.now()}`, // ID único baseado no framePath
          prompt: scene.prompt || '',
          duration: Number(scene.duration) > 0 ? Number(scene.duration) : 4,
          framePath: scene.framePath || null,
          effect: scene.effect || 'none',
          animation: scene.animation || 'none',
        }));
        setGeneratedScenes(scenes);
        console.log('✅ Cenas atualizadas no estado:', scenes.length);
      } else {
        console.warn('⚠️ Nenhuma cena retornada do servidor');
      }
    } catch (err) {
      console.error('❌ syncScenesFromServer erro:', err);
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

  const removeGeneratedScene = async (index) => {
    const sceneToRemove = generatedScenes[index];
    
    // Remove do estado
    setGeneratedScenes(generatedScenes.filter((_, i) => i !== index));
    
    // Deleta o arquivo físico se existir
    if (sceneToRemove.framePath) {
      try {
        await fetch('/api/delete-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ framePath: sceneToRemove.framePath }),
        });
        console.log('🗑️ Arquivo deletado:', sceneToRemove.framePath);
      } catch (err) {
        console.error('❌ Erro ao deletar arquivo:', err);
      }
    }
  };

  const moveSceneUp = (index) => {
    if (index === 0) return;
    const next = [...generatedScenes];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setGeneratedScenes(next);
  };

  const moveSceneDown = (index) => {
    if (index === generatedScenes.length - 1) return;
    const next = [...generatedScenes];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setGeneratedScenes(next);
  };

  const syncWithAudio = () => {
    if (!audioInfo?.duracaoAudioSemSilencio || generatedScenes.length === 0) {
      alert('⚠️ Certifique-se de ter áudio processado e cenas geradas');
      return;
    }

    const totalDuration = audioInfo.duracaoAudioSemSilencio;
    const numScenes = generatedScenes.length;
    const durationPerScene = totalDuration / numScenes;

    const updated = generatedScenes.map(scene => ({
      ...scene,
      duration: Math.round(durationPerScene * 10) / 10, // Arredonda para 1 casa decimal
    }));

    setGeneratedScenes(updated);
    setStatus(`✅ Tempo distribuído: ${durationPerScene.toFixed(1)}s por cena (${numScenes} cenas = ${totalDuration}s)`);
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

      const totalImages = scenesToGenerate.length * 2; // Whisk gera 2 por prompt
      setStatus(`Frames gerados! Aguarde o download de ${totalImages} imagens...`);

      // 🔔 AVISA A EXTENSÃO: "roda o batch com essas cenas"
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('MY_WHISK_RUN_BATCH', {
            detail: { scenes: scenesToGenerate },
          }),
        );
      }

      // Calcula tempo de espera baseado no número de cenas (≈20s por cena + 10s buffer)
      const estimatedTime = (scenesToGenerate.length * 20 + 10) * 1000;
      setStatus(`Aguardando downloads (${Math.ceil(estimatedTime/1000)}s)... Depois clique em "📥 Importar do Download"`);
      
      setTimeout(async () => {
        await handleAutoImport();
      }, estimatedTime);

    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoImport = async () => {
    setStatus('🔍 Buscando imagens do Whisk nos diretórios de download...');
    setLoading(true);
    try {
      const res = await fetch('/api/import-whisk', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao importar imagens do Whisk');

      if (data.imported === 0) {
        setStatus('⚠️ Nenhuma imagem encontrada. Certifique-se de que as imagens do Whisk foram baixadas. Verifique sua pasta Downloads.');
        return;
      }

      const usedImages = data.downloadedFiles?.slice(0, 3).join(', ') || 'imagens';
      const moreCount = data.downloadedFiles?.length > 3 ? ` e mais ${data.downloadedFiles.length - 3}` : '';
      setStatus(`✅ ${data.imported || 0} imagens importadas (${usedImages}${moreCount})! Sincronizando...`);
      
      console.log('🔄 Chamando syncScenesFromServer...');
      await syncScenesFromServer();
      
      setStatus(`✅ ${data.imported || 0} imagens prontas! Configure duração e efeitos abaixo.`);
    } catch (err) {
      console.error('❌ Erro no import:', err);
      setStatus(`❌ Erro: ${err.message}`);
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
      setAudioDuration(data.duration || 0);
      setStatus(`✅ Áudio carregado: ${data.duration}s de duração`);
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

    setStatus('Salvando configurações...');
    setLoading(true);
    try {
      // Primeiro salva as cenas no metadata
      const saveRes = await fetch('/api/save-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: generatedScenes }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Falha ao salvar cenas');
      
      console.log('✅ Cenas salvas:', saveData.saved);
      
      // Agora renderiza usando o metadata salvo
      setStatus('Renderizando video...');
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao renderizar video');
      setVideoPath(data.videoPath);
      setStatus(`✅ Video criado: ${data.videoPath}`);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
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
            <button type="button" onClick={handleRender} disabled={loading || !audioPath || generatedScenes.length === 0}>
              🎬 Renderizar Vídeo
            </button>
          </div>
          {status && <div className="status">{status}</div>}
        </div>
        {/* Card de Áudio Info */}
        {audioInfo?.duracaoAudioSemSilencio > 0 && (
          <div className="card audio-info-card">
            <div className="audio-info-header">
              <div>
                <p className="label">🎵 Áudio Pronto</p>
                <p className="tiny">Sincronize o tempo com as imagens</p>
              </div>
              <div className="audio-duration-badge">
                {audioInfo.duracaoAudioSemSilencio}s
              </div>
            </div>
            
            {generatedScenes.length > 0 && (
              <div className="sync-section">
                <div className="sync-info">
                  <span>🎬 {generatedScenes.length} cenas</span>
                  <span>⏱️ Total: {generatedScenes.reduce((sum, s) => sum + s.duration, 0).toFixed(1)}s</span>
                </div>
                <button 
                  onClick={syncWithAudio}
                  className="btn-sync"
                  disabled={loading}
                >
                  🔄 Sincronizar com Áudio
                </button>
              </div>
            )}
            
            {audioInfo.audioSemSilencio && (
              <audio 
                controls 
                src={audioInfo.audioSemSilencio} 
                style={{ width: '100%', marginTop: '1rem' }}
              />
            )}
          </div>
        )}

        <div className="card upload">
          <p className="label">Áudio (Legado)</p>
          <input type="file" accept="audio/*" onChange={handleAudioUpload} />
          {audioPath ? (
            <div>
              <p className="tiny">✅ Áudio carregado</p>
              {audioDuration > 0 && (
                <p className="tiny" style={{ fontWeight: 'bold', color: '#4CAF50' }}>
                  ⏱️ Duração: {audioDuration}s
                  {generatedScenes.length > 0 && (
                    <span style={{ marginLeft: '8px', color: '#666' }}>
                      | Cenas: {generatedScenes.reduce((sum, s) => sum + s.duration, 0)}s
                    </span>
                  )}
                </p>
              )}
            </div>
          ) : (
            <p className="tiny">Envie um .mp3/.wav</p>
          )}
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={handleAutoImport} disabled={loading} style={{ fontSize: '0.875rem' }}>
              📥 Importar do Download
            </button>
            <button type="button" onClick={addPrompt} className="ghost">
              + Adicionar prompt
            </button>
          </div>
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
              <div key={scene.id || idx} className="scene-card">
                {/* Thumbnail */}
                <div className="scene-thumb">
                  {scene.framePath ? (
                    <img
                      src={`/api/frame?path=${encodeURIComponent(scene.framePath)}&t=${Date.now()}`}
                      alt={`Cena ${idx + 1}`}
                      key={`${scene.id}-${idx}`}
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

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      type="button" 
                      className="ghost" 
                      onClick={() => moveSceneUp(idx)}
                      disabled={idx === 0}
                      title="Mover para cima"
                    >
                      ⬆️
                    </button>
                    <button 
                      type="button" 
                      className="ghost" 
                      onClick={() => moveSceneDown(idx)}
                      disabled={idx === generatedScenes.length - 1}
                      title="Mover para baixo"
                    >
                      ⬇️
                    </button>
                    <button 
                      type="button" 
                      className="ghost danger" 
                      onClick={() => removeGeneratedScene(idx)}
                      style={{ marginLeft: 'auto' }}
                    >
                      🗑️ Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

