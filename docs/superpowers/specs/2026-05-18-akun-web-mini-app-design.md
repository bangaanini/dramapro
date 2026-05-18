# Akun Web untuk User Mini-App + Merge dua arah — Design

**Status:** Draft, awaiting implementation plan
**Date:** 2026-05-18
**Author:** brainstorm session
**Related code (uncommitted):** `lib/user-auth.ts` (draft `setupWebAccount`, `hasWebAccount`)

---

## 1. Goals & non-goals

### Goals
- User mini-app (telegram-only) bisa setup akun web (email + password + confirm) dari halaman profil tanpa kehilangan data Telegram-nya.
- User yang setup akun web bisa login web pakai email tersebut, dan saat login web mendapat akun yang **persis sama** dengan akun mini-app (history, VIP, favorites, partner bot ownership, affiliate, dll).
- User yang sign-up via web bisa mengisi field Telegram username (opsional). Saat suatu hari user buka mini-app dengan akun Telegram tersebut, sistem deteksi match dan tawarkan merge ke akun web yang sudah ada.
- Merge menggabungkan dua User row jadi satu row, sehingga semua benefit (VIP, affiliate, role admin bot partner) tetap terbawa, tidak duplikat.
- Role admin bot partner ikut otomatis tanpa logic baru karena `partnerBot.ownerUserId` di-repoint dalam transaksi merge.

### Non-goals
- Verifikasi email (OTP / email link) — di-skip eksplisit oleh user.
- Forgot-password flow — out of scope; user yang lupa password tetap kontak support manual.
- Auth provider tambahan (Google, dll) — tidak dirancang sekarang.
- Refactor arsitektural ke tabel `UserAuthIdentity` — di-skip; memakai schema sekarang.

---

## 2. Perubahan schema

**Tidak ada migration DB baru yang dibutuhkan.** Semua field yang dipakai sudah ada di `User` model:
- `email String? @unique` — sudah ada
- `passwordHash String?` — sudah ada
- `telegramUsername String?` (tidak unique) — sudah ada, sengaja non-unique karena dua user bisa klaim username yang sama saat sign-up web; banner merge yang menentukan match
- `telegramId String? @unique` — sudah ada, hanya diisi setelah verifikasi via Telegram WebApp initData

Field `User.authProvider` (enum `local | telegram`) **dipertahankan** sebagai metadata "metode login terakhir", tapi UI tidak lagi pakai field ini untuk gating. UI pindah pakai `hasWebAccount` (turunan dari `email && passwordHash`).

Tidak butuh kolom `mergeCandidateDismissedAt` — pakai cookie untuk dismiss banner (lihat 5.2).

---

## 3. UI flow

### 3.1 Mini-app: menu "Buat Akun Web" di `/profile`

Lokasi: `components/profile-overview.tsx`.

- Daftar `profileMenuItems` ditambah satu entry "Buat Akun Web" (icon: `UserPlus`, deskripsi "Buat email & password supaya bisa login lewat web juga.").
- Visibility menu lewat filter pada array (mirip pattern existing `visibleProfileMenuItems`):
  - "Buat Akun Web" → tampil kalau `displayUser.hasWebAccount === false`
  - "Ganti Password" → tampil kalau `displayUser.hasWebAccount === true`
  - Filter `authProvider === "telegram"` yang sekarang ada (line 296) **dihapus** dan diganti dengan filter berbasis `hasWebAccount`.
- Badge "Telegram login" / "Akun web" (line 435-436) diganti:
  - kalau `displayUser.telegramId && displayUser.hasWebAccount` → "Telegram + Web"
  - kalau `displayUser.telegramId` → "Telegram login"
  - else → "Akun web"

`ProfileOverviewProps.user` ditambah field `hasWebAccount: boolean` dan `telegramId: string | null`. `app/profile/page.tsx` memetakan dari `PublicUser` yang sudah punya `hasWebAccount`.

### 3.2 Halaman setup `/profile/setup-web`

Route page baru: `app/profile/setup-web/page.tsx`.

- Server component yang call `getCurrentUser()`. Kalau null → redirect ke `/sign-in?next=/profile/setup-web`.
- Kalau user sudah punya akun web (`hasWebAccount === true`) → redirect ke `/profile/password` dengan toast "Akun web sudah ada".
- Render client component `SetupWebAccountForm`:
  - Field: Email, Password (min 8), Konfirmasi Password.
  - Submit ke server action `setupWebAccountAction(formData)`.
  - On success: redirect ke `/profile?welcome=web`. Halaman profil deteksi query param dan tampilkan toast "Akun web berhasil dibuat."
  - On error: tampilkan pesan error inline.

