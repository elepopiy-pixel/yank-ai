#!/usr/bin/env bash
set -e

echo "🛠️  llama-server kaynaktan derleniyor (hafif mod)..."

# Gerekli klasörleri oluştur
mkdir -p bin models

# 1. Eğer llama.cpp yoksa klonla (sadece son commit)
if [ ! -d "llama.cpp" ]; then
    echo "📦 llama.cpp deposu klonlanıyor..."
    git clone --depth 1 https://github.com/ggml-org/llama.cpp.git
fi

cd llama.cpp

# 2. Derleme klasörü
mkdir -p build && cd build

# 3. Sadece llama-server için CMake yapılandırması (diğer hedefler kapalı)
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

# 4. Bellek dostu derleme (sadece 2 işlem)
echo "🔨 Derleme başlıyor (bu 3-5 dakika sürebilir)..."
make -j2 llama-server

# 5. Binary'yi ana bin/ klasörüne kopyala
echo "📂 Binary kopyalanıyor..."
if [ -f "bin/llama-server" ]; then
    cp bin/llama-server ../../bin/
elif [ -f "tools/llama-server" ]; then
    cp tools/llama-server ../../bin/
else
    echo "❌ llama-server bulunamadı!"
    exit 1
fi

# 6. Çalıştırma izni ver
chmod +x ../../bin/llama-server

cd ../..
echo "✅ Derleme tamamlandı. bin/llama-server hazır."