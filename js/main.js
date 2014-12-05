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
		lastfm_user_info: "http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user={0}&api_key=d90958eeec954a5f7620284eb1a62f9e&format=json",
		linkedmdb: "http://www.linkedmdb.org/sparql"
	};

	var SPARQL_BASE = [
		"SELECT ?movieName ?movieAuthor ?composerName WHERE {",
		"	{0}", // music contributors (mc) union
		"	?movie <http://data.linkedmdb.org/resource/movie/music_contributor> ?mc;",
		"			<http://data.linkedmdb.org/resource/movie/producer> ?ma;",
		"			<http://purl.org/dc/terms/title> ?movieName.",
		"	?ma <http://data.linkedmdb.org/resource/movie/producer_name> ?movieAuthor.",
		//"	?movie <http://data.linkedmdb.org/resource/movie/initial_release_date> ?date.",
		"	?mc <http://data.linkedmdb.org/resource/movie/music_contributor_name> ?composerName.",
		//"	?movie <http://data.linkedmdb.org/resource/movie/genre> ?g.",
		//"	?g <http://data.linkedmdb.org/resource/movie/film_genre_name> ?genre.",
		"}"
	].join(' ');

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
							author: [ movie.movieAuthor.value ],
							//genre: movie.genre.value,
							//date: movie.date.value,
							composer: artist.name,
							type: "movie"
						});
					} else {
						founded.author.push(movie.movieAuthor.value);
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
		is_connected_nodes: function(id1, id2) {
			var is_connected = false;
			this._data.children.forEach(function(artist) {
				if (artist.id === id1) {
					artist.children.forEach(function(movie) {
						if (movie.id === id2) {
							is_connected = true;
						}
					});
				} else if (artist.id === id2) {
					artist.children.forEach(function(movie) {
						if (movie.id === id1) {
							is_connected = true;
						}
					});
				}
			});
			return is_connected;
		}, 
		is_connected_links: function(l, id) {
			//return false;
			if (l.source.type === "user" && (l.target.id == id) ) {
				return true;
			}
			if (l.target.id == id || l.source.id == id) {
				return true;
			}  
			return false;
		},
		get_data: function() {
			return this._data;
		},
		set_data: function(key, value) {
			this._data[key] = value;
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
		show_info: function(d) {
			if (d.type === "movie") {
				$("#movie-name span").text(d.name);
				$("#movie-author span").text(d.author.join(", "));
				$("#movie-genre span").text(d.genre);
				$("#movie-date span").text(d.date);
				$("#movie-composer span").text(d.composer);
				$("#info").show();
			}
		},
		render: function(data) {
			var that = this;
			$('#main-wrapper').removeAttr('class').addClass('graph');

			var force = d3.layout.force()
							.size([document.getElementById('canvas').offsetWidth, document.getElementById('canvas').offsetHeight])
							.on("tick", this.on_tick.bind(this));

			this.svg.selectAll("g").remove();
			this.svg.selectAll(".link").remove();

			this.node = this.svg.selectAll("g");
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
				.attr("id", function(d) { return d.id; })
				.attr("class", function(d) { return d.type; })
				.on('mouseover', function(d) {
					if (d.type !=="user") {
						that.node.attr("active", function(n) { return DATA_PROVIDER.is_connected_nodes(d.id, n.id) ? "true" : "false" });
						that.link.attr("active", function(l) { return DATA_PROVIDER.is_connected_links(l, d.id) ? "true" : "false"   })
					}
					d3.select(this).attr("active", "true");
				})
				.on('mouseout', function(d) {
					that.node.attr('active', "");
					that.link.attr('active', "");
				})
				.on("click", this.show_info)
				.call(force.drag);

			var n;
			this.node.each(function() {
				n = d3.select(this);
				if (n.attr("class") !== "user") {
					n.append("circle")
						.attr("r", function(d) { return Math.sqrt(d.count) || 10 } );
				} else {
					d3.select("#image image").attr("xlink:href", data.user_info.image[1]["#text"]);
					
					var img = new Image();
					img.src = data.user_info.image[1]["#text"];
					img.onload = function() {
						var width = this.width;
						var height = this.height;

						width > height ? width = height : height = width;

						n.append("circle")
							.attr("fill", "url(#image)")
							.attr("r", width / 2);
					}
					
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
					if (!data.error && data.topartists["@attr"]) {
						DATA_PROVIDER.prepare_lastfm_data(data);
						var sparql = $.ajax({
							type: "POST",
							url: "/sparql/",
							dataType: "json",
							data: that.build_query(data.topartists.artist),
							success: function(data) {
								
							},
							error: function() {
								console.error('failed to query SPARQL endpoint');
							}
						});
						var user_info = $.ajax({
							url: URLS.lastfm_user_info.format(data.topartists["@attr"].user)
						});
						$.when(sparql, user_info).then(function(sparql_, user_info_) {
							sparql_ = sparql_[0];
							user_info_ = user_info_[0];

							DATA_PROVIDER.set_data("user_info", user_info_.user);
							DATA_PROVIDER.prepare_mdb_data(sparql_.results.bindings);
							VISUALISER.render(DATA_PROVIDER.get_data());
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
				$("#info").hide();
				$('#lastfm_name').val('').focus();
				$('#main-wrapper').removeAttr('class');
			});
		}
	};

	new App();
})();