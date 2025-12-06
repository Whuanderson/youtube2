import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { framesDir, metadataPath, width, height, fps } from './config.js';
import { generateImage, getFramePath } from './whisk-client.js';

const DEFAULT_SCENES = [
  { prompt: 'Cena de introducao vibrante para YouTube', duration: 5 },
  { prompt: 'Momento principal com foco no produto ou ideia', duration: 6 },
  { prompt: 'Fechamento com call to action e logo', duration: 4 },
];

function argValue(name) {
  const match = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (match) return match.split('=')[1];
  return undefined;
}

async function loadScenes(scenesPathInput) {
  const scenesPath = scenesPathInput || argValue('scenes');
  if (!scenesPath) return DEFAULT_SCENES;

  const absolute = path.isAbsolute(scenesPath)
    ? scenesPath
    : path.join(process.cwd(), scenesPath);

  const content = await fs.readFile(absolute, 'utf8');
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error('Arquivo de cenas deve ser um array de objetos { prompt, duration }.');
  }
  return parsed.map((scene) => ({
    prompt: scene.prompt || '',
    duration: Number(scene.duration) > 0 ? Number(scene.duration) : 4,
  }));
}

async function ensureFolders() {
  await fs.mkdir(framesDir, { recursive: true });
}

async function generateFrames(scenes) {
  await ensureFolders();
  const entries = [];

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const outputPath = getFramePath(framesDir, i);

    // eslint-disable-next-line no-console
    console.log(`Gerando frame ${i + 1}/${scenes.length}...`);
    await generateImage({
      prompt: scene.prompt,
      outputPath,
      width,
      height,
      fps,
    });

    entries.push({
      index: i,
      prompt: scene.prompt,
      duration: scene.duration,
      framePath: outputPath,
    });
  }

  return entries;
}

async function writeMetadata(entries) {
  const payload = {
    width,
    height,
    fps,
    framesDir,
    generatedAt: new Date().toISOString(),
    pendingBatch: true,        // 👈 marca que tem batch pendente
    scenes: entries,
  };

  await fs.writeFile(metadataPath, JSON.stringify(payload, null, 2));
}

export async function main() {
  await ensureFolders();
  const scenes = await loadScenes();
  const entries = await generateFrames(scenes);
  await writeMetadata(entries);

  // eslint-disable-next-line no-console
  console.log(`Frames prontos em ${framesDir}`);
  // eslint-disable-next-line no-console
  console.log(`Ajuste duracoes/prompt em ${metadataPath} antes de renderizar o video.`);
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

export { generateFrames, loadScenes, writeMetadata, ensureFolders };
