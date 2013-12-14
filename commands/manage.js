/**
 * export functions:
 * -> JOB.STATUS	getjob( INT jobid);
 * -> INT			createjob();
 * 
 */

var fs			= require("fs");
var crypto		= require("crypto");
var path		= require("path");
var config		= require("./../config.json");

var jobs		= [];

exports.startCleaner = function(){
	if (config.enable_filetimeout){
		var interval = config.filetimeout;
		setInterval(function(){
			for (var i = 0; i < jobs.length; i++){
				if (jobs[i].state != "deleted"){
					var lifetime = Date.now() - jobs[i].lastchange;
					if (lifetime >= interval) {
						try{
							fs.unlinkSync(path.join(config.outputpath, jobs[i].jobid + "." + jobs[i].format));
							fs.unlinkSync(path.join(config.outputpath, jobs[i].jobid + ".log"));
						} catch(e) {
							console.log("Job " + jobs[i].jobid + " | " + e);
						}
						jobs[i] = { jobid: jobs[i].jobid, state: "deleted", lastchange: Date.now()};
						console.log("Job " + jobs[i].jobid + " | Deleted after " + lifetime / 1000 + " seconds");
					}
				}
			}
		}, interval / 2);
		console.log("Any output file will be deleted after " + config.filetimeout / 1000 + " seconds if nobody is using it...");
	}
};

exports.createjob = function(json){
	_jobid = getRandomId();
	for (var x = 0; x < jobs.length; x++){
		if (jobs[x].jobid == _jobid){
			createjob(json);
			return;
		}
	}
	var validate = validateCompileJson(json);
	var job = null;
	if (validate !== ""){
		job = { jobid: _jobid, 
				state: "error", 
				message: validate, 
				input: json, 
				lastchange: Date.now()
			};
	}else{
		job = { jobid: _jobid, 
			state: "pending", 
			format: json.format, 
			mainfile: json.mainfile, 
			files: json.files, 
			created: Date.now()
		};
	}
	
	jobs.push(job);
	return job;
};

exports.getJob = function(jobid){
	var currentjob = null;
	for (var i = 0; i < jobs.length; i++){
		if (jobs[i].jobid == jobid){
			currentjob = jobs[i];
		}
	}
	
	if (currentjob === null)
		return { jobid: jobid, state: "error", message: "Bad Input: Jobid doesn't exist"};
	
	if ( currentjob.state == "done"){
		return { jobid: currentjob.jobid, 
			state: "done", 
			output: { 
				document: config.webroot + "/output/" + currentjob.jobid + "." + currentjob.format, 
				log: config.webroot + "/output/" + currentjob.jobid + ".log"
			},
			format: currentjob.format };
	} else if (currentjob.state == "pending") {
		return { jobid: currentjob.jobid, 
			state: "pending", 
			format: currentjob.format
		};
	} else if (currentjob.state == "error") {
		return { jobid: currentjob.jobid, 
			state: "error",
			message: currentjob.message
		};
	}
};

exports.getNextPending = function(){
	for (var i = 0; i < jobs.length; i++){
		if (jobs[i].state == "pending")
			return jobs[i];
	}
	return null;
};

exports.updateJob = function(jobid, job){
	for (var i = 0; i < jobs.length; i++){
		if (jobs[i].jobid == jobid)
			jobs[i] = job;
	}
};

var validateCompileJson = function(json){
	try
	{
		if (json.format != "pdf" && json.format != "dvi"){
			return "Bad Input: format isn't pdf or dvi (format: " + json.format + ")";
		}
		if (json.mainfile === "" || json.mainfile === null){
			return "Bad Input: no mainfile selected";
		}
	} catch(e) {
		return "Bad Input: Unknown error in json (" + e + ")";
	}
	return "";
};

var getRandomId = function(){
	var precode = "";
	for (var i = 0; i <= 10; i++){
		precode += Math.floor((Math.random() * 1000000) + 1);
	}
	var md5sum = crypto.createHash('md5');
	md5sum.update(precode);
	return md5sum.digest('hex');
};