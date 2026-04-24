# Production Database Backup Runbook

Dokumen ini menjelaskan cara aman mengambil backup penuh database production PostgreSQL sebelum migrasi schema atau deploy besar.

## Prinsip Penting

1. Backup penuh PostgreSQL **tidak dilakukan dengan SQL murni**.
2. Untuk backup penuh logical, gunakan `pg_dump`.
3. Untuk role, privilege, dan global objects, gunakan `pg_dumpall --globals-only`.
4. SQL dipakai untuk preflight check, audit, dan verifikasi hasil backup.

## Tujuan

Sebelum migrasi production, kamu harus punya:

1. backup database penuh dalam format restore-friendly
2. backup globals seperti role dan privilege
3. bukti integritas file backup
4. uji restore ke database staging

## Format Backup yang Direkomendasikan

Untuk production, format paling aman dan fleksibel:

1. `pg_dump -Fc` untuk satu file archive custom
2. `pg_dumpall --globals-only` untuk role dan grant

Jika database sangat besar dan butuh dump lebih cepat:

1. gunakan `pg_dump -Fd -j 4` atau lebih, lalu restore dengan `pg_restore -j`

## Variabel yang Perlu Disiapkan

Contoh environment:

```bash
export PGHOST="your-prod-host"
export PGPORT="5432"
export PGUSER="your-prod-user"
export PGPASSWORD="your-prod-password"
export PGDATABASE="your-prod-db"
```

Atau kalau kamu pakai connection string:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

## Folder Backup

Buat folder backup bertimestamp:

```bash
export BACKUP_DIR="$HOME/db-backups/$(date +%F-%H%M%S)-dramapro-prod"
mkdir -p "$BACKUP_DIR"
```

## Langkah 1: Audit Cepat Sebelum Backup

Simpan info production sebelum dump.

### Cek versi PostgreSQL

```sql
SELECT version();
```

### Cek nama database aktif

```sql
SELECT current_database();
```

### Cek ukuran database

```sql
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;
```

### Cek daftar migration Prisma

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY finished_at;
```

### Cek tabel paling besar

```sql
SELECT
  schemaname,
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

Simpan output ini ke file teks jika perlu.

## Langkah 2: Backup Globals

Ini membackup role, privilege, dan object global cluster.

```bash
pg_dumpall \
  --globals-only \
  --file="$BACKUP_DIR/00-globals.sql"
```

## Langkah 3: Backup Database Penuh

Ini opsi utama yang direkomendasikan.

```bash
pg_dump \
  --format=custom \
  --file="$BACKUP_DIR/01-database.dump" \
  --no-owner \
  --no-privileges \
  "$PGDATABASE"
```

Versi pendeknya:

```bash
pg_dump -Fc --no-owner --no-privileges -f "$BACKUP_DIR/01-database.dump" "$PGDATABASE"
```

Catatan:

1. `-Fc` membuat archive custom yang fleksibel untuk `pg_restore`
2. `--no-owner` dan `--no-privileges` sering lebih aman untuk restore lintas environment
3. backup ini konsisten walau database sedang dipakai

## Langkah 4: Opsi untuk Database Besar

Kalau database besar dan kamu ingin dump paralel:

```bash
pg_dump \
  --format=directory \
  --jobs=4 \
  --file="$BACKUP_DIR/01-database.dir" \
  --no-owner \
  --no-privileges \
  "$PGDATABASE"
```

Gunakan ini hanya kalau ukuran database memang besar dan storage cukup.

## Langkah 5: Simpan Metadata Backup

Catat isi archive dan checksum.

### Daftar isi archive

```bash
pg_restore --list "$BACKUP_DIR/01-database.dump" > "$BACKUP_DIR/02-archive-contents.txt"
```

### Checksum file

```bash
sha256sum "$BACKUP_DIR/00-globals.sql" > "$BACKUP_DIR/03-checksums.sha256"
sha256sum "$BACKUP_DIR/01-database.dump" >> "$BACKUP_DIR/03-checksums.sha256"
```

### Catat metadata runtime

```bash
{
  echo "backup_time=$(date --iso-8601=seconds)"
  echo "database=$PGDATABASE"
  echo "host=$PGHOST"
  echo "port=$PGPORT"
} > "$BACKUP_DIR/04-metadata.env"
```

## Langkah 6: Verifikasi Backup

Minimal cek bahwa archive bisa dibaca.

```bash
pg_restore --list "$BACKUP_DIR/01-database.dump" | head
```

Kalau command ini gagal, backup tidak valid.

## Langkah 7: Uji Restore ke Database Staging

