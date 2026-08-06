#!/usr/bin/env bash
set -e

echo "⬇️ llama.cpp indiriliyor..."
wget -nv https://github.com/ggml-org/llama.cpp/releases/download/b10290/llama-b10290-bin-ubuntu-x64.tar.gz

echo "📦 Arşiv açılıyor..."
tar -xzf llama-b10290-bin-ubuntu-x64.tar.gz

# bin/ dizinini oluştur
mkdir -p bin

# Kök dizindeki tüm dosyaları (arşivden çıkanlar) bin/ altına taşı
# (Bu işlem sırasında bin/ dizininin kendisini taşımamaya dikkat ediyoruz)
find . -maxdepth 1 -type f -exec mv {} bin/ \;

# Çalıştırılabilir dosyalara yetki ver
chmod +x bin/llama-server
chmod +x bin/llama-*   # diğer binary'ler için de

echo "✅ llama-server ve tüm kütüphaneler bin/ dizininde hazır."