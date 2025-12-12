import path from 'path';

export default async function handler(req, res) {
  try {
    const videoPath = path.join(process.cwd(), 'output', 'final.mp4');
    res.status(200).json({ videoPath });
  } catch (err) {
    console.error('Erro ao carregar vídeo:', err);
    res.status(500).json({ error: err.message });
  }
}
