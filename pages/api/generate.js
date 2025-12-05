import { generateFrames, writeMetadata, ensureFolders } from '../../src/generate-images.js';
import { metadataPath, framesDir } from '../../src/config.js';

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

  try {
    await ensureFolders();
    const scenes = normalizeScenes(req.body?.scenes || []);
    const entries = await generateFrames(scenes);
    await writeMetadata(entries);

    return res.status(200).json({
      ok: true,
      framesDir,
      metadataPath,
      scenes: entries,
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
