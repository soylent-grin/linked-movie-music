;(function() {
	'use strict';



	//string formatting god, follow him!
	String.prototype.format = function() {
		var pattern = /\{\d+\}/g;
		var args = arguments;
		return this.replace(pattern, function(capture){ return args[capture.match(/\d+/)]; });
	};

	var URLS = {
		lastfm_users_top_artists: "http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user={0}&api_key=d90958eeec954a5f7620284eb1a62f9e&format=json",
		linkedmdb: "http://www.linkedmdb.org/sparql"
	};

	var SPARQL_BASE = [
		"SELECT ?movieName ?movieAuthor ?composerName WHERE {",
		"	{0}", // music contributors (mc) union
		"	?movie <http://data.linkedmdb.org/resource/movie/music_contributor> ?mc;",
		"			<http://data.linkedmdb.org/resource/movie/producer> ?ma;",
		"			<http://purl.org/dc/terms/title> ?movieName.",
		"	?ma <http://data.linkedmdb.org/resource/movie/producer_name> ?movieAuthor.",
		"	?mc <http://data.linkedmdb.org/resource/movie/music_contributor_name> ?composerName.",
		"}"
	].join(' ');



	var TYPES = {
	}

	var DataProvider = function() {
		this._user = null;
		this._data = {};
	};
	DataProvider.prototype = {
		constructor: DataProvider,
		get_movie: function(artist, name) {
			var founded = null;
			artist.children.forEach(function(movie) {
				if (movie.name === name) {
					founded = movie;
				}
			});
			return founded;
		},
		get_artist: function(name) {
			var artists = this._data.children;
			var founded = null;
			artists.forEach(function(artist) {
				if (artist.name === name) {
					founded = artist;
				}
			});
			return founded;
		},
		prepare_artists: function(artists) {
			var map = [];
			artists.forEach(function(artist) {
				map.push({
					img: artist.image[0] ? artist.image[0]["#text"] : "",
					rank: artist["@attr"].rank,
					count: artist.playcount,
					name: artist.name,
					type: "artist",
					children: []
				});
			});
			return map;
		},
		prepare_lastfm_data: function(data) {
			this._user = data.topartists["@attr"].user;
			this._data = {
				name: this._user,
				type: "user",
				stats: data.topartists["@attr"],
				children: this.prepare_artists(data.topartists.artist)
			};
		},
		prepare_mdb_data: function(data) {
			var that = this;
			var artists = this._data.children;
			var artist, founded;
			data.forEach(function(movie) {
				artist = that.get_artist(movie.composerName.value);
				if (artist) {
					founded = that.get_movie(artist, movie.movieName.value);
					if (!founded) {
						artist.children.push({
							name: movie.movieName.value,
							author: movie.movieAuthor.value,
							type: "movie"
						});
					}
				} else {
					console.warn("Unexpected artist: " + movie.composerName);
				}
			});
			var new_artists = [];
			artists.forEach(function(artist, i) {
				if (Object.keys(artists[i].children).length > 0) {
					new_artists.push(artists[i]);
				}
			});
			this._data.children = new_artists;
		},
		get_data: function() {
			return this._data;
		}
	};
	var DATA_PROVIDER = new DataProvider();

	var Visualiser = function() {
		this.svg = d3.select("svg");
	};
	Visualiser.prototype = {
		constructor: Visualiser,
		flatten: function(root) {
			var nodes = [], i = 0;

			function recurse(node) {
				if (node.children) {
					node.children.forEach(recurse);
				}
				if (!node.id) {
					node.id = ++i;
				}
				nodes.push(node);
			}

			recurse(root);
			return nodes;
		},

		on_tick: function() {
			this.link.attr("x1", function(d) { return d.source.x; })
				  .attr("y1", function(d) { return d.source.y; })
				  .attr("x2", function(d) { return d.target.x; })
				  .attr("y2", function(d) { return d.target.y; });

			this.node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
		},
		render: function(data) {
			var that = this;
			$('#main-wrapper').removeAttr('class').addClass('graph');

			var force = d3.layout.force()
							.size([document.getElementById('canvas').offsetWidth, document.getElementById('canvas').offsetHeight])
							.on("tick", this.on_tick.bind(this));

			this.svg.selectAll(".node").remove();
			this.svg.selectAll(".link").remove();

			this.node = this.svg.selectAll(".node");
			this.link = this.svg.selectAll(".link");

			var nodes = this.flatten(data);
			var links = d3.layout.tree().links(nodes);
			force
			  .nodes(nodes)
			  .charge(-380)
			  .distance(50)
			  .gravity(0.05)
			  .links(links)
			  .start();

			  // Update the links…
			this.link = this.link.data(links, function(d) { return d.target.id; });

			// Exit any old links.
			this.link.exit().remove();

			// Enter any new links.
			this.link.enter().insert("line", ".node")
				.attr("class", "link")
				.attr("x1", function(d) { return d.source.x; })
				.attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });

			this.node = this.node.data(nodes)
				.enter().append("g")
				.attr("class", "node")
				.on('mouseover', function(d) {
					that.nodes.addClass('not_active');
				})
				.on('mouseout', function(d) {
					console.log("mouseout");
					console.log(d);
				})
				.call(force.drag);

			this.node.append("circle")
				.attr("class", function(d) { return d.type; })
				//.style("fill", function(d) { if (d.type == "user") { return "url(#image)"; }})
				.attr("r", function(d) { 
					if (d.type === "user") {
						return d.name.length * 3;
					} else {
						return Math.sqrt(d.count) || 10; 
					}
				});

			this.node.append("text")
				.attr("dx", function(d) {
					if (d.type === "user") {
						return - (d.name.length * 4.5) / 2;
					} else {
						return Math.sqrt(d.count) || 10; 
					}
				})
				.attr("dy", 5)
				.text(function(d) { return d.name });
		}
	};
	var VISUALISER = new Visualiser();


	var App = function() {
		this.init();
	};
	App.prototype = {
		constructor: App,
		init: function() {
			this.add_event_listeners();
		},
		build_query: function(artists) {
			var query = SPARQL_BASE;
			var array = [];
			artists.forEach(function(artist) {
				array.push('{ ?mc  <http://data.linkedmdb.org/resource/movie/music_contributor_name> "{0}" }'.format(artist.name));
			});
			return SPARQL_BASE.format(array.join(' UNION '));
		},
		process: function(name) {
			var that = this;
			$('#main-wrapper').removeAttr('class').addClass('in-progress');
			$.ajax({
				url: URLS.lastfm_users_top_artists.format(name),
				success: function(data) {
					if (!data.error) {
						DATA_PROVIDER.prepare_lastfm_data(data);
						$.ajax({
							type: "POST",
							url: "/sparql/",
							dataType: "json",
							data: that.build_query(data.topartists.artist),
							success: function(data) {
								DATA_PROVIDER.prepare_mdb_data(data.results.bindings);
								VISUALISER.render(DATA_PROVIDER.get_data());
							},
							error: function() {
								console.error('failed to query SPARQL endpoint');
							}
						});
					} else {
						$('#main-wrapper').removeAttr('class');
						$('#lastfm_name').addClass('error');
					}
				},
				error: function() {
					$('#main-wrapper').removeAttr('class');
				}
			});
		},
		add_event_listeners: function() {
			var that = this;
			$('#lastfm_name').focus().on('keyup', function(e) {
				if (e.which == 13) {
					that.process($(this).val());
				}
			});
			$('body').on('click focus', '.error', function() {
				$(this).removeClass('error');
			});
			$('#back').on('click', function(e) {
				e.preventDefault();
				$('#lastfm_name').val('').focus();
				$('#main-wrapper').removeAttr('class');
			});
		}
	};

	new App();
})();