### 3.3 Web: field Telegram username di sign-up

Lokasi: form sign-up web (route yang sekarang call `registerUser`). Tambah satu field:

- Label: "Telegram Username (opsional)"
- Helper text: "Diisi kalau kamu juga pakai Layar Drama lewat Telegram. Saat kamu buka mini-app nanti, akun ini akan ditawarkan untuk digabungkan."
- Validasi client: optional. Kalau diisi: format `@username` atau `username`, akan dinormalisasi server-side.

Pass ke `registerUser({ ..., telegramUsername })`. Lihat 5.1.

### 3.4 Mini-app: banner merge candidate

Banner ditampilkan di top of `/profile` (komponen baru `MergeCandidateBanner` di-mount oleh `ProfileOverview`).

Flow:

1. Halaman `/profile` mount → client effect call `GET /api/me/merge-candidate`.
2. Endpoint return `{ candidate: { maskedEmail, candidateId } | null }`.
3. Kalau `candidate` ada: tampilkan banner.

Copy banner:
> "Sepertinya kamu sudah punya akun web **a***@gmail.com**. Masukkan password untuk gabungkan akun, dan VIP/history/keuntungan akun akan jadi satu."

Tombol:
- "Gabungkan akun" → buka modal dengan input password + tombol Submit.
  - Submit → server action `mergeWebAccountAction(formData)`.
  - On success: tutup modal, hilangkan banner, refresh halaman (atau `router.refresh()`); toast "Akun berhasil digabungkan."
  - On error (password salah / kandidat hilang): tampilkan pesan inline di modal.
- "Skip" → call server action `dismissMergeBannerAction(formData)` yang set cookie `dramapro_merge_dismissed_<candidateId>` selama 30 hari, lalu hilangkan banner.

Email mask: tampilkan `<huruf-pertama>***@<domain>` (mis. `a***@gmail.com`) untuk hindari kebocoran ke orang yang malicious-claim username Telegram orang lain.

---

## 4. Algoritma merge

Ini bagian paling kritikal. Salah sedikit data hilang atau duplikat. Semua dalam satu `prisma.$transaction`.

### 4.1 Kontrak fungsi

`mergeUsers({ winnerId, loserId, providedPassword })` di `lib/user-auth.ts`:

- `winnerId`: id akun web (yang punya `passwordHash`).
- `loserId`: id akun mini-app yang sedang login (punya `telegramId`).
- `providedPassword`: password plaintext yang user input di modal.
- Return: `{ ok: true, mergedUserId: winnerId } | { ok: false, error: string }`.

Pre-flight (di luar transaksi):
- Kalau `winnerId === loserId` → return `{ ok: true }` (no-op).
- Load `winner` & `loser` row. Kalau salah satu hilang → return error "Akun tidak ditemukan."
- `winner.passwordHash` harus ada; verifikasi `providedPassword` cocok pakai `verifyPassword`. Kalau salah → return `{ ok: false, error: "Password salah." }`.
- `loser.telegramId` harus ada (kandidat tanpa telegramId tidak boleh merge).

### 4.2 Field-level merge di winner

Susun objek `winnerUpdate`:
- `telegramId` ← `loser.telegramId`
- `telegramUsername`, `telegramPhotoUrl`, `telegramFirstName`, `telegramLastName`, `telegramLanguageCode` ← dari `loser` (data Telegram terbaru)
- `telegramMiniAppWelcomeSeenAt` ← `winner.telegramMiniAppWelcomeSeenAt ?? loser.telegramMiniAppWelcomeSeenAt` (yang non-null lebih dulu; kalau dua-duanya, ambil minimum)
- `name` ← tetap `winner.name` (akun web sumber identitas), kecuali kosong → fallback ke `loser.name`
- `vipStartedAt` ← non-null minimum dari kedua (yang lebih dulu mulai VIP)
- `vipExpiresAt` ← non-null maximum dari kedua (yang berakhir paling jauh)
- `affiliateCode` ← `winner.affiliateCode ?? loser.affiliateCode`
- `affiliateCommissionOverrideRate` ← `winner.affiliateCommissionOverrideRate ?? loser.affiliateCommissionOverrideRate`
- `referredById` ← `winner.referredById ?? loser.referredById`
- `referredByPartnerBotId` ← `winner.referredByPartnerBotId ?? loser.referredByPartnerBotId`
- `authProvider` ← `"telegram"` (login terakhir adalah via mini-app saat banner ditampilkan)

