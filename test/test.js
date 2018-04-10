/* global describe:true, it:true */

'use strict';

var fs = require('fs');
var chai = require('chai').should();
var marinetraffic = require('../index.js');

var delta = 1;

describe('marinetraffic', function () {
    describe('distance', function () {
        var distanceTests = [
            {
                // London - Paris
                latlngs: [[51.5000, -0.1167], [48.8667, 2.3333]],
                expected: 342
            },
            {
                // Amsterdam - Paris
                latlngs: [[52.3500, 4.9167], [48.8667, 2.3333]],
                expected: 427.71
            }
        ];

        it('calculate approximate distances', function () {
            distanceTests.forEach(function (test) {

                marinetraffic.distance(test.latlngs[0], test.latlngs[1])
                    .should.be.closeTo(test.expected, delta);
            });
        });
    });

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
                result.should.contain.keys('raw', 'toGeoJson');
            });

            it('has the correct number of points', function () {
                result.raw.should.have.length(3);
            });
        });

        marinetraffic.toJson(xmlFile, function (err, result) {
            it('has the correct number of points', function () {
                result.raw.should.have.length(369);
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
                    ret.should.eql(result);
                });

                it('should add two more points', function () {
                    result.raw.should.have.length(5);
                });
                it('should return those in GeoJSON as well', function () {
                    result.toGeoJson({
                        timeThreshold: 0 //disable time splitting
                    }).features[0].geometry.coordinates
                        .should.have.length(5);
                });
            });
        });
    });

    describe('toGeoJson', function () {
        marinetraffic.toJson(xml, function (err, result) {
            var gj = result.toGeoJson();

            it('appears to be geoJSON', function () {
                gj.should.contain.keys(['type', 'features']);
            });

            it('has one feature', function () {
                gj.features.should.have.length(1);
                gj.features[0].should.have.keys(featureKeys);
            });

            it('with correct properties', function () {
                gj.features[0].properties.should.have.keys(
                    'avg_sog', 'avg_cog', 'startTime', 'endTime', 'duration'
                );
            });
        });

        describe('using options', function () {
            marinetraffic.toJson(xml, function (err, result) {

                describe('includes points', function () {
                    var gj = result.toGeoJson({
                        points: true
                    });

                    it('has four features', function () {
                        gj.features.should.have.length(4);
                        for (var i in gj.features) {
                            var feature = gj.features[i];

                            feature.should.have.keys(featureKeys);

                            if (feature.type === 'Point') {
                                gj.features[i].properties
                                    .should.have.keys('course', 'speed', 'timestamp');
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
                        gj.features.should.have.length(3);
                    });
                    it('has the LineString', function () {
                        var lineStrings = 0;
                        gj.features.forEach(function (value) {
                            if (value.geometry.type === 'LineString') {
                                lineStrings++;
                                value.geometry.coordinates.should.have.length(2);
                            }
                        });
                        lineStrings.should.eql(1);
                    });
                });
            });

            marinetraffic.toJson(xmlFile, function (err, result) {
                describe('timeThreshold', function () {
                    var gj = result.toGeoJson({
                        timeThreshold: 60 * 60
                    });

                    it('splits in 2 legs with 1h timeThreshold', function () {
                        gj.features.should.have.length(2);
                        gj.features.forEach(function (feature) {
                            feature.geometry.type.should.eql('LineString');
                        });
                    });
                });
            });
        });
    });
});
