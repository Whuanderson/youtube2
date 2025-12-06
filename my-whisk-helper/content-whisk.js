// content-whisk.js

console.log("My Whisk Helper content script loaded");

// 1) Preenche a caixa de prompt
function setPromptInBox(prompt) {
  const textarea = document.querySelector("textarea");

  if (!textarea) {
    console.warn("[My Whisk Helper] textarea não encontrada. Ajuste o seletor.");
    return false;
  }

  textarea.focus();
  textarea.value = prompt;

  const event = new InputEvent("input", {
    bubbles: true,
    cancelable: true,
    inputType: "insertText",
    data: prompt
  });

  textarea.dispatchEvent(event);

  console.log("[My Whisk Helper] Prompt aplicado no textarea.");
  return true;
}

// 2) Define a proporção (Quadrado / Retrato / Paisagem)
function setAspectRatio(ratio = "landscape") {
  const labelMap = {
    square: "Quadrado",
    portrait: "Retrato",
    landscape: "Paisagem"
  };

  const label = labelMap[ratio] || labelMap.landscape;
  const spans = Array.from(document.querySelectorAll("span"));

  for (const span of spans) {
    const text = (span.textContent || "").trim();
    if (text === label) {
      // estrutura: <div> <button>…</button> <span>Label</span> </div>
      let btn = span.previousElementSibling;
      if (!btn || btn.tagName !== "BUTTON") {
        btn = span.parentElement?.querySelector("button");
      }

      if (btn) {
        btn.click();
        console.log(
          "[My Whisk Helper] Proporção selecionada:",
          ratio,
          "=>",
          label
        );
        return true;
      }
    }
  }

  console.warn("[My Whisk Helper] Não achei opção de proporção para:", ratio);
  return false;
}

// 3) Clica no botão de gerar imagens (seta roxa)
function clickGenerateButton() {
  const btn =
    document.querySelector('button[aria-label="Enviar comando"]') ||
    document.querySelector(
      // fallback no seletor copiado do DevTools
      '#__next > div.sc-c7ee1759-1.crzReP > div > div.sc-6fe1c1c9-3.isamFv > div.sc-6fe1c1c9-4.jxKrrR > div > div > div > div > div.sc-d9f87e16-0.kKoVkw > div > div.sc-18deeb1d-1.YAIru > div.sc-18deeb1d-3.dgKBQe > div > button.sc-bece3008-0.iCCEfi.sc-18deeb1d-6.cTTkJg'
    );

  if (!btn) {
    console.warn("[My Whisk Helper] Botão de gerar não encontrado.");
    return false;
  }

  btn.click();
  console.log("[My Whisk Helper] Cliquei no botão de gerar.");
  return true;
}

// 4) Observa resultados NOVOS e clica em "download"
function startAutoDownloadWatcher() {
  console.log("[My Whisk Helper] Iniciando watcher de downloads...");

  const root = document.body;
  const clickedButtons = new WeakSet();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        const buttons = [];

        if (node.tagName === "BUTTON") {
          buttons.push(node);
        }

        const innerButtons = node.querySelectorAll("button");
        innerButtons.forEach((b) => buttons.push(b));

        buttons.forEach((btn) => {
          const text = (btn.innerText || btn.textContent || "")
            .trim()
            .toLowerCase();

          // botão com texto "download"
          if (text === "download" && !clickedButtons.has(btn)) {
            clickedButtons.add(btn);
            console.log(
              "[My Whisk Helper] Clicando em botão de download novo..."
            );
            btn.click();
          }
        });
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });
}

// 5) Listener de mensagens vindas do popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[My Whisk Helper] Mensagem recebida:", message);

  if (message.type !== "SET_WHISK_PROMPT") {
    return;
  }

  const prompt = message.prompt || "";
  if (!prompt.trim()) {
    console.warn("[My Whisk Helper] Prompt vazio, nada a fazer.");
    sendResponse?.({ ok: false, reason: "empty_prompt" });
    return;
  }

  const ok = setPromptInBox(prompt);
  if (!ok) {
    sendResponse?.({ ok: false, reason: "prompt_box_not_found" });
    return;
  }

  // sempre usa Paisagem (16:9) por padrão
  const ratio = message.ratio || "landscape";
  setAspectRatio(ratio);

  if (message.autoGenerate) {
    const clicked = clickGenerateButton();
    if (clicked) {
      startAutoDownloadWatcher();
    }
  }

  sendResponse?.({ ok: true });
});
