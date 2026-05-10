8ce22ddc30e132cf5cb011e0d61ae139

Integration flowchart

Untuk menghubungkan dengan API Duitku, ada beberapa hal yang perlu diketahui sebagai berikut:
Kode Merchant

Kode merchant adalah kode proyek yang didapatkan dari halaman merchant Duitku. Kode ini berguna sebagai pengenal proyek anda di setiap transaksinya nanti. Kode ini bisa anda dapatkan pada setiap proyek yang anda daftarkan di merchant portal. Langkah atau cara pembuatan proyek dapat anda lihat di sini.
API Key

API merupakan singkatan dari Application Programming Interface. API key disini adalah kode otentikasi untuk dapat mengakses API Duitku. API key digunakan untuk mencegah penyalahgunaan atau pengguna berbahaya. Seperti kode merchant, API key bisa anda dapatkan pada setiap proyek yang anda daftarkan di merchant portal bersamaan dengan kode merchant.
Postman Collection

Jika anda terbiasa dengan postman, kami juga menyediakan postman collection yang dapat membantu anda memahami bagaimana API Duitku berinteraksi.

Run in Postman
Library

Anda dapat mengintegrasikan menggunakan Library Duitku untuk memulai transaksi menggunakan Duitku pada web atau aplikasi anda. Library akan membantu anda pada saat integrasi dengan Duitku. Untuk mengenal lebih lanjut, anda dapat melihat Library Duitku pada package repository masing-masing library yang telah tersedia berikut ini:

Get Payment Method

Proses ini digunakan untuk mendapatkan metode pembayaran yang aktif dari proyek merchant (anda). API ini berisi nama metode pembayaran, biaya dan URL ke gambar metode pembayaran. Anda dapat menggunakan sebagai daftar channel pembayaran pada proyek anda dan anda akan mendapatkan paymentMethod yang berguna untuk diteruskan ke proses request transaksi. Proses ini opsional, anda dapat melewatinya menuju Permintaan Transaksi.
Request HTTP Get Payment Method

Method : HTTP POST

Type : application/json

Development : https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod

Production : https://passport.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod
Parameter Request Get Payment Method

<?php

    // Set kode merchant anda 
    $merchantCode = "DXXXX"; 
    // Set merchant key anda 
    $apiKey = "DXXXXCX80TZJ85Q70QCI";
    // catatan: environtment untuk sandbox dan passport berbeda 

    $datetime = date('Y-m-d H:i:s');  
    $paymentAmount = 10000;
    $signature = hash('sha256',$merchantCode . $paymentAmount . $datetime . $apiKey);

    $params = array(
        'merchantcode' => $merchantCode,
        'amount' => $paymentAmount,
        'datetime' => $datetime,
        'signature' => $signature
    );

    $params_string = json_encode($params);

    $url = 'https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod'; 

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $url); 
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");                                                                     
    curl_setopt($ch, CURLOPT_POSTFIELDS, $params_string);                                                                  
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);                                                                      
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(                                                                          
        'Content-Type: application/json',                                                                                
        'Content-Length: ' . strlen($params_string))                                                                       
    );   
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);

    //execute post
    $request = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if($httpCode == 200)
    {
        $results = json_decode($request, true);
        print_r($results, false);
    }
    else{
        $request = json_decode($request);
        $error_message = "Server Error " . $httpCode ." ". $request->Message;
        echo $error_message;
    }
?>

Nama 	Tipe 	Wajib 	Keterangan 	Contoh
merchantcode 	string(50) 	

✓

	Kode merchant dari duitku. 	DXXXX
amount 	integer 	

✓

	Nominal transaksi. Tidak ada kode desimal (.) dan tidak ada digit desimal. 	10000
datetime 	date 	

✓

	Format: (yyyy-MM-dd HH:mm:ss). 	2022-01-25 16:23:08
signature 	string(255) 	

✓

	Formula: Sha256(merchantcode + paymentAmount + datetime + apiKey). 	497fbf783f6d17d4b1e1ef468917bdc8
Parameter Respon Get Payment Method

Type : application/json

{
    "paymentFee": [        
        {
            "paymentMethod": "VA",
            "paymentName": "MAYBANK VA",
            "paymentImage": "https://images.duitku.com/hotlink-ok/VA.PNG",
            "totalFee": "0"
        },
        {
            "paymentMethod": "BT",
            "paymentName": "PERMATA VA",
            "paymentImage": "https://images.duitku.com/hotlink-ok/PERMATA.PNG",
            "totalFee": "0"
        },
    ],
    "responseCode": "00",
    "responseMessage": "SUCCESS"
}

Nama 	Tipe 	Keterangan
paymentFee 	paymentFee 	Berisikan daftar pembayaran.
responseCode 	string 	Kode respon.
responseMessage 	string 	Keterangan hasil dari respon.
Permintaan Transaksi

Berikut ini adalah langkah utama pada proses transaksi diawali dengan melakukan request transaksi ke sistem Duitku. Proses ini akan diperuntukan untuk membuat pembayaran (melalui nomor virtual account, QRIS, e-wallet, dsb). Anda dapat membuat suatu halaman pembayaran yang berguna mengarahkan pelanggan membayar tagihan transaksinya kepada anda. Silahkan untuk membuat request transaksi dengan membuat HTTP request seperti berikut. Jika anda melewati Get Payment Method, anda dapat mengisi paymentMethod dengan referensi Metode Pembayaran.
Request HTTP Transaksi

Method : HTTP POST

Type : application/json

Development : https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry

Production : https://passport.duitku.com/webapi/api/merchant/v2/inquiry
Parameter Request Transaksi

