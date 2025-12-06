// pages/api/import-whisk.js
import { importWhiskFrames } from '../../src/import-whisk-frames.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await importWhiskFrames();
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[/api/import-whisk] Erro:', err);
    return res.status(500).json({ error: err.message });
  }
}
