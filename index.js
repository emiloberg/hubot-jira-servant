var fs = require('fs');
var Path = require('path');

module.exports = function(robot) {
	var path = Path.resolve(__dirname, 'dist');
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function(file) {
			if (file.match(/^module.*\.js$/g)) {
				robot.loadFile(path, file);
			}
		});
	}
};
