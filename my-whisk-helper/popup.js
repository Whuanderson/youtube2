const promptEl = document.getElementById('prompt');
const sendBtn = document.getElementById('send');

document.getElementById("send").addEventListener("click", async () => {
  const prompt = document.getElementById("prompt").value.trim();
  if (!prompt) return;

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  chrome.tabs.sendMessage(tab.id, {
    type: "SET_WHISK_PROMPT",
    prompt,
    autoGenerate: true   // 👈 novo
  });
});
