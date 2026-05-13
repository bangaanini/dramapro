Shortmax API Documentation
Build short-form video applications with Shortmax API. Access video content, search functionality, and streaming URLs.

Base API URL
https://streamapi.web.id/p/shortmax

API Token Anda (Bisa Diketik/Ganti)
•••••••••••••••••••••


Available Endpoints

GET
/api/v1/search
Search drama
Parameters
q* cinta
lang id
page 1

GET
/api/v1/home
Homepage by tab
Parameters
tab
1
lang
id
L
GET
/api/v1/feed/recommend
Tab Rekoendasi

Parameters
lang
id


GET
/api/v1/feed/vip
Tab VIP
Parameters
lang
id
Try API

cRL
GET
/api/v1/feed/new
Tab Baru
Parameters
lang
id

Try API

cURL
GET
/api/v1/feed/ranked
Tab Peringkat (3 section)
Parameters
lang
id

GET
/api/v1/feed/war
Tab Dewa Perang
Parameters
lang
id

GET
/api/v1/feed/epic
Tab Dunia Epic
Parameters
lang
id

GET
/api/v1/feed/romance
Tab Romantis
Parameters
lang
id


GET
/api/v1/foryou
For You feed
Parameters
page
1
lang
id

GET
/api/v1/detail/:code
Drama detail

Parameters
code*
843852
lang
id


/api/v1/play/:code
Episode video URL (VIP)
Parameters
code*
843852
ep*
15
lang
id
