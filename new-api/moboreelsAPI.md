Moboreels API Documentation

Integrate Moboreels content into your application with our free API. Access content catalog, search, and streaming functionality.
Base API URL
https://streamapi.web.id/p/moboreels
API Token Anda (Bisa Diketik/Ganti)
Available Endpoints

GET
/api/channelList
Daftar channel/kategori utama
Parameters
langId

GET
/api/channelDetail
Detail channel + daftar series per section
Parameters
channelId*
langId

GET
/api/hotList
Daftar drama hot/trending (10=Trending, 11=Latest)
Parameters
listId*
langId

GET
/api/seriesDetail
Detail drama (judul, cover, genre, episode, status)
Parameters
seriesId*
langId

GET
/api/seriesPage
Daftar episode (paginated)
Parameters
seriesId*
pageNo
pageSize
langId

GET
/api/guessYouLike
Drama rekomendasi serupa
Parameters
seriesId*
langId

GET
/api/video
Episode video URL (auto-unlock). Referer: https://www.cdreader.com/
Parameters
seriesId*
episNum*
langId

GET
/api/proxy/subtitle
Proxy subtitle
Parameters
episId*
langId
