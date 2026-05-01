# OpenAI Project Context - DramaPro / Layar Drama

Dokumen ini dibuat sebagai briefing cepat untuk OpenAI/Codex ketika masuk ke repo ini. Tujuannya agar alur project, batasan penting, dan sistem yang sedang dipakai jelas sejak awal.

## Identitas Project

- Nama repo: `dramapro`
- Produk: web streaming short drama dengan user web, user Telegram, admin dashboard, VIP, affiliate, payment, favorite, saved episode, watch history, dan integrasi bot Telegram.
- Stack utama: Next.js 16 App Router, React 19, Prisma 7, PostgreSQL, HLS.js, FFmpeg untuk fitur download admin.
- Database production lama berasal dari Supabase, tetapi sekarang bisa dipindah ke PostgreSQL lokal/VPS dengan schema yang sama.
- Sumber katalog aktif: StreamAPI provider layer.

## Aturan Paling Penting

1. Jangan gunakan atau menghidupkan lagi API katalog lama.
2. Jangan menaruh token provider, token Telegram, password admin, atau credential payment di file yang dicommit.
3. Jangan mengubah data user, VIP, affiliate, payment, favorite, saved episode, watch history, atau Telegram secara destruktif.
4. Migration database harus additive atau sangat jelas efeknya. Hindari drop table/column tanpa instruksi eksplisit.
5. `PROD_DATABASE_URL` dan `PROD_DIRECT_URL` adalah production credential. Untuk runtime/dev gunakan `DATABASE_URL` dan `DIRECT_URL`.
6. Katalog baru harus memakai `catalogSource = "streamapi"`.
7. Data legacy boleh tetap ada untuk menjaga relasi user lama, tetapi jangan dijadikan sumber homepage/koleksi baru.

## Sistem Katalog Saat Ini

Katalog publik disimpan di schema lama agar fitur lama tetap aman:

- `CatalogPlatform`
- `CatalogLanguage`
- `CatalogSeries`
- `CatalogEpisode`
- `CatalogSyncState`
- `ProviderSyncJob`
- `ProviderWorkerLog`

Mapping StreamAPI ke schema lama:

- Provider StreamAPI -> `CatalogSeries.platformId`
- ID drama upstream -> `CatalogSeries.upstreamSeriesId`
- Judul, cover, sinopsis, tag, jumlah episode -> `CatalogSeries`
- Episode number -> `CatalogEpisode.episodeIndex`
- ID episode upstream -> `CatalogEpisode.upstreamEpisodeId`
- Playback cache -> `CatalogEpisode.playbackSources`, `playbackSubtitles`, `playbackExpiresAt`
- Raw response provider -> `providerRawPayload`

Unique key penting:

- `CatalogSeries`: `platformId + languageId + upstreamSeriesId`
- `CatalogEpisode`: `seriesId + episodeIndex`

## StreamAPI Provider Layer

File utama:

- `lib/streamapi/types.ts`: canonical type provider.
- `lib/streamapi/registry.ts`: daftar provider aktif.
- `lib/streamapi/adapters.ts`: adapter request dan normalisasi provider.
- `lib/streamapi/catalog-sections.ts`: metadata endpoint katalog per provider untuk panel admin dan cron.
- `lib/streamapi/normalizers.ts`: normalisasi drama, episode, dan playback.
- `lib/provider-sync.ts`: validasi admin input, enqueue job, sync katalog/detail, resolve playback, health/log/dashboard.

Provider aktif mengikuti registry StreamAPI. Jika menambah provider baru:

1. Tambahkan provider code di `lib/streamapi/types.ts` dan registry.
2. Tambahkan metadata endpoint katalog di `catalog-sections.ts`.
3. Tambahkan adapter/normalizer jika format provider berbeda.
4. Pastikan hasil masuk ke canonical drama, episode, dan playback.
5. Pastikan sync menyimpan ke `CatalogSeries` dan `CatalogEpisode`, bukan tabel baru.

## Alur Sync

Ada dua cara membuat job sync:

- Admin panel `/admin/sync`
- Cron script `npm run provider:cron`

Alur:

1. Admin/cron enqueue ke `ProviderSyncJob`.
2. Worker `npm run worker:provider-sync` claim job queued.
3. Worker request endpoint provider sesuai metadata dan parameter.
4. Drama dinormalisasi ke canonical shape.
5. Worker upsert ke `CatalogSeries`.
6. Untuk detail/episode, worker hydrate metadata episode ke `CatalogEpisode`.
7. Semua log masuk ke `ProviderWorkerLog`.

Worker tetap jalan walaupun admin meninggalkan halaman.

## Playback

Endpoint publik:

- `GET /api/stream?dramaId=...&episode=...`

File utama:

- `lib/stream-access.ts`
- `lib/provider-sync.ts`
- `components/video-player.tsx`
- `components/h265-hls-player.tsx`
- `app/watch-player/[id]/page.tsx`

Alur playback:

1. User buka detail drama dari `app/watch/[id]/page.tsx`.
2. User klik play menuju route rewrite `/watch/:id/play` -> `/watch-player/:id`.
3. Player memanggil `/api/stream`.
4. `resolveDramaStreamSources` cek VIP lock dan episode lokal.
5. Untuk StreamAPI, `resolveProviderPlayback` resolve URL playback dari provider bila cache kosong/expired.
6. Playback sources dan subtitle dinormalisasi ke response player.
7. URL HLS/subtitle yang rawan CORS diproxy lewat `/api/media`.

Catatan:

