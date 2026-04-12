UPDATE "AppSettings"
SET
  "siteName" = 'Layar Drama',
  "siteUrl" = 'https://layardrama.id',
  "telegramMiniAppUrl" = 'https://layardrama.id/',
  "siteLogoUrl" = '/site-logo.jpg'
WHERE "id" = 'global'
  AND (
    "siteName" = ''
    OR "siteName" = 'DramaPro'
    OR "siteUrl" = ''
    OR "siteUrl" = 'https://dramapro.netlify.app'
    OR "siteUrl" = 'https://dramapro.netlify.app/'
    OR "telegramMiniAppUrl" = ''
    OR "telegramMiniAppUrl" = 'https://dramapro.netlify.app'
    OR "telegramMiniAppUrl" = 'https://dramapro.netlify.app/'
    OR "siteLogoUrl" = ''
    OR "siteLogoUrl" = '/opengraph.jpg'
  );
