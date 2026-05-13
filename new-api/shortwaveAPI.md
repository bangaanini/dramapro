Shortwave API Documentation
Integrate Shortwave content into your application with our free API. Access content catalog, search, and streaming functionality.

Base API URL
https://streamapi.web.id/p/shortwave

API Token Anda (Bisa Diketik/Ganti)
••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••


Available Endpoints (8)

GET
/api/set-lang/:lang
Set bahasa. Judul, tags, konten berubah sesuai bahasa
Parameters
lang*
in

GET
/api/top
Drama trending

GET
/api/all
Semua drama

GET
/api/more
Drama dengan pagination
Parameters
page
1
page_size
20

GET
/api/rankings
Ranking drama

GET
/api/search/:query
Cari drama
Parameters
query*
cinta

GET
/api/drama/:dramaId
Detail drama + semua episode + cover per episode
Parameters
dramaId*
694a475a5f4a5417dbedc27c

GET
/api/stream/:dramaId/:chapterId
Stream URL (M3U8) + subtitle (WebVTT). Auto unlock jika locked
Parameters
dramaId*
694a475a5f4a5417dbedc27c
chapterId*
694a475b5f4a5417dbedc27d
