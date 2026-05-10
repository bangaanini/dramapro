
API Key Anda
sk_live_rxxxxxxxxxxxxxxxx


POST
Create Transaction
Endpoint:
https://paymenku.com/api/v1/transaction/create

Headers:
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
Request Body Parameters:
Parameter 	Type 	Required 	Description
reference_id	string	✓	ID unik dari sistem Anda
amount	number	✓	Jumlah pembayaran (min: 1000)
customer_name	string	✓	Nama customer
customer_email	email	✓	Email customer
customer_phone	string	-	No. HP customer (wajib utk OVO)
channel_code	string	✓	Kode payment channel
return_url	url	✓	URL redirect stlh pembayaran


GET
Get Payment Channels
Endpoint:
https://paymenku.com/api/v1/payment-channels
Headers:

Authorization: Bearer YOUR_API_KEY

cURL:

curl -X GET https://paymenku.com/api/v1/payment-channels \
  -H "Authorization: Bearer YOUR_API_KEY"

GET
Check Transaction Status
Endpoint:
https://paymenku.com/api/v1/check-status/{order_id}
Headers:

Authorization: Bearer YOUR_API_KEY

Path Parameters:
Parameter 	Type 	Description
order_id 	string 	Transaction ID (IDP...) atau Reference ID dari sistem Anda
cURL:

curl -X GET https://paymenku.com/api/v1/check-status/IDP202602271039768990 \
  -H "Authorization: Bearer YOUR_API_KEY"

Payment Channels Tersedia
Code 	Nama 	Type 	Fee
bri_va 	BRI Virtual Account 	va 	Rp 4.440 + 0.20%
bni_va 	BNI Virtual Account 	va 	Rp 4.440 + 0.20%
cimb_va 	CIMB Virtual Account 	va 	Rp 4.440 + 0.20%
qris 	QRIS 	qris 	Rp 200 + 0.70%
danamon_va 	Danamon Virtual Account 	va 	Rp 4.440 + 0.70%
dana 	DANA 	ewallet 	Rp 200 + 3.00%
bsi_va 	BSI Virtual Account 	va 	Rp 4.440 + 0.20%
mandiri_va 	Mandiri Virtual Account 	va 	Rp 4.440 + 0.20%
linkaja 	LinkAja 	ewallet 	Rp 200 + 3.00%
bjb_va 	BJB Virtual Account 	va 	Rp 4.440 + 0.20%
permata_va 	Permata Virtual Account 	va 	Rp 4.440 + 0.20%
WEBHOOK
Webhook Notification

Kami akan mengirim notifikasi ke Callback URL Anda saat status transaksi berubah.
Callback URL Anda:
https://restonew-mu.vercel.app/api/payment/webhook
Webhook Payload (POST request content):

{
  "event": "payment.status_updated",
  "trx_id": "IDP202602271039768990",
  "reference_id": "INV-001",
  "status": "paid",
  "amount": "100000.00",
  "total_fee": "4000.00",
  "amount_received": "96000.00",
  "payment_channel": "bca_va",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "paid_at": "2026-01-18T03:33:18.000000Z",
  "created_at": "2026-01-18T03:31:30.000000Z"
}

Status Values:
pending paid expired cancelled
Verifikasi Webhook Signature (HMAC)

Setiap webhook dikirim dengan header berikut untuk memverifikasi keaslian:
X-PaymenKu-Signature
— HMAC-SHA256 signature
X-PaymenKu-Timestamp
— Unix timestamp saat webhook dikirim
Cara Verifikasi (PHP):

// 1. Ambil header dari request
$signature = $_SERVER['HTTP_X_PAYMENKU_SIGNATURE'];
$timestamp = $_SERVER['HTTP_X_PAYMENKU_TIMESTAMP'];

// 2. Buat string yang akan di-hash
$payload = file_get_contents('php://input');
$signaturePayload = $timestamp . '.' . $payload;

// 3. Hitung expected signature
$webhookSecret = 'whsec_d0327e95877d8e481478cc22d937040121855cfbb1f4d3e5';
$expected = hash_hmac('sha256', $signaturePayload, $webhookSecret);

// 4. Bandingkan
if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    die('Invalid signature');
}

Auto-retry: Jika webhook gagal (non-2xx / timeout), kami akan otomatis retry hingga 3x dengan delay 5 detik, 30 detik, dan 5 menit.
Contoh cURL & Response
Create QRIS Transaction

curl -X POST https://paymenku.com/api/v1/transaction/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_id": "INV-001",
    "amount": 100000,
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "channel_code": "qris",
    "return_url": "https://yoursite.com/payment-done"
  }'

Response:

{
  "status": "success",
  "data": {
    "trx_id": "IDP202602271042567890",
    "reference_id": "INV-001",
    "amount": "100700.00",
    "status": "pending",
    "pay_url": "https://paymenku.com/pay/IDP202602271042567890",
    "payment_info": {
      "transaction_id": "qr_d08cf7c2-5878-xxxx",
      "transaction_status": "pending",
      "qr_url": "https://paymenku.com/api/qris/IDP202602271042567890",
      "qr_string": "00020101021226680016COM.NOBUBANK...",
      "expiration_date": "2026-01-19T03:42:39Z"
    }
  }
}

