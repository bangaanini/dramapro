# Production Catalog Migration Runbook

Dokumen ini menjelaskan cara paling aman untuk memindahkan production dari schema lama berbasis `Drama` ke schema baru berbasis `Catalog*` tanpa merusak data user, payment, favorit, saved episode, dan watch history.

## Tujuan

Migrasi ini harus memenuhi syarat berikut:

1. Data `User`, `UserSession`, `VipPayment`, affiliate, dan payment gateway tetap aman.
2. Data user-content seperti favorit, saved episode, dan watch history tidak hilang.
3. Deploy bisa di-rollback cepat jika ada masalah.
4. Perubahan schema dilakukan bertahap dan backward-compatible.

## Fakta Penting

Schema production lama dari folder [backup-prisma](/home/aan/dramapro/backup-prisma/schema.prisma) memakai model:

- `Drama`
- `DramaFeed`
- `FavoriteDrama.dramaId`
- `SavedEpisode.dramaId`
- `WatchHistory.dramaId`

Schema aplikasi saat ini di [prisma/schema.prisma](/home/aan/dramapro/prisma/schema.prisma) memakai model:

- `CatalogPlatform`
- `CatalogLanguage`
- `CatalogTab`
- `CatalogSeries`
- `CatalogEpisode`
- `CatalogSyncState`
- `CatalogSyncJob`
- `FavoriteDrama.seriesId`
- `SavedEpisode.seriesId`
- `WatchHistory.seriesId`

Artinya ini bukan pure perubahan API. Ada perubahan struktur data katalog dan relasi user ke konten.

## Larangan

Jangan lakukan hal berikut di production:

1. Jangan jalankan `prisma migrate deploy` memakai folder `prisma/migrations` lokal yang sekarang langsung ke database production lama.
2. Jangan membawa migration `20260423120000_catalog_reset` ke database production lama.
3. Jangan deploy app baru sebelum schema baru dan backfill data siap.
4. Jangan menghapus `Drama`, `DramaFeed`, atau kolom `dramaId` pada release pertama.
5. Jangan menjalankan backfill besar dalam satu transaksi panjang.

## Strategi Aman

Gunakan strategi 3 fase:

1. `Additive schema`
2. `Backfill and validation`
3. `Application cutover`

Cleanup tabel lama dilakukan setelah sistem stabil, bukan saat cutover pertama.

## Fase 0: Persiapan

