;(function() {
	'use strict';

	var mock = {
		producers: [
			{
				name: 'Реж 1',
				total: '22'
			},
			{
				name: 'Реж 2',
				total: '2'
			},
			{
				name: 'Реж 3',
				total: '29'
			},
			{
				name: 'Реж 4',
				total: '12'
			},
			{
				name: 'Реж 5',
				total: '19'
			},
			{
				name: 'Реж 6',
				total: '5'
			}
		],
		composers: [
			{
				name: 'Музыкант 1',
				total: '7'
			},
			{
				name: 'Музыкант 2',
				total: '6'
			},
			{
				name: 'Музыкант 3',
				total: '33'
			},
			{
				name: 'Музыкант 4',
				total: '13'
			},
			{
				name: 'Музыкант 5',
				total: '26'
			},
			{
				name: 'Музыкант 6',
				total: '20'
			},
			{
				name: 'Музыкант 7',
				total: '15'
			},
			{
				name: 'Музыкант 8',
				total: '12'
			}
		],
		tracks: [
			{
				name: 'Трек 1',
				producer: 'Реж 1',
				composer: 'Музыкант 3'
			},
			{
				name: 'Трек 2',
				producer: 'Реж 1',
				composer: 'Музыкант 1'
			},
			{
				name: 'Трек 3',
				producer: 'Реж 1',
				composer: 'Музыкант 2'
			},
			{
				name: 'Трек 4',
				producer: 'Реж 2',
				composer: 'Музыкант 3'
			},
			{
				name: 'Трек 5',
				producer: 'Реж 1',
				composer: 'Музыкант 4'
			},
			{
				name: 'Трек 6',
				producer: 'Реж 3',
				composer: 'Музыкант 2'
			},
			{
				name: 'Трек 7',
				producer: 'Реж 4',
				composer: 'Музыкант 5'
			},
			{
				name: 'Трек 8',
				producer: 'Реж 4',
				composer: 'Музыкант 1'
			},
			{
				name: 'Трек 9',
				producer: 'Реж 5',
				composer: 'Музыкант 6'
			},
			{
				name: 'Трек 10',
				producer: 'Реж 5',
				composer: 'Музыкант 7'
			},
			{
				name: 'Трек 11',
				producer: 'Реж 5',
				composer: 'Музыкант 8'
			}
		]
	};

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


})();