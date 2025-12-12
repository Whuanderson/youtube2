import { useRouter } from 'next/router';

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

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>YouTube Studio</h2>
        <p className="sidebar-subtitle">Criação Completa</p>
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
    </aside>
  );
}
