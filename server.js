#!/usr/bin/env node
"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { spawn } = require("child_process");

const app = express();

const WEB_PORT = Number(process.env.PORT || 3000);
const LLAMA_PORT = Number(process.env.LLAMA_PORT || 8080);
const LLAMA_HOST = "127.0.0.1";

const CONTEXT_SIZE = Number(process.env.CONTEXT_SIZE || 512);
const THREADS = Number(process.env.THREADS || 2);
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 256);

const MODEL_DIR = path.join(__dirname, "models");
const MODEL_NAME = "Qwen2.5-0.5B-Instruct-Q2_K.gguf"; // Büyük harfle doğru dosya adı
const MODEL_PATH = path.join(MODEL_DIR, MODEL_NAME);

const MODEL_URL = "https://huggingface.co/tensorblock/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q2_K.gguf";

const SYSTEM_PROMPT = `
Senin adın Yankı.
YankıAI adlı Türkçe odaklı, deneysel ve yerel bir yapay zekâ asistanısın.
Öncelikle Türkçe cevap ver. Kullanıcı başka bir dil isterse o dili kullanabilirsin.
Cevapların samimi, açık, kısa ve faydalı olsun.
Bilmediğin bir şeyi uydurma; emin olmadığını açıkça söyle.
Kendini Qwen tabanlı yerel bir asistan olarak tanıtabilirsin.
Tehlikeli, yasa dışı veya zarar verici taleplerde güvenli bir alternatif sun.
`.trim();

let llamaProcess = null;
let llamaReady = false;
let startupError = null;