<?php
    $merchantCode = 'DXXXXX'; // dari duitku
    $apiKey = 'XXXXXXXXXX7968XXXXXXXXXFB05332AF'; // dari duitku
    $paymentAmount = 40000;
    $paymentMethod = 'VC'; // VC = Credit Card
    $merchantOrderId = time() . ''; // dari merchant, unik
    $productDetails = 'Tes pembayaran menggunakan Duitku';
    $email = 'test@test.com'; // email pelanggan anda
    $phoneNumber = '08123456789'; // nomor telepon pelanggan anda (opsional)
    $additionalParam = ''; // opsional
    $merchantUserInfo = ''; // opsional
    $customerVaName = 'John Doe'; // tampilan nama pada tampilan konfirmasi bank
    $callbackUrl = 'http://example.com/callback'; // url untuk callback
    $returnUrl = 'http://example.com/return'; // url untuk redirect
    $expiryPeriod = 10; // atur waktu kadaluarsa dalam hitungan menit
    $signature = md5($merchantCode . $merchantOrderId . $paymentAmount . $apiKey);

    // Detail Pelanggan
    $firstName = "John";
    $lastName = "Doe";

    // Detail Alamat
    $alamat = "Jl. Kembangan Raya";
    $city = "Jakarta";
    $postalCode = "11530";
    $countryCode = "ID";

    $address = array(
        'firstName' => $firstName,
        'lastName' => $lastName,
        'address' => $alamat,
        'city' => $city,
        'postalCode' => $postalCode,
        'phone' => $phoneNumber,
        'countryCode' => $countryCode
    );

    $customerDetail = array(
        'firstName' => $firstName,
        'lastName' => $lastName,
        'email' => $email,
        'phoneNumber' => $phoneNumber,
        'billingAddress' => $address,
        'shippingAddress' => $address
    );

    $item1 = array(
        'name' => 'Test Item 1',
        'price' => 10000,
        'quantity' => 1);

    $item2 = array(
        'name' => 'Test Item 2',
        'price' => 30000,
        'quantity' => 3);

    $itemDetails = array(
        $item1, $item2
    );

    /*Khusus untuk metode pembayaran OL dan SL
    $accountLink = array (
        'credentialCode' => '7cXXXXX-XXXX-XXXX-9XXX-944XXXXXXX8',
        'ovo' => array (
            'paymentDetails' => array ( 
                0 => array (
                    'paymentType' => 'CASH',
                    'amount' => 40000,
                ),
            ),
        ),
        'shopee' => array (
            'useCoin' => false,
            'promoId' => '',
        ),
    );*/

    /*Khusus untuk metode pembayaran Kartu Kredit
    $creditCardDetail = array (
        'acquirer' => '014',
        'binWhitelist' => array (
            '014',
            '400000'
        )
    );*/

    $params = array(
        'merchantCode' => $merchantCode,
        'paymentAmount' => $paymentAmount,
        'paymentMethod' => $paymentMethod,
        'merchantOrderId' => $merchantOrderId,
        'productDetails' => $productDetails,
        'additionalParam' => $additionalParam,
        'merchantUserInfo' => $merchantUserInfo,
        'customerVaName' => $customerVaName,
        'email' => $email,
        'phoneNumber' => $phoneNumber,
        //'accountLink' => $accountLink,
        //'creditCardDetail' => $creditCardDetail,
        'itemDetails' => $itemDetails,
        'customerDetail' => $customerDetail,
        'callbackUrl' => $callbackUrl,
        'returnUrl' => $returnUrl,
        'signature' => $signature,
        'expiryPeriod' => $expiryPeriod
    );

    $params_string = json_encode($params);
    //echo $params_string;
    $url = 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'; // Sandbox
    // $url = 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry'; // Production
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $url); 
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");                                                                     
    curl_setopt($ch, CURLOPT_POSTFIELDS, $params_string);                                                                  
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);                                                                      
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(                                                                          
        'Content-Type: application/json',                                                                                
        'Content-Length: ' . strlen($params_string))                                                                       
    );   
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);

    //execute post
    $request = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if($httpCode == 200)
    {
        $result = json_decode($request, true);
        //header('location: '. $result['paymentUrl']);
        echo "paymentUrl :". $result['paymentUrl'] . "<br />";
        echo "merchantCode :". $result['merchantCode'] . "<br />";
        echo "reference :". $result['reference'] . "<br />";
        echo "vaNumber :". $result['vaNumber'] . "<br />";
        echo "amount :". $result['amount'] . "<br />";
        echo "statusCode :". $result['statusCode'] . "<br />";
        echo "statusMessage :". $result['statusMessage'] . "<br />";
    }
    else
    {
        $request = json_decode($request);
        $error_message = "Server Error " . $httpCode ." ". $request->Message;
        echo $error_message;
    }
?>

Parameter 	Tipe 	Wajib 	Keterangan 	Contoh
merchantCode 	string(50) 	

✓

	Kode merchant, adalah kode proyek untuk bertransaksi. 	DXXXX
paymentAmount 	integer 	

✓

	Jumlah nominal transaksi. 	40000
merchantOrderId 	string(50) 	

✓

	Nomor transaksi dari merchant. 	abcde12345
productDetails 	string(255) 	

✓

	Keterangan produk/jasa yang diperjual belikan. 	Pembayaran untuk Toko Contoh
email 	string(255) 	

✓

	Alamat email pelanggan anda. 	pelanggan_anda@email.com
additionalParam 	string(255) 	

✗

	Parameter tambahan (opsional). 	
paymentMethod 	string(2) 	

✓

	Kode metode pembayaran yang digunakan. 	VC
merchantUserInfo 	string(255) 	

✗

	Username atau email pelanggan di situs merchant (opsional). 	
customerVaName 	string(20) 	

✓

	Nama yang akan muncul pada halaman konfirmasi pembayaran bank. 	John Doe
phoneNumber 	string(50) 	

✗

	Nomor telepon pelanggan (opsional). 	08123456789
itemDetails 	ItemDetails 	

✗

	Detail barang (opsional). 	
customerDetail 	CustomerDetail 	

✗

	Detail pelanggan. 	
returnUrl 	string(255) 	

✓

	Tautan untuk mengarahkan setelah transaksi selesai atau dibatalkan. 	http://www.contoh.com/return
callbackUrl 	string(255) 	

