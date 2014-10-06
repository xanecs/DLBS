console.log('Import framework and librarys...');
var express = require('express');
var url = require('url');
var path = require('path');
var fs = require('fs');
var config = require('./config.json');
var whitelist = require('./whitelist.json');
var utils = require('./utils.js');
var compile = require('./commands/compile.js');
var manage = require('./commands/manage.js');
var app = express();

console.log('Configure framework...');
app.use(express.bodyParser());

console.log("Clean directorys...");
utils.cleanDirectories();

console.log('Create event handlers...');
manage.startCleaner();

app.get('/output/*', function(req, res) {
	if (!isKnownHost(req, res)){
		return;
	}

	var mimeTypes = {
			"pdf": "application/pdf",
			"dvi": "application/x-dvi",
			"log": "text/x-log"};
	var uri = unescape(url.parse(req.url).pathname);
	var filename = uri.substr(uri.lastIndexOf("/"));
	var filepath = path.join(config.outputpath, filename);
	var stats;

	try {
		stats = fs.lstatSync(filepath); // throws if path doesn't exist
	} catch (e) {
		res.setHeader('Content-Type', 'text/plain');
		res.write('404 Not Found\n');
		res.end();
		return;
	}

	if (stats.isFile()) {
		// path exists, is a file
		var extention = path.extname(filename).split(".")[1];
		switch(extention){
			case "dvi": case "pdf": case "log":
				var mimeType = mimeTypes[extention];
				res.writeHead(200, {'Content-Type': mimeType} );

				var fileStream = fs.createReadStream(filepath);
				fileStream.pipe(res);
				break;
			default:
				res.writeHead(403, {'Content-Type': 'text/plain'});
				res.end("Only .dvi, .pdf and .log files allowed");
		}

	}
	return;
});

app.post('/compile', function(req, res) {
	if (!isKnownHost(req, res)){
		return;
	}
	res.setHeader('Content-Type', 'application/json');

	var job = manage.createjob(req.body);
	compile.compile();

	res.end(JSON.stringify(job));
	return;
});

app.post('/getjob', function(req, res) {
	if (!isKnownHost(req, res)){
		return;
	}
	res.setHeader('Content-Type', 'application/json');

	var job = manage.getJob(req.body.jobid);
	res.end(JSON.stringify(job));
	return;
});

var port = process.env.PORT || config.port

app.listen(port);
console.log('Listening on port ' + port + '...\n');

var isKnownHost = function(request, response) {
	if (!config.whitelist)
		return true;

	for (var i = 0; i < whitelist.allowed_hosts.length; i++){
		if (request.connection.remoteAddress == whitelist.allowed_hosts[i].ip){
			return true;
		}
	}
	response.writeHeader(403, { 'Content-Type': 'text/plain' });
	response.end("403 - Forbidden");
	return false;
};
