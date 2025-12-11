// pages/api/save-scenes.js
import fs from 'fs';
import { metadataPath } from '../../src/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scenes } = req.body || {};
  if (!Array.isArray(scenes)) {
    return res.status(400).json({ error: 'scenes deve ser um array' });
  }

  try {
    let meta = {};
    
    // Tenta ler metadata existente
    if (fs.existsSync(metadataPath)) {
      const raw = fs.readFileSync(metadataPath, 'utf8');
      meta = JSON.parse(raw);
    }

    // Atualiza scenes mantendo estrutura
    meta.scenes = scenes.map((scene, idx) => ({
      index: idx,
      prompt: scene.prompt || '',
      duration: Number(scene.duration) > 0 ? Number(scene.duration) : 4,
      framePath: scene.framePath || '',
      effect: scene.effect || 'none',
      animation: scene.animation || 'none',
    }));

    meta.generatedAt = new Date().toISOString();

    fs.writeFileSync(metadataPath, JSON.stringify(meta, null, 2));
    
    return res.status(200).json({ ok: true, saved: meta.scenes.length });
  } catch (err) {
    console.error('[/api/save-scenes] Erro:', err);
    return res.status(500).json({ error: err.message });
  }
}
