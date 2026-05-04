# VPS Worker

Worker aktif untuk sistem saat ini hanya:

```bash
npm run worker:provider-sync
npm run worker:promo-download
```

## Provider Sync

Worker ini memproses queue `ProviderSyncJob` dari panel admin `/admin/sync`
atau dari cron `npm run provider:cron`.

```bash
pm2 start npm --name layardrama-provider-sync -- run worker:provider-sync
pm2 save
```

Cron cukup enqueue job. Request upstream tetap diproses oleh worker.

```cron
*/30 * * * * cd /root/dramapro && /usr/bin/npm run provider:cron >> /var/log/layardrama-provider-cron.log 2>&1
15 3 * * * cd /root/dramapro && PROVIDER_CRON_SECTIONS=all PROVIDER_CRON_PAGE_COUNT=2 /usr/bin/npm run provider:cron >> /var/log/layardrama-provider-cron-nightly.log 2>&1
```

Opsi cron:

```bash
PROVIDER_CRON_PROVIDERS=all
PROVIDER_CRON_SECTIONS=default
PROVIDER_CRON_PAGE_START=1
PROVIDER_CRON_PAGE_COUNT=1
PROVIDER_CRON_DRY_RUN=1
```

## Promo Download

Worker ini memproses tombol "Download semua" di `/admin/promo-downloader`.
FFmpeg berjalan di background, jadi admin boleh meninggalkan halaman.

```bash
sudo apt install ffmpeg
pm2 start npm --name layardrama-promo-download -- run worker:promo-download
pm2 save
```

Environment penting:

```bash
WORKER_BASE_URL=https://layardrama.id
FFMPEG_PATH=ffmpeg
PROMO_DOWNLOAD_INTERNAL_ORIGIN=http://127.0.0.1:3001
PROMO_DOWNLOAD_TOKEN_SECRET=change-me
PROMO_DOWNLOAD_DIR=storage/promo-downloads
PROMO_DOWNLOAD_MIN_FREE_MB=1024
```

## Jalankan Lokal

Untuk menjalankan web dan dua worker sekaligus:

```bash
npm run dev:all
```

Untuk production lokal/PM2:

```bash
npm run start:all
```
