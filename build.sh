#!/usr/bin/env bash
set -e

echo "🛠️  llama-server hazır binary ile kuruluyor..."

# Klasörleri oluştur
mkdir -p bin models

# Platformu belirle
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Sadece Linux x86_64 için hazır binary indir
if [[ "$OS" == "linux" && "$ARCH" == "x86_64" ]]; then
    echo "⬇️  Linux x86_64 için hazır llama-server indiriliyor..."
    
    # En son sürümü bul ve indir
    LATEST_URL="https://github.com/ggml-org/llama.cpp/releases/latest/download/llama-server-linux-x64"
    
    # Binary'yi indir
    wget -O bin/llama-server "$LATEST_URL" || {
        echo "❌ Binary indirilemedi, derlemeye geçiliyor..."
        # Eğer indirme başarısız olursa derleme yap
        bash -c "$(cat <<'EOF'
            git clone --depth 1 https://github.com/ggml-org/llama.cpp.git
            cd llama.cpp
            mkdir -p build && cd build
            cmake .. -DLLAMA_CUBLAS=OFF -DLLAMA_METAL=OFF -DLLAMA_BUILD_SERVER=ON -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_BENCHMARKS=OFF -DLLAMA_BUILD_EXTRA=OFF -DCMAKE_BUILD_TYPE=Release
            make -j2 llama-server
            cp bin/llama-server ../../bin/ || cp tools/llama-server ../../bin/
            cd ../..
EOF
        )"
    }
    
    # Eğer binary başarıyla indirildiyse, kütüphaneleri de indir
    if [ -f "bin/llama-server" ]; then
        chmod +x bin/llama-server
        echo "✅ Binary indirildi."
        
        # Kütüphaneleri indir (aynı release'den)
        echo "⬇️  Kütüphaneler indiriliyor..."
        wget -O bin/libllama-common.so.0 "https://github.com/ggml-org/llama.cpp/releases/latest/download/libllama-common.so.0" 2>/dev/null || true
        wget -O bin/libllama.so.0 "https://github.com/ggml-org/llama.cpp/releases/latest/download/libllama.so.0" 2>/dev/null || true
        wget -O bin/libggml.so.0 "https://github.com/ggml-org/llama.cpp/releases/latest/download/libggml.so.0" 2>/dev/null || true
        chmod +x bin/*.so* 2>/dev/null || true
    fi
else
    echo "⚠️  Sadece Linux x86_64 destekleniyor. Derleme yapılıyor..."
    # Burada derleme yap (önceki gibi)
    bash -c "$(cat <<'EOF'
        git clone --depth 1 https://github.com/ggml-org/llama.cpp.git
        cd llama.cpp
        mkdir -p build && cd build
        cmake .. -DLLAMA_CUBLAS=OFF -DLLAMA_METAL=OFF -DLLAMA_BUILD_SERVER=ON -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_BENCHMARKS=OFF -DLLAMA_BUILD_EXTRA=OFF -DCMAKE_BUILD_TYPE=Release
        make -j2 llama-server
        cp bin/llama-server ../../bin/ || cp tools/llama-server ../../bin/
        cp -P bin/*.so* ../../bin/ 2>/dev/null || true
        cp -P *.so* ../../bin/ 2>/dev/null || true
        cd ../..
EOF
    )"
fi

echo "✅ Kurulum tamamlandı. bin/ içeriği:"
ls -la bin/