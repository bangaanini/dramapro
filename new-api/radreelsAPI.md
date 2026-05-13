Radreels API Documentation

Integrate Radreels content into your application with our free API. Access content catalog, search, and streaming functionality.
Base API URL
https://streamapi.web.id/p/radreels
API Token Anda (Bisa Diketik/Ganti)

Available Endpoints

GET
/api/v1/home
Homepage
Parameters
lang

GET
/api/v1/tab/:id
Tab content
Parameters
id*
page
size
lang

GET
/api/v1/search/:query
Search drama
Parameters
query*
page
lang

GET
/api/v1/drama/:keyword
Drama detail
Parameters
keyword*
page
lang

GET
/api/v1/episodes/:fakeId
All episodes
Parameters
fakeId*
lang
GET
/api/v1/video/:videoFakeId/:episodicDramaId

Video URL
Parameters
videoFakeId*
episodicDramaId*
lang
GET
/api/v1/ranking

Ranking
Parameters
lang
GET
/api/v1/foryou
For You feed
Parameters
page
lang