1. Backup database production penuh.
2. Simpan hasil query:

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY finished_at;
```

3. Pastikan baseline migration production adalah folder [backup-prisma/migrations](/home/aan/dramapro/backup-prisma/migrations), bukan folder `prisma/migrations` lokal yang sekarang.
4. Clone database production ke staging.
5. Uji semua langkah migrasi di staging lebih dulu.

## Fase 1: Buat Branch Migrasi Production

Di branch khusus production migration:

1. Restore history migration lama dari `backup-prisma/migrations`.
2. Jangan hapus history lama dari branch ini.
3. Tambahkan migration baru yang sifatnya additive saja.

Hasil yang diinginkan pada fase ini:

1. App lama masih tetap bisa jalan.
2. Schema baru sudah ada.
3. Belum ada data user lama yang diputus.

## Fase 2: Additive Schema Release

Release pertama hanya menambah object baru.

Tambahkan tabel:

1. `CatalogPlatform`
2. `CatalogLanguage`
3. `CatalogTab`
4. `CatalogSeries`
5. `CatalogTabSeries`
6. `CatalogEpisode`
7. `CatalogSyncState`
8. `CatalogSyncJob`

Tambahkan kolom nullable berikut:

1. `FavoriteDrama.seriesId`
2. `SavedEpisode.seriesId`
3. `WatchHistory.seriesId`

Tambahkan juga kolom yang memang dibutuhkan schema baru:

1. `CatalogSeries.isHomepageVisible`
2. `CatalogSeries.homepageHiddenReason`
3. `CatalogSyncJob.runnerId`
4. `CatalogSyncJob.leaseExpiresAt`
5. `CatalogSyncJob.lastHeartbeatAt`

## Fase 2A: Index dan Constraint

Tambahkan index untuk semua FK baru dan kolom query penting.

Minimal:

1. index pada `FavoriteDrama.seriesId`
2. index pada `SavedEpisode.seriesId`
3. index pada `WatchHistory.seriesId`
4. index pada `CatalogSeries(platformId, languageId, updatedAt)`
5. index pada `CatalogEpisode(seriesId, updatedAt)`
6. index pada `CatalogSyncJob(status, updatedAt)`

Best practice production:

1. Untuk index besar, gunakan `CREATE INDEX CONCURRENTLY`.
2. Hindari lock panjang.
3. Pisahkan pembuatan index besar dari deploy app jika perlu.

## Fase 3: Isi Data Katalog Baru

Pada tahap ini app production lama masih tetap memakai `Drama`.

Langkah:

1. Deploy schema additive.
2. Jalankan worker katalog ke tabel `Catalog*`.
3. Isi provider, language, tab, series, episode, dan sync state.
4. Pastikan homepage app lama tetap stabil karena masih membaca tabel lama.

Target validasi:

1. `CatalogPlatform` terisi.
2. `CatalogSeries` terisi.
3. `CatalogEpisode` terisi untuk provider yang sehat.
4. `CatalogSyncJob` berjalan normal.

## Fase 4: Backfill Relasi User

Ini tahap paling sensitif.

Tujuan:

1. map `Drama` lama ke `CatalogSeries`
2. isi `seriesId` untuk tabel user-content

Tabel yang harus dibackfill:

1. `FavoriteDrama`
2. `SavedEpisode`
3. `WatchHistory`

Best practice:

1. Jalankan batch kecil, misalnya 500 sampai 2000 row per batch.
2. Jangan bungkus jutaan row dalam satu transaksi.
3. Simpan log hasil batch.
4. Catat row yang gagal dipetakan.

Sumber mapping ideal:

1. provider lama
2. upstream id lama
3. judul sebagai fallback hanya jika benar-benar diperlukan

Urutan prioritas mapping:

1. exact provider + upstream id
2. provider + judul normalize
3. manual review untuk row sisa

## Fase 5: Validasi Backfill

Sebelum cutover app baru, semua hal di bawah ini harus dicek.

### Validasi jumlah data

1. jumlah total `FavoriteDrama`
2. jumlah `FavoriteDrama` yang sudah punya `seriesId`
3. jumlah total `SavedEpisode`
4. jumlah `SavedEpisode` yang sudah punya `seriesId`
5. jumlah total `WatchHistory`
6. jumlah `WatchHistory` yang sudah punya `seriesId`

### Validasi orphan

Harus ada laporan untuk:

1. row yang masih punya `dramaId` tetapi `seriesId` kosong
2. row yang map ke series salah
3. series yang belum punya episode valid

### Validasi bisnis

Cek sample user nyata di staging:

1. login tetap normal
2. VIP status tetap benar
3. riwayat tonton tetap muncul
4. favorit tetap muncul
5. saved episode tetap muncul
6. payment lama tetap terbaca

## Fase 6: Cutover App Baru

Deploy code baru hanya setelah:

1. schema additive sudah masuk
2. data `Catalog*` sudah terisi
3. backfill relasi user selesai
4. validasi lulus

Saat cutover:

1. deploy app baru yang membaca `Catalog*`
2. worker sync tetap aktif
3. jangan hapus tabel lama
4. monitor error application, query lambat, dan mismatch data user-content

## Fase 7: Masa Observasi

Biarkan sistem berjalan dengan dua dunia schema sementara:

1. app baru membaca `Catalog*`
2. tabel lama masih ada untuk fallback dan rollback

Durasi observasi minimal:

1. 24 jam untuk traffic ringan
2. 3 sampai 7 hari untuk traffic production normal

Yang harus dimonitor:

1. error rate API
2. login error
3. payment callback
4. favorit hilang
5. watch history hilang
6. page home/search/watch kosong

## Fase 8: Cleanup

Cleanup hanya dilakukan setelah sistem benar-benar stabil.

Urutan aman:

1. pastikan tidak ada rollback yang dibutuhkan
2. ubah `seriesId` menjadi `NOT NULL` jika semua row sudah terisi
3. hapus pembacaan ke tabel lama dari code
4. hapus `dramaId` lama
5. hapus `DramaFeed`
6. hapus `Drama` jika memang sudah tidak dipakai

Cleanup jangan digabung dengan cutover utama.

## Rollback Plan

Rollback tercepat harus fokus ke app dulu, bukan schema.

Jika app baru bermasalah:

1. rollback code ke versi lama
2. biarkan schema additive tetap ada
3. hentikan worker catalog jika perlu
4. investigasi data mapping dan query app baru

Jika backfill salah:

1. hentikan cutover
2. perbaiki script mapping
3. ulangi batch yang gagal
4. jangan hapus kolom lama sampai hasil valid

Jika deploy schema additive gagal:

1. hentikan deploy app baru
2. rollback migration hanya jika aman
3. jika migration sudah menambah tabel baru tanpa mengganggu tabel lama, lebih aman biarkan schema baru tetap ada lalu perbaiki step berikutnya

## Checklist Go/No-Go

Sebelum deploy app baru ke production, semua item ini harus bernilai `yes`.

1. Backup production tersedia.
2. Hasil `_prisma_migrations` production sudah dicatat.
3. Branch migrasi memakai baseline `backup-prisma/migrations`.
4. Schema additive berhasil diuji di staging clone.
5. Tabel `Catalog*` berhasil dibuat.
6. Worker sync berhasil mengisi katalog.
7. `seriesId` di favorit sudah terisi sesuai target.
8. `seriesId` di saved episode sudah terisi sesuai target.
9. `seriesId` di watch history sudah terisi sesuai target.
10. Payment, VIP, dan login tetap normal di staging.
11. Rollback app sudah disiapkan.
12. Cleanup tabel lama belum dilakukan.

## Rekomendasi Praktis

Untuk project ini, jalur paling aman adalah:

1. buat branch `production-catalog-migration`
2. pulihkan migration history lama dari `backup-prisma`
3. buat migration additive baru
4. buat script backfill SQL atau Node batch
5. tes penuh di staging clone
6. deploy additive schema ke production
7. jalankan sync katalog
8. jalankan backfill relasi user
9. validasi
10. baru deploy app baru

## Kesimpulan

Perubahan ini aman untuk data user dan payment hanya jika deploy dilakukan bertahap. Risiko terbesar bukan pada tabel payment, tetapi pada perpindahan relasi dari `Drama` ke `CatalogSeries`. Karena itu migrasi harus additive, dibackfill, divalidasi, lalu baru cutover.
