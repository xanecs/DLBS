var express = require('express');
var config = require('./config.json');
var app = express();

app.use(express.bodyParser());

var jobidcounter = 0;
app.post('/compile', function(req, res) {
	res.setHeader('Content-Type', 'text/plain');
	
	req.body.jobid = jobidcounter++;
	
	//TODO: Validate Json!
	queue.push(req.body);
	
	if (!isCompiling)
		compilequeue();
	res.end('{ "status": "compiling", "jobid": "' + req.body.jobid + '" }');
});

app.listen(config.port);
console.log('Listening on port ' + config.port);

var http = require('http');
var path = require('path');
var fs = require('fs');
var url = require('url');
var exec = require('child_process').exec;

var queue = [];
var isCompiling = false;

//Make directories
if (!fs.existsSync(config.outputpath)){
	fs.mkdirSync(config.outputpath);
}


var compilequeue = function(){
	if (queue.length > 0){
		isCompiling = true;
		
		prepareDirectories(queue[0]);
	}
	else {
		isCompiling = false;
		return;
	}
};

var prepareDirectories = function(object){
	
	//Delete directory
	if(fs.existsSync(config.compilepath)) {
		rmDir(config.compilepath);
	}
	
	//Create directory
	fs.mkdirSync(config.compilepath);
	
	//Create requested directory
	for (var i = 0; i < queue[0].folders.length; i++){
		fs.mkdirSync(config.compilepath + queue[0].folders[i].path + queue[0].folders[i].name);
	}
	
	//Download files
	downloadFiles(queue[0]);
};

var downloadFiles = function(){
	if (queue[0].files.length > 0){
		for (var i = 0; i < queue[0].files.length; i++){
			download_file_httpget(queue[0].files[i].url, queue[0].files[i].name, queue[0].files[i].path);
		}
	} else {
		throw new Exception("Could not compile! No files requested");
	}
};

var sucessfullydownloaded = 0;
var download_file_httpget = function(file_url, file_name, subdir) {
	var options = {
		host: url.parse(file_url).host,
		port: 80,
		path: url.parse(file_url).pathname
	};
	
	var file = fs.createWriteStream(config.compilepath + subdir + "/" + file_name);
	
	http.get(options, function(res) {
		res.on('data', function(data) {
			file.write(data);
		}).on('end', function() {
			file.end();
			
			sucessfullydownloaded++;
			if (sucessfullydownloaded >= queue[0].files.length){
				sucessfullydownloaded = 0;
				compile();
			}
		});
	});
};

var compile = function(){
	var pdflatex = "cd " + config.compilepath +"; pdflatex -interaction=nonstopmode --output-format='" + queue[0].output + "' " + queue[0].mainfile + ";";
	exec(pdflatex, function(err, stdout, stderr){
		
		provide();
	});
};

var provide = function(){
	var pos = queue[0].mainfile.lastIndexOf(".");
	var oldpath = config.compilepath + "/" + queue[0].mainfile.substr(0, pos) + "." + queue[0].output;
	var newpath = config.outputpath + "/job" + queue[0].jobid + "." + queue[0].output;
	
	fs.createReadStream(oldpath).pipe(fs.createWriteStream(newpath));
	
	console.log(queue[0].jobid + " | Finished compiling (Output: "+ queue[0].output + ", Files: " + queue[0].files.length + ", Folders: " + queue[0].folders.length + ")");
	
	queue.splice(0, 1);
	compilequeue();
};

var rmDir = function(dirPath) {
	var files;
	try {files = fs.readdirSync(dirPath); }
    catch(e) { return; }
    if (files.length > 0)
      for (var i = 0; i < files.length; i++) {
        var filePath = dirPath + '/' + files[i];
        if (fs.statSync(filePath).isFile())
          fs.unlinkSync(filePath);
        else
          rmDir(filePath);
      }
    fs.rmdirSync(dirPath);
};