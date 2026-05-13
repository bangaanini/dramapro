Vigloo API Documentation
Integrate Vigloo content into your application with our free API. Access content catalog, search, and streaming functionality.

Base API URL
https://streamapi.web.id/p/vigloo

API Token Anda (Bisa Diketik/Ganti)
••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••


Available Endpoints (12)
GET
/api/v1/languages
Available languages


GET
/api/v1/tabs
Home tabs
Parameters
lang
id


GET
/api/v1/tabs/:id
Tab content
Parameters
id*
15000101
offset
limit
20
lang
id


GET
/api/v1/bundles/:id
Public bundle
Parameters
id*
15001213
lang
id


GET
/api/v1/browse
Browse programs
Parameters
sort
POPULAR
genre
country
limit
30
lang
id


GET
/api/v1/search
Search dramas
Parameters
q*
love
limit
20
lang
id


GET
/api/v1/rank
Ranking
Parameters
lang
id


GET
/api/v1/genres
Genre list
Parameters
lang
id


GET
/api/v1/drama/:id
Drama detail
Parameters
id*
15000287
lang
id

GET
/api/v1/drama/:programId/season/:seasonId/episodes
Episode list
Parameters
programId*
15000468
seasonId*
15000463
lang
id


GET
/api/v1/play
Get video URL + cookies
Parameters
seasonId*
15000046
ep
1

Try API

cURL
GET
/api/v1/stream
HLS stream with embedded cookies
Parameters
seasonId*
15000046
ep
1
