// News sources for ingest.ts. Add a feed by adding a line.
// Any RSS or Atom feed works here: rss-parser gives every feed the same item shape, and
// imageOf(), categoryOf() and summarise() in ingest.ts handle the few ways outlets differ.
// kind 'reddit': a subreddit's .rss feed. kind 'wordpress': a WordPress site's /wp-json/wp/v2/posts
// endpoint, for sites whose RSS feed doesn't work.
export type Feed = { source: string; url: string; kind?: 'reddit' | 'wordpress' };

export const FEEDS: Feed[] = [
  // General news
  { source: 'BBC', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { source: 'Guardian', url: 'https://www.theguardian.com/world/rss' },
  { source: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/home.xml' },
  { source: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { source: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },
  { source: 'New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
  { source: 'ABC News (Australia)', url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
  // Science and technology
  { source: 'BBC', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
  { source: 'Guardian', url: 'https://www.theguardian.com/science/rss' },
  { source: 'The Conversation', url: 'https://theconversation.com/uk/articles.atom' },
  { source: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { source: 'Wired', url: 'https://www.wired.com/feed/rss' },
  // Good-news outlets
  { source: 'Positive News', url: 'https://www.positive.news/feed/' },
  { source: 'Good News Network', url: 'https://www.goodnewsnetwork.org/feed/' },
  { source: 'Reasons to be Cheerful', url: 'https://reasonstobecheerful.world/feed/' },
  // Subreddits. Each entry becomes the article the post links to.
  { source: 'r/UpliftingNews', url: 'https://www.reddit.com/r/UpliftingNews/.rss', kind: 'reddit' },
  { source: 'r/GoodNewsUK', url: 'https://www.reddit.com/r/GoodNewsUK/.rss', kind: 'reddit' },
  { source: 'r/upliftingnewsuk', url: 'https://www.reddit.com/r/upliftingnewsuk/.rss', kind: 'reddit' },
  { source: 'r/goodnews', url: 'https://www.reddit.com/r/goodnews/.rss', kind: 'reddit' },
  // Good-news and solutions journalism
  { source: 'The Optimist Daily', url: 'https://www.optimistdaily.com/feed/' },
  { source: 'YES! Magazine', url: 'https://www.yesmagazine.org/feed' },
  { source: 'Fix the News', url: 'https://substack.fixthenews.com/feed' },
  { source: 'Good Good Good', url: 'https://www.goodgoodgood.co/articles/rss.xml' },
  { source: 'Upworthy', url: 'https://www.upworthy.com/feed/' },
  { source: 'Sunny Skyz', url: 'https://www.sunnyskyz.com/rss_tebow.php' },
  { source: 'DailyGood', url: 'https://www.dailygood.org/feed' },
  { source: 'Nice News', url: 'https://nicenews.com/feed/' },
  { source: 'Anthropocene Magazine', url: 'https://www.anthropocenemagazine.org/feed/' },
  { source: 'Grist', url: 'https://grist.org/solutions/feed/' },
  // Independent and nonprofit newsrooms
  { source: 'The Christian Science Monitor', url: 'https://rss.csmonitor.com/feeds/all' },
  { source: 'Mongabay', url: 'https://news.mongabay.com/feed/' },
  { source: 'Carbon Brief', url: 'https://www.carbonbrief.org/feed/' },
  { source: 'ProPublica', url: 'https://www.propublica.org/feeds/propublica/main' },
  { source: 'The Markup', url: 'https://themarkup.org/feeds/rss.xml' },
  { source: 'Global Voices', url: 'https://globalvoices.org/feed/' },
  { source: 'The New Humanitarian', url: 'https://www.thenewhumanitarian.org/rss/all.xml' },
  { source: 'Inside Climate News', url: 'https://insideclimatenews.org/feed/' },
  { source: 'Atlas Obscura', url: 'https://www.atlasobscura.com/feeds/latest' },
  { source: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/' },
  { source: 'Knowable Magazine', url: 'https://knowablemagazine.org/rss' },
  { source: 'Yale Environment 360', url: 'https://e360.yale.edu/feed.xml' },
  { source: 'Undark', url: 'https://undark.org/feed/' },
  { source: 'Dialogue Earth', url: 'https://dialogue.earth/feed/' },
  { source: 'Nautilus', url: 'https://nautil.us/feed/' },
  // Regional: the most-read English-language outlet per UN member state of 5 million people or more
  // Africa
  { source: 'Legit.ng', url: 'https://www.legit.ng/rss/all.rss' }, // Nigeria
  { source: 'Channels TV', url: 'https://www.channelstv.com/feed/' }, // Nigeria
  { source: 'The Reporter Ethiopia', url: 'https://www.thereporterethiopia.com/feed/atom/' }, // Ethiopia
  { source: 'Egypt Independent', url: 'https://www.egyptindependent.com/feed/' }, // Egypt
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/congo_kinshasa/headlines.rdf' }, // Democratic Republic of the Congo
  { source: 'Daily News', url: 'https://dailynews.co.tz/feed/' }, // Tanzania, state-owned
  { source: 'IOL', url: 'https://iol.co.za/rss/' }, // South Africa
  { source: 'Nation', url: 'https://nation.africa/kenya/rss.xml' }, // Kenya
  { source: 'Daily Monitor', url: 'https://www.monitor.co.ug/rss.xml' }, // Uganda
  { source: 'Radio Dabanga', url: 'https://www.dabangasudan.org/en/feed' }, // Sudan
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/algeria/headlines.rdf' }, // Algeria
  { source: 'Hespress English', url: 'https://en.hespress.com/feed' }, // Morocco
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/angola/headlines.rdf' }, // Angola
  { source: 'Club of Mozambique', url: 'https://clubofmozambique.com/feed/' }, // Mozambique
  { source: 'MyJoyOnline', url: 'https://www.myjoyonline.com/feed/' }, // Ghana
  { source: 'Citi Newsroom', url: 'https://www.citinewsroom.com/wp-json/wp/v2/posts?per_page=20&_fields=link,date_gmt,title,excerpt', kind: 'wordpress' }, // Ghana
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/madagascar/headlines.rdf' }, // Madagascar
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/cotedivoire/headlines.rdf' }, // Cote d'Ivoire
  { source: 'Mimi Mefo Info', url: 'https://mimimefoinfos.com/feed/' }, // Cameroon
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/niger/headlines.rdf' }, // Niger
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/mali/headlines.rdf' }, // Mali
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/burkinafaso/headlines.rdf' }, // Burkina Faso
  { source: 'Nyasa Times', url: 'https://www.nyasatimes.com/feed/' }, // Malawi
  { source: 'Lusaka Times', url: 'https://www.lusakatimes.com/feed/' }, // Zambia
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/chad/headlines.rdf' }, // Chad
  { source: 'Hiiraan Online', url: 'https://hiiraan.com/news.xml' }, // Somalia
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/senegal/headlines.rdf' }, // Senegal
  { source: 'The Herald', url: 'https://www.heraldonline.co.zw/feed/' }, // Zimbabwe, state-owned
  { source: 'KT Press', url: 'https://www.ktpress.rw/feed/' }, // Rwanda
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/benin/headlines.rdf' }, // Benin
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/burundi/headlines.rdf' }, // Burundi
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/tunisia/headlines.rdf' }, // Tunisia
  { source: 'Eye Radio', url: 'https://eyeradio.org/feed/' }, // South Sudan
  { source: 'Sierraloaded', url: 'https://sierraloaded.sl/feed/' }, // Sierra Leone
  { source: 'Libya Herald', url: 'https://libyaherald.com/rss.xml' }, // Libya
  { source: 'allAfrica', url: 'https://allafrica.com/tools/headlines/rdf/centralafricanrepublic/headlines.rdf' }, // Central African Republic
  { source: 'FrontPage Africa', url: 'https://frontpageafricaonline.com/feed/' }, // Liberia
  { source: 'The North Africa Post', url: 'https://northafricapost.com/category/mauritania/feed/' }, // Mauritania
  // Asia
  { source: 'The Astana Times', url: 'https://astanatimes.com/feed/' }, // Kazakhstan
  { source: '24.kg', url: 'https://24.kg/english/rss/' }, // Kyrgyzstan
  { source: 'Asia-Plus', url: 'https://asiaplus.news/en/feed/' }, // Tajikistan
  { source: 'Turkmen.news', url: 'https://en.turkmen.news/feed/' }, // Turkmenistan
  { source: 'Kun.uz', url: 'https://kun.uz/news/rss?lang=en' }, // Uzbekistan
  { source: 'TOLOnews', url: 'https://tolonews.com/rss.xml' }, // Afghanistan
  { source: 'The Daily Star', url: 'https://www.thedailystar.net/news/bangladesh/rss.xml' }, // Bangladesh
  { source: 'The Times of India', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' }, // India
  { source: 'Iran International', url: 'https://www.iranintl.com/en/feed' }, // Iran
  { source: 'The Kathmandu Post', url: 'https://kathmandupost.com/rss' }, // Nepal
  { source: 'Dawn', url: 'https://www.dawn.com/feeds/home' }, // Pakistan
  { source: 'Ada Derana', url: 'https://adaderana.lk/rss.xml' }, // Sri Lanka
  { source: 'Khmer Times', url: 'https://www.khmertimeskh.com/feed/' }, // Cambodia
  { source: 'The Jakarta Post', url: 'https://rss.thejakartapost.com/home' }, // Indonesia
  { source: 'The Laotian Times', url: 'https://laotiantimes.com/feed/' }, // Laos
  { source: 'Free Malaysia Today', url: 'https://www.freemalaysiatoday.com/feed/' }, // Malaysia
  { source: 'Myanmar Now', url: 'https://myanmar-now.org/en/feed/' }, // Myanmar
  { source: 'Philippine Daily Inquirer', url: 'https://newsinfo.inquirer.net/feed' }, // Philippines
  { source: 'The Straits Times', url: 'https://www.straitstimes.com/news/singapore/rss.xml' }, // Singapore
  { source: 'Bangkok Post', url: 'https://www.bangkokpost.com/rss/data/topstories.xml' }, // Thailand
  { source: 'VnExpress International', url: 'https://e.vnexpress.net/rss/news.rss' }, // Vietnam, state-owned
  { source: 'South China Morning Post', url: 'https://www.scmp.com/rss/4/feed' }, // China
  { source: 'The Japan Times', url: 'https://www.japantimes.co.jp/feed/' }, // Japan
  { source: 'NK News', url: 'https://www.nknews.org/feed/' }, // North Korea
  { source: 'The Korea Herald', url: 'https://www.koreaherald.com/rss/newsAll' }, // South Korea
  { source: 'Hong Kong Free Press', url: 'https://hongkongfp.com/feed/' }, // Hong Kong
  // Europe
  { source: 'The Moscow Times', url: 'https://www.themoscowtimes.com/rss/news' }, // Russia
  { source: 'DW', url: 'https://rss.dw.com/rdf/rss-en-all' }, // Germany, state-owned
  { source: 'The Independent', url: 'https://www.independent.co.uk/news/uk/rss' }, // United Kingdom
  { source: 'France 24', url: 'https://www.france24.com/en/rss' }, // France, state-owned
  { source: 'ANSA', url: 'https://www.ansa.it/english/news/english_nr_rss.xml' }, // Italy
  { source: 'El País English', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada' }, // Spain
  { source: 'The Kyiv Independent', url: 'https://kyivindependent.com/news-archive/rss/' }, // Ukraine
  { source: 'Notes from Poland', url: 'https://notesfrompoland.com/feed/' }, // Poland
  { source: 'Romania Insider', url: 'https://www.romania-insider.com/feed' }, // Romania
  { source: 'DutchNews.nl', url: 'https://www.dutchnews.nl/feed/' }, // Netherlands
  { source: 'VRT NWS', url: 'https://www.vrt.be/vrtnws/en.rss.articles.xml' }, // Belgium, state-owned
  { source: 'The Local Sweden', url: 'https://feeds.thelocal.com/rss/se' }, // Sweden
  { source: 'Expats.cz', url: 'https://expats.cz/feed' }, // Czechia
  { source: 'Kathimerini', url: 'https://www.ekathimerini.com/infeeds/rss/nx-rss-feed.xml' }, // Greece
  { source: 'The Portugal News', url: 'https://www.theportugalnews.com/rss' }, // Portugal
  { source: 'Daily News Hungary', url: 'https://dailynewshungary.com/feed/' }, // Hungary
  { source: 'Radio Free Europe/Radio Liberty', url: 'https://www.rferl.org/api/zgoiql-vomx-tpe-kmo' }, // Belarus, state-owned
  { source: 'The Local Austria', url: 'https://feeds.thelocal.com/rss/at' }, // Austria
  { source: 'SWI swissinfo.ch', url: 'https://www.swissinfo.ch/service/eng/rssxml/top-news/rss' }, // Switzerland, state-owned
  { source: 'Balkan Insight', url: 'https://balkaninsight.com/category/bi/serbia/feed/' }, // Serbia
  { source: 'Novinite', url: 'https://www.novinite.com/services/news_rdf.php' }, // Bulgaria
  { source: 'The Local Denmark', url: 'https://feeds.thelocal.com/rss/dk' }, // Denmark
  { source: 'Yle News', url: 'https://yle.fi/rss/t/18-34837/en' }, // Finland, state-owned
  { source: 'The Slovak Spectator', url: 'https://spectator.sme.sk/rss' }, // Slovakia
  { source: 'The Local Norway', url: 'https://feeds.thelocal.com/rss/no' }, // Norway
  { source: 'Irish Independent', url: 'https://www.independent.ie/rss' }, // Ireland
  // Americas, Middle East and Oceania
  { source: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/news' }, // United States
  { source: 'CBC News', url: 'https://www.cbc.ca/webfeed/rss/rss-topstories' }, // Canada, state-owned
  { source: 'Mexico News Daily', url: 'https://mexiconewsdaily.com/feed/' }, // Mexico
  { source: 'The Rio Times', url: 'https://www.riotimesonline.com/feed/' }, // Brazil
  { source: 'Colombia One', url: 'https://colombiaone.com/feed/' }, // Colombia
  { source: 'Buenos Aires Times', url: 'https://www.batimes.com.ar/feed' }, // Argentina
  { source: 'Andina', url: 'https://andina.pe/ingles/rss.aspx' }, // Peru, state-owned
  { source: 'The Rio Times', url: 'https://www.riotimesonline.com/?feed=rss2&category_name=venezuela' }, // Venezuela
  { source: 'MercoPress', url: 'https://en.mercopress.com/rss/chile' }, // Chile
  { source: 'The Rio Times', url: 'https://www.riotimesonline.com/?feed=rss2&category_name=guatemala' }, // Guatemala
  { source: 'Cuenca High Life', url: 'https://www.cuencahighlife.com/feed/' }, // Ecuador
  { source: 'The Rio Times', url: 'https://www.riotimesonline.com/?feed=rss2&category_name=bolivia' }, // Bolivia
  { source: 'The Haitian Times', url: 'https://haitiantimes.com/feed/' }, // Haiti
  { source: 'Havana Times', url: 'https://havanatimes.org/feed/' }, // Cuba
  { source: 'Dominican Today', url: 'https://dominicantoday.com/feed/' }, // Dominican Republic
  { source: 'The Rio Times', url: 'https://www.riotimesonline.com/?feed=rss2&category_name=honduras' }, // Honduras
  { source: 'Havana Times', url: 'https://havanatimes.org/category/news/nicaragua/feed/' }, // Nicaragua
  { source: 'MercoPress', url: 'https://en.mercopress.com/rss/paraguay' }, // Paraguay
  { source: 'El Salvador in English', url: 'https://elsalvadorinenglish.com/feed/' }, // El Salvador
  { source: 'The Tico Times', url: 'https://ticotimes.net/feed' }, // Costa Rica
  { source: 'Hurriyet Daily News', url: 'https://www.hurriyetdailynews.com/rss/turkey' }, // Turkey
  { source: 'Kurdistan24', url: 'https://www.kurdistan24.net/en/rss.xml' }, // Iraq
  { source: 'Arab News', url: 'https://www.arabnews.com/rss.xml' }, // Saudi Arabia
  { source: 'Yemen Monitor', url: 'https://www.yemenmonitor.com/en/feed' }, // Yemen
  { source: 'North Press Agency', url: 'https://npasyria.com/en/feed/' }, // Syria
  { source: 'Roya News', url: 'https://en.royanews.tv/rss' }, // Jordan
  { source: 'Khaleej Times', url: 'https://www.khaleejtimes.com/api/v1/collections/top-section.rss' }, // United Arab Emirates
  { source: 'The Times of Israel', url: 'https://www.timesofisrael.com/feed/' }, // Israel
  { source: 'Trend News Agency', url: 'https://en.trend.az/feeds/index.rss' }, // Azerbaijan
  { source: 'Naharnet', url: 'https://www.naharnet.com/tags/lebanon/en/feed.atom' }, // Lebanon
  { source: 'Times of Oman', url: 'https://timesofoman.com/feed/' }, // Oman
  { source: 'Post-Courier', url: 'https://www.postcourier.com.pg/feed/' }, // Papua New Guinea
  { source: 'NZ Herald', url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/curated/78/?outputType=xml' }, // New Zealand
  { source: 'The Sydney Morning Herald', url: 'https://www.smh.com.au/rss/feed.xml' }, // Australia
];
