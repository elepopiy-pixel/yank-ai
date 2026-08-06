#!/usr/bin/env bash
set -e

echo "🛠️  llama.cpp kaynak kodundan derleniyor..."

# 1. Depoyu klonla
git clone --depth 1 https://github.com/ggml-org/llama.cpp.git

# 2. Derleme klasörüne gir ve derlemeyi başlat
cd llama.cpp
mkdir -p build && cd build

# 3. CMake ile yapılandır (CPU için optimize edilmiş)
cmake .. -DLLAMA_CUBLAS=OFF -DLLAMA_METAL=OFF -DCMAKE_BUILD_TYPE=Release

# 4. Derlemeyi yap (sadece llama-server ve gerekli kütüphaneler)
make -j$(nproc) llama-server

# 5. Ana proje klasörüne dön ve binary'leri kopyala
cd ../../
mkdir -p bin
cp llama.cpp/build/bin/llama-server bin/
cp llama.cpp/build/lib*.so* bin/ 2>/dev/null || true

# 6. Gerekli kütüphane bağlantılarını oluştur
cd bin
ln -sf libggml.so libggml.so.0 2>/dev/null || true
ln -sf libllama.so libllama.so.0 2>/dev/null || true
cd ..

# 7. Çalıştırma izni ver
chmod +x bin/llama-server

echo "✅ llama-server başarıyla derlendi ve hazır."