app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname, "public")));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function requestWithRedirect(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 8) {
      reject(new Error("Çok fazla yönlendirme oluştu."));
      return;
    }
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, options, response => {
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

  if (fs.existsSync(MODEL_PATH) && fs.statSync(MODEL_PATH).size > 100 * 1024 * 1024) {
    console.log(`✅ Model hazır: ${MODEL_PATH}`);
    return;
  }

  const partPath = `${MODEL_PATH}.part`;
  let downloaded = fs.existsSync(partPath) ? fs.statSync(partPath).size : 0;

  console.log("⬇️ Qwen2.5 0.5B Q2_K modeli indiriliyor...");
  if (downloaded > 0) {
    console.log(`↩️ İndirmeye devam ediliyor: ${(downloaded / 1024 / 1024).toFixed(1)} MB`);
  }

  let response = await requestWithRedirect(
    MODEL_URL,
    downloaded > 0 ? { headers: { Range: `bytes=${downloaded}-` } } : {}
  );

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

  const remaining = Number(response.headers["content-length"] || 0);
  const total = downloaded + remaining;
  const file = fs.createWriteStream(partPath, {
    flags: downloaded > 0 ? "a" : "w"
  });

  let received = downloaded;
  let lastPrinted = 0;

  await new Promise((resolve, reject) => {
    response.on("data", chunk => {
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

function findLlamaServer() {
  if (process.env.LLAMA_SERVER_PATH) return process.env.LLAMA_SERVER_PATH;
  if (process.platform === "win32") return path.join(__dirname, "bin", "llama-server.exe");
  return path.join(__dirname, "bin", "llama-server");
}

async function waitForLlama() {
  const maxWaitMs = 180000; // 3 dakika
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (llamaReady) {
      console.log("✅ Yankı modeli cevap vermeye hazır.");
      return;
    }

    if (llamaProcess && llamaProcess.exitCode !== null) {
      throw new Error(`llama-server kapandı. Çıkış kodu: ${llamaProcess.exitCode}`);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const response = await fetch(`http://${LLAMA_HOST}:${LLAMA_PORT}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        llamaReady = true;
        console.log("✅ Yankı modeli cevap vermeye hazır.");
        return;
      }
    } catch (_) {}

    await sleep(300);
  }

  throw new Error("llama-server zamanında hazır olmadı (Timeout).");
}

async function startLlamaServer() {
  const executable = findLlamaServer();
  const binDir = path.join(__dirname, "bin");

  // ⭐ Çalıştırma iznini düzelt
  try {
    if (fs.existsSync(executable)) {
      fs.chmodSync(executable, 0o755);
      console.log(`✅ Çalıştırma izni verildi: ${executable}`);
    } else {
      console.error(`❌ Dosya bulunamadı: ${executable}`);
      throw new Error(`llama-server dosyası mevcut değil: ${executable}`);
    }
  } catch (error) {
    console.error(`⚠️ İzin hatası: ${error.message}`);
    throw error;
  }

  const args = [
    "-m", MODEL_PATH,
    "--host", LLAMA_HOST,
    "--port", String(LLAMA_PORT),
    "-c", String(CONTEXT_SIZE),
    "-t", String(THREADS),
    "--no-mmap"
  ];

  console.log(`🧠 Başlatılıyor: ${executable} ${args.join(" ")}`);

  const env = { ...process.env };
  env.LD_LIBRARY_PATH = binDir + (env.LD_LIBRARY_PATH ? ':' + env.LD_LIBRARY_PATH : '');

  llamaProcess = spawn(executable, args, {
    cwd: binDir,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: env
  });

  const checkLogOutput = (data) => {
    const text = data.toString();
    if (text.trim()) console.log(`[llama] ${text.trim()}`);
    // Server'ın hazır olduğunu belirten logları yakala
    if (
      text.includes("HTTP server listening") ||
      text.includes("listening on") ||
      text.includes("main: server is listening")
    ) {
      llamaReady = true;
    }
  };

  llamaProcess.stdout.on("data", checkLogOutput);
  llamaProcess.stderr.on("data", checkLogOutput);

  llamaProcess.on("error", error => {
    startupError = error.message;
    llamaReady = false;
    console.error("❌ llama-server hatası:", error.message);
  });

  llamaProcess.on("exit", code => {
    llamaReady = false;
    if (code !== 0 && code !== null) {
      startupError = `llama-server kapandı. Kod: ${code}`;
      console.error(`❌ ${startupError}`);
    }
  });

  await waitForLlama();
}

function cleanMessages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(-6)
    .filter(item => item && ["user", "assistant"].includes(item.role))
    .map(item => ({
      role: item.role,
      content: String(item.content || "").slice(0, 1500)
    }))
    .filter(item => item.content.trim());
}

app.get("/api/status", (_req, res) => {
  res.json({
    ready: llamaReady,
    model: "Qwen2.5 0.5B Q2_K",
    error: startupError
  });
});

app.post("/api/chat", async (req, res) => {
  if (!llamaReady) {
    return res.status(503).json({
      error: startupError || "Yankı henüz hazırlanıyor."
    });
  }

  const messages = cleanMessages(req.body.messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Geçerli bir kullanıcı mesajı gönder." });
  }

  try {
    const response = await fetch(
      `http://${LLAMA_HOST}:${LLAMA_PORT}/v1/chat/completions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: MAX_TOKENS,
          stream: false
        })
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      console.error("llama-server yanıtı:", raw);
      return res.status(502).json({ error: "Model cevap üretemedi." });
    }

    const data = JSON.parse(raw);
    const answer = data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return res.status(502).json({ error: "Model boş cevap verdi." });
    }

    res.json({ answer });
  } catch (error) {
    console.error("Sohbet hatası:", error);
    res.status(500).json({ error: "Yankı ile bağlantı kurulamadı." });
  }
});

async function main() {
  app.listen(WEB_PORT, "0.0.0.0", () => {
    console.log(`🌐 YankıAI: http://localhost:${WEB_PORT}`);
  });

  try {
    await downloadModel();
    //await startLlamaServer();
  } catch (error) {
    startupError = error.message;
    llamaReady = false;
    console.error("\n❌ Başlatma hatası:", error.message);
  }
}

function shutdown() {
  if (llamaProcess && llamaProcess.exitCode === null) {
    llamaProcess.kill();
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main();