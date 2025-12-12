import { useRouter } from 'next/router';
import { useState } from 'react';

const steps = [
  { id: 'roteiro', label: '📝 Roteiro', path: '/roteiro' },
  { id: 'tts', label: '🎙️ TTS', path: '/tts' },
  { id: 'imagens', label: '🎨 Imagens', path: '/' },
  { id: 'gerar', label: '🎬 Gerar Vídeo', path: '/gerar' },
  { id: 'seo', label: '🔍 YouTube SEO', path: '/seo' },
  { id: 'thumbnail', label: '🖼️ Thumbnail', path: '/thumbnail' },
  { id: 'publicar', label: '🚀 Publicar', path: '/publicar' },
];

export default function Sidebar() {
  const router = useRouter();
  const currentPath = router.pathname;
  const [loading, setLoading] = useState(false);

  const handleLimparRascunho = async () => {
    if (!confirm('⚠️ Tem certeza que deseja cancelar e apagar todo o rascunho?\n\nIsso irá deletar:\n- Roteiro\n- Legendas SRT\n- Áudios\n- Imagens geradas\n- Prompts salvos')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/limpar-rascunho', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('✅ Rascunho limpo com sucesso!');
      router.push('/roteiro');
    } catch (err) {
      alert(`❌ Erro ao limpar rascunho: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>YouTube Studio</h2>
        <p className="sidebar-subtitle">Criação Completa</p>
        <p className="sidebar-hint">💾 Salva automaticamente</p>
      </div>
      
      <nav className="sidebar-nav">
        {steps.map((step, idx) => {
          const isActive = currentPath === step.path;
          const isCompleted = false; // TODO: implementar lógica de conclusão
          
          return (
            <button
              key={step.id}
              onClick={() => router.push(step.path)}
              className={`sidebar-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              <span className="step-number">{idx + 1}</span>
              <span className="step-label">{step.label}</span>
              {isCompleted && <span className="step-check">✓</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button 
          onClick={handleLimparRascunho} 
          disabled={loading}
          className="btn-danger"
        >
          {loading ? '🔄 Limpando...' : '🗑️ Cancelar Rascunho'}
        </button>
        <p className="tiny" style={{ marginTop: '0.5rem', opacity: 0.7 }}>
          💡 Apaga tudo e começa do zero
        </p>
      </div>
    </aside>
  );
}
