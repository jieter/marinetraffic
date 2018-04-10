## Marinetraffic

Node module to fetch a ships track from http://marinetraffic.com and convert it to json/geojson to be analysed or plotted on a (Leaflet) map.

Please note that this should be used for personal convenience only and not in production websites.

## Usage example

`npm install marinetraffic`

```JavaScript
var marinetraffic = require('marinetraffic');

marinetraffic(mmsi, function (err, result) {
    console.log(result);
});
```
## API

### `marinetraffic(mmsi, callback(err, result))`
Fetches the track for vessel with `mmsi`, calls `callback` when ready, with `err` and a [`result` object](#result-object) as arguments.


### `marinetraffic.toGeoJson(json, options)`
Convert `json` to GeoJSON with optional [`options`](#resulttogeojsonoptions).

### `marinetraffic.fromJson(json)`
Constructs a result object from the JSON representation of the track, for example from a cached file.

### `marinetraffic.xml2json(xml, callback(err, result))`
Converts xml reply from marinetraffic to json.

## `result` object
Example of a result object:
```JavaScript
{ raw:
    [   {   latlng: [Object],
            speed: 0.1,
            course: 122,
            timestamp: '2013-08-30T15:51:00' },
        {   latlng: [Object],
            speed: 0.1,
            course: 122,
            timestamp: '2013-08-30T16:01:00' },

    [...]

        {   latlng: [Object],
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
Returns a [GeoJSON](http://geojson.org/) representation of the track. It takes an optional `options` object to tune the output:

```JavaScript
{
    points: false,              // output Point features for each track point
    speedThreshold: 0.51,       // ignore points with speeds below threshold,
    timeThreshold: 2 * 60 * 60  // create new linestring if diff exeeds 2h
}
```

## Example
To start the example, after cloning the repo, running
```
npm install && cd example && npm install && npm start
```
will start the server on [http://localhost:8888](http://localhost:8888).
