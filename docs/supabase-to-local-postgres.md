# Backup Supabase ke PostgreSQL Lokal VPS

Dokumen ini untuk migrasi database Supabase production ke PostgreSQL lokal di VPS.

## Hasil Cek Saat Ini

- `PROD_DIRECT_URL` tersedia.
- Database production terbaca sekitar `243 MB`.
- Supabase production memakai PostgreSQL `17.6`.
- Tool lokal yang terpasang saat dicek adalah `pg_dump 16.13`, jadi tidak kompatibel untuk backup langsung.

`pg_dump` harus sama atau lebih baru dari versi server. Gunakan salah satu:

```bash
# Opsi A: install client PostgreSQL 17 di VPS
sudo apt install postgresql-client-17

# Opsi B: gunakan Docker, script otomatis memakai image postgres:17 bila perlu
docker --version
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

Tambahkan URL lokal ke `.env` atau export manual:

```bash
LOCAL_DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/dramapro"
```

Restore bersifat destruktif terhadap database target, jadi harus eksplisit:

```bash
CONFIRM_RESTORE=YES npm run db:restore:local -- backups/NAMA_FILE.dump
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
