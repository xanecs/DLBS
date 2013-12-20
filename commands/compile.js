/**
 * Excecute: /compile
 */


var http = require('http');
var path = require('path');
var manage = require('./manage.js');
var fs = require('fs');
var node_fs = require('node-fs');
var url = require('url');
var config = require('./../config.json');
var child_process = require('child_process');

var job;
var isCompiling = false;

exports.compile = function(){
	if (!isCompiling)
		compilequeue();
};

compilequeue = function(){
	var pending = manage.getNextPending();
	if ( pending !== null){
		isCompiling = true;
		
		job = pending;
		console.log("Job " + job.jobid + " | Start compiling");
		downloadFiles();
	}
	else {
		isCompiling = false;
		return;
	}
};



var downloadFiles = function(){
	if (job.files.length > 0){
		for (var i = 0; i < job.files.length; i++){
			download_file_httpget(job.files[i].url, job.files[i].path);
		}
	} else {
		job.state = "error";
		job.message = "Bad Input: files not reachable";
		job.finished = Date.now();
		nextQueue();
	}
};

var sucessfullydownloaded = 0;
var download_file_httpget = function(file_url, file_path) {
	try{
		console.log(file_url);
		/*var options = {
			host: url.parse(file_url).host,
			port: url.parse(file_url).port || 80,
			path: url.parse(file_url).pathname
		};*/
		
		node_fs.mkdirSync(path.join(config.compilepath, file_path.substr(0, file_path.lastIndexOf('/'))), 0777, true);

		var file = fs.createWriteStream(path.join(config.compilepath, file_path), {mode: 0777});
		
		http.get(file_url, function(res) {
			res.on('data', function(data) {
				file.write(data);
			}).on('end', function() {
				file.end();
				sucessfullydownloaded++;
				if (sucessfullydownloaded >= job.files.length){
					sucessfullydownloaded = 0;
					compile();
				}
			});
		});
	} catch(e){
		job.state = "error";
		job.message = e;
		job.finished = Date.now();
		console.log(e);
		nextQueue();
	}
	
};

var compile = function(){
	var pdflatex = config.pdflatex + " --interaction=nonstopmode --output-directory=\"" + config.compilepath + "\" --output-format=" + job.format + " \"" + path.join(config.compilepath, job.mainfile) + "\"";
	console.log(pdflatex);
	try{
	    child_process.exec(pdflatex, {cwd: config.compilepath}, function(err, stdout, stderr){
		    if(stderr) {
		    	console.log(stdout);
		    	console.log(stderr);
		    }
		    provide();
	    });
	} catch(e) {
	    job.state = "error";
		job.message = e;
		job.finished = Date.now();
		nextQueue();
	}
};

var provide = function(){
	try{
		var filename = job.mainfile.split(/(\\|\/)/g).pop();
		var oldpdfpath = path.join(config.compilepath, filename.substr(0, filename.lastIndexOf('.'))) + ".";
		var newpdfpath = config.outputpath + "/" + job.jobid + ".";
	    console.log(oldpdfpath)

	    if (fs.existsSync(oldpdfpath + job.format)) 
		    fs.createReadStream(oldpdfpath + job.format).pipe(fs.createWriteStream(newpdfpath + job.format));
	    if (fs.existsSync(oldpdfpath + "log")) 
		    fs.createReadStream(oldpdfpath + "log").pipe(fs.createWriteStream(newpdfpath + "log"));
		    
	    job.state = "done";
	    job.lastchange = Date.now();
	    console.log("Job " + job.jobid + " | Finished compiling (Output: "+ job.format + ", Files: " + job.files.length + ")");
	}
	catch(e){
		job.state = "error";
		job.message = e;
		job.lastchange = Date.now();
		console.log("Job " + job.jobid + " | " + e);
	}
	
	nextQueue();
};

var nextQueue = function(){	
	manage.updateJob(job.jobid, job);
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
