// pages/api/scenes.js (opcional, só pra debug)
import fs from 'fs';
import { metadataPath } from '../../src/config.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!fs.existsSync(metadataPath)) {
      return res.status(200).json({ scenes: [] });
    }
    const raw = fs.readFileSync(metadataPath, 'utf8');
    const meta = JSON.parse(raw);
    return res.status(200).json({ scenes: meta.scenes || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
