# VPS Worker

Worker ini dipakai untuk menjalankan sync metadata, audit stream, dan refresh cache dari VPS tanpa login admin. Auth memakai `CRON_SECRET` lewat header `Authorization: Bearer ...`.

## Command

```bash
npm run worker:sync
npm run worker:audit
npm run worker:refresh
npm run worker:scheduler
```

## Environment

Isi environment berikut di VPS:

```bash
CRON_SECRET=isi-secret-sama-dengan-app
WORKER_BASE_URL=https://layardrama.id
WORKER_PROVIDERS=melolo,meloshort,goodshort,dramawave,dramabox,reelshort,freereels,flickreels,netshort
WORKER_SOURCES=home,new,popular
WORKER_SYNC_PAGES=2
WORKER_AUDIT_BATCH_SIZE=10
WORKER_SYNC_INTERVAL_MINUTES=30
WORKER_AUDIT_INTERVAL_MINUTES=60
WORKER_REQUEST_TIMEOUT_MS=120000
WORKER_REFRESH_AFTER_RUN=true
WORKER_SYNC_ON_START=true
WORKER_AUDIT_ON_START=false
```

## Mode 1: Cron VPS

Paling sederhana dan paling stabil:

```cron
*/30 * * * * cd /home/aan/dramapro && /usr/bin/npm run worker:sync >> /var/log/layardrama-sync.log 2>&1
0 * * * * cd /home/aan/dramapro && /usr/bin/npm run worker:audit >> /var/log/layardrama-audit.log 2>&1
```

## Mode 2: Scheduler long-running

Kalau mau satu proses hidup terus, jalankan:

```bash
npm run worker:scheduler
```

Contoh dengan `pm2`:

```bash
pm2 start npm --name layardrama-worker -- run worker:scheduler
pm2 save
pm2 startup
```

## Apa yang dikerjakan worker

- `worker:sync`
  - sync source `home`, `new`, `popular`
  - page `1..WORKER_SYNC_PAGES`
  - semua provider aktif di config
  - otomatis refresh cache katalog setelah selesai

- `worker:audit`
  - audit drama tersimpan per source secara batch
  - menghormati logic hide/unhide stream error yang sudah ada
  - otomatis refresh cache katalog setelah selesai

- `worker:refresh`
  - hanya paksa refresh cache homepage/search

- `worker:scheduler`
  - menjalankan `sync` dan `audit` berdasarkan interval worker

## Catatan

- Route berikut sekarang menerima `CRON_SECRET`, jadi worker tidak butuh cookie admin:
  - `/api/cron/sync`
  - `/api/admin/drama-stream-audit`
  - `/api/admin/catalog-cache/refresh`
- Kalau audit sangat besar, worker akan memproses per batch memakai cursor supaya tidak timeout.
