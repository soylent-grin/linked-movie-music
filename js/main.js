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

	var Visualiser = function() {
		this._user = null;
		this._data = {};
	};
	Visualiser.prototype = {
		constructor: Visualiser,
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
					founded = that.get_movie(artist, movie.movieName.value)
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
			this.build_layout();
		},
		build_layout: function() {
			function on_tick() {
				link.attr("x1", function(d) { return d.source.x; })
				      .attr("y1", function(d) { return d.source.y; })
				      .attr("x2", function(d) { return d.target.x; })
				      .attr("y2", function(d) { return d.target.y; });

				node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
			}

			var svg = d3.select("svg").style("display", "block");
			$('#lastfm_name').fadeOut();

			var force = d3.layout.force()
						    .size([document.getElementById('canvas').offsetWidth, document.getElementById('canvas').offsetHeight])
						    .on("tick", on_tick);

			var link = svg.selectAll(".link");

   			var nodes = flatten(this._data);
      		var links = d3.layout.tree().links(nodes);
      		
      		force
		      .nodes(nodes)
		      .charge(-140)
		      .distance(70)
		      .gravity(0.05)
		      .links(links)
		      .start();

		      // Update the links…
			link = link.data(links, function(d) { return d.target.id; });

			// Exit any old links.
			link.exit().remove();

			// Enter any new links.
			link.enter().insert("line", ".node")
				.attr("class", "link")
				.attr("x1", function(d) { return d.source.x; })
				.attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });

/*
			// Enter any new nodes.
			node.enter().append("circle")
				.attr("class", function(d) { return d.type })
				.attr("cx", function(d) { return d.x; })
				.attr("cy", function(d) { return d.y; })
				.attr("r", function(d) { 
					if (d.type === "user") {
						return 40;
					} else {
						return Math.sqrt(d.count) || 4.5; 
					}
				})
				.call(force.drag);
*/
			var node = svg.selectAll(".node")
				.data(nodes)
				.enter().append("g")
				.attr("class", "node")
				.call(force.drag);

			node.append("circle")
				.attr("class", function(d) { return d.type; })
				.style("fill", function(d) { if (d.type == "user") { return "url(#image)"; }})
				.attr("r", function(d) { 
					if (d.type === "user") {
						return 30;
					} else {
						return Math.sqrt(d.count) || 10; 
					}
				});

			node.append("text")
				.attr("dx", 12)
				.attr("dy", ".35em")
				.text(function(d) { return d.name });
		}
	};

	function flatten(root) {
		var nodes = [], i = 0;

		function recurse(node) {
		if (node.children) node.children.forEach(recurse);
		if (!node.id) node.id = ++i;
		nodes.push(node);
		}

		recurse(root);
		return nodes;
	}

	var App = function() {
		this.vis = new Visualiser();
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
			$.ajax({
				url: URLS.lastfm_users_top_artists.format(name),
				success: function(data) {
					that.vis.prepare_lastfm_data(data);
					var sparqler = new SPARQL.Service(URLS.linkedmdb);
					sparqler.setPrefix("dc", "http://purl.org/dc/terms/"); 
					sparqler.setOutput("json");
					sparqler.query(that.build_query(data.topartists.artist), {
						success: function(json) { 
							that.vis.prepare_mdb_data(json.results.bindings);
						}
					});
				},
				error: function() {

				}
			});
		},
		add_event_listeners: function() {
			var that = this;
			$('#lastfm_name').focus().on('keyup', function(e) {
				alert('Key pressed: ' + e.keyCode);
				if (e.which == 13) {
					that.process($(this).val());
				}
			});
		}
	};

	new App();
/*

	function prepare_nodes(data) {
		var array = [];
		var id = 0;

		function push_to(el, type) {
			el.id = id++;
			el.type = type;
			array.push(el);
		}
		data.producers.forEach(function(p) {
			push_to(p, "producer");
		});
		data.composers.forEach(function(c) {
			push_to(c, "composer");
		});

		console.log(array);
		return array;
	}

	function prepare_links(data) {
		var array = [];
		var link;

		data.tracks.forEach(function(t) {
			link = {};
			for (var i = 0; i < data.producers.length; i++) {
				if (data.producers[i].name === t.producer) {
					link.source = data.producers[i].id;
					break;
				}
			}
			for (var j = 0; j < data.composers.length; j++) {
				if (data.composers[j].name === t.composer) {
					link.target = data.composers[j].id;
					break;
				}
			}
			array.push(link);
		});

		console.log(array);
		return array;
	}

	function tick() {
		link.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

		node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
	}

	function on_mouseover() {
		arguments

	}

	var svg = d3.select("svg");


console.log(document.getElementById('canvas').offsetWidth, document.getElementById('canvas').offsetHeight);
	var layout = d3.layout.force()
					.size([document.getElementById('canvas').offsetWidth, document.getElementById('canvas').offsetHeight])
					.on("tick", tick);


	var nodes = prepare_nodes(mock);
	var links = prepare_links(mock, nodes);

	layout.nodes(nodes)
			.links(links)
			.gravity(.05)
		    .distance(100)
		    .charge(-200)
			.start();
	var link = svg.selectAll(".link")
		.data(links)
		.enter().append("line")
		.attr("class", "link");

	var node = svg.selectAll(".node")
		.data(nodes)
		.enter().append("g")
		.attr("class", "node")
		.call(layout.drag)

	node.append("circle")
		.attr("class", function(d) { console.log(d.type); return d.type })
		.attr("r", function(d) { return Math.sqrt(d.total) * 6 || 4.5; })
		.on("mouseover", on_mouseover);

	node.append("text")
		.attr("dx", 12)
		.attr("dy", ".35em")
		.text(function(d) { return d.name });

*/
})();