# Fix: Affiliate Withdrawal Admin UI - Masalah Approved Langsung Hilang

## Masalah yang Terjadi
Saat admin klik tombol "Approve", withdrawal langsung hilang dari section "Withdrawal pending" dan pindah ke section "Riwayat review". Ini membuat admin tidak bisa langsung klik "Mark paid" tanpa reload halaman.

## Root Cause
Query di halaman admin hanya menampilkan withdrawal dengan status `pending` di section pertama:
```typescript
// SEBELUM (SALAH)
where: {
  status: "pending",  // ← Hanya pending
}
```

Saat status berubah ke `approved`, withdrawal langsung hilang dari view karena tidak match filter.

## Solusi yang Diterapkan

### 1. Update Query Section Pertama
**File**: `/app/admin/(dashboard)/affiliate-withdrawals/page.tsx`

**Sebelum**:
```typescript
where: {
  status: "pending",
}
```

**Sesudah**:
```typescript
where: {
  status: {
    in: ["pending", "approved"],  // ← Tampilkan keduanya
  },
}
```

### 2. Update Query Section Kedua
**Sebelum**:
```typescript
where: {
  status: {
    in: ["approved", "paid", "rejected"],
  },
}
```

**Sesudah**:
```typescript
where: {
  status: {
    in: ["paid", "rejected"],  // ← Hanya yang selesai
  },
}
```

### 3. Update Label & Deskripsi

**Section Pertama**:
- Label: "Withdrawal pending" → "Withdrawal menunggu aksi"
- Deskripsi: "Permintaan terbaru yang menunggu tindakan admin." → "Pending review dan approved, siap untuk diproses atau ditandai paid."

**Section Kedua**:
- Label: "Riwayat review" → "Riwayat selesai"
- Deskripsi: "Status terbaru yang sudah ditindak admin." → "Withdrawal yang sudah paid atau rejected."

### 4. Update Stat Cards
Menampilkan breakdown yang lebih jelas:
- "Pending review" = jumlah withdrawal status `pending`
- "Approved" = jumlah withdrawal status `approved`
- "Mode review" = Aktif/Santai

## Hasil Setelah Fix

### Workflow Baru (Lebih Smooth)
```
1. Partner ajukan withdraw
   ↓
2. Admin lihat di section "Withdrawal menunggu aksi" (status: PENDING)
   ↓
3. Admin klik "Approve" → Status jadi APPROVED
   ↓
4. Withdrawal TETAP di section yang sama (tidak hilang!)
   ↓
5. Admin klik "Mark paid" → Status jadi PAID
   ↓
6. Withdrawal pindah ke section "Riwayat selesai"
```

### Keuntungan
✅ Admin bisa langsung klik "Mark paid" tanpa reload  
✅ Workflow lebih intuitif dan smooth  
✅ Tidak perlu scroll ke section lain untuk lanjut proses  
✅ Label lebih jelas menunjukkan status withdrawal  

## Testing Checklist
- [ ] Buka `/admin/affiliate-withdrawals`
- [ ] Lihat withdrawal dengan status `pending`
- [ ] Klik "Approve" → withdrawal tetap di section yang sama
- [ ] Klik "Mark paid" → withdrawal pindah ke "Riwayat selesai"
- [ ] Verifikasi stat cards menampilkan jumlah yang benar

## Files Changed
- `/app/admin/(dashboard)/affiliate-withdrawals/page.tsx`
  - Query section pertama: `pending` → `pending, approved`
  - Query section kedua: `approved, paid, rejected` → `paid, rejected`
  - Label & deskripsi section pertama
  - Label & deskripsi section kedua
  - Stat cards breakdown
