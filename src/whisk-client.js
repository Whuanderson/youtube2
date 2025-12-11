import { spawn } from 'child_process';
import path from 'path';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function generatePlaceholderImage({ prompt, outputPath, width, height }) {
  // Placeholder: gera uma imagem lisa via ffmpeg (sem texto para evitar erro Fontconfig)
  const color = '0x1e1e1e';

  await run('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=${color}:s=${width}x${height}:d=1`,
    '-frames:v',
    '1',
    '-update',
    '1',
    outputPath,
  ]);
}

/**
 * Substitua esta função para conectar a sua automação Whisk (extensão ou API).
 * Ela recebe o prompt e deve salvar a imagem em outputPath.
 */
async function generateImage({ prompt, outputPath, width, height }) {
  // TODO: plugar chamada real do Whisk Automator aqui (ex: HTTP local, puppeteer, websocket).
  // Se tiver um comando próprio para gerar imagens, exponha via WHISK_COMMAND="node cli.js --prompt=%s --out=%o".
  if (process.env.WHISK_COMMAND) {
    const template = process.env.WHISK_COMMAND;
    const promptArg = prompt.replace(/"/g, '\\"');
    const cmd = template.replace('%s', promptArg).replace('%o', outputPath);
    const parts = cmd.split(' ').filter(Boolean);
    const [bin, ...args] = parts;
    await run(bin, args);
    return;
  }

  await generatePlaceholderImage({ prompt, outputPath, width, height });
}

function getFramePath(baseDir, index) {
  const padded = String(index + 1).padStart(3, '0');
  return path.join(baseDir, `frame-${padded}.png`);
}

export { generateImage, getFramePath };