✓

	Tautan untuk callback transaksi. 	http://www.contoh.com/callback
signature 	string(255) 	

✓

	Kode identifikasi transaksi. Formula: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey). 	506XXXf1XXXdfb4aXXX1ffXXX9b8d1e6
expiryPeriod 	int 	

✗

	Masa berlaku transaksi sebelum kedaluwarsa. Berbentuk satuan angka dalam menit. Untuk detail expiryPeriod bisa dilihat disini. 	10
accountLink 	AccountLink 	

✗

	Detail parameter untuk metode pembayaran accountlink (opsional). 	
creditCardDetail 	creditCardDetail 	

✗
	Detail parameter untuk pembayaran kartu kredit (opsional). 	
Berikut ini yang dapat anda lakukan:

    productDetails dapat anda isikan dengan keterangan produk barang atau jasa yang anda sediakan. Anda juga dapat menyisipkan nama toko atau merek anda untuk lebih jelasnya. Lalu, pada itemDetails sebagai contohnya dapat anda isi variant dari produk atau detail model produk, dan hal lainnya yang mendetail tentang produk/jasa yang tercantum pada transaksi tersebut.
    Pastikan nominal paymentAmount setara dengan jumlah dari nominal itemDetails yang ada.
    merchantOrderId adalah ID transaksi yang terdapat di setiap request transaksi. Setiap request untuk transaksi baru harus menggunakan ID yang baru.
    Jika anda menggunakan additionalParam, mohon pastikan parameter yang anda kirim di dalamnya berbentuk URL encode.
    signature berisikan parameter-parameter transaksi yang di-hash menggunakan metode hashing MD5. Formula: MD5(merchantcode + orderId + amount + apiKey).

Fixed VA

Fixed Virtual Account adalah nomor virtual account yang dapat dikustomisasi oleh merchant sehingga menjadi statik atau sesuai dengan keinginan mereka. Merchant dapat menyesuaikan nomor ini setelah angka prefix VA yang diberikan oleh Duitku. Dengan syarat bahwa angka yang ditambahkan tidak melebihi panjang digit maksimal untuk nomor VA tersebut.

Untuk integrasi menggunakan Fixed Virtual Account anda dapat menggunakan API SNAP kami, untuk melihat dokumentasi nya klik disini.
OVO H2H
Untuk dokumentasi pembayaran via OVO tanpa redirect ke halaman pembayaran duitku, dapat dilihat di sini.
Parameter Respon Request Transaksi

Setelah request transaksi ke API Duitku. Server Duitku akan memberikan respon. Respon ini dapat anda jadikan sebagai data pembayaran untuk pelanggan anda.

{
  "merchantCode": "DXXXX",
  "reference": "DXXXXCX80TZJ85Q70QCI",
  "paymentUrl": "https://sandbox.duitku.com/topup/topupdirectv2.aspx?ref=BCA7WZ7EIDXXXXWEC",
  "vaNumber": "7007014001444348",
  "qrString": "00020101021226660014ID.DANA.WWW011893600911002151500102152006170915150010303UME51450015ID.OR.GPNQR.WWW02150000000000000000303UME520454995802ID5911Toko Jualan6013Jakarta Barat61051153062210117LQKI2LPMJQPKCIIS553033605405400006304502A",
  "AppUrl": "https://tokopedia.app.link/?$ios_deeplink_path=tokopedia%3A%2F%2Fdigital%2Fcart%3Fcategory_id%3dXXXX%26operator_id%3d33334%26product_id%3d77778%26client_number%3d1070026818117867&$android_deeplink_path=tokopedia%3A%2F%2Fdigital%2Fcart%3Fcategory_id%3dXXXX%26operator_id%3d33334%26product_id%3d77778%26client_number%3d1070026818117867&$desktop_url=https%3A%2F%2Fpulsa.tokopedia.com%3Faction%3dinit_data%26category_id%3dXXXX%26operator_id%3d33334%26product_id%3d77778%26client_number%3d1070026818117867",
  "amount": "40000",
  "statusCode": "00",
  "statusMessage": "SUCCESS"
}

Parameter 	Tipe 	Keterangan 	Contoh
merchantCode 	string(50) 	Kode merchant, kode proyek anda yang dikembalikan dari server Duitku. Menandakan proyek mana yang anda gunakan dalam transaksi. 	DXXXX
reference 	string(255) 	Referensi dari Duitku (perlu disimpan di sistem anda). 	DXXXXCX80TXXX5Q70QCI
paymentUrl 	string(255) 	Tautan halaman pembayaran jika ingin menggunakan halaman Duitku. 	https://sandbox.duitku.com/topup/topupdirectv2.aspx?ref=BCA7WZ7EIDXXX7WEC
vaNumber 	string(20) 	Nomor pembayaran atau virtual account. 	7007014001444348
amount 	integer 	Nominal pembayaran. 	40000
qrString 	string(255) 	QR string digunakan jika anda menggunakan pembayaran QRIS (anda perlu membuat kode QR dari string ini). 	
appUrl 	string 	Tautan halaman pembayaran untuk menuju aplikasi pembayaran e-commerce. 	
Parameter reference perlu anda simpan untuk membantu melakukan pengecekan transaksi di Duitku. Anda dapat mengarahkan pelanggan ke halaman pembayaran dengan menggunakan URL dari parameter paymentUrl. Jika anda memiliki tampilan pembayaran sendiri, anda dapat menggunakan parameter lainnya seperti berikut ini:

    vaNumber berisikan nomor virtual account bank untuk pembayaran pelanggan anda nanti. Anda dapat menampilkan VA tersebut untuk mengarahkan pelanggan membayar.
    Jika metode pembayaran menggunakan menggunakan QR, anda dapat menggunakan qrString dengan mengubah string tersebut menjadi gambar QR dan ditampilkan pada halaman pembayaran anda.
    appUrl dapat digunakan untuk mengarahkan pengguna langsung ke aplikasi e-commerce dari halaman pembayaran Anda.

