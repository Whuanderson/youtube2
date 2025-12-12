import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { spawn } from 'child_process';
import formidable from 'formidable';
import { outputDir } from '../../src/config.js';

const mkdir = promisify(fs.mkdir);

function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ];
    
    const child = spawn('ffprobe', args);
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 0 : duration);
      } else {
        resolve(0); // fallback se ffprobe falhar
      }
    });
    
    child.on('error', () => resolve(0));
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Usa process.cwd() para garantir que sempre aponta para a raiz do projeto
  const projectRoot = process.cwd();
  const uploadsDir = path.join(projectRoot, 'output', 'uploads');
  await mkdir(uploadsDir, { recursive: true });
  
  console.log('📍 Diretório de upload:', uploadsDir);

  const form = formidable({
    multiples: false,
    uploadDir: uploadsDir,
    keepExtensions: true,
    maxFileSize: 500 * 1024 * 1024, // 500MB
    maxTotalFileSize: 500 * 1024 * 1024,
    filename: (_name, _ext, part) => {
      const safeName = (part.originalFilename || 'audio')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .toLowerCase();
      const stamp = Date.now();
      return `${stamp}-${safeName}`;
    },
  });

  form.parse(req, async (err, _fields, files) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('❌ Erro no upload:', err);
      return res.status(500).json({ error: err.message });
    }
    const file = files.file || files.audio;
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Use field name "file" ou "audio".' });
    }

    const storedPath = Array.isArray(file) ? file[0].filepath : file.filepath;
    
    console.log('📤 Upload concluído:');
    console.log('   📁 Path completo:', storedPath);
    console.log('   ✅ Arquivo existe?', fs.existsSync(storedPath));
    
    const duration = await getAudioDuration(storedPath);
    
    // Retorna URL acessível pelo navegador
    const fileName = path.basename(storedPath);
    const audioUrl = `/api/download?file=uploads/${fileName}`;
    
    console.log('   🔗 URL gerada:', audioUrl);
    
    return res.status(200).json({ 
      ok: true, 
      audioPath: audioUrl,
      duration: Math.round(duration * 10) / 10 // arredonda para 1 casa decimal
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
