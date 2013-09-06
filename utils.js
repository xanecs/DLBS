var path = require('path');
var fs = require('fs');
var config = require('./config.json');
rmDir = function(dirPath) {
	var files;
	try {files = fs.readdirSync(dirPath); }
    catch(e) { console.log(e); return; }
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

exports.cleanDirectories = function(){
	if(fs.existsSync(config.compilepath)) {
		rmDir(config.compilepath);
	}
	if(fs.existsSync(config.outputpath)) {
		rmDir(config.outputpath);
	}
	fs.mkdirSync(config.compilepath);
	fs.mkdirSync(config.outputpath);
};