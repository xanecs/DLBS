/**
 * Excecute: /compile
 */


var http = require('http');
var path = require('path');
var manage = require('./manage.js');
var fs = require('fs');
var url = require('url');
var config = require('./../config.json');
var exec = require('child_process').exec;

queue = [];
isCompiling = false;

exports.compile = function(){
	if (!isCompiling)
		compilequeue();
};

compilequeue = function(){
	var pending = manage.getNextPending();
	if ( pending !== null){
		isCompiling = true;
		
		queue[0] = pending;
		console.log("Job " + queue[0].jobid + " | Start compiling");
		prepareDirectories(queue[0]);
	}
	else {
		isCompiling = false;
		return;
	}
};

var prepareDirectories = function(object){
	
	try{
		//Delete directory
		if(fs.existsSync(config.compilepath)) {
			rmDir(config.compilepath);
		}
		
		//Create directory
		fs.mkdirSync(config.compilepath);
		
		//Create requested directory
		var highestlevel = 0;
		for (var i = 0; i < queue[0].folders.length; i++){
			var level = path.join(queue[0].folders[i].path, queue[0].folders[i].name).split("/").length - 1;
			queue[0].folders[i].level = level;
			if (level > highestlevel){
				highestlevel = level;
			}
		}
		for (var x = 0; x <= highestlevel; x++)
			for (i = 0; i < queue[0].folders.length; i++){
				if (queue[0].folders[i].level == x)
					fs.mkdirSync(config.compilepath + path.join(queue[0].folders[i].path , queue[0].folders[i].name));
			}
		
		//Download files
		downloadFiles(queue[0]);
	}
	catch(e){
		queue[0].state = "error";
		queue[0].message = e;
		queue[0].finished = Date.now();
		console.log(e);
		nextQueue();
	}
};

var downloadFiles = function(){
	if (queue[0].files.length > 0){
		for (var i = 0; i < queue[0].files.length; i++){
			download_file_httpget(queue[0].files[i].url, queue[0].files[i].name, queue[0].files[i].path);
		}
	} else {
		queue[0].state = "error";
		queue[0].message = "Bad Input: files not reachable";
		queue[0].finished = Date.now();
		nextQueue();
	}
};

var sucessfullydownloaded = 0;
var download_file_httpget = function(file_url, file_name, subdir) {
	try{
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
	} catch(e){
		queue[0].state = "error";
		queue[0].message = e;
		queue[0].finished = Date.now();
		nextQueue();
	}
	
};

var compile = function(){
	var pdflatex = "cd " + config.compilepath +"; pdflatex -interaction=nonstopmode --output-format='" + queue[0].format + "' " + queue[0].mainfile + ";";
	exec(pdflatex, function(err, stdout, stderr){
		provide();
	});
};

var provide = function(){
	try{
	var pos = queue[0].mainfile.lastIndexOf(".");
	
		var oldpdfpath = config.compilepath + "/" + queue[0].mainfile.substr(0, pos) + ".";
		var newpdfpath = config.outputpath + "/" + queue[0].jobid + ".";
	
		fs.createReadStream(oldpdfpath + queue[0].format).pipe(fs.createWriteStream(newpdfpath + queue[0].format));
		fs.createReadStream(oldpdfpath + "log").pipe(fs.createWriteStream(newpdfpath + "log"));
		
		queue[0].state = "done";
		queue[0].lastchange = Date.now();
		console.log("Job " + queue[0].jobid + " | Finished compiling (Output: "+ queue[0].format + ", Files: " + queue[0].files.length + ", Folders: " + queue[0].folders.length + ")");
	}
	catch(e){
		queue[0].state = "error";
		queue[0].message = e;
		queue[0].lastchange = Date.now();
		console.log("Job " + queue[0].jobid + " | " + e);
	}
	
	nextQueue();
};

var nextQueue = function(){	
	manage.updateJob(queue[0].jobid, queue[0]);
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