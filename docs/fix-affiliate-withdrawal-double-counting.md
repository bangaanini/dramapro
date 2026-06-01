# Fix: Bug Double Counting Withdrawal dengan Status "Approved"

## Masalah yang Ditemukan

Partner bisa melakukan withdrawal lebih dari saldo yang seharusnya tersedia karena withdrawal dengan status `"approved"` dihitung sebagai `withdrawn`, padahal uang belum ditransfer.

## Root Cause

### Alur Status Withdrawal:
```
pending → approved → paid
       ↘ rejected
```

- `pending`: Baru diajukan, menunggu review admin
- `approved`: Admin sudah review dan setuju, **TAPI BELUM TRANSFER UANG**
- `paid`: Admin **SUDAH TRANSFER UANG** ke rekening partner

### Bug di Kode Lama:

**File**: `app/affiliate/actions.ts` (baris 213-219)

```typescript
// SEBELUM (SALAH)
const totalWithdrawn = withdrawalGroups.reduce((sum, item) => {
  if (item.status !== "approved" && item.status !== "paid") {
    return sum;
  }
  return sum + (item._sum.amount ?? 0);
}, 0);
```

**Masalah**: Status `"approved"` dihitung sebagai `withdrawn`, padahal uang belum ditransfer!

## Skenario Bug

### Timeline Partner A:

**29 Mei - Sebelum Withdraw**:
```
Total Komisi: Rp 300.000
Total Withdrawn: Rp 0
Total Reserved (pending): Rp 0
---
Available Balance: Rp 300.000 ✅
```

**29 Mei - Partner A Request Withdraw Rp 300.000**:
```
Status: pending

Total Komisi: Rp 300.000
Total Withdrawn: Rp 0
Total Reserved: Rp 300.000
---
Available Balance: Rp 0 ✅ (Benar, tidak bisa withdraw lagi)
```

**29 Mei - Admin Klik "Approve" (BELUM TRANSFER UANG)**:
```
Status: approved

Total Komisi: Rp 300.000
Total Withdrawn: Rp 300.000 ← BUG! Seharusnya masih 0
Total Reserved: Rp 0
---
Available Balance: Rp 0 ✅ (Kebetulan masih benar)
```

**30 Mei - Ada Komisi Baru Rp 60.000**:
```
Total Komisi: Rp 360.000
Total Withdrawn: Rp 300.000 ← BUG! Dihitung padahal belum paid
Total Reserved: Rp 0
---
Available Balance: Rp 60.000
```

**31 Mei - Partner A Bisa Withdraw Lagi Rp 60.000**:
```
Partner A request withdraw: Rp 60.000 (status: pending)

Total Komisi: Rp 360.000
Total Withdrawn: Rp 300.000 ← Withdrawal pertama masih approved!
Total Reserved: Rp 60.000
---
Available Balance: Rp 0
```

**Jika admin approve withdrawal kedua**:
```
Total Komisi: Rp 360.000
Total Withdrawn: Rp 360.000 ← BUG! Keduanya dihitung
Total Reserved: Rp 0
---
Available Balance: Rp 0
```

**TAPI admin baru transfer**: Rp 0 (kedua withdrawal masih approved, belum paid!)

### Dampak Bug:

Partner bisa terus withdraw selama ada komisi baru masuk, meskipun admin belum transfer uang dari withdrawal sebelumnya.

**Contoh Ekstrem**:
- Withdrawal 1: Rp 300.000 (approved, belum paid)
- Komisi baru: Rp 100.000
- Withdrawal 2: Rp 100.000 (approved, belum paid)
- Komisi baru: Rp 50.000
- Withdrawal 3: Rp 50.000 (approved, belum paid)

**Total yang bisa ditarik**: Rp 450.000
**Total yang sudah ditransfer admin**: Rp 0 ❌

## Solusi yang Diterapkan

### 1. Fix di `app/affiliate/actions.ts`

**Sebelum**:
```typescript
const totalWithdrawn = withdrawalGroups.reduce((sum, item) => {
  if (item.status !== "approved" && item.status !== "paid") {
    return sum;
  }
  return sum + (item._sum.amount ?? 0);
}, 0);
```

