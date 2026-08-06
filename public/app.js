const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const messagesEl = document.querySelector("#messages");
const welcomeEl = document.querySelector("#welcome");
const statusEl = document.querySelector("#status");
const statusText = statusEl.querySelector(".status-text");

const history = [];
let busy = false;
let ready = false;

function setStatus(state, text) {
  statusEl.className = `status ${state}`;
  statusText.textContent = text;
}

async function checkStatus() {
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    const data = await response.json();

    ready = Boolean(data.ready);
    if (ready) {
      setStatus("ready", "Hazır");
    } else if (data.error) {
      setStatus("error", "Başlatma hatası");
    } else {
      setStatus("", "Model hazırlanıyor");
    }
  } catch {
    ready = false;
    setStatus("error", "Bağlantı yok");
  }

  updateButton();
}

function updateButton() {
  sendButton.disabled = busy || !ready || !input.value.trim();
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

function addMessage(role, content, extraClass = "") {
  welcomeEl.classList.add("hidden");

  const row = document.createElement("article");
  row.className = `message ${role} ${extraClass}`.trim();

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "Y";
    row.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;
  row.appendChild(bubble);

  messagesEl.appendChild(row);
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  return row;
}

async function sendMessage(text) {
  const cleanText = text.trim();
  if (!cleanText || busy || !ready) return;

  busy = true;
  input.value = "";
  resizeInput();
  updateButton();

  addMessage("user", cleanText);
  history.push({ role: "user", content: cleanText });

  const typing = addMessage("assistant", "Yankı düşünüyor…", "typing");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Cevap alınamadı.");
    }

    typing.remove();
    addMessage("assistant", data.answer);
    history.push({ role: "assistant", content: data.answer });

    while (history.length > 6) history.shift();
  } catch (error) {
    typing.remove();
    addMessage("assistant", `Üzgünüm, bir hata oluştu: ${error.message}`);
  } finally {
    busy = false;
    updateButton();
    input.focus();
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", () => {
  resizeInput();
  updateButton();
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

checkStatus();
setInterval(checkStatus, 2500);
input.focus();
