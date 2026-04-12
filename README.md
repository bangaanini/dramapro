# Layar Drama

Layar Drama adalah aplikasi **Short Drama Streaming** berbasis Next.js App Router, PostgreSQL, Prisma, dan Video.js. Aplikasi ini menyimpan metadata drama secara lokal, tetapi mengambil URL streaming secara on-demand agar link video yang punya signature/expiry tidak pernah disimpan di database.

Project ini juga mendukung dua jalur pemakaian:

- **Web umum** melalui domain utama.
- **Telegram Mini App** melalui bot resmi atau partner bot affiliate.

## Fitur Utama

- Katalog drama dari banyak provider upstream.
- Sync metadata `home`, `new`, dan `popular` ke database lokal.
- Stream proxy/BFF yang menormalisasi response provider menjadi format player yang stabil.
- Player short drama mobile-first, fullscreen, subtitle, episode lock, save episode, riwayat, dan favorit drama.
- Login web biasa dan login otomatis Telegram Mini App.
- VIP membership dengan lock episode.
- Payment gateway manager, Paymenku QRIS/VA, status polling, dan QR/VA inline.
- Affiliate/referral single-level dengan komisi global, override komisi per user, request withdraw, dan partner bot referral.
- Admin dashboard untuk user, sync, VIP settings, harga VIP, payment gateway, affiliate, Telegram partner bots, SEO/branding, dan password admin.

## Stack

- Next.js `16.2.3`
- React `19`
- TypeScript
- PostgreSQL
- Prisma `7`
- Tailwind CSS `4`
- Video.js
- Netlify deployment
- Telegram Bot API / Mini App
- Paymenku payment gateway

## Arsitektur Penting

### Metadata First

Database hanya menyimpan metadata stabil:

- judul
- deskripsi
- thumbnail
- jumlah episode
- tag
- provider dan ID provider

URL `.mp4` atau `.m3u8` **tidak boleh disimpan** karena link upstream punya signature dan expiry.

### Stream On Demand

Saat user membuka episode, route `/api/stream`:

1. membaca drama dari database,
2. membuat URL upstream berdasarkan provider,
3. mengambil stream payload dari upstream,
4. menormalisasi response menjadi format aman untuk player,
5. mengembalikan hanya data kualitas/subtitle yang dibutuhkan frontend.

### Provider Adapter

Semua perbedaan endpoint provider diatur di:

```text
lib/provider-adapter.ts
```

Provider saat ini:

- `melolo`
- `meloshort`
- `goodshort`
- `dramawave`
- `dramabox`
- `reelshort`
- `freereels`
- `flickreels`
- `netshort`

## Struktur Folder

```text
app/
  admin/                  Dashboard admin
  api/                    API routes dan webhook
  affiliate/              Halaman affiliate user
  library/                Koleksi, episode tersimpan, riwayat
  profile/                Profil user
  search/                 Search drama
  vip/                    Paket VIP dan checkout
  watch/[id]/             Detail drama
  watch/[id]/play         Player fullscreen

components/               Komponen UI aplikasi
lib/                      Service, adapter, auth, payment, Telegram
netlify/functions/        Scheduled function Netlify
prisma/                   Schema dan migrations
public/                   Logo, favicon, opengraph
```

## Persiapan Lokal

### 1. Install dependency

```bash
npm install
```

### 2. Siapkan database PostgreSQL

Project ini cocok memakai Supabase Postgres, Neon, Railway, atau PostgreSQL biasa.

Pastikan punya dua connection string:

- `DATABASE_URL`: connection pooled untuk runtime aplikasi.
- `DIRECT_URL`: direct connection untuk migration Prisma.

