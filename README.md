# linked-movie-music
Recommend movies using Last.fm account
	npm install
	node server
	Port 3301.

# Web-приложение Linked Movie Music -- Vision

# Идея
Web-приложение осуществляет подбор фильмов, в которых звучит музыка, которая может заинтересовать пользователя. Для поиска используется его профиль на музыкальном  портале [Last.fm](http://www.lastfm.ru/).
Проект направлен как на музыкальную аудиторию, так и на кинолюбителей.
> Last.fm -- это сервис, который позволяет хранить статистику прослушанных музыкальных композиций и предоставляет персональные рекомендации на основе полученных от пользователей данных.

# Описание
После указания своего профиля на портале Last.fm, если такой аккаунт существует -- приложение, используя данные о тех музыкантах, которые есть в библиотеке пользователя, отображает все фильмы, музыка к которым была написана рассматриваемыми композиторами. Информация представляется в виде связного графа. Центральная вершина с аватаром пользователя, синие вершины с исполнителями и композиторами, а после -- красные с названиями фильма. Пример работы приложения на рисунке:
![ScreenShot](http://i.imgur.com/CRBDgT9.jpg)
Имеется возможность получить дополнительную информацию о полученных фильмах (автор, режиссер, композитор, краткое описание), щелкнув мышью по выбранной вершине, как показано на рисунках:
![ScreenShot](http://i.imgur.com/CkbTVCw.png)
![ScreenShot](http://i.imgur.com/SrnFDID.jpg)

# Технические детали
Разработанное приложение получает данные о исполнителях из коллекции пользователя в фомате json посредством [API портала Last.fm](http://www.last.fm/api). Для получения данных о фильмах используется [Linked Movie Dataset](http://linkedmdb.org/). Для визуализации используется JavaScript-библиотека [D3](http://d3js.org/).

## Приложение работает в тестовом режиме по адресу:
http://109.234.34.200:3301/

## Примеры SPARQL-запросов к открытым датасетам:
### Получение всех фильмов по заданным композиторам (http://data.linkedmdb.org/sparql):
	SELECT ?movieName ?movieAuthor ?composerName ?dbpedia_movie_uri 
	WHERE {
		{ ?mc  <http://data.linkedmdb.org/resource/movie/music_contributor_name> "Coil" }
		UNION
		{ ?mc  <http://data.linkedmdb.org/resource/movie/music_contributor_name> "Arvo Part" }
		?movie <http://data.linkedmdb.org/resource/movie/music_contributor> ?mc;
			<http://data.linkedmdb.org/resource/movie/producer> ?ma;
			<http://purl.org/dc/terms/title> ?movieName. 
		optional{
			?movie owl:sameAs ?dbpedia_movie_uri.
			filter regex(str(?dbpedia_movie_uri), 'dbpedia', 'i').
		}.
		
		?ma <http://data.linkedmdb.org/resource/movie/producer_name>
		?movieAuthor.
		
		?mc <http://data.linkedmdb.org/resource/movie/music_contributor_name>
		?composerName.
	}
### Получение расширенной информации о фильме (http://dbpedia.org):
#### По URI фильма
	PREFIX dbo: <http://dbpedia.org/ontology/>
	PREFIX dbpprop: <http://dbpedia.org/property/>
	PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
	PREFIX foaf: <http://xmlns.com/foaf/0.1/>
	SELECT DISTINCT
	  (str(?abstract) as ?abstract_en),
	  (MIN(str(?producer_name)) as ?producer_name_en),
	  (str(?language) as ?language_en)
	WHERE
	{
	  <http://dbpedia.org/resource/The_Shining_(film)> dbo:abstract ?abstract ;
	                                                   dbo:producer ?producer ;
	                                                   dbpprop:language ?language.
	  ?producer foaf:name ?producer_name
	  FILTER langMatches(lang(?abstract), 'EN').
	  FILTER langMatches(lang(?producer_name), 'EN').
	}
	GROUP BY ?abstract ?language
#### По названию фильма
	PREFIX dbo: <http://dbpedia.org/ontology/>",
	PREFIX dbpprop: <http://dbpedia.org/property/>",
	PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
	PREFIX foaf: <http://xmlns.com/foaf/0.1/>",
	SELECT DISTINCT (str(?abstract) as ?abstract_en), (MIN(str(?producer_name)) as ?producer_name_en), (str(?language) as ?language_en)",
	
	WHERE {
	  ?film a dbo:Film;
	        dbo:abstract ?abstract ;
	        dbo:producer ?producer ;
	        dbpprop:language ?language ;
	        foaf:name 'The Shining'@en .
	  ?producer foaf:name ?producer_name .
	  FILTER langMatches(lang(?abstract), 'EN').
	  FILTER langMatches(lang(?producer_name), 'EN')
	}
	GROUP BY ?abstract ?language

# Авторы
- Климов Николай
- Чистяков Александр
- Михеев Дмитрий
- Андреев Алексей

НИУ ИТМО, гр. 6126, курс "Методы онтологического инжиниринга". Санкт-Петербург, 2014
