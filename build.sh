#!/usr/bin/env bash
set -e

echo "🛠️  llama-server hazırlanıyor..."

# 1. Eğer önceden derlenmiş binary varsa kullan
BIN_DIR="./bin"
mkdir -p "$BIN_DIR"

# Platformu belirle
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Linux x86_64 için hazır binary indir (en hızlı)
if [[ "$OS" == "linux" && "$ARCH" == "x86_64" ]]; then
    echo "⬇️  Linux x86_64 için hazır llama-server indiriliyor..."
    wget -O "$BIN_DIR/llama-server" \
        https://github.com/ggml-org/llama.cpp/releases/latest/download/llama-server-linux-x64
    chmod +x "$BIN_DIR/llama-server"
    echo "✅ Binary indirildi."
    exit 0
fi

# macOS veya diğer platformlar için derle
echo "🛠️  Kaynaktan derleniyor (bu 5-10 dakika sürebilir)..."

# 2. Depoyu klonla (sadece son commit)
git clone --depth 1 https://github.com/ggml-org/llama.cpp.git

cd llama.cpp
mkdir -p build && cd build

# 3. Sadece server için hafif CMake yapılandırması
cmake .. \
    -DLLAMA_CUBLAS=OFF \
    -DLLAMA_METAL=OFF \
    -DLLAMA_BUILD_SERVER=ON \
    -DLLAMA_BUILD_EXAMPLES=OFF \
    -DLLAMA_BUILD_TESTS=OFF \
    -DLLAMA_BUILD_BENCHMARKS=OFF \
    -DLLAMA_BUILD_EXTRA=OFF \
    -DCMAKE_BUILD_TYPE=Release

# 4. Bellek sorununu önlemek için -j2 ile derle
make -j2 llama-server

# 5. Çıkan binary'yi bin/ klasörüne kopyala
cp bin/llama-server ../../bin/ 2>/dev/null || cp tools/llama-server ../../bin/ 2>/dev/null || true

cd ../..
echo "✅ Derleme tamamlandı."

# 6. Kontrol
if [ -f "$BIN_DIR/llama-server" ]; then
    echo "✅ llama-server hazır: $BIN_DIR/llama-server"
else
    echo "❌ llama-server bulunamadı!"
    exit 1
fi