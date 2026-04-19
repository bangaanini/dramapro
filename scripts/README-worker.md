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
ACTIVE_PROVIDERS=goodshort,dramabox
WORKER_PROVIDERS=goodshort,dramabox
WORKER_SOURCES=home,new,popular
WORKER_SYNC_PAGES=2
WORKER_AUDIT_BATCH_SIZE=10
WORKER_SYNC_INTERVAL_MINUTES=30
WORKER_AUDIT_INTERVAL_MINUTES=60
WORKER_AUDIT_INITIAL_DELAY_MINUTES=15
WORKER_REQUEST_TIMEOUT_MS=120000
WORKER_REFRESH_AFTER_RUN=true
WORKER_SYNC_ON_START=true
WORKER_AUDIT_ON_START=false
WORKER_NOTIFY_TELEGRAM_BOT_TOKEN=
WORKER_NOTIFY_TELEGRAM_CHAT_ID=
WORKER_NOTIFY_TELEGRAM_MESSAGE_THREAD_ID=
WORKER_NOTIFY_ON_SUCCESS=true
WORKER_NOTIFY_ON_FAILURE=true
```

Kalau mau kirim laporan ke Telegram, cukup isi:

```bash
WORKER_NOTIFY_TELEGRAM_BOT_TOKEN=isi-token-bot
WORKER_NOTIFY_TELEGRAM_CHAT_ID=isi-chat-id
```

Kalau laporan dikirim ke topik forum group Telegram, isi juga:

```bash
WORKER_NOTIFY_TELEGRAM_MESSAGE_THREAD_ID=isi-thread-id
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

Atau langsung pakai file PM2 bawaan repo:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

## Apa yang dikerjakan worker

- `worker:sync`
  - sync source `home`, `new`, `popular`
  - page `1..WORKER_SYNC_PAGES`
  - provider mengikuti `WORKER_PROVIDERS`, atau fallback ke `ACTIVE_PROVIDERS`
  - otomatis refresh cache katalog setelah selesai

- `worker:audit`
  - audit drama tersimpan per source secara batch
  - menghormati logic hide/unhide stream error yang sudah ada
  - otomatis refresh cache katalog setelah selesai

- `worker:refresh`
  - hanya paksa refresh cache homepage/search

- `worker:scheduler`
  - menjalankan `sync` dan `audit` berdasarkan interval worker
  - audit dimulai dengan delay awal agar tidak tabrakan dengan sync
  - kalau ada job lain yang masih berjalan, worker akan skip putaran itu agar tidak overlap
  - bisa kirim laporan selesai proses ke Telegram jika env notifikasi diisi

## Catatan

- Route berikut sekarang menerima `CRON_SECRET`, jadi worker tidak butuh cookie admin:
  - `/api/cron/sync`
  - `/api/admin/drama-stream-audit`
  - `/api/admin/catalog-cache/refresh`
- Kalau audit sangat besar, worker akan memproses per batch memakai cursor supaya tidak timeout.
