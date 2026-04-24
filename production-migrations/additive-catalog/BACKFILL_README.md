# Catalog Relation Backfill

Setelah tabel `Catalog*` terisi oleh sync, jalankan backfill ini untuk memetakan relasi lama berbasis `Drama` ke `CatalogSeries`.

Script:

- [scripts/backfill-catalog-relations.ts](/home/aan/dramapro/scripts/backfill-catalog-relations.ts)

## Apa yang diisi

Script ini mengisi kolom nullable berikut:

1. `FavoriteDrama.seriesId`
2. `SavedEpisode.seriesId`
3. `WatchHistory.seriesId`
4. `DramaChannelBroadcast.seriesId`

## Aturan Mapping

Mapping utama:

1. `Drama.providerName -> CatalogSeries.platformId`
2. `Drama.providerDramaId -> CatalogSeries.upstreamSeriesId`

Jika ada beberapa language untuk series yang sama, script memilih urutan:

1. language default
2. code `id`
3. record paling baru

## Keamanan

1. default mode adalah `dry-run`
2. `--apply` baru benar-benar update data
3. row yang berpotensi menabrak unique target akan dilewati, bukan membuat seluruh proses gagal
4. script hanya mengisi row yang `seriesId IS NULL`

## Menjalankan Dry Run

```bash
set -a && source ./.env.local && set +a
npx tsx scripts/backfill-catalog-relations.ts --database-url-env PROD_DIRECT_URL
```

## Menjalankan Apply

```bash
set -a && source ./.env.local && set +a
npx tsx scripts/backfill-catalog-relations.ts --database-url-env PROD_DIRECT_URL --apply
```

## Kapan Dijalankan

Urutan yang benar:

1. additive schema sudah masuk
2. sync katalog sudah mengisi `CatalogSeries` dan `CatalogEpisode`
3. baru jalankan backfill ini
4. setelah hasilnya benar, lanjut validasi FK baru

## Output

Script akan mencetak JSON berisi:

1. jumlah data katalog saat ini
2. jumlah row legacy yang mappable
3. jumlah conflict yang dilewati
4. jumlah row yang benar-benar diupdate

Jika `CatalogSeries` masih kosong, script akan berhenti dengan pesan yang jelas.