### 4.3 Urutan operasi dalam transaksi

Karena `User.telegramId` punya `@unique`, kita tidak bisa langsung set `winner.telegramId` selama loser masih punya nilainya. Urutan:

1. **Detach loser dari telegramId**: `UPDATE User SET telegramId = NULL WHERE id = loserId`. Ini melepas constraint.
2. **Re-point semua FK** (lihat 4.4 untuk daftar lengkap, 4.5 untuk handling unique conflicts).
3. **Field-level update winner** dengan `winnerUpdate` dari 4.2 (termasuk telegramId yang sekarang dari loser).
4. **Hapus loser**: `DELETE FROM User WHERE id = loserId`. Karena semua FK sudah di-repoint, tidak ada cascade yang menghapus data live.

### 4.4 Daftar tabel yang harus di-repoint

Berdasarkan eksplorasi `prisma/schema.prisma`:

| Model | Kolom | Catatan |
|---|---|---|
| `UserSession` | `userId` | Session aktif loser → ikut ke winner; tidak perlu re-login |
| `AnalyticsVisitor` | `userId` | onDelete SetNull, tapi kita re-point eksplisit |
| `AnalyticsSession` | `userId` | sda |
| `AnalyticsEvent` | `userId` | sda |
| `FavoriteDrama` | `userId` | unique `(userId, seriesId)` — dedupe (4.5) |
| `SavedEpisode` | `userId` | unique `(userId, seriesId, episodeIndex)` — dedupe |
| `WatchHistory` | `userId` | unique `(userId, seriesId)` — dedupe, ambil yang `updatedAt` terbaru |
| `VipPayment` | `userId` | tidak ada konflik unik |
| `AffiliateCommission` | `affiliateUserId` | relation `AffiliateOwner` |
| `AffiliateCommission` | `referredUserId` | relation `AffiliateReferred` |
| `AffiliateWithdrawal` | `affiliateUserId` | |
| `AffiliatePayoutProfile` | `userId` | unique 1-to-1 — kalau dua-duanya ada, pertahankan winner, hapus loser |
| `TelegramPartnerBot` | `ownerUserId` | role admin bot partner ter-bawa otomatis di sini |
| `DramaChannelBroadcast` | `ownerUserId` | onDelete SetNull |
| `PartnerBotDownloadLog` | `userId` | unique `(partnerBotId, userId, seriesId, episodeIndex, periodKey)` — dedupe |
| `PushSubscription` | `userId` | onDelete SetNull |
| `PushNotificationDelivery` | `userId` | onDelete SetNull |
| `User` (self-relation) | `referredById` | user lain yang refer ke loser → re-point ke winner |

**Penting**: kalau di masa depan tabel baru ditambah ke schema dengan FK ke `User`, fungsi `mergeUsers` **harus diupdate**. Tambahkan komentar kode di top fungsi:

```
// CATATAN: kalau menambah tabel baru dengan FK ke User, update fungsi ini.
// Daftar tabel di sini harus sinkron dengan semua relasi `User.@relation` di schema.prisma.
```

### 4.5 Handling unique constraint conflicts

Untuk tabel dengan unique compound yang melibatkan `userId`, perlu dedupe **sebelum** UPDATE:

**FavoriteDrama** (`@@unique([userId, seriesId])`):
1. Cari row di loser yang `seriesId`-nya sudah ada di winner: `SELECT seriesId FROM FavoriteDrama WHERE userId = loserId AND seriesId IN (SELECT seriesId FROM FavoriteDrama WHERE userId = winnerId)`.
2. Hapus loser row yang konflik: `DELETE FROM FavoriteDrama WHERE userId = loserId AND seriesId IN (...)`.
3. UPDATE sisanya: `UPDATE FavoriteDrama SET userId = winnerId WHERE userId = loserId`.

**SavedEpisode** (`@@unique([userId, seriesId, episodeIndex])`):
- Sama pattern: dedupe by `(seriesId, episodeIndex)` pair, prefer winner.

