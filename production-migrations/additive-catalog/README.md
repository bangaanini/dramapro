# Additive Catalog Migration

Folder ini berisi migration additive yang aman untuk database production lama yang masih memakai schema `Drama`.

Migration ini **tidak** menghapus tabel lama dan **tidak** memutus aplikasi production lama. Tujuannya hanya:

1. menambah tabel `Catalog*`
2. menambah tabel `CatalogSyncJob`
3. menambah kolom `seriesId` nullable untuk relasi user-content
4. menambah kolom `seriesId` nullable pada `DramaChannelBroadcast`

## File

1. [001_schema_additive.sql](./001_schema_additive.sql)
2. [002_indexes_concurrently.sql](./002_indexes_concurrently.sql)
3. [003_verify_additive.sql](./003_verify_additive.sql)
4. [004_validate_new_foreign_keys.sql](./004_validate_new_foreign_keys.sql)

## Urutan Jalankan

Gunakan koneksi production direct, misalnya `PROD_DIRECT_URL`.

### 1. Tambah schema baru

```bash
psql "$PROD_DIRECT_URL" -f production-migrations/additive-catalog/001_schema_additive.sql
```

### 2. Tambah index secara aman

```bash
psql "$PROD_DIRECT_URL" -f production-migrations/additive-catalog/002_indexes_concurrently.sql
```

Catatan:

1. file ini memakai `CREATE INDEX CONCURRENTLY`
2. jangan dibungkus dalam transaction manual

### 3. Verifikasi schema additive

```bash
psql "$PROD_DIRECT_URL" -f production-migrations/additive-catalog/003_verify_additive.sql
```

### 4. Jalankan sync dan backfill

Setelah schema additive masuk:

1. isi tabel `Catalog*`
2. backfill `FavoriteDrama.seriesId`
3. backfill `SavedEpisode.seriesId`
4. backfill `WatchHistory.seriesId`
5. backfill `DramaChannelBroadcast.seriesId`

### 5. Validasi foreign key baru

Jalankan ini hanya setelah backfill selesai dan data sudah benar.

```bash
psql "$PROD_DIRECT_URL" -f production-migrations/additive-catalog/004_validate_new_foreign_keys.sql
```

## Penting

1. Jangan deploy app baru sebelum step 1 sampai 4 selesai.
2. Jangan hapus `Drama`, `DramaFeed`, atau kolom `dramaId`.
3. Jangan ubah `seriesId` menjadi `NOT NULL` di fase ini.
4. Jika ada error, rollback app lebih dulu. Schema additive boleh tetap ada.
