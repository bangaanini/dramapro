# Layar Drama API dan Catalog Sync Reference

Dokumen ini menjelaskan API upstream Dracinku, API internal Layar Drama, alur sync katalog, dan alur player terbaru. Format dibuat ringkas dan eksplisit supaya mudah dipakai sebagai konteks untuk OpenAI/Codex atau developer lain.

## 1. Ringkasan Arsitektur

Layar Drama memakai strategi **hybrid on-demand**:

- Supabase menyimpan metadata katalog, provider, tab, series, episode terakhir yang sudah di-hydrate, user, VIP, favorite, saved episode, watch history, payment, dan admin data.
- Homepage/feed/search membaca dari Supabase supaya cepat dan stabil.
- Detail episode dan URL stream di-refresh on-demand saat user membuka detail/player atau saat URL stream lama hilang/expired.
- Sync admin/worker fokus meng-index metadata provider/tab/series. Audit detail episode bisa berjalan sebagai maintenance, tetapi bukan syarat homepage usable.
- Jika detail hydrate gagal, series bisa disembunyikan dari homepage dengan `isHomepageVisible=false`.
- Jika hydrate berikutnya berhasil, series otomatis visible lagi.

## 2. Base URL dan Environment

### Upstream API

```text
Base URL: https://api.dracinku.site
Header: X-API-Key: <UPSTREAM_NEW_API_KEY>
```

Env yang dipakai aplikasi:

```env
UPSTREAM_NEW_API_BASE_URL=https://api.dracinku.site
UPSTREAM_NEW_API_KEY=<secret>
UPSTREAM_NEW_API_TIMEOUT_MS=25000
UPSTREAM_NEW_API_RETRIES=3

CATALOG_DEFAULT_PLATFORM=dramabox
CATALOG_DEFAULT_LANGUAGE=id
CATALOG_DETAIL_TTL_MINUTES=360
CATALOG_SYNC_AUDIT_AFTER_INDEX=false

WORKER_BASE_URL=http://127.0.0.1:3001
WORKER_CATALOG_SYNC_INTERVAL_MS=3000
WORKER_REQUEST_TIMEOUT_MS=120000
WORKER_NOTIFY_TELEGRAM_BOT_TOKEN=<optional>
WORKER_NOTIFY_TELEGRAM_CHAT_ID=<optional>
```

### Internal App API

```text
Local dev: http://localhost:3000
Production: https://layardrama.id
```

Admin/internal endpoints memakai salah satu dari:

- Cookie session admin yang valid.
- Internal secret header/query sesuai helper `hasValidInternalSecret()` untuk worker/server-to-server.

## 3. Provider Aktif

Provider drama yang dipakai app saat ini:

```text
dramabox
shortmax
shorten
dramadash
flickreels
goodshort
melolo
netshort
reelbuzz
freereels
dramamax
flickshort
radreels
hishort
dramawave
litetv
chill
dramarush
movietv
drakor
cachebjav
meloshort
dramanova
microdrama
```

Catatan:

- `anime` dan `animev2` sengaja tidak dipakai untuk sync drama.
- Provider bisa di-hide dari homepage lewat admin. Jika provider hide, semua series provider tersebut tidak muncul di feed/homepage.
- Homepage tab provider hanya menampilkan provider yang visible dan punya minimal 1 series visible.

## 4. Upstream API Dracinku

Semua request upstream wajib memakai header:

```http
X-API-Key: <UPSTREAM_NEW_API_KEY>
Accept: application/json
Content-Type: application/json
```

### 4.1 Get Languages

```http
GET /{platform}/languages
```

Sample:

```bash
curl -X GET "https://api.dracinku.site/dramabox/languages" \
  -H "X-API-Key: <UPSTREAM_NEW_API_KEY>"
```

Response:

```json
{
  "success": true,
  "platform": "dramabox",
  "data": {
    "supported": ["id", "en", "th"],
    "mapping": {
      "id": "id_ID",
      "en": "en_US",
      "th": "th_TH"
    }
  }
}
```

### 4.2 Get Tab List

```http
GET /{platform}/tablist?lang={lang_code}
```

Sample:

```bash
curl -X GET "https://api.dracinku.site/dramabox/tablist?lang=id" \
  -H "X-API-Key: <UPSTREAM_NEW_API_KEY>"
```