**WatchHistory** (`@@unique([userId, seriesId])`):
- Dedupe by `seriesId`. Tapi **prefer yang updatedAt terbaru**, bukan winner default.
- Algoritma:
  1. Query: untuk tiap `seriesId` yang dimiliki loser **dan** winner, ambil pasangan `(winnerRow, loserRow)`.
  2. Untuk tiap pasangan: kalau `loserRow.updatedAt > winnerRow.updatedAt`, DELETE winnerRow (loser akan menggantikan via UPDATE di step 4). Kalau winner lebih baru atau sama, DELETE loserRow.
  3. Konflik habis. UPDATE sisa loser row: `UPDATE WatchHistory SET userId = winnerId WHERE userId = loserId`.

**PartnerBotDownloadLog** (`@@unique([partnerBotId, userId, seriesId, episodeIndex, periodKey])`):
- Dedupe by `(partnerBotId, seriesId, episodeIndex, periodKey)`. Konflik sangat jarang (butuh dua user beda yang punya download exactly sama). Hapus loser row yang konflik, re-point sisanya.

**AffiliatePayoutProfile** (`userId @unique` — verified di schema.prisma):
- Kalau dua-duanya ada: hapus loser, pertahankan winner. Tidak merge field-level (akun web yang manage payout).
- Kalau hanya loser yang ada: re-point langsung ke winner.

**PushSubscription** (`endpoint @unique`):
- Konflik endpoint sangat rare karena unik per device. Kalau ada: hapus loser yang duplikat, re-point sisanya.

**AnalyticsVisitor** (`tokenHash @unique`):
- tokenHash tidak bergantung userId — re-point langsung tanpa konflik.

### 4.6 Atomicity

Semua step (detach telegramId, dedupe + repoint per tabel, field merge winner, delete loser) **wajib** dalam satu `prisma.$transaction([...])`. Kalau ada satu step gagal:
- Transaksi rollback otomatis.
- Kedua user row tetap utuh.
- Server action return `{ ok: false, error: "Gagal menggabungkan akun. Coba lagi." }`.

### 4.7 Audit log

Sebelum `return { ok: true }`, log dengan struktur ini (count diambil dari hasil query repoint, bukan placeholder):

```
console.log("[user-merge]", JSON.stringify({
  event: "user_merge",
  winnerId,
  loserId,
  mergedAt: new Date().toISOString(),
  telegramIdMoved: loser.telegramId,
  vipExpiresChosen: winnerUpdate.vipExpiresAt,
  affiliateCodeKept: winnerUpdate.affiliateCode,
  partnerBotMoved: partnerBotRepointResult.count,
  favoritesMoved: favoritesRepointResult.count,
  watchHistoryMoved: watchHistoryRepointResult.count,
}));
```

`partnerBotRepointResult` dll adalah hasil `prisma.telegramPartnerBot.updateMany(...)` yang return `{ count: number }`. Pakai variabel ini langsung di log, jangan re-query.

Tidak butuh tabel audit baru. Log dibaca lewat `pm2 logs layardrama` saat debugging.

---

## 5. Server actions, fungsi library, endpoints

### 5.1 Perubahan di `lib/user-auth.ts`

**Tetap dari draft (sudah benar, tidak diubah):**
- `setupWebAccount({ userId, email, password, confirmPassword })`
- `hasWebAccount` di `PublicUser` dan `mapPublicUser`
- `authenticateUser` yang dilonggarkan ke `passwordHash` saja
- `changeCurrentUserPassword` yang dilonggarkan

**Yang diubah:**

`registerUser` ditambah parameter optional:
```
registerUser({ email, name, password, telegramUsername? })
```
- Kalau `telegramUsername` diisi: trim, lowercase, strip leading `@`. Validasi format `/^[a-z0-9_]{3,32}$/i`. Kalau tidak match format → return error "Format Telegram username tidak valid."
- Simpan ke `user.telegramUsername` saat create.
- **Tidak** set `telegramId`. **Tidak** ubah `authProvider` dari `local`.

**Yang ditambah:**

`findMergeCandidate(currentUserId, telegramUsername)`:
```
async function findMergeCandidate(
  currentUserId: string,
  telegramUsername: string | null,
): Promise<{ id: string; email: string; createdAt: Date } | null>
```
- Kalau `!telegramUsername` → return null.
- Query:
  ```
  prisma.user.findFirst({
    where: {
      id: { not: currentUserId },
      passwordHash: { not: null },
      email: { not: null },
      telegramUsername: { equals: telegramUsername, mode: "insensitive" },
      telegramId: null,
    },
    orderBy: { createdAt: "asc" },
    select: { id, email, createdAt },
  })
  ```