Ini langkah wajib sebelum kamu anggap backup aman.

### Buat database restore test

```bash
createdb dramapro_restore_test
```

### Restore globals jika memang perlu

Biasanya untuk staging tidak perlu semua globals. Kalau perlu:

```bash
psql -d postgres -f "$BACKUP_DIR/00-globals.sql"
```

### Restore database

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname=dramapro_restore_test \
  "$BACKUP_DIR/01-database.dump"
```

Kalau restore mau lebih cepat:

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --jobs=4 \
  --dbname=dramapro_restore_test \
  "$BACKUP_DIR/01-database.dump"
```

## Langkah 8: Verifikasi Hasil Restore

Jalankan SQL berikut di database hasil restore.

### Cek jumlah migration

```sql
SELECT COUNT(*) FROM "_prisma_migrations";
```

### Cek tabel penting user dan payment

```sql
SELECT
  (SELECT COUNT(*) FROM "User") AS users,
  (SELECT COUNT(*) FROM "UserSession") AS user_sessions,
  (SELECT COUNT(*) FROM "VipPayment") AS vip_payments,
  (SELECT COUNT(*) FROM "FavoriteDrama") AS favorite_dramas,
  (SELECT COUNT(*) FROM "SavedEpisode") AS saved_episodes,
  (SELECT COUNT(*) FROM "WatchHistory") AS watch_history;
```

### Cek contoh payment terbaru

```sql
SELECT id, "referenceId", status, "createdAt"
FROM "VipPayment"
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Cek user terbaru

```sql
SELECT id, email, name, "createdAt"
FROM "User"
ORDER BY "createdAt" DESC
LIMIT 10;
```

Jika angka dan data masuk akal, backup bisa dianggap valid.

## Langkah 9: Simpan Backup di Lokasi Aman

Minimal simpan di 2 lokasi:

1. disk server sementara
2. object storage atau mesin lain

Contoh:

```bash
rsync -av "$BACKUP_DIR/" user@backup-host:/data/backups/dramapro/
```

Atau upload ke S3 compatible storage jika ada.

## Langkah 10: Checklist Sebelum Migrasi

Sebelum migrasi schema production:

1. backup globals selesai
2. backup database selesai
3. checksum tersimpan
4. `pg_restore --list` berhasil
5. restore test ke staging berhasil
6. tabel user dan payment tervalidasi setelah restore
7. backup tersimpan di lokasi kedua

Jika salah satu belum terpenuhi, jangan lanjut migrasi.

## Perintah yang Paling Direkomendasikan

Kalau kamu ingin jalur aman yang paling sederhana, gunakan ini:

### Backup

```bash
export BACKUP_DIR="$HOME/db-backups/$(date +%F-%H%M%S)-dramapro-prod"
mkdir -p "$BACKUP_DIR"

pg_dumpall --globals-only --file="$BACKUP_DIR/00-globals.sql"
pg_dump -Fc --no-owner --no-privileges -f "$BACKUP_DIR/01-database.dump" "$PGDATABASE"
pg_restore --list "$BACKUP_DIR/01-database.dump" > "$BACKUP_DIR/02-archive-contents.txt"
sha256sum "$BACKUP_DIR/00-globals.sql" "$BACKUP_DIR/01-database.dump" > "$BACKUP_DIR/03-checksums.sha256"
```

### Restore test

```bash
createdb dramapro_restore_test
pg_restore --clean --if-exists --no-owner --no-privileges --dbname=dramapro_restore_test "$BACKUP_DIR/01-database.dump"
```

## Yang Harus Kamu Lakukan

Urutan kerja paling aman:

1. siapkan kredensial PostgreSQL production
2. jalankan backup globals
3. jalankan backup database penuh dengan `pg_dump -Fc`
4. simpan checksum dan daftar isi archive
5. restore backup ke database test
6. verifikasi tabel user, payment, dan Prisma migrations
7. baru lanjut ke migrasi schema

## Catatan Penting

1. Untuk backup penuh logical, `pg_dump` adalah alat yang tepat, bukan query SQL biasa.
2. Untuk restore lintas server, format custom lebih aman daripada SQL plain biasa.
3. Jangan menganggap backup valid sebelum restore test berhasil.

## Sumber

Referensi resmi PostgreSQL yang dipakai:

1. PostgreSQL `pg_dump`: https://www.postgresql.org/docs/16/app-pgdump.html
2. PostgreSQL `pg_restore`: https://www.postgresql.org/docs/current/app-pgrestore.html
3. PostgreSQL backup and dump: https://www.postgresql.org/docs/current/backup-dump.html
