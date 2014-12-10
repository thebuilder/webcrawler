var webpage = require('webpage');
var url = require('url');
var fs = require('fs');
var varname = require('varname');

function Crawler(domain, opts) {
	if (domain.charAt(domain.length-1) != "/") domain += "/";
	domain = url.parse(domain);

	var delay = 0;
	var visitedURLs = {};
	var urlsToVisit = [];
	var sizes = opts.sizes || [{
		width: 1280,
		height: 800
	}];


	var page = webpage.create();
	page.viewportSize = sizes[0];

	//Clean last run
	if (fs.exists("runs/" + domain.hostname)) {
		fs.removeTree("runs/" + domain.hostname);
	}

	page.onConsoleMessage = function(msg, lineNum, sourceId) {
		console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
	};

	page.onResourceError = function(resourceError) {
		console.log('Unable to load resource (#' + resourceError.id + ' URL:' + resourceError.url + ')');
		console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
		logError('Unable to load resource (' + resourceError.errorCode + '): ' + resourceError.url);
	};

	page.onError = function(msg, trace) {
		var msgStack = ['ERROR: ' + msg];

		if (trace && trace.length) {
			msgStack.push('Stack trace:');
			trace.forEach(function(t) {
				msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
			});
		}

		console.error(msgStack.join('\n'));
	};

	crawl(domain.href);

	function crawl(url) {
		if ( visitedURLs[url]) {
			crawlNext();
			return;
		}

		console.log("Open " + url);
		page.viewportSize = sizes[0]; //Ensure viewport is reset
		//Open the url
		page.open(url, pageLoaded);
	}

	function pageLoaded(status) {
		visitedURLs[page.url] = {loaded:true, status:status};

		//console.log("Loaded: " + page.url, status);
		if (status === 'success') {
			scrapeLinks();
			//Delay capture?
			setTimeout(function() {
				captureScreenshot();
				crawlNext();
			}, delay);
		} else {
			crawlNext();
		}

	}

	function captureScreenshot() {
		//Render the page
		var size;
		for (var i = 0; i < sizes.length; i++) {
			//if (i > 0) {
				page.viewportSize = sizes[i];
				size = page.viewportSize.width + "_" + page.viewportSize.height;
			//}
			page.render("runs/" + getHostName() + "/" + (size ? size + "/" : "") + getPageName() + ".png");
		}

		page.viewportSize = sizes[0];
	}

	function crawlNext() {
		if (urlsToVisit.length) {
			crawl(urlsToVisit.shift());
		} else {
			console.log("All done");
			phantom.exit();
		}
	}

	function scrapeLinks() {
		var hrefs = page.evaluate(function () {
			return Array.prototype.slice.call(document.querySelectorAll("a"), 0).map(function (link) {
				var href = link.getAttribute("href");
				//Filter hrefs
				if (!href || href.indexOf("mailto:") == 0 || href.indexOf("tel:") == 0 || href.indexOf("javascript:") == 0) return null;
				return href;
			});
		});

		var href;
		for (var i = 0; i < hrefs.length; i++) {
			if (!hrefs[i]) continue;
			//Resolve urls to absolute paths
			href = url.resolve(domain.href, hrefs[i]);
			var queryIndex = href.indexOf('#');
			if (queryIndex > 0) href = href.substr(0, queryIndex);

			if (url.parse(href).hostname == domain.hostname) {
				urlsToVisit.push(href);
			}
		}
	}

	function logError(msg) {
		if (!fs.exists("runs/" + getHostName() + "/errors.txt")) {
			//First write. Print some details?
		}
		fs.write("runs/" + getHostName() + "/errors.txt", msg + "\n", 'a');
	}

	function getHostName() {
		var u = url.parse(page.url);
		return u.hostname;
	}
	function getPageName() {
		var u = url.parse(page.url);
		var pathName = varname.dash(url.parse(decodeURI(page.url)).pathname);
		if (!pathName || !pathName.length) pathName = "root";
		return pathName;
	}

	return {
		domain: domain
	}
}

module.exports = Crawler;