Response:

```json
{
  "success": true,
  "platform": "dramabox",
  "language": "id",
  "data": [
    {
      "type": "tab",
      "name": "Populer",
      "tab_key": "0",
      "position_index": 0
    }
  ]
}
```

### 4.3 Get First Tab Page

```http
POST /{platform}/tabdata?lang={lang_code}
```

Request:

```json
{
  "key": "0",
  "positionIndex": 0,
  "type": "tab"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "book": {
      "list": [
        {
          "id": "42000002890",
          "name": "Kembalinya Sang Petinju",
          "cover": "https://example.com/cover.jpg",
          "chapterCount": 72,
          "introduction": "Deskripsi singkat",
          "tags": ["Balas Dendam", "Modern"],
          "playCount": "9.5M"
        }
      ]
    },
    "page_info": {
      "has_more": true,
      "pageNo": 1,
      "pageSize": 15
    }
  }
}
```

### 4.4 Get Next Tab Page

```http
POST /{platform}/tabfeed?lang={lang_code}
```

Request:

```json
{
  "page_info": {
    "has_more": true,
    "pageNo": 1,
    "pageSize": 15
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "book": [
      {
        "id": "42000002888",
        "name": "Dewa Judi",
        "cover": "https://example.com/cover.jpg",
        "chapterCount": 74,
        "playCount": "18.4M"
      }
    ],
    "page_info": {
      "has_more": true,
      "pageNo": 2,
      "pageSize": 15
    }
  }
}
```

### 4.5 Search Upstream

```http
POST /{platform}/search?lang={lang_code}
```

Request:

```json
{
  "keyword": "cinta"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "book": [
      {
        "id": "42000002888",
        "name": "Dewa Judi",
        "cover": "https://example.com/cover.jpg",
        "chapterCount": 74,
        "playCount": "18.4M"
      }
    ],
    "page_info": {
      "has_more": false,
      "pageNo": 1
    }
  }
}
```

### 4.6 Get Series Detail dan Episode

```http
GET /{platform}/series/{upstreamSeriesId}?lang={lang_code}&quality={quality}
```

Sample:

```bash
curl -X GET "https://api.dracinku.site/dramabox/series/42000002890?lang=id&quality=720" \
  -H "X-API-Key: <UPSTREAM_NEW_API_KEY>"
```

Response:

```json
{
  "success": true,
  "data": {
    "book": {
      "id": "42000002890",
      "name": "Balikan Cinta dengan Mantan Suami",
      "chapterCount": 80,
      "introduction": "Setelah bercerai, Isabella meraih kesuksesan...",
      "cover": "https://example.com/cover.jpg",
      "tags": ["Romance"],
      "playCount": "1.2M"
    },
    "chapters": [
      {
        "eps": "EP-1",
        "index": 0,
        "videoPath": "https://example.com/video.m3u8",
        "subtitle": [
          {
            "language": "id",
            "display_name": "Indonesian",
            "subtitle": "https://example.com/subtitle.srt"
          }
        ]
      }
    ]
  }
}
```

Normalisasi episode di app:

- Jika chapter upstream mulai dari `index: 0`, app menyimpan episode sebagai `episodeIndex = index + 1`.
- Jika chapter upstream mulai dari `index: 1`, app memakai index apa adanya.
- `eps` hanya dipakai sebagai label (`episodeLabel`), bukan sumber index utama kecuali index tidak valid.
- Episode tanpa `videoPath` tidak disimpan.
- Subtitle disimpan mentah di `CatalogEpisode.subtitles`, lalu diproxy/normalisasi saat stream resolve.

## 5. Database Katalog Utama

Tabel utama:

- `CatalogPlatform`: daftar provider dan flag `isHomepageVisible`.
- `CatalogLanguage`: bahasa per provider.
- `CatalogTab`: tab/category upstream.
- `CatalogTabSeries`: relasi tab ke series.
- `CatalogSeries`: metadata judul, cover, count episode, status homepage, TTL detail.
- `CatalogEpisode`: episode detail, video URL, subtitle JSON.
- `CatalogSyncState`: status sync tab/series.
- `CatalogSyncJob`: job sync all berbasis cursor/step.

