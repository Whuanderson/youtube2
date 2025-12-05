# Gerador de vídeo YouTube (Whisk + ffmpeg)

Pipeline em Node para gerar frames com sua automação Whisk e montar um vídeo 1080p30 no ffmpeg.

## Requisitos
- Node 18+
- ffmpeg no PATH (já detectado neste ambiente)

## Como usar (rápido)
```bash
# 1) Gerar frames (usa placeholders até plugar o Whisk)
node src/generate-images.js --scenes=scenes.sample.json

# 2) Renderizar com áudio
node src/render-video.js --audio=meu-audio.mp3 --out=output/final.mp4

# Ou tudo em uma chamada (gera + renderiza)
node src/index.js --audio=meu-audio.mp3 --scenes=scenes.sample.json --out=output/final.mp4

# Frontend Next (painel)
npm run dev
# abra http://localhost:3000 para editar cenas, subir áudio e renderizar via UI
```

Durante o passo 1 é criado `output/scenes.generated.json`. Ajuste `duration` e a ordem das cenas ali antes de rodar o passo 2 se quiser refinar a distribuição.

## Integrando seu Whisk Automator
Edite `src/whisk-client.js`:
- A função `generateImage` recebe `{ prompt, outputPath, width, height }`.
- Substitua o bloco TODO pela chamada real (ex: HTTP local, websocket ou CLI que acione sua extensão do Chrome).
- Opcional: defina `WHISK_COMMAND="seu-comando --prompt=\"%s\" --out=\"%o\""` para o wrapper chamar seu binário/CLI.

Enquanto isso, o placeholder gera imagens lisas com o prompt escrito ao centro para manter o fluxo funcional.

## Formato de cenas
Arquivo JSON com array de objetos `{ "prompt": string, "duration": segundos }`.
Exemplo em `scenes.sample.json`:
```json
[
  { "prompt": "Cena inicial vibrante com logo", "duration": 5 },
  { "prompt": "Explicacao visual do produto", "duration": 6 },
  { "prompt": "Call to action final", "duration": 4 }
]
```

## Saídas
- Frames: `output/frames/frame-XXX.png`
- Metadata editável: `output/scenes.generated.json`
- Lista concat do ffmpeg: `output/concat.txt`
- Vídeo final: `output/final.mp4` (ou o caminho passado em `--out`)
 - Download via UI: `http://localhost:3000/api/download?file=final.mp4`
