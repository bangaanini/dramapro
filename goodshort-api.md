# GoodShort API

Base URL:

```text
https://goodshort-api.rokeroke41.workers.dev
```

API ini adalah Cloudflare Worker yang mem-proxy request ke layanan GoodShort/GoodReels dan mengembalikan respons JSON.

## Ringkasan

- Method publik: `GET`
- CORS: `Access-Control-Allow-Origin: *`
- Format respons: `application/json; charset=utf-8`
- Preflight: `OPTIONS` didukung untuk semua path

Catatan:

- Parameter `populer` memang memakai ejaan itu, karena route di kode menggunakan `?populer`.
- Endpoint `/goodshort` hanya memproses satu mode per request. Urutan prioritasnya: `home` -> `populer` -> `new` -> `nav` -> `search`.
- Pada respons upstream, field `ip` dan `path` dibuang sebelum dikembalikan ke client.

## Endpoint

### 1. Root

Mengembalikan daftar route yang tersedia.

```http
GET /
```

Contoh:

```bash
curl 'https://goodshort-api.rokeroke41.workers.dev/'
```

Contoh respons:

```json
{
  "routes": [
    "/goodshort?home&page=1",
    "/goodshort?new&page=1",
    "/goodshort?populer&page=1",
    "/goodshort?nav",
    "/goodshort?search=SISTEM&page=1",
    "/goodshort/detail?bookId=31001293031",
    "/goodshort/stream?bookId=31001020259"
  ]
}
```

### 2. Home Recommendations

Mengambil rekomendasi beranda.

```http
GET /goodshort?home&page=1
```

Parameter:

- `home`: flag tanpa nilai
- `page`: opsional. Saat ini tidak dipakai oleh handler, tapi aman disertakan

Contoh:

```bash
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort?home&page=1'
```

Respons sukses biasanya berbentuk:

```json
{
  "data": {
    "recommentList": [
      {
        "book": {
          "bookId": "31001318080",
          "bookName": "Aku di Supermarket Akhir Zaman"
        },
        "chapter": {
          "id": 17338168,
          "chapterName": "001",
          "cdn": "https://..."
        }
      }
    ]
  },
  "status": 0,
  "message": "success",
  "timestamp": 1776533873352,
  "region": "ID",
  "success": true
}
```

### 3. New Releases

Mengambil daftar konten terbaru berdasarkan channel.

```http
GET /goodshort?new&page=1
GET /goodshort?new&page=1&channelId=563
```

Parameter:

- `new`: flag tanpa nilai
- `page`: opsional, default `1`
- `channelId`: opsional, default `563`

Contoh:

```bash
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort?new&page=1'
```

Respons sukses biasanya berbentuk:

```json
{
  "data": {
    "current": 1,
    "size": 12,
    "records": [
      {
        "name": "HOT🔥",
        "items": [
          {
            "bookId": "31001342038",
            "bookName": "Kakakku Parah Banget!"
          }
        ]
      }
    ],
    "pages": 1
  },
  "status": 0,
  "message": "success",
  "timestamp": 1776533873324,
  "region": "ID",
  "success": true
}
```

### 4. Popular

Mengambil daftar konten populer.

```http
GET /goodshort?populer&page=1
```

Parameter:

- `populer`: flag tanpa nilai
- `page`: opsional, default `1`

Contoh:

```bash
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort?populer&page=1'
```

Catatan implementasi:

- Mengarah ke upstream `home/index`
- Menggunakan `pageSize=12`
- `channelType=1`
- `channelId=-1`

### 5. Navigation / Categories

Mengambil daftar menu navigasi dan filter kategori.

```http
GET /goodshort?nav
```

Parameter:

- `nav`: flag tanpa nilai

Contoh:

```bash
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort?nav'
```

Respons sukses biasanya berbentuk:

```json
{
  "data": {
    "list": [
      {
        "title": "Tren🔥",
        "channelId": -1
      },
      {
        "title": "Terbaru",
        "channelId": 563
      },
      {
        "title": "Kategori",
        "channelId": -4,
        "generSearchConditions": []
      }
    ]
  },
  "status": 0,
  "message": "success",
  "timestamp": 1776533840841,
  "region": "ID",
  "success": true
}
```

### 6. Search

Mencari judul berdasarkan keyword.

```http
GET /goodshort?search=SISTEM&page=1
```

Parameter:

- `search`: wajib, keyword pencarian
- `page`: opsional, default `1`

Contoh:

```bash
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort?search=SISTEM&page=1'
```

Respons sukses biasanya berbentuk:

```json
{
  "data": {
    "searchResult": {
      "current": 1,
      "size": 15,
      "total": 500,
      "records": [
        {
          "bookId": "31001318070",
          "bookName": "Sistem Pernyataan Cinta"
        }
      ],
      "pages": 34
    },
    "otherSearchResults": []
  },
  "status": 0,
  "message": "success",
  "timestamp": 1776533873557,
  "region": "ID",
  "success": true
}
```

Jika keyword kosong:

```http
GET /goodshort?search=
```

Respons:

```json
{
  "error": "Provide search query, e.g. ?search=SISTEM&page=1"
}
```

Status: `400`

### 7. Detail Book

Mengambil detail buku dan daftar chapter awal.

```http
GET /goodshort/detail?bookId=31001293031
```

Parameter:

- `bookId`: wajib

Contoh:

```bash
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort/detail?bookId=31001293031'
```

Respons sukses biasanya berbentuk:

```json
{
  "data": {
    "book": {
      "bookId": "31001293031",
      "bookName": "[Sulih Suara]Sistem cinta"
    },
    "list": [
      {
        "id": 16880951,
        "chapterName": "001",
        "cdn": "https://..."
      }
    ],
    "chapterListVersion": 0,
    "chapterContentVersion": 0
  },
  "status": 0,
  "message": "success",
  "timestamp": 1776533873943,
  "region": "ID",
  "success": true
}
```

Jika `bookId` tidak dikirim:

```json
{
  "error": "Provide bookId, e.g. /goodshort/detail?bookId=31001293031"
}
```

Status: `400`

### 8. Stream / Download List

Mengambil daftar stream/download chapter untuk sebuah buku.

```http
GET /goodshort/stream?bookId=31001020259
```

Parameter:

- `bookId`: wajib

Contoh:

```bash
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort/stream?bookId=31001020259'
```

Respons sukses biasanya berbentuk:

```json
{
  "data": {
    "bookId": "31001020259",
    "bookName": "Dewa Uang Berpihak Padaku",
    "downloadList": [
      {
        "id": 12690320,
        "index": 0,
        "chapterName": "001",
        "multiVideos": [
          {
            "type": "720p",
            "filePath": "https://..."
          }
        ]
      }
    ]
  },
  "status": 0,
  "message": "success",
  "timestamp": 1776533882597,
  "region": "ID",
  "success": true
}
```

Jika `bookId` tidak dikirim:

```json
{
  "error": "Provide bookId, e.g. /goodshort/stream?bookId=31001020259"
}
```

Status: `400`

## Status Code

- `200`: request berhasil
- `400`: parameter tidak valid atau mode query tidak diberikan
- `404`: path tidak ditemukan
- `500`: error internal worker atau upstream

Contoh `400` untuk `/goodshort` tanpa mode:

```json
{
  "error": "Use ?home, ?new, ?populer, ?nav, or ?search="
}
```

Contoh `404`:

```json
{
  "error": "Not found"
}
```

## Quick Test

```bash
curl 'https://goodshort-api.rokeroke41.workers.dev/'
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort?home&page=1'
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort?new&page=1'
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort?populer&page=1'
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort?nav'
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort?search=SISTEM&page=1'
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort/detail?bookId=31001293031'
curl 'https://goodshort-api.rokeroke41.workers.dev/goodshort/stream?bookId=31001020259'
```