Field penting:

```text
CatalogSeries.lastDetailSyncedAt
CatalogSeries.isHomepageVisible
CatalogSeries.homepageHiddenReason
CatalogEpisode.episodeIndex
CatalogEpisode.videoUrl
CatalogEpisode.subtitles
CatalogSyncJob.phase
CatalogSyncJob.progressPercent
```

## 6. Internal Public API

### 6.1 Homepage Feed

```http
GET /api/catalog/feed?offset=0&limit=18
GET /api/catalog/feed?platform=dramawave&offset=0&limit=18
```

Query:

- `offset`: angka mulai data.
- `limit`: jumlah data.
- `platform`: optional provider id.

Response:

```json
{
  "entries": [
    {
      "id": "39fd42e5-9526-4040-aba7-de18e39d38bb",
      "title": "Judul Drama",
      "thumbUrl": "https://example.com/cover.jpg",
      "platformId": "dramawave",
      "platformName": "DramaWave",
      "episodeCount": 80,
      "description": "Deskripsi",
      "playCount": "1.2M",
      "tags": ["Romance"]
    }
  ],
  "total": 120,
  "nextOffset": 18,
  "hasMore": true
}
```

Behavior:

- Hanya mengambil `CatalogSeries.isHomepageVisible=true`.
- Hanya mengambil provider dengan `CatalogPlatform.isHomepageVisible=true`.
- Digunakan oleh homepage tab provider dan tombol `Muat lebih banyak`.

### 6.2 Search Lokal

```http
GET /api/search?q=cinta&limit=18
```

Response:

```json
{
  "query": "cinta",
  "tabId": "",
  "tag": "",
  "total": 2,
  "minimumQueryLength": 2,
  "results": [
    {
      "id": "39fd42e5-9526-4040-aba7-de18e39d38bb",
      "title": "Cinta di Usia Senja",
      "thumbUrl": "https://example.com/cover.jpg",
      "providerName": "HiShort",
      "episodeCount": 70,
      "tags": ["Romance"],
      "description": "Deskripsi",
      "playCount": "23490"
    }
  ]
}
```

### 6.3 Resolve Stream

```http
GET /api/stream?internalDramaId={catalogSeriesId}&episodeIndex=1
```

Response:

```json
{
  "dramaId": "39fd42e5-9526-4040-aba7-de18e39d38bb",
  "provider": "dramawave",
  "episodeIndex": 1,
  "defaultQuality": "Auto",
  "qualities": [
    {
      "label": "Auto",
      "url": "/api/media?url=https%3A%2F%2Fexample.com%2Fvideo.m3u8",
      "mimeType": "application/x-mpegURL"
    },
    {
      "label": "720p",
      "url": "/api/media?url=https%3A%2F%2Fexample.com%2Fvideo.m3u8",
      "mimeType": "application/x-mpegURL"
    }
  ],
  "subtitles": [
    {
      "label": "Indonesian",
      "language": "id",
      "url": "/api/media?url=https%3A%2F%2Fexample.com%2Fsubtitle.srt"
    }
  ]
}
```

Behavior penting:

- Response `Cache-Control: no-store`.
- Mengecek VIP lock sebelum resolve episode.
- Memanggil `ensureSeriesPlayableFresh()` sebelum resolve.
- Jika episode tidak ada, detail series akan di-refresh paksa dari upstream satu kali.
- Jika URL signed stream expired/nyaris expired, detail akan di-refresh paksa.
- URL media/subtitle yang perlu proxy akan diubah ke `/api/media?url=...`.
- Subtitle external dinormalisasi ke WebVTT oleh `/api/media`.

Error response:

```json
{
  "error": "Requested episode is out of range."
}
```

Common status:

- `400`: parameter salah, episode out of range.
- `403`: episode terkunci VIP.
- `404`: drama tidak ditemukan.
- `502`: upstream/stream resolve gagal.

### 6.4 Media Proxy

```http
GET /api/media?url={encodedMediaUrl}
GET /api/media?url={encodedMediaUrl}&download=1&filename=episode.mp4
```

Behavior:

- Proxy HLS playlist dan segment.
- Rewrite isi `.m3u8` agar semua segment/key URI melewati `/api/media`.
- Proxy MP4/range request.
- Deteksi subtitle `.vtt`, `.srt`, `/subtitle`, lalu normalisasi ke `text/vtt`.
- Menghapus key `local://offline-key` dari playlist.

