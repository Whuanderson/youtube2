import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import formidable from 'formidable';
import { outputDir } from '../../src/config.js';

const mkdir = promisify(fs.mkdir);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uploadsDir = path.join(outputDir, 'uploads');
  await mkdir(uploadsDir, { recursive: true });

  const form = formidable({
    multiples: false,
    uploadDir: uploadsDir,
    keepExtensions: true,
    filename: (_name, _ext, part) => {
      const safeName = (part.originalFilename || 'audio')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .toLowerCase();
      const stamp = Date.now();
      return `${stamp}-${safeName}`;
    },
  });

  form.parse(req, (err, _fields, files) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    const file = files.file || files.audio;
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Use field name "file" ou "audio".' });
    }

    const storedPath = Array.isArray(file) ? file[0].filepath : file.filepath;
    return res.status(200).json({ ok: true, audioPath: storedPath });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
