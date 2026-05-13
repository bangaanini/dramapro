Shotshort API Documentation
Integrate Shotshort content into your application with our free API. Access content catalog, search, and streaming functionality.

Base API URL
https://streamapi.web.id/p/shotshort

API Token Anda (Bisa Diketik/Ganti)
••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••

Available Endpoints
GET
/api/languages

GET
/api/popular
Popular dramas
Parameters
page
1
limit
20
lang
id


GET
/api/search
Search dramas
Parameters
q*
cinta
page
1
limit
20
lang
id


GET
/api/book/:id
Drama detail with episodes
Parameters
id*
1558
lang
id


GET
/api/book/:id/episodes
List all episodes with chapterId
Parameters
id*
1558
lang
id


GET
/api/book/:bookId/chapter/:chapterId
Chapter video URL with auto-fetch subtitles
Parameters
bookId*
1558
chapterId*
31830
lang
id


GET
/api/category/list
Category list
Parameters
lang
id


GET
/api/category
Category content (case-sensitive: Romance, Urban, Mafia)
Parameters
category
Romance
page
1
limit
20
lang
id
