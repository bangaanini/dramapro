d
Shortbox API Documentation

Integrate Shortbox content into your application with our free API. Access content catalog, search, and streaming functionality.
Base API URL
https://streamapi.web.id/p/shortbox
API Token Anda (Bisa Diketik/Ganti)
Available Endpoints

GET
/api/categories
Category list (21 categories)
Parameters
lang

GET
/api/list
Drama list (paginated, use sort_type for sorting)
Parameters
page
page_size
sort_type
languages

GET
/api/new-list
New/trending dramas
Parameters
page
page_size
languages

GET
/api/hot-search
Hot search ranking
Parameters
languages

GET
/api/search
Search dramas
Parameters
q*
page
page_size
is_fuzzy
languages

GET
/api/detail/:id
Drama detail (metadata)
Parameters
id*
languages

GET
/api/episodes/:id
Episode list with video URLs (includes PlayAuth, PlayAuthId/kid for DRM, and MainPlayUrl)
Parameters
id*
index
count
languages

GET
/api/stream/:id/:ep
Direct CDN stream URL with DRM key (client-side decryption, zero bandwidth cost)
Parameters
id*
ep*
quality
languages