- Filter `telegramId: null` penting: row lain yang sudah punya telegramId berbeda berarti bukan kandidat (orang lain yang kebetulan klaim username sama).

`maskEmail(email)`:
```
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}
```

`mergeUsers({ winnerId, loserId, providedPassword })` — implementasi algoritma di Section 4.

### 5.2 Server actions

**`setupWebAccountAction(formData: FormData)`** — di `app/profile/setup-web/actions.ts` (file baru):
- Get `email`, `password`, `confirmPassword` dari formData.
- `getCurrentUser()` → kalau null, throw redirect ke `/sign-in`.
- Call `setupWebAccount({ userId: user.id, email, password, confirmPassword })`.
- On success: `revalidatePath('/profile')`, `redirect('/profile?welcome=web')`.
- On error: return `{ ok: false, error }` ke client component.

**`mergeWebAccountAction(formData: FormData)`** — di `app/profile/actions.ts` (atau lokasi shared):
- Get `password` dari formData.
- `getCurrentUser()` → null → return `{ ok: false, error: "Sesi habis." }`.
- Call `findMergeCandidate(currentUser.id, currentUser.telegramUsername)` → null → return `{ ok: false, error: "Kandidat merge tidak lagi tersedia." }`.
- Call `mergeUsers({ winnerId: candidate.id, loserId: currentUser.id, providedPassword: password })`.
- On success: `revalidatePath('/profile')`, return `{ ok: true }`. Session aktif sudah otomatis ter-bind ke winner karena `UserSession.userId` di-repoint.
- On error: return `{ ok: false, error }`.

**`dismissMergeBannerAction(formData: FormData)`**:
- Get `candidateId` dari formData.
- Set cookie `dramapro_merge_dismissed_<candidateId>` selama 30 hari (`maxAge: 60*60*24*30`, `path: "/"`, `httpOnly: true`, `sameSite: "lax"`).
- Return `{ ok: true }`.

### 5.3 Endpoint API: `GET /api/me/merge-candidate`

File: `app/api/me/merge-candidate/route.ts`.

```
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return new Response(null, { status: 401 });

  // Skip kalau user sudah punya akun web
  if (user.hasWebAccount) return Response.json({ candidate: null });

  // Skip kalau tidak punya telegramUsername
  if (!user.telegramUsername) return Response.json({ candidate: null });

  const candidate = await findMergeCandidate(user.id, user.telegramUsername);
  if (!candidate) return Response.json({ candidate: null });

  // Cek cookie dismiss
  const dismissed = request.cookies.get(`dramapro_merge_dismissed_${candidate.id}`);
  if (dismissed) return Response.json({ candidate: null });

  return Response.json({
    candidate: {
      candidateId: candidate.id,
      maskedEmail: maskEmail(candidate.email),
    },
  });
}
```

### 5.4 `authProvider` post-fitur

Field tetap di DB tapi UI tidak pakai untuk gating. Setelah fitur:
- Setup akun web → `authProvider` tetap `telegram` (terakhir login via mini-app).
- Login web → `authProvider` jadi `local`.
- Login mini-app → `authProvider` jadi `telegram`.
- Setelah merge → `authProvider` = `telegram` (karena merge dipicu dari mini-app).

UI gating semua pindah ke `hasWebAccount` dan `telegramId !== null`.

### 5.5 Banner client component

`components/merge-candidate-banner.tsx` (client):
- `useEffect` fetch `/api/me/merge-candidate`.
- Render banner kalau response `candidate !== null`.
- Modal pakai pattern existing (dialog dari shadcn/ui yang sudah dipakai `premium-modal.tsx`).

---

## 6. Testing & rollout

### 6.1 Integration test minimal (Opsi A)

Buat `scripts/test-merge-users.ts` (jalankan via `npx tsx scripts/test-merge-users.ts`):

