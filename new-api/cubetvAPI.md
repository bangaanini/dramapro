Cubetv API Documentation

Integrate Cubetv content into your application with our free API. Access content catalog, search, and streaming functionality.
Base API URL
https://streamapi.web.id/p/cubetv
API Token Anda (Bisa Diketik/Ganti)

Available Endpoints

GET
/shows
Katalog lengkap drama
Parameters
page
lang

GET
/nav/Jvgr0G
Beranda / Rekomendasi
Parameters
lang

GET
/nav/9vb8aR
Baru & Trending
Parameters
lang

GET
/nav/m0Wk0w
Kategori Emosi/Romance
Parameters
lang

GET
/nav/GZVRZj
Kategori Shows
Parameters
lang

GET
/search
Browse drama
Parameters
page
pageSize
lang

GET
/search/:videoid/episodes
Detail drama
Parameters
videoid*
lang

GET
/episode/:videoid/list
Daftar semua episode
Parameters
videoid*

GET
/stream/:videoid/:episodeid
URL Video M3U8 + subtitle
Parameters
videoid*
episodeid*
