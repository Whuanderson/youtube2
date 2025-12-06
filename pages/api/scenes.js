// pages/api/scenes.js
import fs from 'fs';
import { metadataPath } from '../../src/config.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'scenes.generated.json não encontrado' });
    }

    const raw = fs.readFileSync(metadataPath, 'utf8');
    const meta = JSON.parse(raw);

    const scenes = Array.isArray(meta.scenes) ? meta.scenes : [];

    return res.status(200).json({
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      framesDir: meta.framesDir,
      generatedAt: meta.generatedAt,
      scenes,
    });
  } catch (err) {
    console.error('[/api/scenes] Erro:', err);
    return res.status(500).json({ error: err.message });
  }
}
