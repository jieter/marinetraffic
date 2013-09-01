'use strict';

var http = require('http');
var _ = require('underscore');

// swap an [lat, lng]-array, or an array of [lat, lng]-arrays.
var swap = function (array) {
	if (array.length === 2 && typeof array[0] === 'number') {
		return [array[1], array[0]];
	} else {
		var ret = [];
		array.forEach(function (value) {
			ret.push(swap(value));
		});
		return ret;
	}
};

// difference in seconds between a and b
var timeDiff = function (a, b) {
	return Math.abs((new Date(a) - new Date(b)) / 1000);
};

// return average for array of numbers,
// or, if key is defined, for key in array of objects.
var average = function (array, key) {
	return array.reduce(function (a, b) {
		if (key) {
			return a + b[key];
		} else {
			return a + b;
		}
	}, 0) / array.length;
};

// round a number with `digits` decimals
var formatNum = function (num, digits) {
	var pow = Math.pow(10, digits || 5);
	return Math.round(num * pow) / pow;
};

// two arrays of objects using unique key.
// keeping the reference to dest
var union = function (dest, array, key) {
	var data = {};
	[dest, array].forEach(function (array) {
		array.forEach(function (elem) {
			data[elem[key]] = elem;
		});
	});

	// empty original array
	dest.length = 0;
	// put the new values in.
	for (var i in data) {
		dest.push(data[i]);
	}
	return dest;
};


// construct a GeoJSON Point feature
var point = function (point) {
	return {
		type: 'Feature',
		geometry: {
			type: 'Point',
			coordinates: swap(point.latlng)
		},
		properties: _.omit(point, 'latlng')
	};
};

// construct a GeoJSON LinString feature
var lineString = function (points) {
	var latlngs = points.map(function (v) {
		return v.latlng;
	});

	var startTime = points[0].timestamp;
	var endTime = points[points.length - 1].timestamp;
	return {
		type: 'Feature',
		geometry: {
			type: 'LineString',
			coordinates: swap(latlngs),
		},
		properties: {
			'avg_sog': formatNum(average(points, 'speed'), 2),
			'avg_cog': Math.round(average(points, 'course')),
			'startTime': startTime,
			'endTime': endTime,
			'duration': timeDiff(endTime, startTime)
		}
	};
};

// construct a GeoJSON file
var toGeoJson = function (json, options) {
	options = _.extend({
		points: false, // output Point features for each track point
		speedThreshold: 0.51, // ignore points with speeds below threshold
		timeThreshold: 2 * 60 * 60 // 2h split = new leg.
	}, options);

	var features = [];

	var prev, splitHere, lastPt;
	var line = [];

	json.forEach(function (value, key) {
		lastPt = (key === json.length - 1);

		splitHere = (options.timeThreshold > 0 && prev) ?
			timeDiff(prev.timestamp, value.timestamp) > options.timeThreshold : false;

		if (value.speed >= options.speedThreshold) {
			line.push(value);
			if (options.points) {
				features.push(point(value));
			}
		}

		if (line.length > 0 && (splitHere || lastPt)) {
			features.push(lineString(line));
			line = [];
		}

		prev = value;
	});

	return {
		type: 'FeatureCollection',
		features: features
	};
};

var fromJson = function (track) {
	return {
		raw: track,
		union: function (json) {
			if (!json.length && json.raw) {
				json = json.raw;
			}

			union(track, json, 'timestamp');

			return this;
		},
		toGeoJson: function (options) {
			return toGeoJson(track, options);
		}
	};
};

/* Passes a minimal json representation of the marinetraffic XML to the callback.
 * [{
 *   latlng: [<>, <>],
 *   speed: <>, // knots,
 *   course: <>, // degrees
 *   timestamp: "<>"
 * }, {...}]
 */
var xml2json = function (xml, callback) {
	require('xml2js').parseString(xml, function (err, json) {
		if (err) {
			callback(err);
		}
		if (!json.TRACK || !json.TRACK.POS) {
			callback(new Error('Unexpected xml contents'));
			return;
		}

		var track = [];
		json.TRACK.POS.forEach(function (point) {
			point = point.$;
			track.push({
				latlng: [parseFloat(point.LAT), parseFloat(point.LON)],
				speed: parseInt(point.SPEED, 10) / 10,
				course: parseInt(point.COURSE, 10),
				timestamp: point.TIMESTAMP
			});
		});

		callback(null, fromJson(track));
	});
};

module.exports = function (mmsi, callback) {
	if (!callback) {
		return;
	}

	var vesselTrackUrl = 'http://www.marinetraffic.com/ais/gettrackxml.aspx?mmsi=';

	http.get(vesselTrackUrl + mmsi, function (res) {
		var data = '';

		res.on('data', function (chunk) {
			data += chunk;
		});
		res.on('end', function () {
			xml2json(data, callback);
		});
	}).on('error', function (event) {
		callback(new Error('HTTP error: ' + event.message));
	});
};

module.exports.toGeoJson = toGeoJson;
module.exports.fromJson = fromJson;
module.exports.toJson = xml2json;