**Sesudah**:
```typescript
const totalWithdrawn = withdrawalGroups.reduce((sum, item) => {
  if (item.status !== "paid") {  // ← HANYA PAID
    return sum;
  }
  return sum + (item._sum.amount ?? 0);
}, 0);
```

### 2. Fix di `lib/admin-users-data.ts`

**Sebelum**:
```typescript
if (item.status === "pending") {
  current.pendingAmount += amount;
} else if (item.status === "approved" || item.status === "paid") {
  current.withdrawnAmount += amount;
}
```

**Sesudah**:
```typescript
if (item.status === "pending") {
  current.pendingAmount += amount;
} else if (item.status === "approved") {
  current.pendingAmount += amount;  // ← Approved = masih pending
} else if (item.status === "paid") {
  current.withdrawnAmount += amount;  // ← Hanya paid yang withdrawn
}
```

## Hasil Setelah Fix

### Timeline Partner A (Setelah Fix):

**29 Mei - Admin Klik "Approve" (BELUM TRANSFER UANG)**:
```
Status: approved

Total Komisi: Rp 300.000
Total Withdrawn: Rp 0 ✅ (Benar, belum paid)
Total Reserved: Rp 300.000 ✅ (Approved = masih reserved)
---
Available Balance: Rp 0 ✅
```

**30 Mei - Ada Komisi Baru Rp 60.000**:
```
Total Komisi: Rp 360.000
Total Withdrawn: Rp 0 ✅
Total Reserved: Rp 300.000 ✅
---
Available Balance: Rp 60.000 ✅
```

**31 Mei - Partner A Bisa Withdraw Rp 60.000** ✅ (Benar)

**31 Mei - Admin Mark Paid Withdrawal Pertama**:
```
Status withdrawal pertama: paid

Total Komisi: Rp 360.000
Total Withdrawn: Rp 300.000 ✅ (Sekarang dihitung)
Total Reserved: Rp 0 ✅
---
Available Balance: Rp 60.000 ✅
```

## Definisi Status yang Benar

| Status | Arti | Uang Sudah Ditransfer? | Dihitung Sebagai |
|--------|------|------------------------|------------------|
| `pending` | Baru diajukan | ❌ Belum | Reserved |
| `approved` | Admin sudah review & setuju | ❌ Belum | Reserved |
| `paid` | Admin sudah transfer uang | ✅ Sudah | Withdrawn |
| `rejected` | Admin tolak | ❌ Tidak akan | - |

## Formula Saldo yang Benar

```
Available Balance = Total Commission - Total Withdrawn - Total Reserved

Dimana:
- Total Commission = SUM(amount) WHERE status != 'cancelled'
- Total Withdrawn = SUM(amount) WHERE status = 'paid'
- Total Reserved = SUM(amount) WHERE status IN ('pending', 'approved')
```

## Testing Checklist

- [ ] Partner request withdrawal → status `pending` → saldo berkurang
- [ ] Admin approve → status `approved` → saldo tetap berkurang (masih reserved)
- [ ] Admin mark paid → status `paid` → saldo tetap berkurang (sekarang withdrawn)
- [ ] Partner tidak bisa withdraw lebih dari available balance
- [ ] Jika ada komisi baru setelah approved (belum paid), partner hanya bisa withdraw komisi baru
- [ ] Halaman `/admin/users` menampilkan saldo yang benar
- [ ] Halaman `/affiliate` menampilkan saldo yang benar

## Files Changed

1. `app/affiliate/actions.ts`
   - `requestAffiliateWithdrawalAction`: Fix kalkulasi `totalWithdrawn`
   - `requestPartnerBotWithdrawalAction`: Fix kalkulasi `totalWithdrawn`

2. `lib/admin-users-data.ts`
   - `getAdminUsersTableData`: Fix kalkulasi `withdrawnAmount` dan `pendingAmount`

## Impact

**Sebelum Fix**:
- Partner bisa withdraw lebih dari yang seharusnya
- Admin bisa kehilangan uang jika tidak hati-hati

**Setelah Fix**:
- Partner hanya bisa withdraw sesuai saldo yang benar
- Status `approved` diperlakukan sebagai "reserved" sampai admin mark paid
- Sistem lebih aman dan akurat
