var webpage = require('webpage');
var url = require('url');
var S = require('string');

function Crawler(domain, opts) {
	domain = url.parse(domain);
	opts = opts || {};

	var visitedURLs = {};
	var urlsToVisit = [];

	var page = webpage.create();
	page.viewportSize = {
		width: 1280,
		height: 800
	};

	page.onConsoleMessage = function(msg, lineNum, sourceId) {
		console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
	};

	page.onResourceError = function(resourceError) {
		console.log('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
		console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
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

	function crawl(url) {
		if ( visitedURLs[url]) {
			crawlNext();
			return;
		}

		console.log("Open " + url);
		//Open the url
		page.open(url, pageLoaded);
	}

	function pageLoaded(status) {
		visitedURLs[page.url] = {loaded:true, status:status};
		console.log("Loaded: " + page.url, status);
		if (status === 'success') {
			scrapeLinks();
			captureScreenshot();
		} else {
		}

		crawlNext();
	}

	function captureScreenshot() {
		var u = url.parse(page.url);
		var pathName = S(url.parse(decodeURI(page.url)).pathname).replaceAll("/", "_");
		if (!pathName || !pathName.length) pathName = "root";

		//Render the page
		page.render("screenshots/" + u.hostname + "/" + pathName + ".png");
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

	return {
		crawl: crawl,
		domain: domain
	}
}

module.exports = Crawler;