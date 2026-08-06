#!/usr/bin/env bash
set -e

echo "🛠️  llama-server kaynaktan derleniyor (hafif mod)..."

mkdir -p bin models

if [ ! -d "llama.cpp" ] || [ ! -f "llama.cpp/CMakeLists.txt" ]; then
    echo "📦 llama.cpp deposu klonlanıyor..."
    rm -rf llama.cpp
    git clone --depth 1 https://github.com/ggml-org/llama.cpp.git
fi

cd llama.cpp
mkdir -p build && cd build

echo "⚙️  CMake yapılandırması yapılıyor..."
cmake .. \
    -DLLAMA_CUBLAS=OFF \
    -DLLAMA_METAL=OFF \
    -DLLAMA_BUILD_SERVER=ON \
    -DLLAMA_BUILD_EXAMPLES=OFF \
    -DLLAMA_BUILD_TESTS=OFF \
    -DLLAMA_BUILD_BENCHMARKS=OFF \
    -DLLAMA_BUILD_EXTRA=OFF \
    -DCMAKE_BUILD_TYPE=Release

echo "🔨 Derleme başlıyor (bu 3-5 dakika sürebilir)..."
make -j2 llama-server

echo "📂 Binary ve kütüphaneler kopyalanıyor..."
# Binary
if [ -f "bin/llama-server" ]; then
    cp bin/llama-server ../../bin/
elif [ -f "tools/llama-server" ]; then
    cp tools/llama-server ../../bin/
else
    echo "❌ llama-server bulunamadı!"
    exit 1
fi

# Kütüphaneleri kopyala (tüm .so dosyaları)
find . -name "*.so*" -exec cp -P {} ../../bin/ \; 2>/dev/null || true

cd ../..
chmod +x bin/llama-server
chmod +x bin/*.so* 2>/dev/null || true

echo "✅ Derleme tamamlandı. bin/ içeriği:"
ls -la bin/