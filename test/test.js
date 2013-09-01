/* global describe:true, it:true */

'use strict';

var fs = require('fs');
var expect = require('expect.js');
var marinetraffic = require('../index.js');

describe('marinetraffic', function () {

	var xml = '<TRACK>' +
		'<POS LON="1.51547" LAT="51.405472" SPEED="55" COURSE="148" TIMESTAMP="2013-08-29T00:03:00" />' +
		'<POS LON="1.517997" LAT="51.40287" SPEED="55" COURSE="148" TIMESTAMP="2013-08-29T00:05:00" />' +
		'<POS LON="1.520745" LAT="51.400379" SPEED="53" COURSE="145" TIMESTAMP="2013-08-29T00:07:00" />' +
		'</TRACK>';
	var xmlFile = fs.readFileSync(__dirname + '/test.xml');

	var featureKeys = [
		'type', 'geometry', 'properties'
	];

	describe('toJson', function () {
		marinetraffic.toJson(xml, function (err, result) {
			it('has the right keys', function () {
				expect(result).to.have.key('raw');
				expect(result).to.have.key('toGeoJson');
			});

			it('has the correct number of points', function () {
				expect(result.raw.length).to.equal(3);
			});
		});

		marinetraffic.toJson(xmlFile, function (err, result) {
			it('has the correct number of points', function () {
				expect(result.raw.length).to.equal(369);
			});
		});

		describe('addJson', function () {
			var more = [
				{
					latlng: [1, 2],
					speed: 44,
					course: 122,
					timestamp: '2013-08-30T15:51:00'
				}, {
					latlng: [2, 3],
					speed: 55,
					course: 122,
					timestamp: '2013-08-30T16:01:01'
				}
			];

			marinetraffic.toJson(xml, function (err, result) {
				var ret = result.union(more);
				it('should return an instance of itself', function () {
					expect(ret).to.eql(result);
				});

				it('should add two more points', function () {

					expect(result.raw.length).to.equal(5);
				});
				it('should return those in GeoJSON as well', function () {
					var gj = result.toGeoJson({
						timeThreshold: 0 //disable time splitting
					});
					expect(gj.features[0].geometry.coordinates.length).to.equal(5);
				});
			});
		});
	});

	describe('toGeoJson', function () {
		marinetraffic.toJson(xml, function (err, result) {
			var gj = result.toGeoJson();

			it('appears to be geoJSON', function () {
				expect(gj).to.have.keys(['type', 'features']);
			});

			it('has one feature', function () {
				expect(gj.features.length).to.be(1);
				expect(gj.features[0]).to.have.keys(featureKeys);
			});

			it('with correct properties', function () {
				expect(gj.features[0].properties).to.have.keys([
					'avg_sog', 'avg_cog', 'startTime', 'endTime', 'duration'
				]);
			});
		});

		describe('using options', function () {
			marinetraffic.toJson(xml, function (err, result) {

				describe('includes points', function () {
					var gj = result.toGeoJson({
						points: true
					});

					it('has four features', function () {
						expect(gj.features.length).to.be(4);
						for (var i in gj.features) {
							var feature = gj.features[i];

							expect(feature).to.have.keys(featureKeys);

							if (feature.type === 'Point') {
								expect(gj.features[i].properties).to.have.keys([
									'course', 'speed', 'timestamp'
								]);
							}
						}
					});
				});

				describe('removes points below speedThreshold', function () {
					var gj = result.toGeoJson({
						speedThreshold: 5.31,
						points: true
					});

					it('has three features', function () {
						expect(gj.features.length).to.be(3);
					});
					it('has the LineString', function () {
						var lineStrings = 0;
						gj.features.forEach(function (value) {
							if (value.geometry.type === 'LineString') {
								lineStrings++;
								expect(value.geometry.coordinates.length).to.be(2);
							}
						});
						expect(lineStrings).to.be(1);
					});
				});
			});

			marinetraffic.toJson(xmlFile, function (err, result) {
				describe('timeThreshold', function () {
					var gj = result.toGeoJson({
						timeThreshold: 60 * 60
					});

					it('splits in 2 legs with 1h timeThreshold', function () {
						expect(gj.features.length).to.be(2);
						gj.features.forEach(function (feature) {
							expect(feature.geometry.type).to.be('LineString');
						});
					});
				});
			});
		});
	});
});