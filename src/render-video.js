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
  await writeConcatFile(scenes);

  const finalOutput = outputPath
    ? path.isAbsolute(outputPath)
      ? outputPath
      : path.join(process.cwd(), outputPath)
    : path.join(outputDir, 'final.mp4');

  const args = [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatListPath,
    '-i',
    audioPath,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(fps),
    '-s',
    `${width}x${height}`,
    '-c:a',
    'aac',
    '-shortest',
    finalOutput,
  ];

  await run('ffmpeg', args);
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
