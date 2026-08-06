#!/usr/bin/env bash
set -e

echo "⬇️ llama.cpp indiriliyor..."
wget -nv https://github.com/ggml-org/llama.cpp/releases/download/b10290/llama-b10290-bin-ubuntu-x64.tar.gz

echo "📦 Arşiv açılıyor..."
tar -xzf llama-b10290-bin-ubuntu-x64.tar.gz

# bin/ klasörünü oluştur (zaten varsa sorun olmaz)
mkdir -p bin

# SADECE llama.cpp ile ilgili dosyaları taşı (server.js, package.json vb. DOKUNMA)
# - 'llama' ile başlayanlar
# - 'lib' ile başlayanlar
# - 'ggml' ile başlayanlar
# - 'mtmd' ile başlayanlar
mv llama* lib* ggml* mtmd* bin/ 2>/dev/null || true

# Çalıştırılabilir dosyalara yetki ver
chmod +x bin/llama-server
chmod +x bin/llama-* 2>/dev/null || true

echo "✅ llama-server ve kütüphaneler bin/ dizininde hazır."
echo "📁 Kök dizindeki dosyalar:"
ls -la