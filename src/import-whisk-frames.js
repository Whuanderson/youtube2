// src/import-whisk-frames.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { framesDir as FRAMES_DIR, metadataPath } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenta múltiplos locais onde as imagens podem ter sido baixadas
function getPossibleDownloadDirs() {
  const userHome = process.env.USERPROFILE || process.env.HOME;
  return [
    // Pasta customizada se definida
    process.env.WHISK_DOWNLOAD_DIR,
    // Pasta Downloads/whisk
    path.join(userHome, 'Downloads', 'whisk'),
    // Pasta Downloads padrão (onde o navegador baixa por padrão)
    path.join(userHome, 'Downloads'),
    // Desktop como alternativa
    path.join(userHome, 'Desktop'),
  ].filter(Boolean);
}

function findWhiskImages() {
  const dirs = getPossibleDownloadDirs();
  let allFiles = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    
    try {
      const files = fs
        .readdirSync(dir)
        .filter(isImageFile)
        .filter(name => {
          // Filtra apenas imagens que parecem ser do Whisk (recentes)
          const full = path.join(dir, name);
          const stat = fs.statSync(full);
          const ageMinutes = (Date.now() - stat.mtimeMs) / 1000 / 60;
          return ageMinutes < 30; // apenas últimos 30 minutos
        })
        .map(name => {
          const full = path.join(dir, name);
          const stat = fs.statSync(full);
          return { name, full, mtime: stat.mtimeMs, dir };
        });
      
      allFiles = allFiles.concat(files);
    } catch (err) {
      console.warn(`Não foi possível ler ${dir}:`, err.message);
    }
  }

  // Ordena por data de modificação (mais recentes primeiro)
  return allFiles.sort((a, b) => b.mtime - a.mtime);
}

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

/**
 * Aguarda até que tenhamos pelo menos N imagens recentes.
 * @param {number} expectedCount - Número de imagens esperadas
 * @param {number} maxWaitMs - Tempo máximo de espera em milissegundos
 * @param {number} pollIntervalMs - Intervalo entre verificações
 * @returns {Promise<number>} - Número de imagens encontradas
 */
async function waitForDownloads(expectedCount, maxWaitMs = 30000, pollIntervalMs = 1000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const files = findWhiskImages();
    
    console.log(`📊 Aguardando downloads: ${files.length}/${expectedCount} imagens prontas...`);
    
    if (files.length > 0) {
      const locations = [...new Set(files.map(f => f.dir))];
      console.log(`   Locais verificados: ${locations.join(', ')}`);
    }
    
    if (files.length >= expectedCount) {
      console.log(`✅ Todas as ${expectedCount} imagens estão prontas!`);
      return files.length;
    }
    
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  
  const files = findWhiskImages();
  console.warn(`⚠️ Timeout: apenas ${files.length}/${expectedCount} imagens encontradas.`);
  return files.length;
}

