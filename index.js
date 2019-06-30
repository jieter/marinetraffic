'use strict';

var https = require('https');
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

var distance = function (p1, p2) {
    var R = 6378137, // earth radius in meters
        d2r = Math.PI / 180,
        dLat = (p2[0] - p1[0]) * d2r,
        dLon = (p2[1] - p1[1]) * d2r,
        lat1 = p1[0] * d2r,
        lat2 = p2[0] * d2r,
        sin1 = Math.sin(dLat / 2),
        sin2 = Math.sin(dLon / 2);

    var a = sin1 * sin1 + sin2 * sin2 * Math.cos(lat1) * Math.cos(lat2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) / 1000;
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
    [dest, array].forEach(function (a) {
        a.forEach(function (elem) {
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
        timeThreshold: 2 * 60 * 60, // 2h split = new leg.
        splitLocations: []
    }, options);

    var features = [];

    var prev, splitHere, lastPt, timeThresholdExceeded, dist
    var line = [];

    json.forEach(function (value, key) {
        lastPt = (key === json.length - 1);

        // decide on splitting:
        timeThresholdExceeded = prev && timeDiff(prev.timestamp, value.timestamp) > options.timeThreshold;

        if (options.timeThreshold > 0 && prev && timeThresholdExceeded) {
            splitHere = true;
        } else {
            splitHere = false;
            options.splitLocations.forEach(function (loc) {
                dist = distance(loc, value.latlng);
                if (dist < loc[2]) {
                    splitHere = true;
                }
            });
        }

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
        if (!json.VESSELTRACK || !json.VESSELTRACK.POSITION) {
            callback(new Error('Unexpected XML contents'));
            return;
        }

        var track = [];
        json.VESSELTRACK.POSITION.forEach(function (point) {
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

    var vesselTrackUrl = 'https://services.marinetraffic.com/api/exportvesseltrack/YOURAPIKEY/v:2/period:daily/days:5/mmsi:';

    https.get(vesselTrackUrl + mmsi, function (res) {
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

module.exports.distance = distance;
module.exports.toGeoJson = toGeoJson;
module.exports.fromJson = fromJson;
module.exports.toJson = xml2json;
