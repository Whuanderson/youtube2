// src/import-whisk-frames.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { framesDir as FRAMES_DIR, metadataPath } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function readScenesCount() {
  try {
    if (!fs.existsSync(metadataPath)) return 0;
    const raw = fs.readFileSync(metadataPath, 'utf8');
    const meta = JSON.parse(raw);
    return Array.isArray(meta.scenes) ? meta.scenes.length : 0;
  } catch {
    return 0;
  }
}

export async function importWhiskFrames() {
  console.log('📂 WHISK_DOWNLOAD_DIR:', WHISK_DOWNLOAD_DIR);
  console.log('🎬 FRAMES_DIR:', FRAMES_DIR);

  ensureDir(WHISK_DOWNLOAD_DIR);
  ensureDir(FRAMES_DIR);

  const scenesCount = readScenesCount();

  // limpa frames antigos na pasta do projeto
  const oldFrames = fs.readdirSync(FRAMES_DIR);
  for (const file of oldFrames) {
    fs.unlinkSync(path.join(FRAMES_DIR, file));
  }

  // imagens baixadas do Whisk
  let files = fs
    .readdirSync(WHISK_DOWNLOAD_DIR)
    .filter(isImageFile)
    .map((name) => {
      const full = path.join(WHISK_DOWNLOAD_DIR, name);
      const stat = fs.statSync(full);
      return { name, full, mtime: stat.mtimeMs };
    })
    .sort((a, b) => a.mtime - b.mtime);

  if (!files.length) {
    console.log('⚠️ Nenhuma imagem encontrada em', WHISK_DOWNLOAD_DIR);
    return { imported: 0, frames: [] };
  }

  // pega só as N mais recentes, onde N = scenesCount (se for > 0)
  if (scenesCount > 0 && files.length > scenesCount) {
    files = files.slice(files.length - scenesCount);
  }

  console.log(`🖼️ Importando ${files.length} imagens do Whisk.`);

  const newFramePaths = [];

  files.forEach((file, index) => {
    const ext = path.extname(file.name).toLowerCase() || '.jpg';
    const frameName = `frame-${zeroPad(index + 1, 3)}${ext}`;
    const dest = path.join(FRAMES_DIR, frameName);

    fs.copyFileSync(file.full, dest);
    newFramePaths.push(dest);
    console.log(`➡️  ${file.name} -> ${frameName}`);

    // remove original pra não reaproveitar em imports futuros
    try {
      fs.unlinkSync(file.full);
    } catch (err) {
      console.warn('Não foi possível apagar arquivo original:', file.full, err.message);
    }
  });

  // atualiza metadata com os novos framePath
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

// permitir rodar standalone
const isDirectRun =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  importWhiskFrames().catch((err) => {
    console.error('Erro ao importar frames do Whisk:', err);
    process.exit(1);
  });
}
