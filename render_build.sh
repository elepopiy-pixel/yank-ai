#!/usr/bin/env bash
set -e

echo "⬇️ llama.cpp indiriliyor..."

wget -q https://github.com/ggml-org/llama.cpp/releases/download/b10290/llama-b10290-bin-ubuntu-x64.tar.gz

tar -xzf llama-b10290-bin-ubuntu-x64.tar.gz

chmod +x bin/llama-server

echo "✅ Hazır."