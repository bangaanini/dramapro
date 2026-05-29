# Alur Affiliate Withdrawal (Penarikan Komisi)

## Overview

Sistem affiliate withdrawal di Layar Drama memiliki flow yang sederhana dan terstruktur:
1. Partner mengisi data payout default
2. Partner mengajukan withdrawal request
3. Admin mereview dan approve/reject
4. Admin mark sebagai paid setelah transfer

## 1. Setup Payout Default (`/profile/payout-settings`)

### Data yang Disimpan
Partner harus mengisi informasi payout sekali saja:
- **Nama pemilik rekening** (required)
- **Nama bank / e-wallet** (required) - contoh: BCA, BRI, Mandiri, DANA
- **Nomor rekening** (required)
- **Nomor WhatsApp** (required)
- **Email payout** (required)
- **Catatan opsional** - prioritas transfer, instruksi khusus, dll

### Validasi
- Semua field wajib diisi
- Email harus format valid (regex: `^\S+@\S+\.\S+$`)
- Nomor rekening dan WhatsApp otomatis dihapus spasi

### Database
Disimpan di tabel `AffiliatePayoutProfile`:
```prisma
model AffiliatePayoutProfile {
  id                    String   @id @default(cuid())
  userId                String   @unique
  accountHolderName     String
  bankName              String
  accountNumber         String
  whatsappNumber        String
  payoutEmail           String
  notes                 String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## 2. Request Withdrawal (`/affiliate`)

### Kondisi yang Harus Terpenuhi
1. **Payout profile sudah diisi** - jika belum, redirect ke `/profile/payout-settings`
2. **Saldo mencukupi minimum** - default Rp 50.000 (configurable di admin settings)
3. **User sudah login**

### Kalkulasi Saldo
```
Available Balance = Total Commission - Total Withdrawn - Total Reserved

Dimana:
- Total Commission = semua komisi dengan status != "cancelled"
- Total Withdrawn = withdrawal dengan status "approved" atau "paid"
- Total Reserved = withdrawal dengan status "pending"
```

### Proses Withdrawal Request
1. Ambil `availableBalance` dari kalkulasi di atas
2. Copy semua data dari `AffiliatePayoutProfile` ke `AffiliateWithdrawal`
3. Buat record baru dengan status `"pending"`
4. Redirect ke `/affiliate?tab=history&success=1`

### Database
Disimpan di tabel `AffiliateWithdrawal`:
```prisma
model AffiliateWithdrawal {
  id                        String   @id @default(cuid())
  affiliateUserId           String
  partnerBotId              String?
  amount                    Int
  status                    String   @default("pending") // pending, approved, paid, rejected
  payoutAccountHolderName   String
  payoutBankName            String
  payoutAccountNumber       String
  payoutWhatsappNumber      String
  payoutEmail               String
  notes                     String?
  requestedAt               DateTime @default(now())
  reviewedAt                DateTime?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  affiliateUser             User     @relation(fields: [affiliateUserId], references: [id], onDelete: Cascade)
  partnerBot                TelegramPartnerBot? @relation(fields: [partnerBotId], references: [id], onDelete: SetNull)
}
```

## 3. Admin Review (`/admin/affiliate-withdrawals`)

### Halaman Admin
Menampilkan dua section:

#### A. Withdrawal Pending (Menunggu Review)
- List withdrawal dengan status `"pending"`
- Sorted by `requestedAt` DESC
- Max 30 items
- Tampilkan:
  - Nama partner
  - Email / Telegram username
  - Affiliate code
  - Nominal
  - Tanggal diajukan
  - Detail transfer (nama rekening, bank, nomor, WhatsApp, email)
  - Catatan (jika ada)

#### B. Recent Reviewed (Riwayat Review)
- List withdrawal dengan status `"approved"`, `"paid"`, atau `"rejected"`
- Sorted by `reviewedAt` DESC
- Max 8 items
- Tampilkan:
  - Nama partner
  - Status badge (warna berbeda per status)
  - Nominal
  - Tanggal review

### Action Buttons (Per Withdrawal)
Admin bisa melakukan 3 action:

1. **Approve** → Status berubah dari `pending` → `approved`
   - Artinya: Admin sudah review dan setuju
   - Belum ada transfer uang

2. **Mark Paid** → Status berubah dari `pending` → `paid` (atau `approved` → `paid`)
   - Artinya: Uang sudah ditransfer ke rekening partner
   - Set `reviewedAt` = now()

3. **Reject** → Status berubah dari `pending` → `rejected`
   - Artinya: Admin menolak withdrawal request
   - Set `reviewedAt` = now()

### Server Action
`updateAffiliateWithdrawalStatusAction` di `app/admin/actions.ts`:
```typescript
// Input: id (withdrawal ID), nextStatus (approved | paid | rejected)
// Update: status, reviewedAt (jika status != pending)
// Revalidate: /admin/affiliate-withdrawals
```

## 4. Partner Bot Withdrawal

Ada flow terpisah untuk partner bot:
- `requestPartnerBotWithdrawalAction` - sama seperti affiliate withdrawal
- Tapi hanya menghitung komisi dari bot tertentu (filter by `partnerBotId`)
- Redirect ke `/affiliate/partner-bot/[botUsername]?tab=balance`

## 5. Status Flow

```
pending → approved → paid
       ↘ rejected
```

- **pending**: Baru diajukan, menunggu review admin
- **approved**: Admin sudah review dan setuju, siap untuk ditransfer
- **paid**: Uang sudah ditransfer ke rekening partner
- **rejected**: Admin menolak request

## 6. Minimum Withdrawal Settings

Admin bisa set di `/admin/affiliate-settings`:
- `minimumWithdrawalAmount` - nominal minimum (default: 50000)
- `withdrawalNotes` - catatan untuk partner (contoh: "Proses transfer 1-3 hari kerja")

## 7. Affiliate Commission Calculation

Komisi dihitung otomatis saat VIP payment berhasil:
- Disimpan di tabel `AffiliateCommission`
- Status: `pending` → `paid` (saat VIP payment confirmed)
- Tidak bisa ditarik sampai status `paid`

## 8. Flow Diagram

```
Partner
  ↓
[1] Isi payout default di /profile/payout-settings
  ↓
[2] Klik "Ajukan withdraw" di /affiliate
  ↓
[3] System create AffiliateWithdrawal (status: pending)
  ↓
Admin
  ↓
[4] Review di /admin/affiliate-withdrawals
  ↓
[5] Klik "Approve" atau "Mark paid" atau "Reject"
  ↓
[6] Status berubah, partner bisa lihat di /affiliate
```

## 9. Key Points

- **Snapshot payout**: Data payout di-copy ke setiap withdrawal request, jadi jika partner ubah payout default, request lama tetap punya data lama
- **Available balance**: Otomatis dihitung, tidak bisa withdraw lebih dari available balance
- **Minimum withdrawal**: Bisa dikonfigurasi admin, default Rp 50.000
- **Partner bot**: Ada flow terpisah tapi logic sama
- **No auto-transfer**: Admin harus manual mark sebagai "paid" setelah transfer uang
