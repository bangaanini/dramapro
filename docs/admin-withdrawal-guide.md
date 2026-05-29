# Cara Mengubah Status Withdrawal dari Approved ke Paid

## Lokasi Halaman
**URL**: `https://yourdomain.com/admin/affiliate-withdrawals`

## Step-by-Step

### 1. Buka Halaman Admin Affiliate Withdrawals
- Login sebagai admin
- Buka menu `/admin/affiliate-withdrawals`

### 2. Lihat Section "Withdrawal Pending"
Di bagian kiri, ada list withdrawal yang menunggu action. Setiap withdrawal menampilkan:
- Nama partner
- Email / Telegram username
- Affiliate code
- **Nominal yang akan ditransfer**
- Tanggal diajukan
- Detail transfer (nama rekening, bank, nomor, WhatsApp, email)

### 3. Ada 3 Tombol Action untuk Setiap Withdrawal

```
┌─────────────────────────────────────────┐
│ Nama Partner                    [Pending]│
│ email@example.com • AFCODE123           │
│                                         │
│ Rp 500.000                              │
│ Diajukan 29 Mei 2026, 13:00             │
│                                         │
│ Detail transfer                         │
│ Budi Santoso                            │
│ BCA • 1234567890                        │
│ WhatsApp 081234567890                   │
│ budi@email.com                          │
│                                         │
│ [Approve] [Mark paid] [Reject]          │
└─────────────────────────────────────────┘
```

### 4. Klik Tombol "Mark paid"
- Tombol ini mengubah status dari `pending` → `paid`
- Atau dari `approved` → `paid`
- Artinya: Uang sudah ditransfer ke rekening partner

### 5. Konfirmasi
Setelah klik "Mark paid":
- Halaman akan reload
- Withdrawal akan pindah ke section "Riwayat review"
- Status berubah menjadi `paid` (badge hijau)
- `reviewedAt` otomatis diset ke waktu sekarang

## Alur Status Lengkap

```
PENDING (Baru diajukan)
   ↓
   ├─→ [Approve] → APPROVED (Sudah review, siap transfer)
   │      ↓
   │      └─→ [Mark paid] → PAID ✅ (Uang sudah ditransfer)
   │
   └─→ [Reject] → REJECTED ❌ (Ditolak)
```

## Penjelasan Setiap Tombol

### 1. **Approve** (Tombol Biru)
- **Fungsi**: Approve withdrawal request
- **Status berubah**: `pending` → `approved`
- **Artinya**: Admin sudah review dan setuju, siap untuk ditransfer
- **Kapan digunakan**: Saat admin sudah verifikasi data payout dan siap transfer uang

### 2. **Mark paid** (Tombol Sekunder)
- **Fungsi**: Tandai sebagai sudah dibayar
- **Status berubah**: `pending` → `paid` atau `approved` → `paid`
- **Artinya**: Uang sudah ditransfer ke rekening partner
- **Kapan digunakan**: Setelah admin benar-benar transfer uang ke rekening partner
- **Catatan**: Ini adalah step terakhir, setelah ini withdrawal selesai

### 3. **Reject** (Tombol Ghost)
- **Fungsi**: Tolak withdrawal request
- **Status berubah**: `pending` → `rejected`
- **Artinya**: Admin menolak request ini
- **Kapan digunakan**: Jika ada masalah dengan data payout atau alasan lain

## Contoh Workflow Lengkap

```
1. Partner klik "Ajukan withdraw" di /affiliate
   ↓
2. Withdrawal muncul di admin dengan status PENDING
   ↓
3. Admin verifikasi data payout (nama, bank, nomor rekening)
   ↓
4. Admin klik "Approve" → Status jadi APPROVED
   ↓
5. Admin transfer uang ke rekening partner (manual via bank)
   ↓
6. Admin klik "Mark paid" → Status jadi PAID
   ↓
7. Partner bisa lihat di /affiliate bahwa withdrawal sudah PAID
```

## Catatan Penting

- **Tidak ada auto-transfer**: Admin harus manual transfer uang ke rekening partner
- **Verifikasi data**: Pastikan data payout (nama, bank, nomor) sudah benar sebelum approve
- **Snapshot payout**: Data payout di-copy saat withdrawal dibuat, jadi perubahan payout default tidak affect request lama
- **Riwayat**: Semua withdrawal yang sudah di-review (approved/paid/rejected) bisa dilihat di section "Riwayat review"

## Troubleshooting

### Q: Tombol "Mark paid" tidak muncul?
**A**: Tombol ini selalu ada. Pastikan Anda sudah login sebagai admin dan halaman sudah load dengan benar.

### Q: Bagaimana jika salah klik "Mark paid"?
**A**: Tidak ada undo button. Jika terjadi kesalahan, hubungi developer untuk manual update database.

### Q: Bisa langsung klik "Mark paid" tanpa "Approve" dulu?
**A**: Ya, bisa. Tombol "Mark paid" bisa mengubah status dari `pending` langsung ke `paid`.

### Q: Withdrawal mana yang sudah dibayar?
**A**: Lihat section "Riwayat review" di sebelah kanan. Withdrawal dengan status `paid` (badge hijau) adalah yang sudah dibayar.