Callback

<?php
$apiKey = 'XXXXXXXXXX7968XXXXXXXXXFB05332AF'; // API key anda
$merchantCode = isset($_POST['merchantCode']) ? $_POST['merchantCode'] : null; 
$amount = isset($_POST['amount']) ? $_POST['amount'] : null; 
$merchantOrderId = isset($_POST['merchantOrderId']) ? $_POST['merchantOrderId'] : null; 
$productDetail = isset($_POST['productDetail']) ? $_POST['productDetail'] : null; 
$additionalParam = isset($_POST['additionalParam']) ? $_POST['additionalParam'] : null; 
$paymentMethod = isset($_POST['paymentCode']) ? $_POST['paymentCode'] : null; 
$resultCode = isset($_POST['resultCode']) ? $_POST['resultCode'] : null; 
$merchantUserId = isset($_POST['merchantUserId']) ? $_POST['merchantUserId'] : null; 
$reference = isset($_POST['reference']) ? $_POST['reference'] : null; 
$signature = isset($_POST['signature']) ? $_POST['signature'] : null; 
$publisherOrderId = isset($_POST['publisherOrderId']) ? $_POST['publisherOrderId'] : null; 
$spUserHash = isset($_POST['spUserHash']) ? $_POST['spUserHash'] : null; 
$settlementDate = isset($_POST['settlementDate']) ? $_POST['settlementDate'] : null; 
$issuerCode = isset($_POST['issuerCode']) ? $_POST['issuerCode'] : null; 

//log callback untuk debug 
// file_put_contents('callback.txt', "* Callback *\r\n", FILE_APPEND | LOCK_EX);

if(!empty($merchantCode) && !empty($amount) && !empty($merchantOrderId) && !empty($signature))
{
    $params = $merchantCode . $amount . $merchantOrderId . $apiKey;
    $calcSignature = md5($params);

    if($signature == $calcSignature)
    {
        //Callback tervalidasi
        //Silahkan rubah status transaksi anda disini
        // file_put_contents('callback.txt', "* Success *\r\n\r\n", FILE_APPEND | LOCK_EX);

    }
    else
    {
        // file_put_contents('callback.txt', "* Bad Signature *\r\n\r\n", FILE_APPEND | LOCK_EX);
        throw new Exception('Bad Signature')
    }
}
else
{
    // file_put_contents('callback.txt', "* Bad Parameter *\r\n\r\n", FILE_APPEND | LOCK_EX);
    throw new Exception('Bad Parameter')
}
?>

Parameter callbackUrl yang berada di transaksi request akan digunakan oleh Duitku untuk konfirmasi pembayaran yang telah dilakukan oleh pelanggan anda. Pada saat pelanggan anda berhasil melakukan pembayaran, Duitku akan mengirimkan HTTP POST yang menyertakan hasil pembayaran suatu tagihan dari pelanggan. Anda perlu menyediakan halaman untuk menerima request callback tersebut. Agar dapat memproses hasil transaksi yang telah dilakukan oleh pelanggan.
Silahkan untuk menambahkan IP outgoing Duitku berikut untuk kebutuhan whitelist.

Production : 182.23.85.8, 182.23.85.9, 182.23.85.10, 182.23.85.13, 182.23.85.14, 103.177.101.184, 103.177.101.185, 103.177.101.186, 103.177.101.189, 103.177.101.190

Sandbox : 182.23.85.11, 182.23.85.12, 103.177.101.187, 103.177.101.188
Requirements:

    PORT: 80 atau 443
    URL: Harus dapat diakses secara publik
    POST Response: Mengembalikan HTTP 200 OK

Parameter Callback

Method : HTTP POST

Type : x-www-form-urlencoded
Parameter 	Keterangan 	Contoh
merchantCode 	Kode merchant, dikirimkan oleh server Duitku untuk memberitahu kode proyek yang digunakan. 	DXXXX
amount 	Jumlah nominal transaksi. 	150000
merchantOrderId 	Nomor transaksi dari merchant. 	abcde12345
productDetail 	Keterangan detail produk. 	Pembayaran untuk Toko Contoh
additionalParam 	Parameter tambahan yang anda kirimkan pada saat awal request transaksi. 	
paymentCode 	Metode Pembayaran. 	VC
resultCode 	Pemberitahuan callback hasil transaksi.
00 - Success
01 - Failed 	00
merchantUserId 	Username atau email pelanggan di situs anda. 	test@example.com
reference 	Nomor referensi transaksi dari Duitku. Mohon disimpan untuk keperluan pencatatan atau pelacakan transaksi. 	DXXXXCX80TXXX5Q70QCI
signature 	Kode identifikasi transaksi. Berisikan parameter-parameter transaksi yang di-hash menggunakan metode hashing MD5. Parameter keamanan sebagai acuan bahwa request yang diterima berasal dari server Duitku. Formula: MD5(merchantcode + amount + merchantOrderId + apiKey) 	506f88f1000dfb4a6541ff94d9b8d1e6
publisherOrderId 	Nomor unik pembayaran transaksi dari Duitku. Mohon disimpan untuk keperluan pencatatan atau pelacakan transaksi. 	MGUHWKJX3M1KMSQN5
spUserHash 	Di kirim melalui callback jika pembayaran menggunakan metode pembayaran ShopeePay(QRIS, App, dan Account Link). Jika berisi string dengan kombinasi angka dan huruf, maka menandakan pembayaran menggunakan Shopee itu sendiri. 	xxxyyyzzz
settlementDate 	Informasi waktu estimasi penyelesaian.
Format: YYYY-MM-DD 	2023-07-25
issuerCode 	Informasi kode issuer dari QRIS.
lihat daftar issuer disini. 	93600523
Untuk cek callback anda, dapat menggunakan contoh kode shell untuk melakukan request nya. Sementara itu, jika anda ingin mencoba menerima callback dari server kami, anda mungkin memerlukan URL publik yang dapat diakses melalui internet. Server kami akan mengirim ulang callback jika server belum menangkap HTTP 200. Ketika callback telah dikirim pada upaya maksimum(5 kali), server kami akan mengirimkan pemberitahuan callback gagal melalui email Anda. Anda dapat mengirimkan ulang callback melalui fitur resend yang ada di menu report dashboard duitku.
Redirect