Response untuk playlist:

```http
Content-Type: application/x-mpegURL; charset=utf-8
Cache-Control: no-store
```

Response untuk subtitle:

```http
Content-Type: text/vtt; charset=utf-8
Cache-Control: no-store
```

## 7. Internal Admin Sync API

Endpoint:

```http
GET /api/admin/catalog-sync?platform=dramabox&language=id
POST /api/admin/catalog-sync
```

Auth:

- Admin cookie session, atau
- Internal secret untuk worker.

### 7.1 Get Dashboard Sync

```bash
curl "https://layardrama.id/api/admin/catalog-sync?platform=dramabox&language=id" \
  -H "Cookie: admin_session=..."
```

Response ringkas:

```json
{
  "platform": {
    "id": "dramabox",
    "name": "DramaBox",
    "isHomepageVisible": true
  },
  "language": {
    "code": "id"
  },
  "tabs": [
    {
      "id": "tab-uuid",
      "name": "Populer",
      "type": "tab",
      "syncedEntries": 15,
      "hasMore": true,
      "lastSyncedAt": "2026-04-27T00:00:00.000Z"
    }
  ],
  "syncJob": {
    "id": "job-uuid",
    "status": "running",
    "phase": "sync-tabs",
    "progressPercent": 35
  }
}
```

### 7.2 Start Sync All

```http
POST /api/admin/catalog-sync
Content-Type: application/json
```

Request:

```json
{
  "mode": "start-sync-all",
  "language": "id"
}
```

Response:

```json
{
  "ok": true,
  "mode": "start-sync-all",
  "result": {
    "id": "job-uuid",
    "status": "queued",
    "languageCode": "id",
    "phase": "init-platform",
    "totalPlatforms": 24,
    "completedPlatforms": 0,
    "progressPercent": 0
  },
  "syncJob": {
    "id": "job-uuid",
    "status": "queued",
    "phase": "init-platform",
    "progressPercent": 0
  }
}
```

### 7.3 Run One Sync Step

Worker memanggil endpoint ini berulang:

```json
{
  "mode": "run-sync-all-step",
  "jobId": "job-uuid",
  "runnerId": "catalog-sync:worker:123"
}
```

Response:

```json
{
  "ok": true,
  "mode": "run-sync-all-step",
  "result": {
    "id": "job-uuid",
    "status": "running",
    "languageCode": "id",
    "phase": "sync-tabs",
    "platformIndex": 4,
    "currentPlatformId": "dramawave",
    "currentTabName": "Populer",
    "totalPlatforms": 24,
    "completedPlatforms": 3,
    "totalTabs": 60,
    "completedTabs": 12,
    "totalTitles": 420,
    "totalEpisodes": 0,
    "pendingDetails": 0,
    "processedDetails": 0,
    "errorCount": 1,
    "recentErrors": [],
    "recentLogs": [],
    "lastMessage": "DramaWave / Populer page selesai.",
    "progressPercent": 18,
    "isWorkerActive": true,
    "leaseExpiresAt": "2026-04-27T00:05:00.000Z",
    "lastHeartbeatAt": "2026-04-27T00:04:00.000Z",
    "startedAt": "2026-04-27T00:00:00.000Z",
    "finishedAt": null,
    "updatedAt": "2026-04-27T00:04:00.000Z"
  },
  "syncJob": {
    "id": "job-uuid",
    "status": "running",
    "phase": "sync-tabs",
    "progressPercent": 18
  }
}
```

### 7.4 Other Admin Sync Modes

```json
{ "mode": "init", "platform": "dramabox", "language": "id" }
```

Initialize platform/language/tabs.

```json
{ "mode": "refresh-tablist", "platform": "dramabox", "language": "id" }
```

Refresh tab list.

```json
{ "mode": "sync-first-page", "tabId": "tab-uuid" }
```

Sync first page of one tab.

```json
{ "mode": "sync-next-page", "tabId": "tab-uuid" }
```

Sync next page of one tab using stored cursor/page info.

```json
{ "mode": "hydrate-pending", "platform": "dramabox", "language": "id" }
```

