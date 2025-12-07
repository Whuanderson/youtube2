// content-whisk.js

console.log('My Whisk Helper content script loaded');

// ---------- helpers de DOM ----------

let isRunningBatch = false;

function findPromptBox() {
  return (
    document.querySelector('textarea') ||
    document.querySelector('[data-testid="prompt-input"]') ||
    document.querySelector('div[contenteditable="true"]')
  );
}

function setPromptInBox(prompt) {
  const box = findPromptBox();
  if (!box) {
    console.warn('[My Whisk Helper] campo de prompt não encontrado.');
    return false;
  }

  if (box.tagName === 'TEXTAREA') {
    box.focus();
    box.value = prompt;
    box.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prompt,
      })
    );
  } else {
    // contenteditable
    box.focus();
    box.innerText = prompt;
    box.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prompt,
      })
    );
  }

  console.log('[My Whisk Helper] Prompt aplicado:', prompt);
  return true;
}

function clickGenerateButton() {
  const btn =
    document.querySelector('button[aria-label="Enviar comando"]') ||
    document.querySelector('button[aria-label="Generate"]') ||
    document.querySelector('button[aria-label="Gerar"]') ||
    document.querySelector('button[data-testid="generate-button"]');

  if (!btn) {
    console.warn('[My Whisk Helper] Botão de gerar não encontrado.');
    return false;
  }

  btn.click();
  console.log('[My Whisk Helper] Cliquei no botão de gerar.');
  return true;
}

function findDownloadButtons() {
  const btns = Array.from(document.querySelectorAll('button'));
  return btns.filter((btn) => {
    const text = (btn.textContent || '').trim().toLowerCase();
    return text === 'download' || text.includes('download');
  });
}

function startDownloadWatcherOnce(onDone, timeoutMs = 25000, expectedDownloads = 2) {
  console.log('[My Whisk Helper] Iniciando watcher de downloads...');

  const root = document.body;

  // botões que já existiam ANTES desta geração (não queremos clicar neles)
  const existing = new Set(findDownloadButtons());

  const clicked = new WeakSet();
  let clickedCount = 0;
  let finished = false;
  let observer;

  const handleNodes = () => {
    const all = findDownloadButtons();

    // candidatos = botões novos (não estavam em existing) e ainda não clicados
    const candidates = all.filter((btn) => !existing.has(btn) && !clicked.has(btn));

    if (!candidates.length) return;

    console.log(
      `[My Whisk Helper] Encontrados ${candidates.length} novos botões de download.`
    );

    candidates.forEach((btn) => {
      clicked.add(btn);
      clickedCount += 1;
      console.log('[My Whisk Helper] Clicando download #', clickedCount);
      btn.click();
    });

    // Se já clicamos o esperado para esta cena, encerramos
    if (!finished && clickedCount >= expectedDownloads) {
      finished = true;
      setTimeout(() => {
        if (observer) observer.disconnect();
        console.log(
          '[My Whisk Helper] Downloads desta cena concluídos, encerrando watcher.'
        );
        onDone?.();
      }, 2000);
    }
  };

  observer = new MutationObserver(handleNodes);
  observer.observe(root, { childList: true, subtree: true });

  // Não chamamos handleNodes() imediatamente para NÃO pegar imagens antigas

  // timeout de segurança
  setTimeout(() => {
    if (!finished) {
      finished = true;
      if (observer) observer.disconnect();
      console.log(
        '[My Whisk Helper] Timeout de downloads; seguindo para a próxima cena.'
      );
      onDone?.();
    }
  }, timeoutMs);
}

// ---------- batch controlado pelo painel ----------

async function runBatchCore(scenes) {
  if (isRunningBatch) {
    console.log('[My Whisk Helper] Já existe um batch em execução, ignorando novo pedido.');
    return;
  }

  isRunningBatch = true;
  console.log(`[My Whisk Helper] Rodando batch com ${scenes.length} cenas.`);

  try {
    for (let i = 0; i < scenes.length; i += 1) {
      const scene = scenes[i];
      const label = `Cena ${i + 1}/${scenes.length}: ${scene.prompt || ''}`;
      console.log('[My Whisk Helper]', label);

      const ok = setPromptInBox(scene.prompt || '');
      if (!ok) {
        console.warn('[My Whisk Helper] Não foi possível aplicar o prompt, pulando cena.');
        continue;
      }

      clickGenerateButton();

      // espera downloads dessa cena
      await new Promise((resolve) => {
        startDownloadWatcherOnce(() => {
          setTimeout(resolve, 3000); // respiro depois do clique nos downloads
        }, 25000, 2); // ⬅️ 2 downloads esperados por cena
      });

      // pequeno intervalo entre cenas
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log('[My Whisk Helper] Batch concluído.');
  } finally {
    isRunningBatch = false;
  }
}

// ---------- listener de mensagens ----------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[My Whisk Helper] Mensagem recebida:', message);

  // ainda permite o uso direto do popup (um prompt só)
  if (message.type === 'SET_WHISK_PROMPT') {
    const ok = setPromptInBox(message.prompt || '');
    if (ok && message.autoGenerate) {
      clickGenerateButton();
      startDownloadWatcherOnce();
    }
    sendResponse?.({ ok });
    return;
  }

  // chamado pelo background quando o painel clicar em "Gerar frames"
  if (message.type === 'RUN_BATCH_WITH_SCENES') {
    const scenes = message.scenes || [];
    if (!scenes.length) {
      console.log(
        '[My Whisk Helper] Nenhuma cena recebida em RUN_BATCH_WITH_SCENES.'
      );
      sendResponse?.({ ok: false, error: 'Sem cenas' });
      return;
    }

    runBatchCore(scenes)
      .then(() => sendResponse?.({ ok: true }))
      .catch((err) => {
        console.error('[My Whisk Helper] Erro no batch:', err);
        sendResponse?.({ ok: false, error: err.message });
      });

    return true; // resposta assíncrona
  }
});