Setup:
1. Bikin 2 user fixture:
   - `winner`: email + passwordHash, sudah set `telegramUsername: "alice"`, punya VIP yang aktif (`vipExpiresAt = now+30d`), favorites untuk seri X, watchHistory seri X (1 minggu lalu), affiliate code `WINNER`, partner payout profile.
   - `loser`: telegramId numerik, telegramUsername "alice", VIP aktif (`vipExpiresAt = now+10d`), favorites untuk seri Y, favorites seri X juga (konflik), watchHistory seri X (kemarin — lebih baru), savedEpisode, partner bot ownership 1 bot, affiliate code `LOSER`, AffiliateCommission sebagai owner & sebagai referred.
2. Call `mergeUsers({ winnerId: winner.id, loserId: loser.id, providedPassword: "valid-password" })`.

Asserts:
- `loser` tidak ada di DB.
- `winner.telegramId === loser.originalTelegramId`.
- `winner.telegramUsername === "alice"`.
- `winner.vipExpiresAt === now+30d` (max).
- `winner.affiliateCode === "WINNER"` (winner dipertahankan).
- Favorites: tidak duplikat seri X, ada seri X dan Y, count = 2.
- WatchHistory: seri X ada 1 row, `updatedAt` adalah dari loser (lebih baru).
- TelegramPartnerBot: bot yang loser owner sekarang `ownerUserId === winner.id`.
- AffiliateCommission: dua-duanya re-pointed.
- UserSession dari loser: sekarang `userId === winner.id`.

Cleanup: hapus fixture (lewat cascade dari delete user).

Negative tests:
- Password salah → `{ ok: false }`, kedua row tetap utuh.
- Loser tanpa telegramId → return error.
- Winner tanpa passwordHash → return error.

### 6.2 Manual checklist

- [ ] Mini-app, user telegram tanpa email → tampil menu "Buat Akun Web".
- [ ] Setup web → email tersimpan, login web pakai email tersebut → masuk akun yang sama.
- [ ] Web sign-up dengan telegram username `bob` → buka mini-app dengan akun Telegram `@bob` → banner muncul dengan email masked.
- [ ] Klik "Skip" → banner hilang, reload halaman → banner masih hilang (cookie 30 hari).
- [ ] Klik "Gabungkan" + password salah → error "Password salah."
- [ ] Klik "Gabungkan" + password benar → modal close, banner hilang, halaman refresh, tampilan profil sekarang `hasWebAccount === true`, ada VIP gabungan, ada history dari kedua akun.
- [ ] Login web pakai email akun web → masuk ke akun gabungan, history & VIP sama.
- [ ] DB: row loser hilang.
- [ ] Edge: dua-duanya VIP — `vipExpiresAt` ambil yang max.
- [ ] Edge: dua-duanya favorite seri X — tidak duplikat di DB.
- [ ] Edge: loser owner partner bot — winner sekarang admin partner bot dan bisa download sesuai aturan.

### 6.3 Rollout

1. Deploy ke staging → manual checklist lengkap.
2. Backup DB production sebelum deploy.
3. Deploy ke production.
4. Monitor `pm2 logs layardrama | grep user-merge` selama 24 jam pertama.
5. Tidak ada feature flag — fitur per-user, reversibel via support kalau ada user yang mau "un-merge" (manual SQL by ops).

### 6.4 Risiko & mitigasi

- **Bug repoint sebagian** → data hilang. Mitigasi: `prisma.$transaction`, integration test 6.1.
- **Tabel baru ditambah ke schema setelah merge dideploy, lupa update `mergeUsers`** → INSERT/UPDATE di tabel itu kemungkinan gagal saat merge. Mitigasi: komentar kode di `mergeUsers` (lihat 4.4) dan dokumentasikan di README atau AGENTS.md.
- **User claim telegram username orang lain** lalu orang asli buka mini-app dan mau merge → orang asli akan lihat banner ke akun orang yang nge-claim. Mitigasi: password gate. Orang asli tidak tahu password orang yang nge-claim, jadi merge gagal, dan orang asli bisa skip + lapor support.

---

## 7. Out of scope (untuk dipikirkan kemudian)

- Forgot password / reset password via OTP email.
- Verifikasi email saat setup akun web.
- Auth via Google/Apple/dll.
- UI di admin panel untuk un-merge (rollback merge by ops).
- Multi-device telegram (telegramId baru pada perangkat baru — tapi schema saat ini sudah aman karena telegramId per akun Telegram, bukan per device).
- Refactor `User.authProvider` jadi computed property atau dihapus sama sekali.

---

**Akhir desain.** Implementation plan akan ditulis terpisah lewat skill `writing-plans` setelah review.
