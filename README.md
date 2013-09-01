## Marinetraffic

Node module to fetch a ships track from http://marinetraffic.com and convert it to json/geojson to be analysed or plotted on a (Leaflet) map.

Please note that this should be used for personal convenience only and not in production websites.

## Usage

```JavaScript
var marinetraffic = require('marinetraffic');

marinetraffic(mmsi, function (err, result) {
	console.log(result)
});
```

### `marinetraffic.fromJson(json)`
Constructs a result object from the JSON representation of the track, for example from a cached file.

## `result` object
Example of a result object:
```JavaScript
{ raw:
	[	{	latlng: [Object],
			speed: 0.1,
			course: 122,
			timestamp: '2013-08-30T15:51:00' },
		{ latlng: [Object],
			speed: 0.1,
			course: 122,
			timestamp: '2013-08-30T16:01:00' },

	[...]

		{ latlng: [Object],
			speed: 1.7,
			course: 337,
			timestamp: '2013-08-31T11:41:00' } ],
	union: [Function],
	toGeoJson: [Function] }
```

### `result.raw`
The `raw` member contains a JSON representation of all the points.

### `result.union(otherResult)`
Returns the union of `result` and `otherResult` by looking at the timestamps of each trackpoint, keeping the reference to `result`.

### `result.toGeoJson([options])`
Returns a [GeoJSON](http://geojson.org/) representation of the track. It takes an `options` object to tune the output:

```JavaScript
{
	points: false,              // output Point features for each track point
	speedThreshold: 0.51,       // ignore points with speeds below threshold,
	timeThreshold: 2 * 60 * 60  // create new linestring if diff exeeds 2h
}
```

