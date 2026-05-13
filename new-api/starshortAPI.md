Starshort API Documentation
Integrate Starshort content into your application with our free API. Access content catalog, search, and streaming functionality.

Base API URL
https://streamapi.web.id/p/starshort

API Token Anda (Bisa Diketik/Ganti)
••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••


Available Endpoints (7)
GET
/api/v1/languages
List supported languages (returns id:name mapping)


GET
/api/v1/dramas
Popular dramas (lang: 3=English, 4=Indonesian)
Parameters
lang
4


GET
/api/v1/dramas/new
New releases
Parameters
lang
4


GET
/api/v1/dramas/search
Search drama
Parameters
q*
cinta
lang
4


GET
/api/v1/dramas/:dramaId
Drama detail
Parameters
dramaId*
Gaen
lang
4


GET
/api/v1/dramas/:dramaId/episodes
Episode list
Parameters
dramaId*
Gaen
lang
4


GET
/api/v1/dramas/:dramaId/episodes/:epNum
Episode video URL
Parameters
dramaId*
Gaen
epNum*
15
lang
4
