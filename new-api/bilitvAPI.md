Bilitv API Documentation

Base API URL
https://streamapi.web.id/p/bilitv
API Token Anda (Bisa Diketik/Ganti)

Available Endpoints

/api/v1/home
Homepage dramas
Parameters
page
limit
lang
curl -X GET "https://streamapi.web.id/p/bilitv/api/v1/home?page=2&limit=20&lang=id&token=SeyjtsEingL9A37w6AlPwpxg4LJigICtPJ72F9zFQkHnYJR4XL6zTrwbhnn62O8h"

GET
/api/v1/search
Search drama
Parameters
q*
lang
curl -X GET "https://streamapi.web.id/p/bilitv/api/v1/search?q=love&lang=id&token=SeyjtsEingL9A37w6AlPwpxg4LJigICtPJ72F9zFQkHnYJR4XL6zTrwbhnn62O8h"

GET
/api/v1/recommend
Recommended dramas
Parameters
lang
GET
/api/v1/dramas
curl -X GET "https://streamapi.web.id/p/bilitv/api/v1/recommend?lang=id&token=SeyjtsEingL9A37w6AlPwpxg4LJigICtPJ72F9zFQkHnYJR4XL6zTrwbhnn62O8h"

Drama list
Parameters
lang
page
size
curl -X GET "https://streamapi.web.id/p/bilitv/api/v1/dramas?lang=id&page=1&size=20&token=SeyjtsEingL9A37w6AlPwpxg4LJigICtPJ72F9zFQkHnYJR4XL6zTrwbhnn62O8h"

GET
/api/v1/drama/:id
Drama detail with episodes
Parameters
id*
lang
curl -X GET "https://streamapi.web.id/p/bilitv/api/v1/drama/1881?lang=id&token=SeyjtsEingL9A37w6AlPwpxg4LJigICtPJ72F9zFQkHnYJR4XL6zTrwbhnn62O8h"

GET
/api/v1/drama/:id/episode/:ep
Episode video URL (480/720/1080)
Parameters
id*
ep*
quality
curl -X GET "https://streamapi.web.id/p/bilitv/api/v1/drama/1881/episode/15?quality=720&token=SeyjtsEingL9A37w6AlPwpxg4LJigICtPJ72F9zFQkHnYJR4XL6zTrwbhnn62O8h"

GET
/api/v1/subtitle/:shortId/:episode
Episode subtitle with auto-translate
Parameters
shortId*
episode*
lang
format
curl -X GET "https://streamapi.web.id/p/bilitv/api/v1/subtitle/1881/15?lang=id&format=json%7Cvtt&token=SeyjtsEingL9A37w6AlPwpxg4LJigICtPJ72F9zFQkHnYJR4XL6zTrwbhnn62O8h"