Pada saat mengirimkan transaksi request bersamaan dengan parameter callbackUrl, anda juga mengirimkan parameter returnUrl. Berbeda dengan callback yang berguna untuk menerima status pembayaran yang dilakukan pelanggan. Redirect berguna pada saat setelah anda mengarahkan pelanggan ke paymentUrl pelanggan akan diarahkan kembali ke situs atau halaman toko anda. Setelah transaksi berhasil atau dibatalkan, Duitku akan mengarahkan pelanggan kembali ke situs anda menggunakan URL beserta parameter berikut.

Contoh

GET: http://www.merchantweb.com/redirect.php?merchantOrderId=abcde12345&resultCode=00&reference=DXXXXCX80TXXX5Q70QCI

Parameters
Parameter 	Keterangan 	Contoh
merchantOrderId 	Nomor transaksi dari merchant. 	abcde12345
reference 	Nomor referensi transaksi dari Duitku. 	DXXXXCX80TXXX5Q70QCI
resultCode 	Kode hasil dari transaksi.
00 - Success
01 - Pending
02 - Canceled 	00
Jangan menggunakan resultCode untuk mengupdate status pembayaran di aplikasi atau website anda. Anda dapat menggunakan parameter sebagai dasar informasi pembayaran. Mohon untuk diperhatikan URL dapat diubah secara manual oleh pelanggan.
Cek Transaksi

Setelah request transaksi, anda dapat melakukan langkah untuk melihat status pembayaran pada order ID tertentu. Anda juga dapat menampilkan pada pelanggan anda status tersebut. Ataupun, anda juga dapat menggunakannya sebagai API untuk verfikasi transaksi. Untuk menjamin bahwa informasi transaksi benar telah berubah. Anda dapat menyisipkan cek transaksi pada saat menerima callback agar pembayaran lebih terjamin statusnya.
Request HTTP Cek Transaksi

Method : HTTP POST

Type : x-www-form-urlencoded

Development : https://sandbox.duitku.com/webapi/api/merchant/transactionStatus

Production : https://passport.duitku.com/webapi/api/merchant/transactionStatus
Parameter Request Cek Transaksi

<?php
    $merchantCode = 'DXXXX'; // dari duitku
    $apiKey = 'XXXXXXXXXX7968XXXXXXXXXFB05332AF'; // dari duitku
    $merchantOrderId = 'abcde12345'; // dari anda (merchant), bersifat unik

    $signature = md5($merchantCode . $merchantOrderId . $apiKey);

    $params = array(
        'merchantCode' => $merchantCode,
        'merchantOrderId' => $merchantOrderId,
        'signature' => $signature
    );

    $params_string = json_encode($params);
    $url = 'https://sandbox.duitku.com/webapi/api/merchant/transactionStatus';
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $url); 
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");                                                                     
    curl_setopt($ch, CURLOPT_POSTFIELDS, $params_string);                                                                  
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);                                                                      
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(                                                                          
        'Content-Type: application/json',                                                                                
        'Content-Length: ' . strlen($params_string))                                                                       
    );   
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);

    //execute post
    $request = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if($httpCode == 200)
    {
        $results = json_decode($request, true);
        print_r($results, false);
        // echo "merchantOrderId :". $results['merchantOrderId'] . "<br />";
        // echo "reference :". $results['reference'] . "<br />";
        // echo "amount :". $results['amount'] . "<br />";
        // echo "fee :". $results['fee'] . "<br />";
        // echo "statusCode :". $results['statusCode'] . "<br />";
        // echo "statusMessage :". $results['statusMessage'] . "<br />";
    }
    else
    {
        $request = json_decode($request);
        $error_message = "Server Error " . $httpCode ." ". $request->Message;
        echo $error_message;
    }
?>

Parameter 	Keterangan 	Contoh
merchantCode 	Kode merchant, didapatkan dari halaman merchant Duitku. 	DXXXX
merchantOrderId 	Nomor transaksi dari merchant. 	abcde12345
signature 	Kode identifikasi transaksi. Berisikan parameter-parameter transaksi yang di-hash menggunakan metode hashing MD5. Formula : md5(merchantCode + merchantOrderId + apiKey). 	497fbf783f6d17d4b1e1ef468917bdc8
Parameter Respon Cek Transaksi

{
  "merchantOrderId": "abcde12345",
  "reference": "DXXXXCX80TZJ85Q70QCI",
  "amount": "100000",
  "fee":"0.00",
  "statusCode": "00",
  "statusMessage": "SUCCESS"
}

Parameter 	Keterangan
merchantOrderId 	Order ID dari merchant.
reference 	Reference yaitu referensi transaksi dari Duitku.
amount 	Nominal transaksi.
fee 	Biaya transaksi.
statusCode 	Kode status transaksi.
00 - Success
01 - Pending
02 - Canceled
statusMessage 	Pesan Pembayaran
Uji Coba

Berikut adalah daftar kredensial transaksi dummy yang dapat digunakan untuk melakukan transaksi di sandbox.
Kartu Kredit
3D Secure Transaction
Tipe Kartu 	Nomor Kartu Kredit 	Masa Berlaku 	CVV
VISA 	4000 0000 0000 0044 	03/33 	123
MASTERCARD 	5500 0000 0000 0004 	03/33 	123
Virtual Akun

Demo transaction virtual account sandbox klik-disini.
E-Money
Shopee

Untuk pengetesan transaksi shopee dapat mengunduh shopeeapp staging apk disini.
QRIS
Shopeepay

Untuk pengetesan transaksi Shopee QRIS gunakan Shopeeapp seperti shopee e-money.
Gudang Voucher

