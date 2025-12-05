import path from 'path';
import { renderVideo } from '../../src/render-video.js';
import {
  generateFrames,
  writeMetadata,
  ensureFolders,
} from '../../src/generate-images.js';
import { metadataPath } from '../../src/config.js';

function normalizeScenes(scenes) {
  if (!Array.isArray(scenes)) return [];
  return scenes.map((scene) => ({
    prompt: scene.prompt || '',
    duration: Number(scene.duration) > 0 ? Number(scene.duration) : 4,
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audioPath, scenes, out } = req.body || {};
  if (!audioPath) {
    return res.status(400).json({ error: 'audioPath é obrigatório' });
  }

  try {
    if (scenes && scenes.length) {
      await ensureFolders();
      const normalized = normalizeScenes(scenes);
      const entries = await generateFrames(normalized);
      await writeMetadata(entries);
    }

    const videoPath = await renderVideo({
      audioPath,
      outputPath: out && out.trim() ? out : undefined,
      metaPath: metadataPath,
    });

    return res.status(200).json({
      ok: true,
      videoPath: path.isAbsolute(videoPath) ? videoPath : path.join(process.cwd(), videoPath),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