Contoh:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
```

### 3. Buat `.env.local`

Buat file `.env.local` di root project.

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

# Public site
NEXT_PUBLIC_SITE_URL="https://layardrama.id"

# Admin bootstrap
ADMIN_EMAIL="admin@example.com"
ADMIN_NAME="Layar Drama Administrator"
ADMIN_PASSWORD="ganti-password-kuat"

# Cron sync
CRON_SECRET="ganti-secret-cron"

# Secret enkripsi credential payment/telegram di database
PAYMENT_CREDENTIALS_KEY="ganti-dengan-random-string-panjang"

# Paymenku fallback, opsional karena bisa diisi dari dashboard admin
PAYMENKU_API_KEY=""

# Telegram fallback, opsional karena bisa diisi dari dashboard admin
TELEGRAM_BOT_TOKEN=""
TELEGRAM_BOT_USERNAME=""
TELEGRAM_WEBHOOK_SECRET=""
TELEGRAM_SUPPORT_URL=""
TELEGRAM_MINI_APP_URL=""

# Netlify scheduled sync, opsional
SYNC_PROVIDERS="melolo,meloshort,goodshort,dramawave,dramabox,reelshort,freereels,flickreels,netshort"
SYNC_SOURCES="new"
SYNC_PAGES="1"
```

Catatan penting:

- Jangan commit file `.env` atau `.env.local`.
- `PAYMENT_CREDENTIALS_KEY` wajib stabil. Jika diganti, credential terenkripsi lama di database tidak bisa dibaca.
- Setelah admin mengisi setting dari dashboard, value database dipakai lebih dulu daripada env untuk Telegram, SEO, dan payment gateway.

### 4. Jalankan migration

Untuk development:

```bash
npx prisma migrate dev
```

Untuk production:

```bash
npx prisma migrate deploy
```

Generate Prisma client:

```bash
npx prisma generate
```

### 5. Jalankan dev server

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

## Login Admin Pertama

Buka:

```text
/admin/login
```

Login memakai:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Admin pertama otomatis dibuat ketika login pertama kali jika tabel admin masih kosong.

Setelah login, sebaiknya langsung ubah password di:

```text
/admin/password
```

## Menu Admin

### Dashboard

Ringkasan cepat untuk operasional admin.

### Users

Fitur:

- live search user berdasarkan nama, email, Telegram username, atau kode affiliate,
- pagination tabel,
- status Free/Premium,
- jumlah favorit, riwayat, sesi, referral aktif,
- kolom `Referred by`,
- override komisi affiliate per user,
- hapus user.

Komisi affiliate:

- Jika `Komisi override` dikosongkan, user memakai komisi umum dari setting affiliate.
- Jika admin mengisi `50`, maka user itu mendapat komisi 50% untuk transaksi baru dari referralnya.

### Sync

Dipakai untuk sync metadata dari provider.

Pilihan:

- provider tertentu atau semua provider,
- source `home`, `new`, `popular`,
- page.

Sync hanya menyimpan metadata. URL video tidak disimpan.

### VIP Settings

Mengatur episode lock.

Contoh:

- `lockFromEpisode = 19`
- Episode 1-18 bisa dibuka.
- Episode 19 ke atas terkunci untuk user non-VIP.

### VIP Pricing

Mengatur paket VIP.

Field utama:

- nama paket,
- slug,
- badge highlight, contoh `Promo`, `Terlaris`, `Best Value`,
- warna badge highlight dalam format hex, contoh `#f59e0b`,
- durasi,
- harga,
- currency,
- urutan,
- status aktif.

Badge highlight opsional. Jika kosong, paket tampil tanpa badge.

### Payment Gateway

Mengatur gateway pembayaran.

Saat ini implementasi penuh:

- Paymenku

Provider yang disiapkan untuk fase berikutnya:

- Xendit
- Midtrans
- Tripay
- DOKU

Paymenku mendukung:

- QRIS
- Virtual Account
- status polling
- QR/VA inline di halaman checkout

VA hanya bisa dipilih untuk nominal minimal Rp 20.000.

### Affiliate Settings

Mengatur:

- status program affiliate,
- masa cookie referral,
- minimum withdraw,
- tier komisi umum,
- catatan komisi,
- catatan withdraw,
- syarat lain.

### Affiliate Withdrawals

Admin melihat request withdraw affiliate, termasuk:

- nama user,
- nominal,
- rekening,
- nomor rekening,
- WhatsApp,
- email payout,
- status review.

### Telegram Bots

Mengatur partner bot affiliate.

Alurnya:

1. Admin menambahkan bot partner.
2. Admin memilih owner affiliate untuk bot tersebut.
3. Sistem memberi webhook URL khusus partner.
4. User yang masuk dari bot partner otomatis menjadi referral owner bot partner.

Komisi tetap single-level:

- A mengajak B, B beli VIP, A dapat komisi.
- B mengajak C, C beli VIP, B dapat komisi.
- A tidak mendapat komisi dari C.

### Settings

Mengatur Telegram dan SEO/branding dari database.

Telegram settings:

- bot token,
- bot username,
- webhook secret,
- support URL,
- Mini App URL,
- site/public URL.

SEO settings:

- site URL,
- site name,
- site description,
- site logo URL.

Prioritas config:

1. database settings dari admin,
2. env server,
3. default project.

## Sync Metadata

### Manual dari Admin

Buka:

```text
/admin/sync
```

Pilih provider, source, dan page, lalu jalankan sync.

### Manual via API

Endpoint:

```text
GET /api/cron/sync?provider=melolo&page=1&source=new
```

Header:

```http
Authorization: Bearer CRON_SECRET
```

Contoh:

```bash
curl "https://layardrama.id/api/cron/sync?provider=melolo&page=1&source=new" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Source yang didukung:

- `home`
- `new`
- `popular`
- `populer` diterima sebagai alias untuk `popular`

### Cron Netlify

File:

```text
netlify/functions/sync-dramas.ts
```

Schedule default:

```text
0 */6 * * *
```

Artinya sync setiap 6 jam.

Env yang dipakai:

```env
SYNC_PROVIDERS="melolo,meloshort,goodshort,dramawave,dramabox,reelshort,freereels,flickreels,netshort"
SYNC_SOURCES="new"
SYNC_PAGES="1"
```

Untuk awal database kosong, jalankan sync manual dulu dari admin agar katalog cepat terisi.

## Payment Gateway

### Paymenku

Cara paling mudah:

1. Login admin.
2. Buka `Payment Gateway`.
3. Pilih Paymenku.
4. Masukkan API key.
5. Aktifkan gateway.
6. Pilih Paymenku sebagai checkout aktif.

Config JSON contoh:

```json
{
  "mode": "production",
  "enabledChannels": ["qris", "bni_va", "bri_va", "mandiri_va", "bsi_va", "cimb_va", "permata_va", "danamon_va", "bjb_va"]
}
```

Untuk sandbox:

```json
{
  "mode": "sandbox",
  "enabledChannels": ["qris"]
}
```

Catatan:

- Paymenku live key biasanya diawali `sk_live`.
- Sandbox/test key biasanya diawali `sk_test`.
- Jika muncul `Validation failed`, cek API key, channel aktif, nominal minimum, dan data customer.

### Callback/Webhook Payment

Jika payment gateway menyediakan callback URL, gunakan domain production:

```text
https://layardrama.id/api/vip/transactions/CALLBACK_REFERENCE
```

Saat ini flow utama memakai polling status dari checkout page, sehingga user tetap bisa aktif otomatis setelah pembayaran terdeteksi.

## Telegram Mini App

### Env Minimal

Value bisa diisi di dashboard admin `Settings`, tetapi fallback env tetap tersedia:

```env
TELEGRAM_BOT_TOKEN="TOKEN_DARI_BOTFATHER"
TELEGRAM_BOT_USERNAME="LayarDramaBot"
TELEGRAM_WEBHOOK_SECRET="secret-webhook-kuat"
TELEGRAM_SUPPORT_URL="https://t.me/support_username"
TELEGRAM_MINI_APP_URL="https://layardrama.id"
NEXT_PUBLIC_SITE_URL="https://layardrama.id"
```

### Set Webhook Bot Resmi

Gunakan command yang otomatis muncul di `Admin > Settings`. Format manual:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://layardrama.id/api/telegram/webhook",
    "secret_token": "YOUR_WEBHOOK_SECRET",
    "allowed_updates": ["message"]
  }'
```

Cek webhook:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

### BotFather

Set Mini App/Main App URL:

```text
https://layardrama.id/
```

Set menu button:

```text
Tonton Sekarang
https://layardrama.id/
```

### Tombol Inline Bot

Saat user mengirim `/start`, bot akan menampilkan tombol:

- Nonton Sekarang
- Cari Judul
- Gabung Affiliate
- Channel Drama
- Channel Movie
- Hubungi Admin
- Join VIP

Channel default yang dipakai:

- Drama: `https://t.me/LayarDramaID`
- Movie: `https://t.me/layarboxoffice`

## Partner Bot Affiliate

Partner bot memungkinkan affiliate memakai bot Telegram pribadi sebagai pintu referral.

Alur:

1. Partner membuat bot sendiri di BotFather.
2. Partner memberi token bot ke admin.
3. Admin buka `Telegram Bots`.
4. Admin tambah bot partner dan pilih owner affiliate.
5. Sistem menampilkan Mini App URL dan command webhook khusus partner.

Contoh webhook partner:

```text
https://layardrama.id/api/telegram/webhook/partner/nama_bot
```

Contoh Mini App URL partner:

```text
https://layardrama.id/?tg_bot=nama_bot
```

Aturan referral:

- User baru yang masuk dari partner bot otomatis menjadi referral owner bot.
- Jika user sudah punya referrer, referrer lama tidak diganti.
- Jika ada kode referral lain di bot partner, owner bot tetap diprioritaskan.

## Referral dan Affiliate

Link referral web:

```text
https://layardrama.id/?ref=KODE
```

Link referral Telegram:

```text
https://t.me/BOT_USERNAME?start=ref_KODE
```

Flow:

1. Calon user membuka link referral.
2. Sistem menyimpan attribution.
3. Saat user login/register atau masuk Telegram Mini App, user diikat ke referrer jika belum punya referrer.
4. Komisi dibuat ketika user referral membeli VIP dan transaksi berstatus `paid`.

## Operasional User

### Web Umum

User bisa:

- melihat katalog,
- mencari drama,
- membuka detail drama,
- mulai nonton,
- menyimpan drama,
- menyimpan episode,
- melihat library,
- membeli VIP,
- ikut affiliate.

### Telegram Mini App

User Telegram tidak perlu sign up manual.

Saat Mini App dibuka:

1. client membaca `Telegram.WebApp.initData`,
2. server memverifikasi signature Telegram,
3. user Telegram dibuat/diupdate di tabel `User`,
4. session aplikasi dibuat,
5. profil menampilkan nama, username, dan foto Telegram.

## Deploy ke Netlify

### 1. Hubungkan repo

Di Netlify:

- pilih repository,
- build command: `npm run build`,
- publish directory mengikuti plugin Next/Netlify otomatis.

File `netlify.toml`:

```toml
[build]
  command = "npm run build"

[functions]
  directory = "netlify/functions"
```

### 2. Set environment variables

Masukkan env production di Netlify:

```env
DATABASE_URL=""
DIRECT_URL=""
NEXT_PUBLIC_SITE_URL="https://layardrama.id"
ADMIN_EMAIL=""
ADMIN_NAME=""
ADMIN_PASSWORD=""
CRON_SECRET=""
PAYMENT_CREDENTIALS_KEY=""
```

Opsional:

```env
PAYMENKU_API_KEY=""
TELEGRAM_BOT_TOKEN=""
TELEGRAM_BOT_USERNAME=""
TELEGRAM_WEBHOOK_SECRET=""
TELEGRAM_SUPPORT_URL=""
TELEGRAM_MINI_APP_URL=""
SYNC_PROVIDERS=""
SYNC_SOURCES=""
SYNC_PAGES=""
```

### 3. Jalankan migration production

Dari lokal atau CI:

```bash
npx prisma migrate deploy
```

### 4. Deploy

Push ke branch production atau trigger deploy dari Netlify.

### 5. Setting domain

Pastikan domain sudah diarahkan ke Netlify.

Jika memakai Netlify DNS:

- tambahkan domain di Netlify,
- arahkan nameserver domain ke Netlify,
- tunggu propagasi DNS,
- aktifkan HTTPS/SSL.

Jika memakai DNS eksternal:

- root domain biasanya memakai A/ALIAS/ANAME sesuai instruksi Netlify,
- `www` memakai CNAME ke domain Netlify.

Setelah ganti domain, update:

- `NEXT_PUBLIC_SITE_URL`
- `Admin > Settings > Site/Public URL`
- `Admin > Settings > Telegram Mini App URL`
- BotFather Mini App URL
- Telegram webhook baru
- Paymenku callback URL jika dipakai

## Checklist Setelah Deploy

1. Buka homepage.
2. Login admin.
3. Jalankan migration production.
4. Isi Settings SEO/Telegram.
5. Isi Payment Gateway.
6. Buat atau cek paket VIP.
7. Jalankan sync metadata.
8. Tes search.
9. Tes detail drama.
10. Tes player episode gratis.
11. Tes episode lock.
12. Tes checkout VIP QRIS atau VA.
13. Tes affiliate link.
14. Tes Telegram Mini App.
15. Tes bot `/start`.

## Command Penting

Development:

```bash
npm run dev
```

Lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

Generate Prisma:

```bash
npx prisma generate
```

Migration development:

```bash
npx prisma migrate dev
```

Migration production:

```bash
npx prisma migrate deploy
```

Reset database development:

```bash
npx prisma migrate reset
```

## Troubleshooting

### Admin tidak bisa login

- Pastikan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` benar.
- Jika admin sudah pernah dibuat, env baru tidak otomatis mengubah password lama.
- Gunakan halaman `/admin/password` setelah berhasil login.

### Prisma client tidak ditemukan saat build

Jalankan:

```bash
npx prisma generate
```

Build script sudah menjalankan generate otomatis:

```json
"build": "prisma generate && next build"
```

### Database production belum punya kolom baru

Jalankan:

```bash
npx prisma migrate deploy
```

### Payment gagal `Validation failed`

Cek:

- API key sandbox/live sesuai environment,
- gateway aktif di admin,
- channel aktif di config JSON,
- nominal VA minimal Rp 20.000,
- user punya email/nama valid,
- `PAYMENT_CREDENTIALS_KEY` tersedia.

### Telegram Mini App tidak login otomatis

Cek:

- Bot token benar,
- Mini App dibuka dari Telegram, bukan browser biasa,
- webhook secret sama dengan setting admin,
- BotFather Mini App URL sudah domain terbaru,
- domain HTTPS aktif.

### Bot tidak membalas `/start`

Cek webhook:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

Jika URL lama, set ulang webhook.

### Katalog kosong

Jalankan sync:

```bash
curl "https://layardrama.id/api/cron/sync?provider=melolo&page=1&source=new" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Atau lewat `Admin > Sync`.

### Thumbnail tidak tampil

Cek:

- `thumbUrl` di database,
- `normalizeDisplayImageUrl` di `lib/utils.ts`,
- `images.remotePatterns` di `next.config.ts`.

### Stream provider gagal

Cek:

- provider adapter,
- detail payload untuk resolve episode ID,
- `/api/stream?internalDramaId=...&episodeIndex=1`,
- `/api/media` jika stream perlu proxy media.

## Catatan Keamanan

- Jangan simpan URL stream di database.
- Jangan commit token, API key, atau password.
- Gunakan `PAYMENT_CREDENTIALS_KEY` yang panjang dan stabil.
- Gunakan webhook secret Telegram.
- Batasi akses dashboard admin.
- Jalankan migration production dengan hati-hati.
- Backup database sebelum perubahan besar.

## Catatan Pengembangan

Jika menambah provider baru:

1. Tambahkan enum `ProviderName` di Prisma.
2. Tambahkan provider di `PROVIDERS`.
3. Tambahkan URL builder home/detail/stream.
4. Tambahkan normalizer collection/detail/stream.
5. Tambahkan migration Prisma.
6. Jalankan `npx prisma generate`.
7. Tes sync dan stream.

Jika menambah payment gateway baru:

1. Tambahkan provider di enum `PaymentGatewayProvider`.
2. Tambahkan definition di `lib/payment-gateways.ts`.
3. Tambahkan adapter create/check status di `lib/payment-gateway-service.ts`.
4. Tambahkan mapping checkout result ke `VipPayment`.
5. Tes checkout, polling, dan aktivasi VIP.

## Lisensi

Project ini private.Di larang meperjual belikan,
