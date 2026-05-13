Snackshort API Documentation
Integrate Snackshort content into your application with our free API. Access content catalog, search, and streaming functionality.

Base API URL
https://streamapi.web.id/p/snackshort

API Token Anda (Bisa Diketik/Ganti)
••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••


Available Endpoints (7)
GET
/api/v1/home
Homepage feed
Parameters
lang
Indonesian


GET
/api/v1/tabs
Drama tabs
Parameters
lang
Indonesian


GET
/api/v1/browsing
Browse dramas
Parameters
page
1
pageSize
20
lang
Indonesian


GET
/api/v1/search
Search drama by keyword (q), or get search terms if no q
Parameters
q
love
page
1
limit
20
lang
Indonesian


GET
/api/v1/book/:bookId
Book/drama detail
Parameters
bookId*
123
lang
Indonesian


GET
/api/v1/book/:bookId/chapters
Chapter list
Parameters
bookId*
123
lang
Indonesian


GET
/api/v1/book/:bookId/episode/:chapterId
Episode video URL
Parameters
bookId*
123
chapterId*
9150
lang
Indonesian
