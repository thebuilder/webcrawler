var Crawler = require('./js/crawler');

var crawler = new Crawler('http://www.in2media.dk');
crawler.crawl(crawler.domain);