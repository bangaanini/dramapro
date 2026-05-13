Stardusttv API Documentation
Integrate Stardusttv content into your application with our free API. Access content catalog, search, and streaming functionality.

Base API URL
https://streamapi.web.id/p/stardusttv

API Token Anda (Bisa Diketik/Ganti)
••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••


Available Endpoints

- GET
/api/v1/homepage
Homepage feed lang:id
Parameters
lang id

- GET
/api/v1/categories
Category list
Parameters
lang id

- GET
/api/v1/category/:id
Videos by category with pagination
Parameters
id* 1
lang id
page 2
page_size 10

- GET
/api/v1/search
Search drama with pagination
Parameters
q* love
lang id
page 2
page_size 10


- GET
/api/v1/video/:id
Video detail + all episodes 
Parameters
id* 15172
lang id

- GET
/api/v1/video/:id/episode/:episode
Episode stream URL (H264/H265)

Parameters
id* 15172
episode* 1
lang id