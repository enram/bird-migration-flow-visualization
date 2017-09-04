/*
 * Bird migration flow visualization
 *
 * https://github.com/enram/bird-migration-flow-visualization
 * Copyright (c) 2015 LifeWatch INBO
 * The MIT License - http://opensource.org/licenses/MIT
 *
 * Based on air.js from air
 * https://github.com/cambecc/air
 * Copyright (c) 2013 Cameron Beccario
 */

"use strict";

// Prototype function for arrays to reduce it to unique elements only
Array.prototype.unique = function() {
    var tmp = {}, out = [];
    for(var i = 0, n = this.length; i < n; ++i) {
        if(!tmp[this[i]]) { tmp[this[i]] = true; out.push(this[i]); }
    }
    return out;
};


function app() {
    var app = {},                   // Module
        drawer,                     // All drawing functions
        interpolator,               // All interpolating functions
        albersProjection,           // Projection function
        flowVizAnimation,
        animationCanvasID = "#animation-canvas", // Animation canvas element

        bbox = settings.bbox,       // Bounding box coordinates
        TIME_OFFSET = settings.time_step_minutes, // the amount of minutes between two time frames
        minX,                       // Top left pixel position from bounding box
        minY,                       // Top left pixel position from bounding box
        maxX,                       // Right buttom pixel position from bounding box
        maxY,                       // Right buttom pixel position from bounding box
        animationRunning = true,    // Switch between pausing and playing animation
        gridTimeOut,                // Timeout for grid function

        radars = {},                // Radar metadata
        migrationByAltAndTime = {}, // Migration data nested by timestamp, then altitude band
        migrationByRadarAndAlt = {},// Migration data nested by radar, then altitude band
        minDate,                    // Minimum date in migration data
        maxDate,                    // Maximum data in migration data
        maxBirdDensity;             // Maximum bird density in migration data

    var BASELAYER_OBJECT = settings.baselayer_object, // Name of baselayer object in topojson
        TIME_INPUT = "#time-int",   // Time input element
        ALTITUDE_BAND_INPUT = "#alt-band", // Altitude band input element
        DEFAULT_ALTITUDE_BAND = 1,  // Default altitude band to be shown
        DATE_FORMAT = settings.date_format, // Date format to be shown in UI
        UTC_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss", // Date format for hashing
        UPDATE_SPEED = 1000;        // Milliseconds between grid refreshes


    function hashData(rows) {
        var outdataByAltandTime = {};
        var outdataByRadar = {};
        var timeKeys = [];
        for (var i=0; i<rows.length; i++) {
            if (!timeKeys.includes(rows[i].interval_start_time)) {
                timeKeys.push(rows[i].interval_start_time);
            }
            if (outdataByAltandTime.hasOwnProperty(rows[i].altitude_band)) {
                if (outdataByAltandTime[rows[i].altitude_band].hasOwnProperty(rows[i].interval_start_time)) {
                    outdataByAltandTime[rows[i].altitude_band][rows[i].interval_start_time].push(rows[i]);
                } else {
                    outdataByAltandTime[rows[i].altitude_band][rows[i].interval_start_time] = [rows[i]];
                }
            } else {
                outdataByAltandTime[rows[i].altitude_band] = {};
                outdataByAltandTime[rows[i].altitude_band][rows[i].interval_start_time] = [rows[i]];
            }
            if (outdataByRadar.hasOwnProperty(rows[i].radar_id)) {
                if (outdataByRadar[rows[i].radar_id].hasOwnProperty(rows[i].altitude_band)) {
                    outdataByRadar[rows[i].radar_id][rows[i].altitude_band].push(rows[i]);
                } else {
                    outdataByRadar[rows[i].radar_id][rows[i].altitude_band] = [rows[i]];
                }
            } else {
                var band = rows[i].altitude_band;
                outdataByRadar[rows[i].radar_id] = {};
                outdataByRadar[rows[i].radar_id][band] = [rows[i]];
            }
        }
        timeKeys.sort(); // Not guaranteed that timestamps are added in order
        return {dataByTime: outdataByAltandTime, dataByRadar: outdataByRadar, keys: timeKeys};
    }


    var createDrawer = function () {
        var d = {},                   //
            timechartX ,              // x scale of the time chart
            timechartY,               // y scale of the time chart
            g,                        // canvas context object
            particles,                // array of all living particles
            timeNeedle,               // Needle rectangle on time slider
            basemapSvg = d3.select("#map-svg"); // Basemap svg element

        var CANVAS_ID = "#canvas";  // Containing canvas element ID

        var settings = {
            frameRate: 60,          // Desired milliseconds per frame
            maxParticleAge: 60,     // Maximum number of frames a particle is drawn before regeneration
            particleCount: 450      // Number of particles
        };

        // An object {width:, height:, timechartHeight} that describes the extent of the container's view in pixels.
        var mapView = function() {
            var timechartHeight = 0;
            var b = $(CANVAS_ID)[0];
            var x = b.clientWidth;
            var y = b.clientHeight - timechartHeight;
            return {width: x, height: y, timechartHeight: timechartHeight};
        }();

        function getmapView() {
            return mapView;
        }

        function getUIDateTime() {
            var datetime,
                date;
            datetime = $(TIME_INPUT).val();
            date = moment.utc(datetime, DATE_FORMAT);
            return date;
        }

        function setUIDateTime(dt) {
            $(TIME_INPUT).val(moment.utc(dt).format(DATE_FORMAT));
        }

        function getAltitudeBand() {
            return $(ALTITUDE_BAND_INPUT).val();
        }

        function setAltitudeBand(alt) {
            $(ALTITUDE_BAND_INPUT).val(alt);
        }

        /*
         * Returns a d3 Albers conical projection (en.wikipedia.org/wiki/Albers_projection) that maps the bounding box
         * defined by the lower left geographic coordinates (lng0, lat0) and upper right coordinates (lng1, lat1) onto
         * the view port having (0, 0) as the upper left point and (width, height) as the lower right point.
         */
        function createAlbersProjection(lng0, lat0, lng1, lat1, view) {
            // Construct a unit projection centered on the bounding box. NOTE: center calculation will not be correct
            // when the bounding box crosses the 180th meridian. Don't expect that to happen to Tokyo for a while...
            var projection = d3.geo.albers()
                .rotate([-((lng0 + lng1) / 2), 0]) // rotate the globe from the prime meridian to the bounding box's center
                .center([0, (lat0 + lat1) / 2])    // set the globe vertically on the bounding box's center
                .scale(1)
                .translate([0, 0]);
            // Project the two longitude/latitude points into pixel space. These will be tiny because scale is 1.
            var p0 = projection([lng0, lat0]);
            var p1 = projection([lng1, lat1]);
            // The actual scale is the ratio between the size of the bounding box in pixels and the size of the view port.
            // Reduce by 5% for a nice border.
            var s = 1 / Math.max((p1[0] - p0[0]) / view.width, (p0[1] - p1[1]) / view.height) * 0.95;
            // Move the center to (0, 0) in pixel space.
            var t = [view.width / 2, view.height / 2];
            return projection.scale(s).translate(t);
        }


        // Load the basemap in the svg with the countries
        function drawBasemap(bm) {
            var countries = topojson.feature(bm, bm.objects[BASELAYER_OBJECT]);
            albersProjection = createAlbersProjection(bbox[0], bbox[1], bbox[2], bbox[3], mapView);
            var path = d3.geo.path()
                .projection(albersProjection);

            basemapSvg.append("path")
                .datum(countries)
                .attr("d", path)
                .attr("class", "countries");

            path.pointRadius(2);
        }

        function drawRadars(radarData) {
            basemapSvg.selectAll("circle .radars")
                .data(radarData).enter()
                .append("circle")
                .attr("cx", function (d) {
                    return albersProjection(d.coordinates)[0];
                })
                .attr("cy", function (d) {
                    return albersProjection(d.coordinates)[1];
                })
                .attr("r", 3)
                .attr("class", "radars");
        }

        function drawTimechart(altBand) {
            timechartX = d3.scale.linear()
                .domain([minDate.valueOf(), maxDate.valueOf()])
                .range([0, mapView.width]);

            var inverseTimechartX = d3.scale.linear()
                .domain([0, mapView.width])
                .range([minDate.valueOf(), maxDate.valueOf()]);

            timechartY = d3.scale.linear()
                .domain([0, maxBirdDensity[altBand]])
                .range([mapView.timechartHeight, 0]);

            var timechart = basemapSvg.append("g")
                .attr("width", mapView.width)
                .attr("height", mapView.timechartHeight)
                .attr("transform", "translate(0," + mapView.height + ")");

            timechart.append("rect")
                .attr("width", "100%")
                .attr("height", mapView.timechartHeight)
                .attr("fill", "white")
                .attr("opacity", ".4")
                .on("click", function(d, i) {
                    var pointClicked = d3.mouse(this);
                    var clickedDate = moment.utc(inverseTimechartX(pointClicked[0]));
                    // round to closest time interval:
                    clickedDate.minutes(clickedDate.minutes() - clickedDate.minutes() % TIME_OFFSET);
                    drawer.setUIDateTime(clickedDate);
                    interpolator.calculateForTimeAndAlt(clickedDate, drawer.getAltitudeBand());
                    drawer.updateTimeNeedle(clickedDate);
                });

            for (var radar in migrationByRadarAndAlt) {
                if (migrationByRadarAndAlt.hasOwnProperty(radar)) {
                    timechart.selectAll("circle " + ".r" + radar)
                        .data(migrationByRadarAndAlt[radar][altBand]).enter().append("circle")
                        .attr("class", ".r" + radar)
                        .attr("cx", function(d) {return timechartX(moment.utc(d.interval_start_time).valueOf());})
                        .attr("cy", function(d) {return timechartY(d.avg_bird_density)})
                        .attr("r", 1.5)
                        .attr("stroke", "none")
                        .attr("fill", "#555");
                }
            }

            timeNeedle = timechart.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 2)
                .attr("height", mapView.timechartHeight)
                .attr("fill", "rgba(14, 100, 143, 0.9)");

        }

        function updateTimeNeedle(datetime) {
            timeNeedle.attr("x", timechartX(datetime.valueOf()));
        }

        function replaceTimechart(densities, alt_band) {
            basemapSvg.select("g").remove();
            drawTimechart(densities, alt_band);
        }

        var init = function(basemapdata, radarData) {
            d3.select(CANVAS_ID).attr("width", mapView.width).attr("height", mapView.height + mapView.timechartHeight);
            basemapSvg.attr("width", mapView.width).attr("height", mapView.height + mapView.timechartHeight);
            drawBasemap(basemapdata);
            drawRadars(radarData);
            var p0 = albersProjection([bbox[0], bbox[1]]);
            var p1 = albersProjection([bbox[2], bbox[3]]);
            minX = Math.floor(p0[0]);
            maxX = Math.floor(p1[0]);
            minY = 0;
            maxY = mapView.height;
        };

        // d.drawTimechart= drawTimechart;
        // d.replaceTimechart = replaceTimechart;
        // d.updateTimeNeedle = updateTimeNeedle;
        d.setUIDateTime = setUIDateTime;
        d.getUIDateTime = getUIDateTime;
        d.getAltitudeBand = getAltitudeBand;
        d.getmapView = getmapView;
        d.setAltitudeBand = setAltitudeBand;
        d.init = init;
        d.view = mapView;
        return d;
    };


    // Update the altitude
    function updateAltitude() {
        var date = drawer.getUIDateTime();
        var alt_band = drawer.getAltitudeBand();
        drawer.setUIDateTime(date);
        flowVizAnimation.setData(migrationByAltAndTime[alt_band], date.format(UTC_DATE_FORMAT) + "+00");
        //drawer.replaceTimechart(alt_band);
    }

    // Subtract TIME_OFFSET minutes from entered time and show results
    function previous() {
        var date = drawer.getUIDateTime();
        var alt_band = drawer.getAltitudeBand();
        date = moment(date).subtract('minutes', TIME_OFFSET);
        drawer.setUIDateTime(date);
        //drawer.updateTimeIndicator(date);
        flowVizAnimation.setTime(date.format(UTC_DATE_FORMAT) + "+00");
    }

    // Add TIME_OFFSET minutes from entered time and show results
    function next(){
        var date = drawer.getUIDateTime();
        var alt_band = drawer.getAltitudeBand();
        date = moment(date).add('minutes', TIME_OFFSET);
        if (date > maxDate) {
            date = minDate;
        }
        drawer.setUIDateTime(date);
        //drawer.updateTimeIndicator(date);
        flowVizAnimation.setTime(date.format(UTC_DATE_FORMAT) + "+00")
    }

    function nextWithPause() {
        next();
        pause();
    }

    function previousWithPause() {
        previous();
        pause();
    }

    function pause() {
        clearInterval(gridTimeOut);
        animationRunning = false;
        $("#play-pause").addClass("active");
    }

    function play() {
        gridTimeOut = setInterval(function() {
            next();
        }, UPDATE_SPEED);
        animationRunning = true;
        $("#play-pause").removeClass("active");
    }

    function playPause() {
        if (animationRunning == true) {
            pause();
        } else {
            play();
        }
    }

    function bindControls() {
        $(TIME_INPUT).bind("keyup", function(event) {
            if (event.which == 13) {
                var datetime = drawer.getUIDateTime();
                drawer.setUIDateTime(datetime);
                //drawer.updateTimeIndicator(datetime);
                flowVizAnimation.setTime(datetime.format(UTC_DATE_FORMAT) + "+00");
                pause();
                event.preventDefault();
                event.stopPropagation();
            }
        });

        $(TIME_INPUT).on("focus", function(event) {
            pause();
        });
        $("#play-pause").on("click", function(event) {
            playPause();
        });
        $("#previous").on("click", function(event) {
            previousWithPause();
        });
        $("#next").on("click", function(event) {
            nextWithPause();
        });
        $("#alt-band").on("change", function(event) {
            updateAltitude();
        })
    }

    function kneadBirdData(indata) {
        var result,
            timestamps,
            allAltitudeBands,
            altitudeBands,
            altBand;
        result = hashData(indata);
        migrationByAltAndTime = result.dataByTime;
        migrationByRadarAndAlt = result.dataByRadar;
        timestamps = result.keys;
        minDate = moment.utc(timestamps[0], UTC_DATE_FORMAT);
        maxDate = moment.utc(timestamps[timestamps.length - 1], UTC_DATE_FORMAT);
        allAltitudeBands = [];
        indata.forEach(function(x) {allAltitudeBands.push(x.altitude_band)});
        altitudeBands = allAltitudeBands.unique();
        maxBirdDensity = {};
        for (var i = 0; i < altitudeBands.length; i++) {
            altBand = altitudeBands[i];
            maxBirdDensity[altBand] = d3.extent(indata.map(function(x) {if (x.altitude_band == altBand) {return parseFloat(x.avg_bird_density);}}))[1];
        }
    }

    function kneadRadarData(indata) {
        radars = {};
        for (var i = 0; i < indata.radars.length; i++) {
            indata.radars[i].pixel_point = albersProjection(indata.radars[i].coordinates);
            radars[indata.radars[i].id] = indata.radars[i];
        }
    }

    function init() {
        var mapview;
        var view;
        bindControls();
        d3.csv(settings.datafile, function(indata) {
            kneadBirdData(indata);
            d3.json(settings.basemapfile, function(basemapdata) {
                d3.json(settings.radardatafile, function(radarData) {
                    drawer = createDrawer();
                    drawer.init(basemapdata, radarData.radars); // draw basemap and radars
                    mapview = drawer.getmapView();
                    view = {
                        minX: minX,
                        maxX: maxX,
                        minY: minY,
                        maxY: maxY,
                        width: mapview.width,
                        height: mapview.height
                    };
                    kneadRadarData(radarData);
                    drawer.setUIDateTime(minDate);
                    flowVizAnimation = flowViz();
                    flowVizAnimation.init(
                        animationCanvasID, view, minDate.format(UTC_DATE_FORMAT) + "+00",
                        migrationByAltAndTime["1"], radars); // initiate flow animation
                    //drawer.drawTimechart(DEFAULT_ALTITUDE_BAND);
                    play(); // update flow animation every second
                });
            })
        });
    }

    app.init = init;
    app.next = next;
    app.previous = previous;
    app.play = play;
    app.pause = pause;
    app.previousWithPause = previousWithPause;
    app.nexWithPause = nextWithPause;
    app.playPause = playPause;
    app.changeAltitude = updateAltitude;
    return app;
};

var a = app();
a.init();
