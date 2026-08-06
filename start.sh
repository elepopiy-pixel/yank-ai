#!/usr/bin/env bash

# Çalışma dizinini ayarla
cd /opt/render/project/src

# Kütüphane yolunu bin/ klasörüne ayarla
export LD_LIBRARY_PATH="./bin:$LD_LIBRARY_PATH"

# llama-server'ı başlat
./bin/llama-server \
    -m ./models/qwen2.5-0.5b-instruct-Q2_K.gguf \
    --host 127.0.0.1 \
    --port 8080 \
    --ctx-size 512 \
    --threads 2 \
    --parallel 1 \
    --batch-size 16 \
    --ubatch-size 8 \
    --no-mmap