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
        grid,                       // Grid function
        albersProjection,           // Projection function

        bbox = settings.bbox,       // Bounding box coordinates
        TIME_OFFSET = settings.time_step_minutes, // the amount of minutes between two time frames
        minX,                       // Top left pixel position from bounding box
        minY,                       // Top left pixel position from bounding box
        maxX,                       // Right buttom pixel position from bounding box
        maxY,                       // Right buttom pixel position from bounding box
        animationRunning = true,    // Switch between pausing and playing animation
        gridTimeOut,                // Timeout for grid function

        radars = {},                // Radar metadata
        migrationByTimeAndAlt = {}, // Migration data nested by timestamp, then altitude band
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
        var outdataByTime = {};
        var outdataByRadar = {};
        var timeKeys = [];
        for (var i=0; i<rows.length; i++) {
            if (outdataByTime.hasOwnProperty(rows[i].interval_start_time)) {
                if (outdataByTime[rows[i].interval_start_time].hasOwnProperty(rows[i].altitude_band)) {
                    outdataByTime[rows[i].interval_start_time][rows[i].altitude_band].push(rows[i]);
                } else {
                    outdataByTime[rows[i].interval_start_time][rows[i].altitude_band] = [rows[i]];
                }
            } else {
                timeKeys.push(rows[i].interval_start_time);
                var band = rows[i].altitude_band;
                outdataByTime[rows[i].interval_start_time] = {};
                outdataByTime[rows[i].interval_start_time][band] = [rows[i]];
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
        return {dataByTime: outdataByTime, dataByRadar: outdataByRadar, keys: timeKeys};
    }


    var createDrawer = function () {
        var d = {},                   //
            timechartX ,              // x scale of the time chart
            timechartY,               // y scale of the time chart
            g,                        // canvas context object
            particles,                // array of all living particles
            timeNeedle,               // Needle rectangle on time slider
            basemapSvg = d3.select("#map-svg"), // Basemap svg element
            animationCanvas = d3.select("#animation canvas"); // Animation canvas element

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

        // Return a random number between min (inclusive) and max (exclusive).
        function rand(min, max) {
            return min + Math.random() * (max - min);
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

        // Create particle object
        function createParticle(age) {
            var particle = {
                age: age,
                x: rand(minX, maxX),
                y: rand(minY, maxY),
                xt: 0,
                yt: 0
            };
            return particle
        }

        // Calculate the next particle's position
        function evolve() {
            particles.forEach(function(particle, i) {
                if (particle.age >= settings.maxParticleAge) {
                    particles.splice(i, 1);
                    particle = createParticle(Math.floor(rand(0, settings.maxParticleAge/2))); // respawn
                    particles.push(particle);
                }
                var x = particle.x;
                var y = particle.y;
                var uv = grid(x, y);
                var u = uv[0];
                var v = uv[1];
                var xt = x + u;
                var yt = y + v;
                particle.age += 1;
                particle.xt = xt;
                particle.yt = yt;
            });
        }

        // Draw a line between a particle's current and next position
        function draw() {
            // Fade existing trails
            var prev = g.globalCompositeOperation;
            g.globalCompositeOperation = "destination-in";
            g.fillRect(0, 0, mapView.width, mapView.height);
            g.globalCompositeOperation = prev;

            // Draw new particle trails
            particles.forEach(function(particle) {
                if (particle.age < settings.maxParticleAge) {
                    g.moveTo(particle.x, particle.y);
                    g.lineTo(particle.xt, particle.yt);
                    particle.x = particle.xt;
                    particle.y = particle.yt;
                }
            });
        }

        // This function will run the animation for 1 time frame
        function runTimeFrame() {
            g.beginPath();
            evolve();
            draw();
            g.stroke();
        }

        function startAnimation() {
            g = animationCanvas.node().getContext("2d");
            g.lineWidth = 2;
            g.strokeStyle = "rgba(14, 100, 143, 0.9)";
            g.fillStyle = "rgba(255, 255, 255, 0.7)"; /*  White layer to be drawn over existing trails */
            particles = [];
            for (var i=0; i< settings.particleCount; i++) {
                particles.push(createParticle(Math.floor(rand(0, settings.maxParticleAge))));
            }
            var animationTimeOut = setInterval(runTimeFrame, settings.frameRate);
        }


        var init = function(basemapdata, radarData) {
            d3.select(CANVAS_ID).attr("width", mapView.width).attr("height", mapView.height + mapView.timechartHeight);
            basemapSvg.attr("width", mapView.width).attr("height", mapView.height + mapView.timechartHeight);
            animationCanvas.attr("width", mapView.width).attr("height", mapView.height);
            drawBasemap(basemapdata);
            drawRadars(radarData);
            var p0 = albersProjection([bbox[0], bbox[1]]);
            var p1 = albersProjection([bbox[2], bbox[3]]);
            minX = Math.floor(p0[0]);
            maxX = Math.floor(p1[0]);
            minY = 0;
            maxY = mapView.height;
        };

        d.startAnimation = startAnimation;
        d.drawTimechart= drawTimechart;
        d.replaceTimechart = replaceTimechart;
        d.updateTimeNeedle = updateTimeNeedle;
        d.setUIDateTime = setUIDateTime;
        d.getUIDateTime = getUIDateTime;
        d.getAltitudeBand = getAltitudeBand;
        d.setAltitudeBand = setAltitudeBand;
        d.init = init;
        d.view = mapView;
        return d;
    };

    var createInterpolator = function () {
        var interpolator = {},
            view,
            interpSettings = {
                vectordenominator: 1000
            },
            columns;

        function init(inview) {
            view = inview;
        }

        // Build points based on the data retrieved from the data back end
        function buildPointsFromRadars(indata) {
            var points = [];
            indata.forEach(function(row) {
                var p = albersProjection([radars[row.radar_id].coordinates[0], radars[row.radar_id].coordinates[1]]);
                var point = [p[0], p[1], [row.avg_u_speed, -row.avg_v_speed]]; // negate v because pixel space grows downwards, not upwards
                points.push(point);
            });
            return points;
        }

        function createField() {
            var nilVector = [NaN, NaN, NaN];
            grid = function(x, y) {
                var column = columns[Math.round(x)];
                if (column) {
                    var v = column[Math.round(y)];
                    if (v) {
                        return v;
                    }
                }
                return nilVector;
            };
        }

        function interpolateField(timestamp, altitude_band) {
            if (!migrationByTimeAndAlt.hasOwnProperty(timestamp)) {
                columns = [];
                createField();
                return columns;
            }
            var indata = migrationByTimeAndAlt[timestamp][altitude_band];
            var densities = indata.map(function(x) {return parseFloat(x.avg_bird_density);}).sort(function (a, b) {return a-b});
            var points = buildPointsFromRadars(indata);
            var numberOfPoints = points.length;
            if (numberOfPoints > 5) {
                numberOfPoints = 5; // Maximum number of points to interpolate from.
            }
            var interpolate = mvi.inverseDistanceWeighting(points, numberOfPoints);
            var tempColumns = [];

            var x = minX;
            var MAX_TASK_TIME = 50;  // Amount of time before a task yields control (milliseconds)
            var MIN_SLEEP_TIME = 25;

            function interpolateColumn(x) {
                var column = [];
                for (var y=minY; y<=maxY; y++) {
                    var v = [0, 0, 0];
                    v = interpolate(x, y, v);
                    v = mvi.scaleVector(v, view.height / interpSettings.vectordenominator);
                    column.push(v);
                }
                return column;
            }

            function batchInterpolate() {
                var start = +new Date;
                while (x<maxX) {
                    tempColumns[x] = interpolateColumn(x);
                    x++;
                    if ((+new Date - start) > MAX_TASK_TIME) {
                        setTimeout(batchInterpolate, MIN_SLEEP_TIME);
                        return;
                    }
                }
                columns = tempColumns;
                return createField();
            }
            batchInterpolate();
            return columns;
        }

        function calculateForTimeAndAlt(date, altitude) {
            interpolateField(moment.utc(date).format(UTC_DATE_FORMAT) + "+00", altitude);
        }

        interpolator.init = init;
        interpolator.calculateForTimeAndAlt = calculateForTimeAndAlt;
        return interpolator;
    };

    // Update the altitude
    function updateAltitude() {
        var date = drawer.getUIDateTime();
        var alt_band = drawer.getAltitudeBand();
        drawer.setUIDateTime(date);
        interpolator.calculateForTimeAndAlt(date, alt_band);
        //drawer.replaceTimechart(alt_band);
    }

    // Subtract TIME_OFFSET minutes from entered time and show results
    function previous() {
        var date = drawer.getUIDateTime();
        var alt_band = drawer.getAltitudeBand();
        date = moment(date).subtract('minutes', TIME_OFFSET);
        drawer.setUIDateTime(date);
        //drawer.updateTimeIndicator(date);
        interpolator.calculateForTimeAndAlt(date, alt_band);
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
        interpolator.calculateForTimeAndAlt(date, alt_band);
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
                var alt_band = drawer.getAltitudeBand();
                drawer.setUIDateTime(datetime);
                //drawer.updateTimeIndicator(datetime);
                interpolator.calculateForTimeAndAlt(datetime, alt_band);
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
        migrationByTimeAndAlt = result.dataByTime;
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
        bindControls();
        d3.csv(settings.datafile, function(indata) {
            kneadBirdData(indata);
            d3.json(settings.basemapfile, function(basemapdata) {
                d3.json(settings.radardatafile, function(radarData) {
                    drawer = createDrawer();
                    interpolator = createInterpolator();
                    drawer.init(basemapdata, radarData.radars);
                    interpolator.init(drawer.view);
                    kneadRadarData(radarData);
                    drawer.setUIDateTime(minDate);
                    interpolator.calculateForTimeAndAlt(minDate, DEFAULT_ALTITUDE_BAND);
                    //drawer.drawTimechart(DEFAULT_ALTITUDE_BAND);
                    drawer.startAnimation();
                    play();
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
