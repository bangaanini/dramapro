# DramaDash Edge Function API

Dokumentasi ini menjelaskan endpoint yang tersedia pada Supabase Edge Function `dramadash`.

Base URL production saat ini:

```text
https://wdofzqixcnvtfrfjzfzw.supabase.co/functions/v1/dramadash
```

## Ringkasan

Function ini mem-proxy upstream API DramaDash dan mendukung 3 pola pemanggilan:

1. Path-based route
2. Query-string route
3. `POST` JSON body

Semua respons dikembalikan dalam format JSON.

## Header

Untuk `POST`, gunakan:

```http
Content-Type: application/json
```

Function ini saat ini bersifat public dan merespons CORS:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`

## Endpoint

### 1. Home

Mengambil data home, banner, trending, daftar drama, dan tabs.

#### Path

```http
GET /functions/v1/dramadash
GET /functions/v1/dramadash/home
```

#### Query-string

```http
GET /functions/v1/dramadash?action=home
```

#### POST body

```http
POST /functions/v1/dramadash
Content-Type: application/json
```

```json
{
  "action": "home"
}
```

#### Contoh curl

```bash
curl "https://wdofzqixcnvtfrfjzfzw.supabase.co/functions/v1/dramadash/home"
```

#### Bentuk respons

```json
{
  "status": 200,
  "data": {
    "banner": [],
    "trending": [],
    "drama": []
  },
  "tabs": [
    {
      "id": null,
      "name": "Populer"
    }
  ]
}
```

### 2. Tabs

Mengambil respons raw upstream untuk tab tertentu.

#### Parameter

- `tabId`:
  ID tab. Contoh:
  - `2` = Baru
  - `3` = Trending
  - `4` = Romansa
  - `5` = CEO

#### Path

```http
GET /functions/v1/dramadash/tabs/:tabId
```

Contoh:

```http
GET /functions/v1/dramadash/tabs/2
```

#### Query-string

```http
GET /functions/v1/dramadash?action=tabs&tabId=2
```

#### POST body

```json
{
  "action": "tabs",
  "tabId": "2"
}
```

#### Contoh curl

```bash
curl "https://wdofzqixcnvtfrfjzfzw.supabase.co/functions/v1/dramadash/tabs/2"
```

#### Bentuk respons

Respons `tabs` adalah respons raw upstream dan tidak memakai shape ringkas seperti endpoint `home`.

### 3. Drama Detail

Mengambil detail drama dan seluruh daftar episode.

#### Parameter

- `dramaId`:
  ID drama. Contoh `44`
- alias query yang juga didukung:
  - `id`

#### Path

```http
GET /functions/v1/dramadash/drama/:dramaId
```

Contoh:

```http
GET /functions/v1/dramadash/drama/44
```

#### Query-string

```http
GET /functions/v1/dramadash?action=drama&dramaId=44
GET /functions/v1/dramadash?action=drama&id=44
```

#### POST body

```json
{
  "action": "drama",
  "dramaId": "44"
}
```

#### Contoh curl

```bash
curl "https://wdofzqixcnvtfrfjzfzw.supabase.co/functions/v1/dramadash/drama/44"
```

#### Bentuk respons

```json
{
  "status": 200,
  "data": {
    "id": 44,
    "name": "Menikah dengan Orang Asing",
    "poster": "https://...",
    "description": "Lily pura-pura menjadi tunangan Tristan demi merebut hati ibunya.",
    "viewCount": 0,
    "tags": [],
    "genres": []
  },
  "episodes": [
    {
      "id": 2862,
      "episodeNumber": 1,
      "isLocked": false,
      "isLiked": false,
      "isWatched": false,
      "duration": 0,
      "current": true,
      "videoUrl": "https://...",
      "subtitles": []
    }
  ]
}
```

### 4. Search

Mencari drama berdasarkan kata kunci.

#### Parameter

- `q`:
  kata pencarian
- alias yang juga didukung:
  - `query`

#### Path

```http
GET /functions/v1/dramadash/search?q=putri
GET /functions/v1/dramadash/search?query=putri
```

#### Query-string

```http
GET /functions/v1/dramadash?action=search&q=putri
GET /functions/v1/dramadash?action=search&query=putri
```

#### POST body

```json
{
  "action": "search",
  "query": "putri"
}
```

#### Contoh curl

```bash
curl "https://wdofzqixcnvtfrfjzfzw.supabase.co/functions/v1/dramadash/search?q=putri"
```

#### Bentuk respons

```json
{
  "status": 200,
  "data": [
    {
      "id": 6,
      "name": "Jatuh Cinta pada Putri Ayah Angkatku",
      "poster": "https://...",
      "description": "",
      "viewCount": 0,
      "tags": [],
      "genres": [
        "Mafia",
        "Hubungan Keluarga"
      ]
    }
  ]
}
```

### 5. Episode

Mengambil satu episode spesifik dari drama tertentu.

#### Parameter

- `dramaId`:
  ID drama. Contoh `44`
- `episode`:
  nomor episode. Contoh `1`
- alias query/body yang juga didukung:
  - `episodeNumber`

#### Path

```http
GET /functions/v1/dramadash/episode/:dramaId/:episode
```

Contoh:

```http
GET /functions/v1/dramadash/episode/44/1
```

#### Query-string

```http
GET /functions/v1/dramadash?action=episode&dramaId=44&episode=1
GET /functions/v1/dramadash?action=episode&dramaId=44&episodeNumber=1
```

#### POST body

```json
{
  "action": "episode",
  "dramaId": "44",
  "episode": "1"
}
```

#### Contoh curl

```bash
curl "https://wdofzqixcnvtfrfjzfzw.supabase.co/functions/v1/dramadash/episode/44/1"
```

#### Bentuk respons

```json
{
  "status": 200,
  "data": {
    "id": 2862,
    "episodeNumber": 1,
    "isLocked": false,
    "isLiked": false,
    "isWatched": false,
    "duration": 0,
    "current": true,
    "videoUrl": "https://...",
    "subtitles": [
      {
        "language": "id",
        "languageDisplayName": "Indonesian",
        "url": "https://..."
      }
    ]
  }
}
```

## Parameter Override Opsional

Semua parameter berikut bisa dikirim melalui `POST` body untuk override konfigurasi upstream per request:

- `deviceToken`
- `deviceId`
- `baseUrl`
- `appVersion`
- `lang`
- `timezone`
- `platform`
- `deviceType`
- `userAgent`
- `acceptEncoding`

Contoh:

```json
{
  "action": "search",
  "query": "putri",
  "lang": "id",
  "timezone": "Asia/Bangkok"
}
```

## Error Response

Jika request salah atau parameter wajib tidak ada:

```json
{
  "error": "Missing required parameter: dramaId"
}
```

Jika action atau route tidak dikenali:

```json
{
  "error": "Unknown route. Use /home, /tabs/:tabId, /drama/:dramaId, /search?q=..., or /episode/:dramaId/:episode."
}
```

Jika upstream gagal:

```json
{
  "error": "Request failed [GET home]",
  "details": {
    "endpoint": "home",
    "method": "GET",
    "responseData": {}
  }
}
```

## HTTP Status

- `200`:
  Request sukses
- `400`:
  Parameter tidak lengkap atau request invalid
- `404`:
  Route/action tidak dikenali
- `502` atau status upstream lain:
  Kegagalan dari upstream DramaDash

## Endpoint Checklist

Endpoint berikut sudah diuji terhadap URL production:

- `GET /dramadash`
- `GET /dramadash/home`
- `GET /dramadash/tabs/2`
- `GET /dramadash/drama/44`
- `GET /dramadash/search?q=putri`
- `GET /dramadash/episode/44/1`
- `GET /dramadash?action=drama&id=44`
- `GET /dramadash?action=episode&dramaId=44&episode=1`
- `POST /dramadash` dengan body `search`
- `POST /dramadash` dengan body `drama`
