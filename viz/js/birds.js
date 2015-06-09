/**
 * Bird migration flow visualization for Belgium & the Netherlands
 *
 * https://github.com/enram/bird-migration-flow-visualization
 * Copyright (c) 2014 LifeWatch INBO
 * The MIT License - http://opensource.org/licenses/MIT
 *
 * Based on air.js from air
 * https://github.com/cambecc/air
 * Copyright (c) 2013 Cameron Beccario
 */

"use strict";

function app() {
    var app = {},
        drawer,
        interpolator,
        basemap,
        field,
        g,
        particles,
        radars,
        data,
        datafile = "../data/bird-migration-altitude-profiles/aggregated-data.csv",
        radardatafile = "../data/radars/radars.json",
        basemapfile = "../data/basemap/basemap.topojson",
        TIME_INTERVAL_ID = "#time-int",
        ALTITUDE_BAND_ID = "#alt-band",
        min_date,
        max_date,
        default_alt_band = 1,
        minX,
        maxX,
        minY,
        maxY,
        albers_projection;


    // special document elements

    var TIME_OFFSET = 20,
        DATE_FORMAT = 'MMMM D YYYY, HH:mm',
        UTC_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss",
        SECONDS_TO_PLAY = 1,
        intervalRunning = true,
        interval;


    /**
     * An object to perform logging when the browser supports it.
     */
    var log = {
        debug:   function(s) { if (console && console.log) console.log(s); },
        info:    function(s) { if (console && console.info) console.info(s); },
        error:   function(e) { if (console && console.error) console.error(e.stack ? e + "\n" + e.stack : e); },
        time:    function(s) { if (console && console.time) console.time(s); },
        timeEnd: function(s) { if (console && console.timeEnd) console.timeEnd(s); }
    };

    function hashOnIntervalStart(rows) {
        var outdata = {};
        var keys = [];
        for (var i=0; i<rows.length; i++) {
            if (outdata.hasOwnProperty(rows[i].interval_start_time)) {
                if (outdata[rows[i].interval_start_time].hasOwnProperty(rows[i].altitude_band)) {
                    outdata[rows[i].interval_start_time][rows[i].altitude_band].push(rows[i]);
                } else {
                    outdata[rows[i].interval_start_time][rows[i].altitude_band] = [rows[i]];
                }
            } else {
                keys.push(rows[i].interval_start_time);
                var band = rows[i].altitude_band;
                outdata[rows[i].interval_start_time] = {};
                outdata[rows[i].interval_start_time][band] = [rows[i]];
            }
        }
        return {data: outdata, keys: keys};
    }

    var createDrawer = function () {
        var d = {};

        var CANVAS_ID = "#canvas",
            MAP_SVG_ID = "#map-svg",
            ANIMATION_CANVAS_ID = "#animation-canvas";

        /**
         * An object {width:, height:} that describes the extent of the container's view in pixels.
         */
        var view = function() {
            var b = $(CANVAS_ID)[0]; // Similar to document.getElementById
            var x = b.clientWidth;
            var y = b.clientHeight;
            // log.debug("Container size width:" + x + " height: "+ y);
            return {width: x, height: y};
        }();

        /**
         * Create settings
         */
        var settings = {
            frameRate: 60, // desired milliseconds per frame
            maxParticleAge: 60, // max number of frames a particle is drawn before regeneration
            particleCount: 300
        };

        // Return a random number between min (inclusive) and max (exclusive).
        function rand(min, max) {
            return min + Math.random() * (max - min);
        }

        /**
         * Returns a d3 Albers conical projection (en.wikipedia.org/wiki/Albers_projection) that maps the bounding box
         * defined by the lower left geographic coordinates (lng0, lat0) and upper right coordinates (lng1, lat1) onto
         * the view port having (0, 0) as the upper left point and (width, height) as the lower right point.
         */
        function createAlbersProjection(lng0, lat0, lng1, lat1, view) {
            // Construct a unit projection centered on the bounding box. NOTE: center calculation will not be correct
            // when the bounding box crosses the 180th meridian. Don't expect that to happen to Tokyo for a while...
            // log.time("Creating projection");
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
            // log.timeEnd("Projection created");
            return projection.scale(s).translate(t);
        }


        /**
         * Load the basemap in the svg with the countries, country border and radars
         */
        function drawBasemap(bm) {
            //log.debug("Creating basemap...");
            var countries = topojson.feature(bm, bm.objects.ne_10m_admin_0_countries);
            albers_projection = createAlbersProjection(bm.bbox[0], bm.bbox[1], bm.bbox[2], bm.bbox[3], view);
            var path = d3.geo.path()
                .projection(albers_projection);

            var svg = d3.select(MAP_SVG_ID);

            svg.append("path")
                .datum(countries)
                .attr("d", path)
                .attr("class", "countries");

            path.pointRadius(2);
            // log.debug("Basemap created");
        }

        function drawRadars(radarData) {
            var svg = d3.select(MAP_SVG_ID);
            svg.selectAll("circle")
                .data(radarData).enter()
                .append("circle")
                .attr("cx", function(d) {return albers_projection(d.coordinates)[0];})
                .attr("cy", function(d) {return albers_projection(d.coordinates)[1];})
                .attr("r", "2")
                .attr("class", "radars");
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
                var uv = field(x, y);
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
            g.fillRect(0, 0, view.width, view.height);
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
            g = d3.select(ANIMATION_CANVAS_ID).node().getContext("2d");
            g.lineWidth = 0.7;
            g.strokeStyle = "rgba(255, 255, 255, 1)";
            g.fillStyle = "rgba(255, 255, 255, 0.7)"; /*  White layer to be drawn over existing trails */
            particles = [];
            for (var i=0; i< settings.particleCount; i++) {
                particles.push(createParticle(Math.floor(rand(0, settings.maxParticleAge))));
            }
            interval = setInterval(runTimeFrame, settings.frameRate);
        }


        // Return a random number between min (inclusive) and max (exclusive).
        function rand(min, max) {
            return min + Math.random() * (max - min);
        }



        var init = function(basemapdata, radarData) {
            d3.select(CANVAS_ID).attr("width", view.width).attr("height", view.height);
            d3.select(MAP_SVG_ID).attr("width", view.width).attr("height", view.height);
            d3.select(ANIMATION_CANVAS_ID).attr("width", view.width).attr("height", view.height);
            drawBasemap(basemapdata);
            drawRadars(radarData);
            var p0 = albers_projection([basemapdata.bbox[0], basemapdata.bbox[1]]);
            var p1 = albers_projection([basemapdata.bbox[2], basemapdata.bbox[3]]);
            minX = Math.floor(p0[0]);
            maxX = Math.floor(p1[0]);
            minY = 0;
            maxY = view.height;
        };


        d.startAnimation = startAnimation;
        d.init = init;
        d.minX = minX;
        d.maxX = maxX;
        d.minY = minY;
        d.maxY = maxY;
        d.view = view;
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
                var p = albers_projection([radars[row.radar_id].coordinates[0], radars[row.radar_id].coordinates[1]]);
                var point = [p[0], p[1], [row.avg_u_speed, -row.avg_v_speed]]; // negate v because pixel space grows downwards, not upwards
                points.push(point);
            });
            return points;
        }

        function createField() {
            //log.debug("createField called");
            var nilVector = [NaN, NaN, NaN];
            field = function(x, y) {
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
            var indata = data[timestamp][altitude_band];
            var points = buildPointsFromRadars(indata);
            var numberOfPoints = points.length;
            if (numberOfPoints > 5) {
                numberOfPoints = 5; // maximum number of points to interpolate from.
            }
            var interpolate = mvi.inverseDistanceWeighting(points, numberOfPoints);
            var tempColumns = [];

            var x = minX;
            var MAX_TASK_TIME = 50;  // amount of time before a task yields control (milliseconds)
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
                        // log.debug("Interpolating: " + x + "/" + maxX);
                        setTimeout(batchInterpolate, MIN_SLEEP_TIME);
                        return;
                    }
                }
                //log.debug("columns interpolated");
                columns = tempColumns;
                return createField();
            }
            batchInterpolate();
            return columns;
        }

        interpolator.init = init;
        interpolator.interpolateField = interpolateField;
        interpolator.columns = columns;
        return interpolator;
    };

    /**
     * Change the altitude and update radar data
     */
    function changeAltitude() {
        var datetime = $(TIME_INTERVAL_ID).val();
        var date = moment.utc(datetime, DATE_FORMAT);
        $(TIME_INTERVAL_ID).val(moment.utc(date).format(DATE_FORMAT));
        var alt_band = $(ALTITUDE_BAND_ID).val();
        interpolator.interpolateField(moment.utc(date).format(UTC_DATE_FORMAT) + "+00", alt_band);
    }

    /**
     * Subtract TIME_OFFSET minutes from entered time and show results
     */
    function previous() {
        var datetime = $(TIME_INTERVAL_ID).val();
        var date = moment.utc(datetime, DATE_FORMAT);
        date = moment(date).subtract('minutes', TIME_OFFSET);
        $(TIME_INTERVAL_ID).val(moment.utc(date).format(DATE_FORMAT));
        var alt_band = $(ALTITUDE_BAND_ID).val();
        interpolator.interpolateField(moment.utc(date).format(UTC_DATE_FORMAT) + "+00", alt_band);
    }

    /**
     * Add TIME_OFFSET minutes from entered time and show results
     */
    function next(){
        var datetime = $(TIME_INTERVAL_ID).val();
        var date = moment.utc(datetime, DATE_FORMAT);
        date = moment(date).add('minutes', TIME_OFFSET);
        if (date > max_date) {
            date = min_date;
        }
        $(TIME_INTERVAL_ID).val(moment.utc(date).format(DATE_FORMAT));
        var alt_band = $(ALTITUDE_BAND_ID).val();
        interpolator.interpolateField(moment.utc(date).format(UTC_DATE_FORMAT) + "+00", alt_band);
    }

    /**
     * Function used from next button on html, needs to pause the time running as wel as go to next timeframe
     */
    function nextWithPause() {
        next();
        pause();
    }

    /**
     * Function used from previous button on html, needs to pause the time running as wel as go to previous timeframe
     */
    function previousWithPause() {
        previous();
        pause();
    }

    /**
     * Pause interval for time running
     */
    function pause() {
        // log.debug("Pause clicked");
        clearInterval(interval);
        intervalRunning = false;
        $("#play-pause").addClass("active");
    }

    /**
     * Start interval for time running
     */
    function play() {
        // log.debug("Paused unclicked");
        interval = setInterval(function() {
            next();
        }, SECONDS_TO_PLAY*1000);
        intervalRunning = true;
        $("#play-pause").removeClass("active");
    }

    /**
     * Play/Pause functionality. When paused, continue animation but do not update radar data
     */
    function playPause() {
        if (intervalRunning == true) {
            pause();
        } else {
            play();
        }
    }

    function bindControls() {
        /**
         * Bind to input field to make enter work when user changes date manually
         */
        $(TIME_INTERVAL_ID).bind("keyup", function(event) {
            if (event.which == 13) {
                var datetime = $(TIME_INTERVAL_ID).val();
                var alt_band = $(ALTITUDE_BAND_ID).val();
                var date = moment.utc(datetime, DATE_FORMAT);
                $(TIME_INTERVAL_ID).val(moment.utc(date).format(DATE_FORMAT));
                interpolator.interpolateField(moment.utc(date).format(UTC_DATE_FORMAT) + "+00", alt_band);
                pause();
                event.preventDefault();
                event.stopPropagation();
            }
        });
        $(TIME_INTERVAL_ID).on("focus", function(event) {
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
        $("#altitude-band").on("change", function(event) {
            changeAltitude();
        })
    }

    function init(inbasemap, indata) {
        bindControls();
        d3.csv(datafile, function(indata) {
            var result = hashOnIntervalStart(indata);
            data = result.data;
            var timestamps = result.keys;
            min_date = moment.utc(timestamps[0], UTC_DATE_FORMAT);
            max_date = moment.utc(timestamps[timestamps.length - 1], UTC_DATE_FORMAT);
            d3.json(basemapfile, function(basemapdata) {
                d3.json(radardatafile, function(radarData) {
                    basemap = basemapdata;
                    radars = {};
                    for (var i=0; i<radarData.radars.length; i++) {
                        radars[radarData.radars[i].id] = radarData.radars[i];
                    };
                    drawer = createDrawer();
                    drawer.init(basemap, radarData.radars);
                    interpolator = createInterpolator();
                    interpolator.init(drawer.view);
                    interpolator.interpolateField(moment.utc(min_date).format(UTC_DATE_FORMAT) + "+00", default_alt_band);
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
    app.changeAltitude = changeAltitude;
    return app;
};

var a = app();
a.init();
