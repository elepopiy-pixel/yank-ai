#!/usr/bin/env bash
set -e

echo "⬇️ llama.cpp indiriliyor..."
wget -nv https://github.com/ggml-org/llama.cpp/releases/download/b10290/llama-b10290-bin-ubuntu-x64.tar.gz

echo "📦 Arşiv açılıyor..."
tar -xzf llama-b10290-bin-ubuntu-x64.tar.gz

echo "📁 Arşiv içeriği (kök dizin):"
ls -la

echo "📁 bin/ klasörü içeriği:"
ls -la bin/ || echo "bin/ klasörü yok!"

# Eğer llama-server başka bir yerdeyse bulup taşı
if [ -f "bin/llama-server" ]; then
    chmod +x bin/llama-server
    echo "✅ llama-server hazır."
else
    echo "❌ bin/llama-server bulunamadı. Tüm dosyalar taranıyor..."
    find . -name "llama-server" -exec ls -l {} \;
    # Eğer bulunursa, doğru yere taşı
    if [ -f "./llama-server" ]; then
        mkdir -p bin
        mv ./llama-server bin/
        chmod +x bin/llama-server
        echo "✅ llama-server taşındı ve hazır."
    else
        echo "❌ llama-server hiçbir yerde bulunamadı. Build başarısız."
        exit 1
    fi
fi