export async function importWhiskFrames(waitForComplete = true) {
  const dirs = getPossibleDownloadDirs().filter(d => fs.existsSync(d));
  console.log('📂 Locais de busca:', dirs.join(', '));
  console.log('🎬 FRAMES_DIR:', FRAMES_DIR);

  ensureDir(FRAMES_DIR);

  const scenesCount = readScenesCount();
  
  // Se waitForComplete=true, aguarda todas as imagens serem baixadas
  // Whisk gera 2 imagens por prompt, então esperamos scenesCount * 2
  if (waitForComplete && scenesCount > 0) {
    const expectedImages = scenesCount * 2;
    console.log(`⏳ Aguardando ${expectedImages} imagens (${scenesCount} prompts × 2) serem baixadas...`);
    await waitForDownloads(expectedImages, 90000, 2000); // 90s max, verifica a cada 2s
  }

  // limpa frames antigos na pasta do projeto
  const oldFrames = fs.readdirSync(FRAMES_DIR);
  for (const file of oldFrames) {
    fs.unlinkSync(path.join(FRAMES_DIR, file));
  }

  // busca imagens recentes do Whisk em múltiplos locais
  let files = findWhiskImages();

  if (!files.length) {
    console.log('⚠️ Nenhuma imagem recente encontrada nos diretórios de download.');
    console.log('   Dica: Verifique se as imagens foram baixadas nos últimos 30 minutos.');
    return { imported: 0, frames: [], downloadedFiles: [] };
  }

  console.log(`✅ Encontradas ${files.length} imagens recentes:`);
  files.forEach((f, i) => {
    const ageMinutes = Math.round((Date.now() - f.mtime) / 1000 / 60);
    console.log(`   ${i + 1}. ${f.name} (${ageMinutes}min atrás, em ${path.basename(f.dir)})`);
  });

  // Whisk gera 2 imagens por prompt. Usamos TODAS elas!
  // Se temos 3 prompts, teremos 6 imagens e todas serão usadas no vídeo
  if (scenesCount > 0 && files.length >= scenesCount * 2) {
    // Usa todas as imagens (scenesCount * 2)
    files = files.slice(0, scenesCount * 2);
    console.log(`📸 Usando TODAS as ${files.length} imagens geradas (2 por prompt)`);
  } else if (scenesCount > 0 && files.length > scenesCount) {
    // fallback: pega as N mais recentes
    files = files.slice(0, scenesCount);
  }

  console.log(`🖼️ Importando ${files.length} imagens do Whisk.`);

  const newFramePaths = [];
  const downloadedFiles = []; // ⬅️ nomes dos arquivos originais baixados

  files.forEach((file, index) => {
    const ext = path.extname(file.name).toLowerCase() || '.jpg';
    const frameName = `frame-${zeroPad(index + 1, 3)}${ext}`;
    const dest = path.join(FRAMES_DIR, frameName);

    fs.copyFileSync(file.full, dest);
    newFramePaths.push(dest);
    downloadedFiles.push(file.name); // ⬅️ guarda nome original
    console.log(`➡️  ${file.name} -> ${frameName}`);

    // remove original pra não reaproveitar em imports futuros
    try {
      fs.unlinkSync(file.full);
    } catch (err) {
      console.warn('Não foi possível apagar arquivo original:', file.full, err.message);
    }
  });

  // Limpa todas as outras imagens não usadas em todos os locais
  const allRemainingFiles = findWhiskImages();
  
  if (allRemainingFiles.length > 0) {
    console.log(`🧹 Limpando ${allRemainingFiles.length} imagens não utilizadas...`);
    allRemainingFiles.forEach((file) => {
      try {
        fs.unlinkSync(file.full);
        console.log(`   🗑️  ${file.name} (de ${file.dir})`);
      } catch (err) {
        console.warn('Não foi possível apagar:', file.name, err.message);
      }
    });
  }

  // atualiza ou cria metadata com os novos framePath
  let meta = null;
  try {
    if (fs.existsSync(metadataPath)) {
      const raw = fs.readFileSync(metadataPath, 'utf8');
      meta = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('⚠️ Não foi possível ler metadata existente:', err.message);
  }

  // Se não existe metadata ou não tem scenes, cria do zero
  if (!meta) {
    meta = {
      width: 1920,
      height: 1080,
      fps: 30,
      framesDir: FRAMES_DIR,
      generatedAt: new Date().toISOString(),
    };
  }

  // Cria scenes para TODAS as imagens importadas
  meta.scenes = newFramePaths.map((framePath, idx) => {
    const existingScene = meta.scenes?.[idx];
    return {
      index: idx,
      prompt: existingScene?.prompt || downloadedFiles[idx] || `Frame ${idx + 1}`,
      duration: existingScene?.duration || 4,
      framePath: framePath,
      effect: existingScene?.effect || 'none',
      animation: existingScene?.animation || 'none',
    };
  });

  meta.generatedAt = new Date().toISOString();
  meta.framesDir = FRAMES_DIR;

  fs.writeFileSync(metadataPath, JSON.stringify(meta, null, 2));
  console.log(`📝 Metadata atualizada com ${meta.scenes.length} scenes.`);

  console.log('✅ Importação concluída.');
  return { 
    imported: newFramePaths.length, 
    frames: newFramePaths,
    downloadedFiles // ⬅️ retorna os nomes originais baixados
  };
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
