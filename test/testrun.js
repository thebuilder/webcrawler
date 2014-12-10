var Crawler = require('../');


var options = {
	sizes: [{
		width: 1280,
		height: 800
	},{
		width: 1024,
		height: 640
	},{
		width: 320,
		height: 560
	}]
};

var crawler = new Crawler('http://localhost:3000', options);