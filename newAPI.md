Authentication

All requests must include your License Key as a header.
Request Header

X-API-Key: 6G7C-RL57-2Z8O-ZVER

Base URL
Production
https://api.dracinku.site

Platforms
Replace {platform} in any path with one of:

dramabox
shortmax
dramadash
flickreels
goodshort
melolo
netshort
reelbuzz
freereels
dramamax
flickshort
radreels
hishort
dramawave
litetv
chill
dramarush
animev2
anime
movietv
drakor
cachebjav
meloshort
dramanova
microdrama

6 Endpoints

1. /{platform} /languages
Get list of available languages for a platform
Response JSON
{
  "success": true,
  "platform": "netshort",
  "data": {
    "supported": [
      "id",
      "en",
      "th",
      "vi",
      "zh",
      "kr",
      "jp"
    ],
    "mapping": {
      "id": "id_ID",
      "en": "en_US",
      "th": "th_TH"
    }
  }
}

2. /{platform} /tablist
Get list of content categories/tabs
Query parameter: lang {lang_code}
Response JSON
{
  "success": true,
  "platform": "dramadash",
  "language": "id",
  "data": [
    {
      "type": "tab",
      "name": "Populer",
      "tab_key": "0",
      "position_index": 0
    },
    {
      "type": "tab",
      "name": "Baru",
      "tab_key": "2",
      "position_index": 1
    }
  ]
}

3. /{platform} /tabdata
Get content for a specific category
Query parameter: lang {lang_code}
Request body Json:
{
  "key": "{tab_key}",
  "positionIndex": "{position_index}",
  "type": "{type}"
}
Response Json
{
  "success": true,
  "data": {
    "book": {
      "list": [
        {
          "id": "42000002890",
          "name": "Kembalinya Sang Petinju",
          "cover": "https://...",
          "chapterCount": 72,
          "tags": [
            "Balas Dendam",
            "Modern"
          ],
          "playCount": "9.5M"
        }
      ]
    },
    "page_info": {
      "has_more": true,
      "pageNo": 1,
      "pageSize": 15
    }
  }
}

4. /{platform} /tabfeed
Pagination load next page of content
Query Parameters: lang {lang_code}
Request Body JSON
{
  "page_info": "{page_info from tabdata}"
}
Response JSON
{
  "success": true,
  "data": {
    "book": [
      {
        "id": "42000002888",
        "name": "Dewa Judi",
        "chapterCount": 74,
        "playCount": "18.4M"
      }
    ],
    "page_info": {
      "has_more": true,
      "pageNo": 2,
      "pageSize": 15
    }
  }
}

5. /{platform} /search
Search for dramas by keyword
Query Parameters: lang {lang_code}
Request Body (JSON)
{
  "keyword": "string"
}
Response (JSON)
{
  "success": true,
  "data": {
    "book": [
      {
        "id": "42000002888",
        "name": "Dewa Judi",
        "chapterCount": 74,
        "playCount": "18.4M"
      }
    ],
    "page_info": {
      "has_more": false,
      "pageNo": 1
    }
  }
}

6. /{platform} /series/{id}
Get series details and episode list with video URLS
Query Parameters: lang {lang_code}
quality: int — video quality
Response (JSON)
{
  "success": true,
  "data": {
    "book": {
      "id": "58",
      "name": "Balikan Cinta dengan Mantan Suami",
      "chapterCount": 80,
      "introduction": "Setelah bercerai, Isabella meraih kesuksesan…"
    },
    "chapters": [
      {
        "eps": "EP-1",
        "index": 1,
        "videoPath": "{url_video}",
        "subtitle": [
          {
            "language": "id",
            "display_name": "Indonesian",
            "subtitle": "{url_subtitle}"
          }
        ]
      }
    ]
  }
}

Example Request
cURL

curl -X GET "https://api.dracinku.site/dramabox/tablist?lang=id" \
  -H "X-API-Key: 6G7C-RL57-2Z8O-ZVER"