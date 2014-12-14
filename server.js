var http = require("http"),
	url = require("url"),
	path = require("path"),
	fs = require("fs"),
	SparqlClient = require('sparql-client'),
	port = process.argv[2] || 3301;

var util = require('util');

http.createServer(function(request, response) {

	var uri = url.parse(request.url).pathname;
	console.log(request.method  + ' ' + uri);

	if(request.method === "POST") {
		if (uri.indexOf("/sparql/") === 0) {
			var query = url.parse(request.url, true).query;
			if (query && query.endpoint) {
				query.body = '';
				request.on('data', function(data) {
					query.body += data;
					if(query.body.length > 1e7) {
						response.writeHead(413, 'Request Entity Too Large', {'Content-Type': 'text/html'});
					}
				});
				request.on('end', function() {
					try {
						var client = new SparqlClient(query.endpoint);
						client.query(query.body).execute(function(err, results) {
							response.writeHead(200, { 'Content-Type': 'application/json' });
							response.end(JSON.stringify(results));
						});
					} catch(e) {
						console.log(e.message);
						response.writeHead(400);
						response.end('Bad Request');
					}
				});
			} else {
				response.writeHead(400);
				response.end('Bad Request');
			}
		} else {
			response.writeHead(405, {"Content-Type": "text/plain"});
			response.write("405 Method not allowed\n");
			response.end();
			return;
		}
	} else {
		var filename = path.join(process.cwd(), uri);

		path.exists(filename, function(exists) {
			if(!exists) {
				response.writeHead(404, {"Content-Type": "text/plain"});
				response.write("404 Not Found\n");
				response.end();
				return;
			}

			if (fs.statSync(filename).isDirectory()) {
				 filename += '/index.html';
			}

			fs.readFile(filename, "binary", function(err, file) {
				if(err) {        
					response.writeHead(500, {"Content-Type": "text/plain"});
					response.write(err + "\n");
					response.end();
					return;
				}

				var ext;
				switch(path.extname(request.url)) {
					case ".png":
					ext = "image/png";
					break;
					case ".svg":
					ext = "image/svg+xml";
					break;
					case ".gif":
					ext = "image/gif";
					break;
				}
				ext != undefined ? response.writeHead(200, {'Content-Type':ext}) : response.writeHead(200);
				response.write(file, "binary");
				response.end();
			});
		});
	}
}).listen(parseInt(port, 10));

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");