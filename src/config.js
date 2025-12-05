import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const fps = 30;
export const width = 1920;
export const height = 1080;
export const outputDir = path.join(__dirname, '..', 'output');
export const framesDir = path.join(outputDir, 'frames');
export const concatListPath = path.join(outputDir, 'concat.txt');
export const metadataPath = path.join(outputDir, 'scenes.generated.json');
