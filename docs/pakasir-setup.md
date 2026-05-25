# Setup Pakasir Payment Gateway

## Konfigurasi di Admin Panel

1. Buka `/admin/payment-gateways`
2. Cari card **Pakasir**
3. Isi konfigurasi:
   - **Merchant ID**: Project slug Pakasir (contoh: `layardrama`)
   - **Secret / API key**: API key dari dashboard Pakasir
   - **Aktifkan gateway**: Centang checkbox
4. Pilih channel yang ingin diaktifkan (QRIS + Virtual Account)
5. Klik **Simpan konfigurasi gateway**
6. Klik **Jadikan checkout aktif** untuk mengaktifkan Pakasir sebagai gateway utama

## Webhook Configuration

Agar pembayaran otomatis terdeteksi, konfigurasikan webhook di dashboard Pakasir:

**Webhook URL**: `https://yourdomain.com/api/payment/pakasir/callback`

Pakasir akan mengirim POST request dengan format:
```json
{
  "amount": 100000,
  "order_id": "VIP-1234567890-ABCD1234",
  "project": "layardrama",
  "status": "completed",
  "payment_method": "qris",
  "completed_at": "2026-05-25T15:30:00+07:00"
}
```

## Polling Otomatis

Jika webhook belum dikonfigurasi atau gagal, sistem akan melakukan polling otomatis setiap 5 detik untuk mengecek status pembayaran ke API Pakasir.

## Testing

1. Buat transaksi VIP dari halaman `/vip`
2. Pilih channel Pakasir (QRIS atau VA)
3. Lakukan pembayaran
4. Halaman akan otomatis update status setelah:
   - Webhook diterima (instant), atau
   - Polling berhasil (maksimal 5 detik)

## Troubleshooting

**Halaman tidak update setelah bayar:**
- Pastikan webhook URL sudah dikonfigurasi di dashboard Pakasir
- Cek log server untuk melihat apakah webhook diterima
- Klik tombol "Cek sekarang" untuk manual refresh
- Polling otomatis akan tetap berjalan setiap 5 detik

**Error "Pakasir project slug belum diisi":**
- Isi Merchant ID dengan project slug Anda di admin panel

**Error saat create transaction:**
- Pastikan API key valid (sandbox atau production)
- Cek apakah channel yang dipilih tersedia di project Pakasir Anda
