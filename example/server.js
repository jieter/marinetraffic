var connect = require('connect');

var path = __dirname + '/';
var port = 8888;

var marinetraffic = require('../index.js');

connect()
	.use(connect.logger('dev'))
	.use(connect.static(path))
	.use(connect.query())
	.use(function (req, res, next) {
		if(req.url.substr(0, 14) === '/marinetraffic') {
			marinetraffic(req.query.mmsi, function (err, result) {
				res.end(JSON.stringify(result.toGeoJson()));
			});
		} else {
			next();
		}
	})
	.listen(port);

console.log('Started server for: ' + path);
console.log('Listening on ' + port + '...');
console.log('Press Ctrl + C to stop.');