Hydrate pending series details in small batch.

```json
{
  "mode": "set-provider-homepage-visibility",
  "platform": "anime",
  "isHomepageVisible": false
}
```

Hide/unhide provider from homepage.

## 8. Sync All Flow

Sync all memakai `CatalogSyncJob` sebagai cursor job. Worker tidak menjalankan satu proses besar yang mudah crash, tetapi memproses satu step per request.

Phases:

```text
init-platform -> sync-tabs -> audit-series -> completed
```

### 8.1 init-platform

Untuk provider aktif:

1. Register provider ke `CatalogPlatform`.
2. Fetch `/languages`.
3. Upsert `CatalogLanguage`.
4. Fetch `/tablist?lang=id`.
5. Upsert `CatalogTab`.
6. Lanjut ke `sync-tabs`.

### 8.2 sync-tabs

Untuk setiap tab provider:

1. Jika belum pernah sync, call `/tabdata`.
2. Jika sudah punya `page_info.has_more=true`, call `/tabfeed`.
3. Upsert `CatalogSeries` dari summary.
4. Upsert `CatalogTabSeries`.
5. Simpan cursor `lastPageInfo` di `CatalogSyncState`.
6. Jika satu tab habis, pindah tab berikutnya.
7. Jika semua tab provider selesai, pindah provider berikutnya.

Data summary tidak dipercaya penuh untuk episode karena upstream kadang mengirim `chapterCount: 0`. Detail episode tetap di-hydrate on-demand.

### 8.3 audit-series

Audit bersifat maintenance:

1. Ambil batch series pending/stale.
2. Panggil `/series/{id}`.
3. Jika punya episode valid, update episode dan visible.
4. Jika gagal/tidak punya episode, hide dari homepage.
5. Ulang sampai tidak ada pending.

Jika env `CATALOG_SYNC_AUDIT_AFTER_INDEX=false`, index selesai tanpa audit penuh. Web tetap usable karena player/detail melakukan hydrate on-demand.

### 8.4 completed

Job selesai saat semua provider/tab selesai dan audit optional selesai/dilewati.

## 9. Worker

Command utama:

```bash
npm run worker:catalog-sync
```

Script:

```bash
node scripts/ops-worker.mjs catalog-sync
```

Behavior:

- Menunggu endpoint `/api/admin/catalog-sync` siap.
- Polling `POST /api/admin/catalog-sync` mode `run-sync-all-step`.
- Mengirim `runnerId` unik.
- Memakai lease/heartbeat agar job tidak diproses ganda.
- Bisa kirim notifikasi Telegram saat selesai/gagal.

Env penting:

```env
WORKER_BASE_URL=http://127.0.0.1:3001
WORKER_CATALOG_SYNC_INTERVAL_MS=3000
WORKER_REQUEST_TIMEOUT_MS=120000
WORKER_NOTIFY_TELEGRAM_BOT_TOKEN=<optional>
WORKER_NOTIFY_TELEGRAM_CHAT_ID=<optional>
WORKER_NOTIFY_ON_SUCCESS=true
WORKER_NOTIFY_ON_FAILURE=true
```

PM2 biasanya menjalankan:

```bash
pm2 start ecosystem.config.cjs --update-env
pm2 restart layardrama --update-env
pm2 restart layardrama-ops --update-env
pm2 save
```

## 10. On-Demand Hydrate Flow

### Saat buka detail/player

Helper:

```ts
ensureSeriesPlayableFresh(seriesId, options)
```

Refresh detail jika:

- `force=true`.
- Episode kosong.
- `chapterCount=0`.
- `lastDetailSyncedAt` stale berdasarkan `CATALOG_DETAIL_TTL_MINUTES`.

Jika berhasil:

- Update `CatalogSeries.title`, `description`, `coverUrl`, `chapterCount`, `tags`, `playCount`.
- Upsert `CatalogEpisode`.
- Set `isHomepageVisible=true` jika episode valid.
- Clear `homepageHiddenReason`.

Jika gagal:

- Jika `hideOnFailure=true`, set `isHomepageVisible=false`.
- Set `homepageHiddenReason=detail_on_demand_failed`.
- Jika `allowStaleOnFailure=true` dan masih ada episode lama, tetap gunakan data lama.

