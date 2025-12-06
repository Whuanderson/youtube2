// src/import-whisk-frames.mjs
import fs from "fs";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Ajuste este caminho se quiser: onde o Chrome baixa os arquivos do Whisk
const WHISK_DOWNLOAD_DIR =
  process.env.WHISK_DOWNLOAD_DIR ||
  path.join(
    process.env.USERPROFILE || process.env.HOME,
    "Downloads",
    "whisk"
  );

// Pasta de frames do seu projeto (já existe)
const FRAMES_DIR = path.join(__dirname, "..", "output", "frames");

function zeroPad(n, width) {
  return String(n).padStart(width, "0");
}

function isImageFile(name) {
  return /\.(png|jpe?g|webp)$/i.test(name);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function importWhiskFrames() {
  console.log("📂 WHISK_DOWNLOAD_DIR:", WHISK_DOWNLOAD_DIR);
  console.log("🎬 FRAMES_DIR:", FRAMES_DIR);

  ensureDir(WHISK_DOWNLOAD_DIR);
  ensureDir(FRAMES_DIR);

  // limpa frames antigos (opcional – pode tirar se quiser acumular)
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
    console.log("⚠️ Nenhuma imagem encontrada em", WHISK_DOWNLOAD_DIR);
    return;
  }

  console.log(`🖼️ Encontradas ${files.length} imagens do Whisk.`);

  files.forEach((file, index) => {
    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    const frameName = `frame-${zeroPad(index + 1, 3)}${ext}`;
    const dest = path.join(FRAMES_DIR, frameName);

    fs.copyFileSync(file.full, dest);
    console.log(`➡️  ${file.name} -> ${frameName}`);
  });

  console.log("✅ Importação concluída.");
}

importWhiskFrames().catch((err) => {
  console.error("Erro ao importar frames do Whisk:", err);
  process.exit(1);
});