Untuk pengetesan transaksi Gudang Voucher dapat menggunakan demo sukses virtual account.
Nusapay
Nomor Telepon 	PIN 	OTP
08188886666 	123789 	123456

Untuk pengetesan transaksi Nusapay QRIS dapat mengunduh Nusapay staging apk disini.
Paylater
Indodana
Nomor Telepon 	PIN 	OTP
081282325566 	000000 	
0838499610 	123654 	999999
085780110019 	123654 	999999
Atome

Transaksi Berhasil
Country Code 	Nomor Telepon 	OTP
ID 	+62811000122 	7524

Transaksi Gagal
Country Code 	Nomor Telepon 	OTP
ID 	+62810000001500 	1111
E-Banking
Jenius Pay
E-mail 	Password 	CashTag 	OTP
testjenpay4@yopmail.com 	P@ssw0rd123 	$testjenpay4 	6 digit angka acak

Untuk pengetesan transaksi Jenius Pay, hanya ada dalam website Jenius yang dapat diakses di sini
E-Commerce
Tokopedia

Untuk uji coba tokopedia bisa menggunakan virtual account demo success.
Khusus untuk uji coba yang tidak tercantum di atas silahkan hubungi kami terlebih dahulu di support@duitku.com.
JSON Object

Daftar objek JSON yang dimiliki Duitku.
Item Details

"itemDetails": [{
    "price": 50000,
    "quantity": 2,
    "name": "Apel",
  }]

Parameter 	Tipe 	Wajib 	Keterangan 	Contoh
name 	string(255) 	

✓

	Nama barang yang dibeli. 	Apel
quantity 	integer 	

✓

	Jumlah barang dibeli. 	10
price 	integer 	

✓

	Harga barang. Catatan: Jangan tambahkan desimal. 	50000
Total dari semua price detail barang harus sama persis dengan paymentAmount.
Customer Detail

"customerDetail": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "pelanggan_anda@email.com",
    "phoneNumber": "08123456789",
    "billingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "address": "Jl. Kembangan Raya",
      "city": "Jakarta",
      "postalCode": "11530",
      "phone": "08123456789",
      "countryCode": "ID"
    },
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "address": "Jl. Kembangan Raya",
      "city": "Jakarta",
      "postalCode": "11530",
      "phone": "08123456789",
      "countryCode": "ID"
    }
}

Parameter 	Tipe 	Wajib 	Keterangan 	Contoh
firstName 	string(255) 	

✗

	Nama pertama pelanggan. 	John
lastName 	string(255) 	

✗

	Nama belakang pelanggan. 	Doe
email 	string(255) 	

✗

	Email pelanggan. 	pelanggan_anda@email.com
phoneNumber 	string(255) 	

✗

	Nomor telepon pelanggan. 	08123456789
billingAddress 	Address 	

✗

	Alamat tagihan pelanggan. 	
shippingAddress 	Address 	

✗

	Alamat pengiriman pelanggan. 	
Address

{
  "firstName": "John",
  "lastName": "Doe",
  "address": "Jl. Kembangan Raya",
  "city": "Jakarta",
  "postalCode": "11530",
  "phone": "08123456789",
  "countryCode": "ID"
}

Parameter 	Tipe 	Wajib 	Keterangan 	Contoh
firstName 	string(255) 	

✗

	Nama pertama pelanggan. 	John
lastName 	string(255) 	

✗

	Nama belakang pelanggan. 	Doe
address 	string(255) 	

✗

	Alamat tagihan atau pengiriman pelanggan. 	Jl. Kembangan Raya
city 	string(255) 	

✗

	Keterangan alamat kota. 	Jakarta
postalCode 	string(255) 	

✗

	Kode Pos alamat. 	11530
phone 	string(255) 	

✗

	Nomor Telepon Tagihan atau Pengiriman Pelanggan. 	08123456789
countryCode 	string(255) 	

✗

	ISO 3166-1 alpha-3. 	ID
Account Link

Parameter khusus untuk metode pembayaran yang menggunakan OVO Account Link dan Shopee Account Link.

"accountLink": {
    "credentialCode": "A0F22572-4AF1-E111-812C-B01224449936",
    "ovo": {
        "paymentDetails": [{
            "paymentType": "CASH",
            "amount": "10000"
        }]
    },
    "shopee": {
        "useCoin": false,
        "promoId": ""
    }
},

Parameter 	Tipe 	Wajib 	Keterangan 	Contoh
credentialCode 	string(50) 	

✓

	Kode kredensial dari Duitku. 	B3A72721-7FFB-EC11-812D-B4617B397E08
ovo 	OVO 	

✓

	Wajib untuk pembayaran melalui OVO. 	
shopee 	Shopee 	

✓

	Wajib untuk pembayaran melalui Shopee. 	
Untuk dokumentasi Account Link dapat diunduh disini.
Ovo Detail

"ovo": {
    "paymentDetails": [
        {
            "paymentType": "CASH",
            "amount": "10000"
        }
    ]
}

Parameter 	Tipe 	Wajib 	Keterangan 	Contoh
paymentDetails 	array object 	

✓

	Parameter untuk request pembayaran OVO. 	
paymentType 	string(10) 	

✓

	Tipe pembayaran yang dilakukan. 	CASH
amount 	int 	

✓

	Jumlah nominal transaksi. 	10000
Untuk panduan tambahan OVO Account Link dapat diunduh di sini.
Shopee Detail

"shopee": {
  "promo_ids": "",
  "useCoin": false,
}

Parameter 	Tipe 	Wajib 	Keterangan 	Contoh
promo_ids 	string(50) 	

✓

	Kode voucher. 	campaign111
useCoin 	boolean 	

✓

	Jika pembayaran ingin menggunakan koin shopee dari akun shopee yang terhubung (Khusus payment method SL). 	false
Payment Fee

{
  "paymentMethod": "VA",
  "paymentName": "MAYBANK VA",
  "paymentImage": "https://images.duitku.com/hotlink-ok/VA.PNG",
  "totalFee": "0"
}

