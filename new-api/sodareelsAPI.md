Kembali ke Dashboard
Sodareels API Documentation
Integrate Sodareels content into your application with our free API. Access content catalog, search, and streaming functionality.

Base API URL
https://streamapi.web.id/p/sodareels

API Token Anda (Bisa Diketik/Ganti)
••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••


Available Endpoints (6)

GET
/api/v1/home
Homepage feed
Parameters
page
1
count
20
lang
id


GET
/api/v1/search
Search drama
Parameters
q*
cinta
lang
id


GET
/api/v1/drama/:id
Episode video URLs (use ewash from /info)
Parameters
id*
2008415452123893762


GET
/api/v1/info/:id
Drama info + episode list
Parameters
id*
2008052547485241345


GET
/api/v1/category
Category list
Parameters
cat
page
1
count
20


GET
/api/v1/episodes
Episode video URLs (use ewash from /info)
Parameters
ids*
2008415452123893762

