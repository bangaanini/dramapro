Velolo API Documentation
Integrate Velolo content into your application with our free API. Access content catalog, search, and streaming functionality.

Base API URL
https://streamapi.web.id/p/velolo

API Token Anda (Bisa Diketik/Ganti)
••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••


Available Endpoints (7)
GET
/languages
List bahasa tersedia


GET
/hot
Drama trending/hot chart
Parameters
page
1
limit
10
lang
id


GET
/new
New releases
Parameters
page
1
limit
10
lang
id


GET
/labels
List kategori (untuk labelId di /dramas)
Parameters
lang
id


GET
/dramas
Browse/search drama
Parameters
q
cinta
labelId
page
1
limit
10
lang
id


GET
/detail/:id
Drama detail + semua episode URLs
Parameters
id*
1959825426474463232
lang
id


GET
/stream
Extract .ts segments dari m3u8
Parameters
url*
https://velolo-bunny.b-cdn.net/hls/xxx/01.m3u8
