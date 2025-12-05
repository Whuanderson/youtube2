import { pathToFileURL } from 'url';
import { loadScenes, generateFrames, writeMetadata } from './generate-images.js';
import { renderVideo } from './render-video.js';
import { metadataPath } from './config.js';

function argValue(name) {
  const match = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (match) return match.split('=')[1];
  return undefined;
}

export async function main() {
  const audioPath = argValue('audio');
  const scenesPath = argValue('scenes');
  const outputPath = argValue('out');

  const scenes = await loadScenes(scenesPath);
  const entries = await generateFrames(scenes);
  await writeMetadata(entries);

  if (!audioPath) {
    // eslint-disable-next-line no-console
    console.log('Frames gerados. Para renderizar informe o audio com --audio=caminho_do_arquivo.');
    return;
  }

  const videoPath = await renderVideo({
    audioPath,
    outputPath,
    metaPath: metadataPath,
  });

  // eslint-disable-next-line no-console
  console.log(`Pronto! Video em ${videoPath}`);
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
