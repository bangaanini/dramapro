-- Manual migration untuk menambahkan field notifikasi admin
-- Jalankan dengan: psql -U postgres -d layar_drama -f migration-admin-notification.sql

-- 1. Tambah field telegramId ke AdminUser
ALTER TABLE "AdminUser"
ADD COLUMN IF NOT EXISTS "telegramId" TEXT;

-- 2. Tambah field adminNotificationSentAt dan adminNotificationError ke VipPayment
ALTER TABLE "VipPayment"
ADD COLUMN IF NOT EXISTS "adminNotificationSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "adminNotificationError" TEXT DEFAULT '';

-- Selesai
SELECT 'Migration completed successfully!' as status;
