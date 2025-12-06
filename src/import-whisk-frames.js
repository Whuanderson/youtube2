// src/import-whisk-frames.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { framesDir as FRAMES_DIR, metadataPath } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// onde o Chrome salva os downloads do Whisk
const WHISK_DOWNLOAD_DIR =
  process.env.WHISK_DOWNLOAD_DIR ||
  path.join(
    process.env.USERPROFILE || process.env.HOME,
    'Downloads',
    'whisk',
  );

function zeroPad(n, width) {
  return String(n).padStart(width, '0');
}

function isImageFile(name) {
  return /\.(png|jpe?g|webp)$/i.test(name);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function importWhiskFrames() {
  console.log('📂 WHISK_DOWNLOAD_DIR:', WHISK_DOWNLOAD_DIR);
  console.log('🎬 FRAMES_DIR:', FRAMES_DIR);

  ensureDir(WHISK_DOWNLOAD_DIR);
  ensureDir(FRAMES_DIR);

  // limpa frames antigos
  const oldFrames = fs.readdirSync(FRAMES_DIR);
  for (const file of oldFrames) {
    fs.unlinkSync(path.join(FRAMES_DIR, file));
  }

  // lista imagens baixadas do Whisk
  const files = fs
    .readdirSync(WHISK_DOWNLOAD_DIR)
    .filter(isImageFile)
    .map((name) => {
      const full = path.join(WHISK_DOWNLOAD_DIR, name);
      const stat = fs.statSync(full);
      return { name, full, mtime: stat.mtimeMs };
    })
    .sort((a, b) => a.mtime - b.mtime); // mais antigas primeiro

  if (files.length === 0) {
    console.log('⚠️ Nenhuma imagem encontrada em', WHISK_DOWNLOAD_DIR);
    return { imported: 0, frames: [] };
  }

  console.log(`🖼️ Encontradas ${files.length} imagens do Whisk.`);

  const newFramePaths = [];

  files.forEach((file, index) => {
    const ext = path.extname(file.name).toLowerCase() || '.jpg';
    const frameName = `frame-${zeroPad(index + 1, 3)}${ext}`;
    const dest = path.join(FRAMES_DIR, frameName);

    fs.copyFileSync(file.full, dest);
    newFramePaths.push(dest);
    console.log(`➡️  ${file.name} -> ${frameName}`);
  });

  // Atualiza scenes.generated.json com os novos caminhos
  let meta = null;
  try {
    if (fs.existsSync(metadataPath)) {
      const raw = fs.readFileSync(metadataPath, 'utf8');
      meta = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('⚠️ Não foi possível ler metadata para atualizar framePath:', err.message);
  }

  if (meta && Array.isArray(meta.scenes)) {
    meta.scenes = meta.scenes.map((scene, idx) => ({
      ...scene,
      framePath: newFramePaths[idx] || scene.framePath,
    }));

    fs.writeFileSync(metadataPath, JSON.stringify(meta, null, 2));
    console.log('📝 metadata atualizada com novos framePath.');
  } else {
    console.log('⚠️ metadata não encontrada ou sem scenes, nada para atualizar.');
  }

  console.log('✅ Importação concluída.');
  return { imported: newFramePaths.length, frames: newFramePaths };
}

// permitir rodar standalone: node src/import-whisk-frames.js
const isDirectRun =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  importWhiskFrames().catch((err) => {
    console.error('Erro ao importar frames do Whisk:', err);
    process.exit(1);
  });
}
