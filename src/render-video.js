import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { pathToFileURL } from 'url';
import {
  concatListPath,
  metadataPath,
  outputDir,
  width as defaultWidth,
  height as defaultHeight,
  fps as defaultFps,
} from './config.js';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function argValue(name) {
  const match = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (match) return match.split('=')[1];
  return undefined;
}

async function loadMetadata(metaPath) {
  const absolute = path.isAbsolute(metaPath) ? metaPath : path.join(process.cwd(), metaPath);
  const content = await fs.readFile(absolute, 'utf8');
  const parsed = JSON.parse(content);
  if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
    throw new Error('Arquivo de metadata invalido: scenes ausente.');
  }
  return parsed;
}

function buildConcatFile(scenes) {
  const lines = [];
  scenes.forEach((scene, idx) => {
    const filePath = scene.framePath;
    const safePath = filePath.replace(/'/g, "''");
    lines.push(`file '${safePath}'`);
    lines.push(`duration ${scene.duration}`);
    if (idx === scenes.length - 1) {
      lines.push(`file '${safePath}'`); // repete ultimo para respeitar a duracao final
    }
  });
  return lines.join('\n');
}

function buildVideoFilter(scene, width, height, fps) {
  const filters = [];
  const duration = scene.duration || 4;
  
  // Base: sempre escala e centraliza primeiro
  filters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
  filters.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`);
  
  // Gera frames no FPS correto
  filters.push(`fps=${fps}`)
  
  // IMPORTANTE: limita a exatamente N frames (duração × fps)
  const maxFrames = Math.floor(duration * fps);
  filters.push(`trim=end_frame=${maxFrames}`);
  filters.push(`setpts=PTS-STARTPTS`)
  
  // Efeitos visuais (aplicados DEPOIS do trim)
  switch (scene.effect) {
    case 'fade':
      const fadeInDuration = Math.min(0.5, duration / 4);
      const fadeOutStart = Math.max(0, duration - 0.5);
      filters.push(`fade=t=in:st=0:d=${fadeInDuration}`);
      if (duration > 1) {
        filters.push(`fade=t=out:st=${fadeOutStart}:d=0.5`);
      }
      break;
    case 'blur':
      filters.push('boxblur=2:1');
      break;
    case 'brightness':
      filters.push('eq=brightness=0.15');
      break;
    case 'sepia':
      filters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
      break;
  }
  
  // Animação estática (zoom/pan sem movimento por enquanto)
  switch (scene.animation) {
    case 'zoom-in':
    case 'zoom-out':
      // Mantém estático até corrigir zoompan
      break;
  }
  
  return filters.length > 0 ? filters.join(',') : null;
}

async function writeConcatFile(scenes) {
  const content = buildConcatFile(scenes);
  await fs.writeFile(concatListPath, content, 'utf8');
}

export async function renderVideo({
  audioPath,
  outputPath,
  metaPath = metadataPath,
  fps = defaultFps,
  width = defaultWidth,
  height = defaultHeight,
}) {
  if (!audioPath) throw new Error('Informe --audio=CAMINHO_DO_ARQUIVO');

  const metadata = await loadMetadata(metaPath);
  const scenes = metadata.scenes.map((scene) => ({
    ...scene,
    duration: Number(scene.duration) > 0 ? Number(scene.duration) : 4,
  }));

  await fs.mkdir(outputDir, { recursive: true });

  const finalOutput = outputPath
    ? path.isAbsolute(outputPath)
      ? outputPath
      : path.join(process.cwd(), outputPath)
    : path.join(outputDir, 'final.mp4');

  // Se nenhuma cena tem efeitos/animações, usa o método concat simples (mais rápido)
  const hasEffects = scenes.some(s => (s.effect && s.effect !== 'none') || (s.animation && s.animation !== 'none'));
  
  if (!hasEffects) {
    // Método simples e rápido com concat
    await writeConcatFile(scenes);
    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-i', audioPath,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      '-s', `${width}x${height}`,
      '-c:a', 'aac',
      '-shortest',
      finalOutput,
    ];
    await run('ffmpeg', args);
  } else {
    // Método com filtros complexos para aplicar efeitos/animações
    console.log('🎨 Aplicando efeitos e animações em', scenes.length, 'cenas');
    const args = ['-y'];
    
    // Adiciona cada imagem como input com framerate definido
    scenes.forEach((scene, idx) => {
      console.log(`  Cena ${idx + 1}: ${scene.animation || 'none'} + ${scene.effect || 'none'} (${scene.duration}s)`);
      args.push('-loop', '1', '-framerate', '1', '-t', String(scene.duration), '-i', scene.framePath);
    });
    
    // Adiciona áudio
    args.push('-i', audioPath);
    
    // Constrói filtros complexos
    const filterParts = [];
    scenes.forEach((scene, idx) => {
      const filter = buildVideoFilter(scene, width, height, fps);
      filterParts.push(`[${idx}:v]${filter}[v${idx}]`);
    });
    
    // Concatena todos os vídeos processados
    const concatInputs = scenes.map((_, idx) => `[v${idx}]`).join('');
    filterParts.push(`${concatInputs}concat=n=${scenes.length}:v=1:a=0,fps=${fps}[outv]`);
    
    args.push('-filter_complex', filterParts.join(';'));
    args.push('-map', '[outv]');
    args.push('-map', `${scenes.length}:a`);
    args.push('-c:v', 'libx264');
    args.push('-preset', 'fast');
    args.push('-pix_fmt', 'yuv420p');
    args.push('-c:a', 'aac');
    args.push('-b:a', '192k');
    args.push('-shortest');
    args.push(finalOutput);
    
    console.log('🎬 Renderizando com efeitos/animações...');
    await run('ffmpeg', args);
  }

  return finalOutput;
}

export async function main() {
  const audioPath = argValue('audio');
  const outputPath = argValue('out');
  const metaPath = argValue('meta') || metadataPath;

  const videoPath = await renderVideo({ audioPath, outputPath, metaPath });
  // eslint-disable-next-line no-console
  console.log(`Video criado: ${videoPath}`);
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

export { writeConcatFile, buildConcatFile };
