#!/usr/bin/env bash
set -e

echo "⬇️ llama.cpp indiriliyor..."
wget -nv https://github.com/ggml-org/llama.cpp/releases/download/b10290/llama-b10290-bin-ubuntu-x64.tar.gz

echo "📦 Arşiv açılıyor..."
tar -xzf llama-b10290-bin-ubuntu-x64.tar.gz

mkdir -p bin

# Tüm llama dosyalarını bin/ altına taşı (server.js, package.json vs. dokunma)
mv llama* lib* ggml* mtmd* bin/ 2>/dev/null || true

cd bin

# Kopyala (link değil!) – linker için çalışacaktır
if [ -f libggml.so.0.18.1 ]; then
    cp -p libggml.so.0.18.1 libggml.so.0
    cp -p libggml.so.0.18.1 libggml-base.so.0
    cp -p libggml.so.0.18.1 libggml-cpu.so.0
fi

if [ -f libllama-common.so.0.0.10290 ]; then
    cp -p libllama-common.so.0.0.10290 libllama-common.so.0
fi

if [ -f libllama.so.0.0.10290 ]; then
    cp -p libllama.so.0.0.10290 libllama.so.0
fi

if [ -f libmtmd.so.0.0.10290 ]; then
    cp -p libmtmd.so.0.0.10290 libmtmd.so.0
fi

cd ..

chmod +x bin/llama-server
chmod +x bin/llama-* 2>/dev/null || true

echo "✅ Hazır."
echo "📁 bin/ içeriği (kütüphaneler):"
ls -la bin/ | grep -E "\.so"