#!/usr/bin/env bash
set -e

echo "⬇️ llama.cpp indiriliyor..."
wget -nv https://github.com/ggml-org/llama.cpp/releases/download/b10290/llama-b10290-bin-ubuntu-x64.tar.gz

echo "📦 Arşiv açılıyor..."
tar -xzf llama-b10290-bin-ubuntu-x64.tar.gz

mkdir -p bin

# Sadece llama ile ilgili dosyaları taşı (server.js, package.json vs. yerinde kalsın)
mv llama* lib* ggml* mtmd* bin/ 2>/dev/null || true

# Kütüphane isimlerini kısalt (sembolik link)
cd bin
if [ -f libllama-common.so.0.0.10290 ]; then
    ln -sf libllama-common.so.0.0.10290 libllama-common.so.0
    ln -sf libllama.so.0.0.10290 libllama.so.0
    ln -sf libggml.so.0.18.1 libggml.so.0
    ln -sf libmtmd.so.0.0.10290 libmtmd.so.0
fi
cd ..

chmod +x bin/llama-server
chmod +x bin/llama-* 2>/dev/null || true

echo "✅ Hazır."