# YankıAI

TinyLlama 1.1B Chat Q2_K modelini ilk çalıştırmada otomatik indirir ve
llama.cpp sunucusu üzerinden beyaz bir sohbet arayüzünde çalıştırır.

## Gerekenler

- Node.js 18 veya üzeri
- llama.cpp içinden `llama-server.exe` (Windows) veya `llama-server` (Linux)

Çalıştırılabilir dosyayı `bin` klasörüne koy:

- Windows: `bin/llama-server.exe`
- Linux: `bin/llama-server`

## Çalıştırma

Windows:

```bat
start.bat
```

Elle:

```bash
npm install
npm start
```

Ardından:

```text
http://localhost:3000
```

## Düşük RAM

Varsayılanlar:

- Context: 256
- Threads: 2
- Batch: 16
- Aynı anda 1 istek
- Maksimum cevap: 128 token

Değiştirme örneği:

```bat
set CONTEXT_SIZE=192
set MAX_TOKENS=96
set THREADS=2
npm start
```

512 MB RAM, model ve çalışma önbelleği birlikte düşünüldüğünde çok sıkı bir
sınırdır. İşletim sistemi veya barındırma hizmeti süreci kapatabilir.

## Doğruluk notu

TinyLlama Türkçe için sıfırdan eğitilmiş bir model değildir. Yankı sistem
promptu ile Türkçe yanıt vermeye yönlendirilir.
