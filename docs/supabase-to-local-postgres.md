# Backup Supabase ke PostgreSQL Lokal VPS

Dokumen ini untuk migrasi database Supabase production ke PostgreSQL lokal di VPS.

## Hasil Cek Saat Ini

- `PROD_DIRECT_URL` tersedia.
- Database production terbaca sekitar `243 MB`.
- Supabase production memakai PostgreSQL `17.6`.
- Tool lokal yang terpasang saat dicek adalah `pg_dump 16.13`, jadi tidak kompatibel untuk backup langsung.

`pg_dump` harus sama atau lebih baru dari versi server. Gunakan salah satu:

```bash
# Opsi A paling cepat: gunakan Docker.
# Script backup otomatis memakai image postgres:17 bila pg_dump lokal terlalu tua.
docker --version

# Kalau Docker belum ada:
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable --now docker
```

Jika ingin install `postgresql-client-17` langsung via `apt`, tambahkan dulu repo resmi PostgreSQL APT. Paket ini sering tidak ada di repo bawaan Ubuntu/Debian.

```bash
sudo apt update
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc

. /etc/os-release
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
  | sudo tee /etc/apt/sources.list.d/pgdg.list

sudo apt update
sudo apt install -y postgresql-client-17
pg_dump --version
```

## Backup

Backup penuh dari `PROD_DIRECT_URL`:

```bash
npm run db:backup:supabase
```

File akan masuk ke folder `backups/` dan tidak ikut git.

Untuk backup hanya schema `public` yang dipakai aplikasi:

```bash
DB_BACKUP_SCHEMAS=public npm run db:backup:supabase
```

Catatan: backup penuh Supabase akan ikut membawa schema seperti `auth`, `storage`, `realtime`, dan `vault`. Ini bagus untuk arsip lengkap, tetapi restore ke PostgreSQL biasa bisa butuh role kompatibilitas Supabase. Untuk menjalankan aplikasi DramaPro saja, schema `public` biasanya cukup karena Prisma membaca tabel aplikasi dari `public`.

## Restore ke PostgreSQL Lokal

Siapkan database lokal kosong, contoh:

```bash
sudo -u postgres createdb dramapro
```

PostgreSQL tidak menyimpan password dalam bentuk yang bisa dilihat ulang. Untuk aplikasi, buat user khusus dan password baru:

```bash
APP_DB=dramapro
APP_USER=dramapro_app
APP_PASS=$(openssl rand -hex 24)

sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_USER}') THEN
    CREATE ROLE ${APP_USER} LOGIN PASSWORD '${APP_PASS}';
  ELSE
    ALTER ROLE ${APP_USER} LOGIN PASSWORD '${APP_PASS}';
  END IF;
END
\$\$;

ALTER DATABASE ${APP_DB} OWNER TO ${APP_USER};
GRANT ALL PRIVILEGES ON DATABASE ${APP_DB} TO ${APP_USER};
SQL

echo "LOCAL_DATABASE_URL=\"postgresql://${APP_USER}:${APP_PASS}@127.0.0.1:5432/${APP_DB}\""
```

Tes koneksi:

```bash
psql "postgresql://${APP_USER}:${APP_PASS}@127.0.0.1:5432/${APP_DB}" \
  -c "select current_user, current_database();"
```

Untuk melihat daftar user dan owner database:

```bash
sudo -u postgres psql -c "\\du"
sudo -u postgres psql -c "\\l"
```
supabase-prod_direct_url-full-2026-05-01T03-43-14-337Z.dump
Tambahkan URL lokal ke `.env` atau export manual:

```bash
LOCAL_DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/dramapro"
```

Restore bersifat destruktif terhadap database target, jadi harus eksplisit:

```bash
CONFIRM_RESTORE=YES npm run db:restore:local -- backups/supabase-prod_direct_url-full-2026-05-01T03-43-14-337Z.dump
```

Jika restore dump penuh Supabase dan gagal karena role seperti `anon` atau `authenticated` belum ada:

```bash
CREATE_SUPABASE_COMPAT_ROLES=1 CONFIRM_RESTORE=YES npm run db:restore:local -- backups/NAMA_FILE.dump
```

Script restore akan menolak target yang terlihat seperti Supabase/remote kecuali:

```bash
ALLOW_REMOTE_RESTORE=1
```

Jangan pakai itu untuk migrasi normal.

## Setelah Restore

Ubah runtime app agar memakai PostgreSQL lokal:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/dramapro"
DIRECT_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/dramapro"
```

Lalu validasi:

```bash
npx prisma migrate status
npx prisma generate
npm run build
```

Jika migration repo belum ada di database lokal hasil restore, jalankan:

```bash
npx prisma migrate deploy
```

## PM2

Setelah app memakai database lokal:

```bash
pm2 restart layardrama
pm2 restart layardrama-provider-sync
pm2 save
```