Parameter 	Tipe 	Keterangan
paymentMethod 	String(2) 	Kode metode pembayaran.
paymentName 	String(255) 	Nama metode pembayaran.
paymentImage 	String(255) 	URL gambar metode pembayaran.
totalFee 	String(255) 	Biaya transaksi.
Jika pengaturan dalam merchant portal biaya dibebankan pada merchant. Maka, biaya akan tampil 0. Nominal biaya akan muncul jika dibebankan kepada pelanggan.
Credit Card Detail

Berikut ini adalah parameter tambahan untuk request transaksi menggunakan channel kartu kredit bersifat opsional.

"creditCardDetail": {
  "acquirer":"014",
  "binWhitelist":["014","022", "400000"]
}

Parameter 	Tipe 	Wajib 	Keterangan 	Contoh
acquirer 	string(3) 	

✗
	Anda dapat menentukan acquirer bank yang akan digunakan pada transaksi yang akan dilakukan.
• 014 untuk BCA.
• 022 untuk CIMB. 	014
binWhitelist 	array string(6) 	

✗
	Parameter untuk membatasi kartu kredit yang diizinkan pada transaksi. Menggunakan kode bank(3 digit) atau nomor bin kartu kredit(6 digit). Maksimal 25 list bin. 	014, 022, 400000
Metode Pembayaran
Jenis Pembayaran 	Kode Pembayaran 	Keterangan
Credit Card 	

VC
	(Visa / Master Card / JCB)
Virtual Account 	

BC
	BCA Virtual Account
	

M2
	Mandiri Virtual Account
	

VA
	Maybank Virtual Account
	

I1
	BNI Virtual Account
	

B1
	CIMB Niaga Virtual Account
	

BT
	Permata Bank Virtual Account
	

A1
	ATM Bersama
	

AG
	Bank Artha Graha
	

NC
	Bank Neo Commerce/BNC
	

BR
	BRIVA
	

S1
	Bank Sahabat Sampoerna
	

DM
	Danamon Virtual Account
	

BV
	BSI Virtual Account
Ritel 	

FT
	Pegadaian/ALFA/Pos
	

IR
	Indomaret
E-Wallet 	

OV
	OVO (Support Void)
	

SA
	Shopee Pay Apps (Support Void)
	

LF
	LinkAja Apps (Fixed Fee)
	

LA
	LinkAja Apps (Percentage Fee)
	

DA
	DANA
	

SL
	Shopee Pay Account Link
	

OL
	OVO Account Link
QRIS 	

SP
	Shopee Pay
	

NQ
	Nobu
	

GQ
	Gudang Voucher
	

SQ
	Nusapay
Kredit* 	

DN
	Indodana Paylater
	

AT
	ATOME
E-Banking 	

JP
	Jenius Pay
E-Commerce 	

T1
	Tokopedia Card Payment
	

T2
	Tokopedia E-Wallet
	

T3
	Tokopedia Others
Requirements

    Untuk metode pembayaran kredit parameter customerDetail dan itemDetails menjadi wajib.
    Untuk metode pembayaran E-Commerce, parameter customerVaName menjadi wajib.

Expiry Period

Daftar value dari parameter expiryPeriod jika Default atau NULL. Berbentuk satuan angka dalam menit.
Jenis Pembayaran 	Default Expiry Period 	Maksimal Expiry Period
Credit Card 	30 menit* 	
Virtual Account 	1440 menit 	>1440 minutes
Retail 	1440 menit 	>1440 minutes
OVO 	10 menit** 	1440 minutes
Shopee Pay Apps 	10 menit 	60 minutes
LinkAja Apps 	24 menit* 	1440 minutes
DANA 	1440 menit 	1440 minutes
Shopee Pay Account Link 	30 menit* 	
OVO Account Link 	15 menit* 	
QRIS Payment 	10 menit 	60 minutes
NOBU QRIS Payment 	24 menit 	1440 minutes
Indodana Paylater 	1440 menit 	1440 minutes
ATOME 	720 menit 	720 minutes
Jenius Pay 	10 menit 	10 minutes
Tokopedia 	1440 minutes 	1440 minutes
Catatan:
Nilai dari expiryPeriod yang digunakan menyesuaikan dengan nilai yang di request oleh merchant.

*Nilai dari expiryPeriod yang digunakan akan selalu mengikuti nilai default dan menghiraukan nilai yang di request oleh merchant.

**Nilai dari expiryPeriod yang digunakan untuk pembayaran melalui channel OVO pada halaman checkout duitku sebelum klik tombol paynow.

