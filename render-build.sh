#!/usr/bin/env bash
set -e

echo "🛠️  llama.cpp kaynaktan derleniyor (bu 5-10 dakika sürebilir)..."

# 1. Depoyu klonla (sadece son commit, hızlı)
git clone --depth 1 https://github.com/ggml-org/llama.cpp.git

# 2. Derleme klasörü
cd llama.cpp
mkdir -p build && cd build

# 3. CMake yapılandırması (CPU için)
cmake .. -DLLAMA_CUBLAS=OFF -DLLAMA_METAL=OFF -DCMAKE_BUILD_TYPE=Release

# 4. Sadece llama-server ve gerekli kütüphaneleri derle
make -j$(nproc) llama-server

# 5. Ana proje klasörüne dön
cd ../../

# 6. bin/ klasörünü oluştur
mkdir -p bin

# 7. Tüm derlenmiş dosyaları (binary + kütüphaneler) bin/ altına kopyala
cp -r llama.cpp/build/bin/* bin/ 2>/dev/null || true
cp -r llama.cpp/build/lib/* bin/ 2>/dev/null || true
cp -r llama.cpp/build/src/*.so* bin/ 2>/dev/null || true
cp -r llama.cpp/build/ggml/src/*.so* bin/ 2>/dev/null || true

# 8. Eğer llama-server hala build/bin/ altında değilse, build/tools/ altında ara
if [ ! -f bin/llama-server ]; then
    echo "🔍 llama-server build/bin/ altında bulunamadı, build/tools/ altından kopyalanıyor..."
    cp llama.cpp/build/tools/llama-server bin/ 2>/dev/null || true
fi

# 9. Tüm kütüphanelere çalıştırma izni ver ve sembolik linkleri düzelt
cd bin
chmod +x llama-server
chmod +x *.so* 2>/dev/null || true

# 10. Eksik sembolik linkleri oluştur (tahmini)
if [ -f libggml.so ]; then
    ln -sf libggml.so libggml.so.0 2>/dev/null || true
fi
if [ -f libllama.so ]; then
    ln -sf libllama.so libllama.so.0 2>/dev/null || true
fi
cd ..

echo "✅ Derleme tamamlandı. bin/ içeriği:"
ls -la bin/