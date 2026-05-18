# Migration Runbook — Dramapro VPS Lama → VPS Baru

Dokumentasi lengkap langkah pindah project Dramapro dari VPS lama ke VPS baru
(`145.79.13.143`).

**Last updated:** 2026-05-14
**Source VPS:** `srv1207789` (PostgreSQL lokal)
**Target VPS:** `145.79.13.143` (Ubuntu/Debian)
**Database:** `dramapro` user `dramapro_app`
**Backup file:** `supabase-database_url-full-2026-05-14T06-33-31-752Z.dump` (278 MB)

---

## Daftar Isi

1. [Pre-migration checklist](#1-pre-migration-checklist)
2. [Backup database VPS lama](#2-backup-database-vps-lama)
3. [Setup VPS baru](#3-setup-vps-baru)
4. [Transfer database backup](#4-transfer-database-backup)
5. [Restore database di VPS baru](#5-restore-database-di-vps-baru)
6. [Deploy aplikasi di VPS baru](#6-deploy-aplikasi-di-vps-baru)
7. [Verifikasi & cutover](#7-verifikasi--cutover)
8. [Rollback plan](#8-rollback-plan)
9. [Post-migration cleanup](#9-post-migration-cleanup)

---

## 1. Pre-migration checklist

Sebelum mulai, pastikan:

- [ ] Akses SSH ke kedua VPS (lama + baru) berfungsi
- [ ] Akses root/sudo di kedua VPS
- [ ] Domain DNS bisa dipindahkan (Cloudflare/Namecheap/dll)
- [ ] Repository Git up-to-date (commit semua perubahan lokal)
- [ ] Tahu password DB user (`dramapro_app`) atau siap buat baru

**Estimasi total waktu migrasi:** 1-2 jam (tanpa downtime: 30 menit dengan pre-staging).

---

## 2. Backup database VPS lama

### 2.1 SSH ke VPS lama

```bash
ssh root@srv1207789  # atau IP VPS lama
cd ~/dramapro
```

### 2.2 Jalankan backup

Skrip `scripts/backup-supabase-db.mjs` sudah handle versi check otomatis.

```bash
export BACKUP_DATABASE_URL_ENV=DATABASE_URL
export DB_BACKUP_DIR=~/dramapro/backups

node scripts/backup-supabase-db.mjs
```

Output: `~/dramapro/backups/supabase-database_url-full-<timestamp>.dump`

**Alternatif manual:**

```bash
mkdir -p ~/dramapro/backups
TS=$(date +%Y%m%dT%H%M%SZ)
pg_dump "postgresql://dramapro_app:PASSWORD@127.0.0.1:5432/dramapro" \
  --format=custom --no-owner --no-privileges --verbose \
  --file=~/dramapro/backups/dramapro-$TS.dump
```

### 2.3 Verifikasi backup

```bash
# Cek ukuran
ls -lh ~/dramapro/backups/

# Cek isi dump (TOC)
pg_restore --list ~/dramapro/backups/supabase-database_url-full-*.dump | head -20

# Hitung row beberapa tabel utama untuk perbandingan nanti
sudo -u postgres psql dramapro -Atc 'SELECT COUNT(*) FROM "CatalogSeries"'
sudo -u postgres psql dramapro -Atc 'SELECT COUNT(*) FROM "CatalogEpisode"'
sudo -u postgres psql dramapro -Atc 'SELECT COUNT(*) FROM "User"'
```

Catat angka row count untuk verifikasi setelah restore.

### 2.4 Generate checksum

```bash
sha256sum ~/dramapro/backups/supabase-database_url-full-*.dump
```

Simpan hash ini untuk verifikasi setelah transfer.

---

## 3. Setup VPS baru

### 3.1 SSH ke VPS baru

```bash
ssh root@145.79.13.143
```

### 3.2 Update sistem

```bash
apt update && apt upgrade -y
```

### 3.3 Install dependencies

```bash
# Node.js (via nvm — recommended) atau dari NodeSource
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22  # sesuai dengan VPS lama
nvm use 22

# Verifikasi
node -v
npm -v

# PostgreSQL
apt install -y postgresql postgresql-contrib

# Tools tambahan
apt install -y git rsync htop ufw nginx certbot python3-certbot-nginx

# PM2 untuk process manager
npm install -g pm2
```

### 3.4 Setup PostgreSQL

```bash
# Cek versi PostgreSQL VPS baru — HARUS sama atau lebih baru dari VPS lama
sudo -u postgres psql -Atc "SHOW server_version;"

# Buat user + database
sudo -u postgres psql <<EOF
CREATE USER layar_drama_app WITH PASSWORD 'Rahasia250992';
CREATE DATABASE layar_drama OWNER layar_drama_app;
GRANT ALL PRIVILEGES ON DATABASE layar_drama TO layar_drama_app;
EOF
```

**Penting:** Catat password baru — akan dipakai di `.env` nanti.

### 3.5 Verifikasi versi PostgreSQL

VPS lama: cek versi-nya:

```bash
# Di VPS LAMA
sudo -u postgres psql -Atc "SHOW server_version_num;"
```

VPS baru harus ≥ versi VPS lama. Kalau lebih lama, update PostgreSQL atau pakai Docker untuk pg_restore.

### 3.6 Buat folder untuk backup

```bash
mkdir -p ~/backups
```

### 3.7 Setup firewall (opsional tapi recommended)

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 4. Transfer database backup

### 4.1 Copy SSH key VPS lama ke VPS baru (kalau belum)

Untuk rsync tanpa password prompt:

```bash
# Di VPS LAMA
ssh-copy-id root@145.79.13.143
```

### 4.2 Transfer file backup

```bash
# Di VPS LAMA
rsync -avz --progress --partial -e ssh \
  ~/dramapro/backups/supabase-database_url-full-2026-05-14T06-33-31-752Z.dump \
  root@145.79.13.143:~/backups/
```

**Estimasi:** 5-15 menit untuk 278 MB.

Kalau koneksi putus, jalankan ulang command yang sama — `--partial` akan resume.

### 4.3 Verifikasi checksum

```bash
# Di VPS BARU
sha256sum ~/backups/supabase-database_url-full-2026-05-14T06-33-31-752Z.dump
```

Harus match dengan hash dari step 2.4.

### 4.4 Transfer file `.env` (sensitif)

```bash
# Di VPS LAMA
scp ~/dramapro/.env root@145.79.13.143:/tmp/dramapro.env
```

(Akan dipindah ke folder repo nanti setelah clone.)

### 4.5 Transfer storage uploads (kalau ada manual drama)

```bash
# Di VPS LAMA
rsync -avz --progress -e ssh \
  ~/dramapro/storage/ \
  root@145.79.13.143:~/dramapro-storage/
```

(Folder akan dipindah ke repo nanti.)

---

## 5. Restore database di VPS baru

### 5.1 Verifikasi file dump

```bash
# Di VPS BARU
ls -lh ~/backups/

pg_restore --list ~/backups/supabase-database_url-full-*.dump | head -20
pg_restore --list ~/backups/supabase-database_url-full-*.dump | wc -l
```

Harus tampil ratusan TOC entries.

### 5.2 Restore via skrip repo (recommended)

Skrip `scripts/restore-postgres-db.mjs` punya safety guard. Tapi karena belum
clone repo, restore manual dulu:

```bash
# Di VPS BARU
TARGET_URL="postgresql://layar_drama_app:Rahasia2509@127.0.0.1:5432/layar_drama"
TARGET_URL="postgresql://dramapro_app:056cfd0a596476649efd69736bcc64c6c98de1f68fb986b3@127.0.0.1:5432/dramapro"

pg_restore \
  --clean --if-exists \
  --no-owner --no-privileges \
  --verbose \
  --dbname="$TARGET_URL" \
  ~/backups/supabase-database_url-full-2026-05-14T06-33-31-752Z.dump
```

**Errors yang aman diabaikan:**
- `relation "_xxx" does not exist` — karena `--clean --if-exists`, drop dijalankan
  meskipun objek belum ada
- `must be member of role "supabase_xxx"` — kalau masih ada residu Supabase

**Errors yang perlu dicek:**
- `permission denied` di tabel/schema — DB user tidak punya privilege cukup

### 5.3 Verifikasi restore

```bash
# Di VPS BARU
sudo -u postgres psql dramapro -Atc 'SELECT COUNT(*) FROM "CatalogSeries"'
sudo -u postgres psql dramapro -Atc 'SELECT COUNT(*) FROM "CatalogEpisode"'
sudo -u postgres psql dramapro -Atc 'SELECT COUNT(*) FROM "User"'
sudo -u postgres psql dramapro -Atc 'SELECT COUNT(*) FROM "VipPayment"'
```

Bandingkan dengan angka dari step 2.3. **HARUS PERSIS SAMA.**

Kalau beda, restore gagal partial — **JANGAN** lanjut ke step berikutnya.
Investigasi dulu errornya.

---

## 6. Deploy aplikasi di VPS baru

### 6.1 Clone repository

```bash
# Di VPS BARU
cd ~
git clone <REPO_URL> dramapro
cd dramapro
git checkout main  # atau branch production yang dipakai
```

### 6.2 Pindahkan `.env`

```bash
mv /tmp/dramapro.env ~/dramapro/.env
chmod 600 ~/dramapro/.env  # restrict access
```

### 6.3 Update `.env` dengan kredensial baru

```bash
nano ~/dramapro/.env
```

**Yang harus diupdate:**
- `DATABASE_URL` — pakai password DB baru
- `DIRECT_URL` (kalau ada) — sama
- `LOCAL_DATABASE_URL` — sama (untuk skrip restore)
- `SITE_URL` / `NEXTAUTH_URL` — pakai domain VPS baru kalau berubah

Contoh:
```
DATABASE_URL="postgresql://dramapro_app:PASSWORD_BARU@127.0.0.1:5432/dramapro"
LOCAL_DATABASE_URL="postgresql://dramapro_app:PASSWORD_BARU@127.0.0.1:5432/dramapro"
```

### 6.4 Pindahkan storage

```bash
# Kalau ada folder storage di VPS lama
mv ~/dramapro-storage ~/dramapro/storage
```

### 6.5 Install dependencies

```bash
cd ~/dramapro
npm install
```

### 6.6 Generate Prisma client

```bash
npx prisma generate
```

### 6.7 Build aplikasi

```bash
npm run build
```

Build sukses kalau output:
```
 ✓ Compiled successfully
 ✓ Linting and checking validity of types
 ✓ Generating static pages
```

### 6.8 Setup PM2

Cek `ecosystem.config.cjs` di repo, lalu:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # ikuti instruksi yang muncul untuk auto-start saat boot
```

Verifikasi semua process jalan:

```bash
pm2 status
# Harus muncul: layardrama (Next), provider-sync, promo-download, push-notifications
```

### 6.9 Setup Nginx reverse proxy

Buat config Nginx untuk domain kamu:

```bash
nano /etc/nginx/sites-available/dramapro
```

Isi:
```nginx
server {
    listen 80;
    server_name DOMAIN_KAMU.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

Enable + reload:

```bash
ln -s /etc/nginx/sites-available/dramapro /etc/nginx/sites-enabled/
nginx -t  # syntax check
systemctl reload nginx
```

### 6.10 Setup SSL dengan Certbot

```bash
certbot --nginx -d DOMAIN_KAMU.com
```

Ikuti prompt-nya. Certbot otomatis update config Nginx untuk HTTPS.

---

## 7. Verifikasi & cutover

### 7.1 Test aplikasi pakai IP VPS baru langsung

Sebelum ganti DNS, test langsung pakai IP:

```bash
# Tambahkan ke /etc/hosts laptop kamu (sementara)
145.79.13.143 DOMAIN_KAMU.com
```

Buka browser ke `https://DOMAIN_KAMU.com` — harus muncul versi VPS baru.

**Test checklist:**
- [ ] Homepage tampil dengan drama list
- [ ] Filter provider modal tampil semua 40 provider
- [ ] Search berfungsi
- [ ] Login / register berfungsi
- [ ] Player video bisa diputar
- [ ] Subtitle muncul (kalau provider punya)
- [ ] Admin panel bisa diakses
- [ ] Worker provider sync masih jalan (`pm2 logs provider-sync`)

### 7.2 Pindahkan DNS

Setelah test sukses:

1. Login ke DNS provider (Cloudflare/Namecheap/dll)
2. Update A record domain → IP VPS baru `145.79.13.143`
3. Tunggu propagasi (5-60 menit)

```bash
# Cek propagasi
dig DOMAIN_KAMU.com +short
```

### 7.3 Hapus entry `/etc/hosts` sementara

```bash
# Di laptop
sudo sed -i '/DOMAIN_KAMU.com/d' /etc/hosts
```

### 7.4 Monitor 24 jam

```bash
# Di VPS BARU
pm2 logs --lines 100
pm2 monit  # interactive monitoring
```

Watch:
- Error logs di Next.js (dev server / production)
- Provider sync worker still running
- Memory & CPU usage normal
- Disk space cukup (`df -h`)

---

## 8. Rollback plan

Kalau ada issue serius di VPS baru, **rollback ke VPS lama** dengan:

### 8.1 Pindahkan DNS balik

DNS provider → A record → IP VPS lama.

### 8.2 Kembalikan VPS lama (kalau sudah dimatikan)

Tergantung skenario, biarkan VPS lama tetap jalan **selama 1-7 hari** setelah migrasi
sebagai fallback.

### 8.3 Sync delta data

Kalau ada user baru / payment baru di VPS baru selama window migrasi:

```bash
# Backup VPS baru lagi → restore ke VPS lama
# (proses sama dengan migrasi awal, terbalik arahnya)
```

---

## 9. Post-migration cleanup

Setelah 7 hari berjalan stabil di VPS baru:

### 9.1 Backup terakhir VPS lama

```bash
# Di VPS LAMA
node scripts/backup-supabase-db.mjs
mv ~/dramapro/backups/*.dump ~/final-backup-vps-lama/
```

Simpan ke cold storage (Cloudflare R2 / Backblaze).

### 9.2 Stop services VPS lama

```bash
# Di VPS LAMA
pm2 stop all
pm2 delete all
systemctl stop postgresql
systemctl stop nginx
```

### 9.3 Terminate VPS lama

Cancel subscription / terminate VPS provider.

### 9.4 Cleanup local

```bash
# Hapus file backup yang sudah di-upload ke cold storage
rm ~/dramapro/backups/supabase-*.dump
```

---

## Troubleshooting

### Error: "FATAL: role 'root' does not exist"

`pg_dump` / `pg_restore` tidak boleh dijalankan sebagai user OS `root` tanpa
specify user. Solusi:

```bash
sudo -u postgres pg_restore ...

# Atau pakai connection string explicit
pg_restore --dbname="postgresql://USER:PASSWORD@HOST:PORT/DB" ...
```

### Error: "version mismatch" saat pg_restore

VPS baru pakai PostgreSQL versi lebih lama dari VPS lama. Solusi:

```bash
# Set environment variable agar skrip restore pakai Docker
DB_RESTORE_USE_DOCKER=1 node scripts/restore-postgres-db.mjs ~/backups/file.dump
```

Atau install PostgreSQL versi yang sama:

```bash
# Ubuntu 22.04+
apt install -y postgresql-17  # ganti dengan versi yang dibutuhkan
```

### Error: Storage uploads tidak terbaca aplikasi

Pastikan permission folder benar:

```bash
chown -R aan:aan ~/dramapro/storage
chmod -R 755 ~/dramapro/storage
```

### Error: Prisma migration tidak ter-apply

Setelah restore, biasanya migration history sudah di DB. Tapi kalau Prisma
complain:

```bash
npx prisma migrate resolve --applied "<NAMA_MIGRATION>"
# atau force reset (HATI-HATI: data hilang)
# npx prisma migrate reset
```

### Error: Worker provider-sync tidak jalan

```bash
pm2 logs provider-sync --lines 50

# Restart semua worker
pm2 restart provider-sync promo-download push-notifications
```

### Streamapi token error 401

Cek `.env` punya `STREAMAPI_TOKEN` valid (huruf pertama kapital `S`):

```bash
grep STREAMAPI_TOKEN ~/dramapro/.env
# STREAMAPI_TOKEN=Seyjt...  (S besar)
```

---

## Referensi

- Skrip backup: `scripts/backup-supabase-db.mjs`
- Skrip restore: `scripts/restore-postgres-db.mjs`
- Production runbook lengkap: `PRODUCTION_DATABASE_BACKUP_RUNBOOK.md`
- Catalog migration runbook: `PRODUCTION_CATALOG_MIGRATION_RUNBOOK.md`

---

**Disusun oleh:** Claude Code
**Untuk:** Migrasi VPS srv1207789 → 145.79.13.143
**Versi:** 1.0