- Playback URL sering bertoken dan expired. Jangan simpan sebagai URL permanen.
- Jika cache playback masih valid lebih dari grace period, boleh dipakai ulang.
- Jangan kirim token provider ke client.

## Admin

Route admin utama:

- `/admin`
- `/admin/sync`
- `/admin/promo-downloader`

API admin utama:

- `app/api/admin/provider-sync/route.ts`
- `app/api/admin/promo-download/route.ts`
- `app/api/admin/promo-download/batch/route.ts`
- `app/api/admin/promo-download/file/route.ts`
- `app/api/admin/promo-download/render/route.ts`
- `app/api/admin/catalog-cache/refresh/route.ts`

Auth admin:

- `lib/admin-auth.ts`
- Admin bootstrap memakai `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`.

## Promo Downloader

Fitur admin untuk download episode atau batch episode.

File utama:

- `components/admin-promo-downloader.tsx`
- `lib/promo-download.ts`
- `scripts/promo-download-worker.ts`
- `app/api/admin/promo-download/*`

Alur:

1. Admin pilih drama dan episode.
2. Single download bisa render langsung via route render.
3. Download semua membuat job di `PromoDownloadJob`.
4. Worker `npm run worker:promo-download` memproses job background.
5. FFmpeg mengambil HLS/MP4 dari `/api/stream` dan menghasilkan file MP4 di `PROMO_DOWNLOAD_DIR`.

Environment penting:

- `FFMPEG_PATH`
- `FFMPEG_LOG_LEVEL`
- `PROMO_DOWNLOAD_DIR`
- `PROMO_DOWNLOAD_IDLE_MS`
- `PROMO_DOWNLOAD_MIN_FREE_MB`
- `PROMO_DOWNLOAD_MIN_DURATION_SECONDS`

## Telegram, User, VIP, Affiliate, Payment

Jangan rusak bagian ini saat mengubah katalog.

File penting:

- `lib/user-auth.ts`
- `lib/telegram-auth.ts`
- `lib/telegram-bot.ts`
- `lib/telegram-partner-bots.ts`
- `lib/telegram-web-app.ts`
- `app/api/telegram/webhook/route.ts`
- `lib/vip.ts`
- `lib/vip-payments.ts`
- `lib/affiliate.ts`
- `lib/paymenku.ts`
- `lib/payment-gateway-service.ts`

Model penting:

- `User`
- `UserSession`
- `AdminUser`
- `AdminSession`
- `TelegramPartnerBot`
- `VipPayment`
- `VipPricePlan`
- `FavoriteDrama`
- `SavedEpisode`
- `WatchHistory`
- `AffiliateCommission`

## Local Development

Jalankan web saja:

```bash
npm run dev
```

Jalankan web + provider worker + promo download worker:

```bash
npm run dev:all
```

Build:

```bash
npm run build
```

Validasi yang disarankan setelah perubahan:

```bash
npx prisma generate
npx prisma validate
npx next typegen
npx tsc --noEmit --pretty false
npm run lint
git diff --check
```

## Production / PM2

File PM2:

- `ecosystem.config.cjs`

Process aktif:

- `layardrama`: Next.js app
- `layardrama-provider-sync`: provider sync worker
- `layardrama-promo-download`: promo downloader worker

Command umum:

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

Cron provider hanya enqueue job. Worker yang melakukan request upstream.

```cron
*/30 * * * * cd /root/dramapro && /usr/bin/npm run provider:cron >> /var/log/layardrama-provider-cron.log 2>&1
15 3 * * * cd /root/dramapro && PROVIDER_CRON_SECTIONS=all PROVIDER_CRON_PAGE_COUNT=2 /usr/bin/npm run provider:cron >> /var/log/layardrama-provider-cron-nightly.log 2>&1
```

## Environment

Template ada di `.env.example`.

Kelompok env:

- Database: `DATABASE_URL`, `DIRECT_URL`
- App: `NEXT_PUBLIC_SITE_URL`, `TELEGRAM_MINI_APP_URL`, `CRON_SECRET`
- Admin: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
- StreamAPI: `STREAMAPI_TOKEN`, `PROVIDER_TIMEOUT_MS`, `PROVIDER_SYNC_IDLE_MS`
- Provider cron: `PROVIDER_CRON_PROVIDERS`, `PROVIDER_CRON_SECTIONS`, `PROVIDER_CRON_PAGE_START`, `PROVIDER_CRON_PAGE_COUNT`
- Worker: `WORKER_BASE_URL`
- Promo downloader: `FFMPEG_PATH`, `PROMO_DOWNLOAD_DIR`, dan limit terkait
- Payment: `PAYMENKU_API_KEY`, `PAYMENT_CREDENTIALS_KEY`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_SUPPORT_URL`

## File Yang Sengaja Menjaga Kompatibilitas

- `lib/catalog-upstream.ts` adalah guard kompatibilitas. File ini tidak boleh dipakai untuk request katalog lama.
- `CatalogSyncJob`, `CatalogTab`, dan beberapa tabel katalog lama masih ada karena schema lama dipertahankan.
- Data legacy tidak dihapus agar relasi user lama tetap aman.

## Checklist Saat Mengubah Fitur

Sebelum final:

1. Pastikan perubahan tidak membaca API katalog lama.
2. Pastikan query katalog publik memfilter `catalogSource = "streamapi"` jika konteksnya homepage/koleksi baru.
3. Pastikan playback tetap lewat `/api/stream`.
4. Pastikan subtitle provider diproxy bila rawan CORS.
5. Pastikan migration aman untuk production.
6. Jalankan typecheck, lint, dan Prisma validate.
7. Jangan commit `.env`, storage hasil download, backup database, atau token.