### Saat resolve stream

`/api/stream` melakukan:

1. Load series dengan episode.
2. Jika detail stale/kosong, hydrate detail.
3. Cari `episodeIndex`.
4. Jika episode missing, force hydrate lalu cari ulang.
5. Jika signed URL expired/nyaris expired, force hydrate lalu pakai URL baru.
6. Return qualities/subtitles.

## 11. Player Flow

Player memakai:

- Native `<video>`.
- `hls.js` untuk HLS normal.
- Fallback HEVC/H.265 player hanya jika manifest/stream gagal dan terdeteksi HEVC.
- Subtitle external lewat `/api/media` agar format SRT/VTT dinormalisasi.

Subtitle behavior terbaru:

- User tidak memilih bahasa.
- Player hanya mencari subtitle Indonesia (`id`, `in`, `ind`, `indo`, `id-id`, label Indonesia/Indonesian).
- Tombol subtitle menjadi toggle `Subtitle On/Off`.
- Jika ON di episode 1, episode berikutnya otomatis ON jika subtitle Indonesia tersedia.
- Jika suatu episode tidak punya subtitle Indonesia, subtitle mati di episode itu tetapi preferensi ON tetap diingat untuk episode berikutnya.

## 12. Cache dan Revalidate

Homepage/feed:

```http
Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400
```

Stream/media:

```http
Cache-Control: no-store
```

Admin sync setelah write:

- `revalidateTag("catalog-home", "max")`
- `revalidateTag("catalog-shortcuts", "max")`

## 13. Error Handling dan Visibility

Common hide reasons:

```text
no_episodes_after_sync
detail_sync_failed
detail_on_demand_failed
provider_tab_sync_failed
pending_audit
```

Rules:

- Provider hide: semua series provider tidak tampil di homepage.
- Series hide: series tidak tampil di homepage/feed/search yang memakai visible filter.
- Hydrate success: series bisa otomatis tampil lagi.
- Stream resolve error tidak selalu fatal untuk database; hanya hide jika force hydrate/on-demand gagal dengan `hideOnFailure=true`.

## 14. Recommended Operational Flow

### Initial deploy / setelah tambah provider

1. Deploy code.
2. Jalankan migrasi additive jika ada.
3. `npx prisma generate`.
4. `npm run build`.
5. Restart app.
6. Restart worker.
7. Klik `Sync All` di admin atau buat job via API.
8. Biarkan worker index provider/tab/series.
9. Audit full optional, bisa dilakukan bertahap.

### Daily operation

1. Worker jalan di background.
2. Sync All/manual hanya jika butuh refresh besar.
3. User membuka detail/player akan hydrate episode on-demand.
4. Provider bermasalah bisa di-hide dari admin tanpa menghapus data.

## 15. Quick Examples untuk OpenAI/Codex

### Pertanyaan: kenapa homepage cepat tapi episode bisa update?

Jawaban teknis:

```text
Homepage membaca CatalogSeries dari Supabase. Episode dan video URL tidak harus selalu fresh di homepage. Saat user membuka detail/player, ensureSeriesPlayableFresh() refresh detail dari upstream jika kosong/stale. Jadi metadata cepat, stream tetap on-demand.
```

### Pertanyaan: kenapa tidak pure direct upstream?

Jawaban teknis:

```text
Pure upstream membuat homepage/search lambat dan rentan timeout. Aplikasi tetap butuh Supabase untuk user data, payment, favorite, saved episode, history, provider visibility, dan cache katalog. Hybrid memberi UX cepat sekaligus stream fresh.
```

### Pertanyaan: apa yang dilakukan Sync All?

Jawaban teknis:

```text
Sync All membuat CatalogSyncJob. Worker memproses job per step: init provider, sync tab pages dengan cursor page_info, upsert series summary, lalu optional audit detail. Proses aman dari crash karena progress disimpan di database.
```

### Pertanyaan: kapan series disembunyikan?

Jawaban teknis:

```text
Series disembunyikan jika hydrate detail gagal atau tidak menghasilkan episode valid. Field yang berubah adalah CatalogSeries.isHomepageVisible=false dan homepageHiddenReason diisi. Jika hydrate berikutnya berhasil, isHomepageVisible bisa kembali true.
```

