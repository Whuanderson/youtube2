// my-whisk-helper/background.js

// Só pra saber que a extensão subiu
chrome.runtime.onInstalled.addListener(() => {
  console.log("My Whisk Helper installed");
});

// (Opcional, mas útil) – organizar os nomes dos arquivos baixados pelo Whisk
// Requer "downloads" em "permissions" no manifest.json
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  // nome original (só o arquivo, sem pastas)
  const originalName = item.filename.split("/").pop();

  // prefixo simples com data/hora
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");

  // vai criar uma subpasta "whisk" dentro da pasta de downloads do Chrome
  const newName = `whisk/${stamp}-${originalName}`;

  suggest({
    filename: newName,
    conflictAction: "overwrite"
  });
});