Daftar Issuer (QRIS)
Kode 	Issuer
93600999 	AHDI
93600947 	Aladin Syariah
93600567 	Allo Bank Indonesia
93600531 	Amar
93600822 	Astrapay
93600116 	Bank Aceh Syariah
93600037 	Bank Artha Graha Internasional
93600133 	Bank BPD Bengkulu
93600124 	Bank BPD Kalimantan Timur dan Kalimantan Utara
93600161 	Bank Ganesha
93600513 	Bank Ina Perdana
93600113 	Bank Jateng
93600123 	Bank Kalbar
93600122 	Bank Kalsel
93600441 	Bank KB Bukopin
93600121 	Bank Lampung
93600157 	Bank Maspion
93600553 	Bank Mayora
93600548 	Bank Multiarta Sentosa
93600490 	Bank Neo Commerce
93600128 	Bank NTB Syariah
93600019 	Bank Panin
93600132 	Bank Papua
93600115 	Bank Pembangunan Daerah Jambi
93600494 	Bank Raya
93600119 	Bank Riau Kepri
93600523 	Bank Sahabat Sampoerna
93600152 	Bank Shinhan
93600126 	Bank Sulsel
93600120 	Bank Sumselbabel
93600023 	Bank UOB Indonesia
93600808 	Bayarind
93600014 	BCA
93600536 	BCA Syariah
93600501 	BCAD
93600815 	Bimasakti Multi Sinergi
93600110 	BJB
93600425 	BJB Syariah
93600919 	BluePay
93600009 	BNI
93600129 	BPD Bali
93600112 	BPD DIY
93600130 	BPD NTT
93600114 	BPD-JATIM
93600002 	BRI
93600422 	BRIS Pay
93600200 	BTN
93600076 	Bumi Arta
93600031 	Citibank
93600950 	Commonwealth
93600915 	Dana
93600011 	Danamon
93600046 	DBS MAX QRIS
93600111 	DKI
93600899 	Doku
93600998 	DSP
93600827 	Fello
93600777 	Finpay
93600813 	GAJA
93600914 	Go-Pay
93600916 	Gudang Voucher
93600484 	Hana bank
93600789 	IMkas
93600920 	Isaku
93600542 	JAGO
93600213 	Jenius
93600812 	Kaspro
93600911 	LinkAja
93600008 	Mandiri Pay
93600016 	Maybank
93600426 	Mega
93600821 	Midazpay
93600485 	Motion Banking
93600147 	Muamalat
93600118 	Nagari
93600814 	Netzme
93600022 	Niaga
93600503 	Nobu
93600028 	OCBC
93600811 	OTTOCASH
93600912 	OVO
93600820 	PAC Cash
93600818 	Paydia
93600917 	Paytrend
93600013 	Permata
93608161 	POS Indonesia
93600167 	QNB Indonesia
93600921 	Saldomu
93600535 	Seabank
93600918 	ShopeePay
93600153 	Sinarmas
93600816 	SPIN
93600451 	Syariah Indonesia
93600898 	T-Money
93600828 	TrueMoney
93600835 	Virgo
93600830 	YODU
93600817 	Yukk
93600825 	Zipay
HTTP Code
Kode 	Pesan 	Keterangan
200 	SUCCESS 	Proses anda berhasil.
400 	Minimum Payment 10000 IDR 	Pembayaran anda kurang dari ketentuan.
	Maximum Payment exceeded 	Pembayaran anda melebihi ketentuan.
	paymentMethod is mandatory 	Cek parameter paymentMethod anda.
	merchantOrderId is mandatory 	Cek parameter merchantOrderId anda.
	length of merchantOrderId can't > 50 	Parameter merchantOrderId anda melebihi batas ketentuan.
	Invalid Email Address 	Cek parameter email anda.
	length of email can't > 50 	Cek parameter email anda.
	length of phoneNumber can't > 50 	Cek parameter phoneNumber anda.
	Customer VA Name must not be empty for this payment channel 	Cek parameter customerVaName anda.
401 	Wrong signature 	Cek parameter signature anda dan parameter lain yang berkaitan.
404 	Merchant not found 	Cek parameter Merchant Code anda.
	Payment channel not available 	Metode pembayaran yang anda gunakan belum aktif. Hubungi live chat atau melalui support@duitku.com.
409 	Payment amount must be equal to all item price 	Terdapat selisih pada paymentAmount dan total price dalam itemDetails.
Changelog
Version 2.0

Feb 2026

    Penambahan Payment channel Tokopedia Card Payment.
    Penambahan Payment channel Tokopedia E-Wallet.
    Penambahan Payment channel Tokopedia Others.
    Penambahan testing untuk E-Commerce.
    Penambahan parameter appUrl pada respon transaksi.
    Penambahan respon error untuk parameter customerVaName.

Dec 2025

    Penambahan requirement untuk callback.
    Penghapusan parameter isSubscription pada inquiry request.
    Penghapusan parameter object subscriptionDetail pada inquiry request.
    Penghapusan parameter subscriptionDetail di JSON Object.

Aug 2025

    Pengurangan payment channel QRIS Dana
    Fix Jenius staging demo payment URL

Jan 2025

    Pengurangan payment channel QRIS Link Aja

Sep 2024

    Penambahan parameter isSubscription pada inquiry request.
    Penambahan parameter object subscriptionDetail pada inquiry request.
    Penambahan parameter subscriptionDetail di JSON Object.

Jul 2024

    Penambahan BSI Virtual Account

Jun 2024

    Penambahan kembali Sahabat Sampoerna Virtual Account
    Penambahan Danamon Virtual Account
    Penambahan Nusapay QRIS

Mar 2024

    Penambahan E-Wallet Jenius Pay

Nov 2023

    Penambahan QRIS via Gudang Voucher Payment Method.

Okt 2023

    Penambahan QRIS via Dana Payment Method.

Agt 2023

    Penambahan parameter issuerCode dan settlementDate pada callback.

Jan 2023

    Penambahan parameter publisherOrderId pada callback.

Okt 2022

    Penambahan tabel detail informasi expiryPeriod.
    Penambahan menu redirect untuk ke dokumentasi OVO H2H.

Aug 2022

    Penambahan Ovo linked account Payment Method.
    Penambahan accountLink di JSON Object.

April 2022

    Penambahan ShopeePay linked account Payment Method.
    Perbaikan informasi dokumentasi untuk status code dan result code.

Maret 2022

    Penambahan Bank Neo Commerce Payment Method.
    Penambahan BRIVA Payment Method.
    Penambahan QRIS by Nobu Payment Method.

September 2021

    Penambahan Pos Indonesia Payment Method.

Agustus 2021

    Penambahan Indomaret Payment Method.

Juni 2021

    Penambahan getPaymentMethod pada Dokumentasi.
    Penambahan Script Shell pada Dokumentasi.

Februari 2021

    Penambahan parameter object shopee pada inquiry request.
    Penambahan parameter spUserHash di Callback.
    Penambahan Shopee di JSON Object.

Januari 2020

    Penambahan parameter customerDetail pada inquiry request.
    Penambahan parameter customerDetail di JSON Object.
    Penambahan Address di JSON Object.

Januari 2019

    Penambahan parameter customerVaName dan expiryPeriod pada inquiry request.
    Penambahan response parameter vaNumber, amount, statusCode dan statusMessage pada inquiry response.

Version 1.0

    Dokumentasi API dibuat.

php
shell
