#!/usr/bin/env node

import express from "express";
import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import { fileURLToPath } from "url";
import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp";

// __dirname ESM uyumluluğu
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const WEB_PORT = Number(process.env.PORT || 3000);
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 256);

const MODEL_DIR = path.join(__dirname, "models");
// TheBloke dosya adı (küçük harf)
const MODEL_NAME = "qwen2.5-0.5b-instruct-Q2_K.gguf";
const MODEL_PATH = path.join(MODEL_DIR, MODEL_NAME);

// TheBloke'un resmi GGUF bağlantısı (kararlı)
const MODEL_URL =
  "https://huggingface.co/TheBloke/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-Q2_K.gguf";

const SYSTEM_PROMPT = `
Senin adın Yankı.
YankıAI adlı Türkçe odaklı, deneysel ve yerel bir yapay zekâ asistanısın.
Öncelikle Türkçe cevap ver. Kullanıcı başka bir dil isterse o dili kullanabilirsin.
Cevapların samimi, açık, kısa ve faydalı olsun.
Bilmediğin bir şeyi uydurma; emin olmadığını açıkça söyle.
Kendini Qwen tabanlı yerel bir asistan olarak tanıtabilirsin.
Tehlikeli, yasa dışı veya zarar verici taleplerde güvenli bir alternatif sun.
`.trim();

let session = null;
let ready = false;
let startupError = null;

app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ─── Model indirme (yönlendirmeleri takip eder) ───
function requestWithRedirect(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 8) {
      reject(new Error("Çok fazla yönlendirme oluştu."));
      return;
    }
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, options, (response) => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.resume();
        const nextUrl = new URL(response.headers.location, url).toString();
        requestWithRedirect(nextUrl, options, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
      }
      resolve(response);
    });
    req.on("error", reject);
  });
}

async function downloadModel() {
  fs.mkdirSync(MODEL_DIR, { recursive: true });

  // Dosya varsa ve boyutu 100MB'den büyükse atla
  if (fs.existsSync(MODEL_PATH) && fs.statSync(MODEL_PATH).size > 100 * 1024 * 1024) {
    console.log(`✅ Model hazır: ${MODEL_PATH}`);
    return;
  }

  const partPath = `${MODEL_PATH}.part`;
  let downloaded = fs.existsSync(partPath) ? fs.statSync(partPath).size : 0;

  console.log("⬇️ Qwen2.5 0.5B Q2_K modeli indiriliyor (TheBloke)...");
  if (downloaded > 0) {
    console.log(`↩️ İndirmeye devam ediliyor: ${(downloaded / 1024 / 1024).toFixed(1)} MB`);
  }

  const headers = {};
  if (downloaded > 0) {
    headers.Range = `bytes=${downloaded}-`;
  }

  let response = await requestWithRedirect(MODEL_URL, { headers });

  // Eğer sunucu Range'i desteklemiyorsa baştan indir
  if (downloaded > 0 && response.statusCode === 200) {
    response.resume();
    fs.rmSync(partPath, { force: true });
    downloaded = 0;
    response = await requestWithRedirect(MODEL_URL);
  }

  if (![200, 206].includes(response.statusCode || 0)) {
    response.resume();
    throw new Error(`Model indirilemedi. HTTP ${response.statusCode}`);
  }

  const total = downloaded + Number(response.headers["content-length"] || 0);
  const file = fs.createWriteStream(partPath, { flags: downloaded > 0 ? "a" : "w" });

  let received = downloaded;
  let lastPrinted = 0;

  await new Promise((resolve, reject) => {
    response.on("data", (chunk) => {
      received += chunk.length;
      const now = Date.now();
      if (now - lastPrinted > 1000) {
        lastPrinted = now;
        const mb = (received / 1024 / 1024).toFixed(1);
        const totalMb = total ? (total / 1024 / 1024).toFixed(1) : "?";
        const percent = total ? ((received / total) * 100).toFixed(1) : "?";
        process.stdout.write(`\r📦 ${mb} / ${totalMb} MB (%${percent})`);
      }
    });
    response.pipe(file);
    file.on("finish", () => file.close(resolve));
    response.on("error", reject);
    file.on("error", reject);
  });

  process.stdout.write("\n");

  if (fs.statSync(partPath).size < 100 * 1024 * 1024) {
    throw new Error("İndirilen model dosyası beklenenden küçük veya bozuk.");
  }

  fs.rmSync(MODEL_PATH, { force: true });
  fs.renameSync(partPath, MODEL_PATH);
  console.log("✅ Model indirme tamamlandı.");
}

// ─── Model yükleme (node-llama-cpp) ───
async function loadModel() {
  try {
    console.log("🧠 Model yükleniyor (bu 15-30 saniye sürebilir)...");
    const model = new LlamaModel({
      modelPath: MODEL_PATH,
      gpuLayers: 0, // CPU'da çalıştır (Render'da GPU yok)
    });
    const context = new LlamaContext({ model });
    session = new LlamaChatSession({ context });
    ready = true;
    console.log("✅ Yankı modeli cevap vermeye hazır.");
  } catch (err) {
    startupError = err.message;
    ready = false;
    console.error("❌ Model yüklenirken hata:", err.message);
    throw err;
  }
}

// ─── API ───
app.get("/api/status", (_req, res) => {
  res.json({
    ready,
    model: "Qwen2.5 0.5B Q2_K (node-llama-cpp)",
    error: startupError,
  });
});

app.post("/api/chat", async (req, res) => {
  if (!ready || !session) {
    return res.status(503).json({
      error: startupError || "Yankı henüz hazırlanıyor.",
    });
  }

  let messages = req.body.messages;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages dizisi gönderin." });
  }

  // Son 6 mesajı al, temizle
  messages = messages
    .slice(-6)
    .filter((m) => m && ["user", "assistant"].includes(m.role))
    .map((m) => ({
      role: m.role,
      content: String(m.content || "").slice(0, 1500),
    }))
    .filter((m) => m.content.trim());

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Geçerli bir kullanıcı mesajı gönder." });
  }

  const chatHistory = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

  try {
    const response = await session.prompt(chatHistory, {
      maxTokens: MAX_TOKENS,
      temperature: 0.7,
      topP: 0.9,
    });

    res.json({ answer: response });
  } catch (err) {
    console.error("Sohbet hatası:", err);
    res.status(500).json({ error: "Yanıt üretilirken hata oluştu." });
  }
});

// ─── Ana fonksiyon ───
async function main() {
  app.listen(WEB_PORT, "0.0.0.0", () => {
    console.log(`🌐 YankıAI: http://localhost:${WEB_PORT}`);
  });

  try {
    await downloadModel();
    await loadModel();
  } catch (err) {
    startupError = err.message;
    ready = false;
    console.error("\n❌ Başlatma hatası:", err.message);
  }
}

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

main();