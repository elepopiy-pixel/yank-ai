#!/usr/bin/env bash
cd /opt/render/project/src
export LD_LIBRARY_PATH="./bin:$LD_LIBRARY_PATH"
./bin/llama-server \
    -m ./models/Qwen2.5-0.5B-Instruct-Q2_K.gguf \
    --host 127.0.0.1 \
    --port 8080 \
    -c 512 \
    -t 2 \
    --no-mmap