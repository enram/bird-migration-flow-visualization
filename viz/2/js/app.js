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

Array.prototype.unique = function() {
    var tmp = {}, out = [];
    for(var i = 0, n = this.length; i < n; ++i) {
        if(!tmp[this[i]]) { tmp[this[i]] = true; out.push(this[i]); }
    }
    return out;
};

function app() {
    var app = {},
        drawer,
        interpolator,
        basemap,
        basemapTimeIndicator,
        field,
        g,
        particles,
        radars,
        sortedRadars,
        dataByTimeAndAlt,
        dataByRadarAndAlt,
        datafile = settings.datafile,
        radardatafile = settings.radardatafile,
        basemapfile = settings.basemapfile,
        bbox = settings.bbox,
        BASELAYER_OBJECT = settings.baselayer_object,
        TIME_INTERVAL_ID = "#time-int",
        ALTITUDE_BAND_ID = "#alt-band",
        min_date,
        max_date,
        maxBirdDensity,
        default_alt_band = 1,
        minX,
        maxX,
        minY,
        maxY,
        albers_projection;


    // special document elements

    var TIME_OFFSET = 20,
        //DATE_FORMAT = 'MMMM D YYYY, HH:mm',
        DATE_FORMAT = settings.date_format,
        UTC_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss",
        SECONDS_TO_PLAY = 1,
        intervalRunning = true,
        interval;


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
        var d = {},
            context_x,
            context_y;

        var CANVAS_ID = "#canvas",
            BASEMAP_SVG = d3.select("#basemap svg"),
            ANIMATION_CANVAS_ID = "#animation-canvas";

        /**
         * An object {width:, height:} that describes the extent of the container's view in pixels.
         */
        var mapView = function() {
            var contextHeight = 50;
            var b = $(CANVAS_ID)[0]; // Similar to document.getElementById
            var x = b.clientWidth;
            var y = b.clientHeight - contextHeight;
            // console.log("Container size width:" + x + " height: "+ y);
            return {width: x, height: y, contextHeight: contextHeight};
        }();

        /**
         * Create settings
         */
        var settings = {
            frameRate: 60, // desired milliseconds per frame
            maxParticleAge: 60, // max number of frames a particle is drawn before regeneration
            particleCount: 450
        };

        // Return a random number between min (inclusive) and max (exclusive).
        function rand(min, max) {
            return min + Math.random() * (max - min);
        }

        function getUIDateTime() {
            var datetime,
                date;
            datetime = $(TIME_INTERVAL_ID).val();
            date = moment.utc(datetime, DATE_FORMAT);
            return date;
        }

        function setUIDateTime(dt) {
            $(TIME_INTERVAL_ID).val(moment.utc(dt).format(DATE_FORMAT));
        }

        function getAltitudeBand() {
            return $(ALTITUDE_BAND_ID).val();
        }

        function setAltitudeBand(alt) {
            $(ALTITUDE_BAND_ID).val(alt);
        }

        /**
         * Returns a d3 Albers conical projection (en.wikipedia.org/wiki/Albers_projection) that maps the bounding box
         * defined by the lower left geographic coordinates (lng0, lat0) and upper right coordinates (lng1, lat1) onto
         * the view port having (0, 0) as the upper left point and (width, height) as the lower right point.
         */
        function createAlbersProjection(lng0, lat0, lng1, lat1, view) {
            // Construct a unit projection centered on the bounding box. NOTE: center calculation will not be correct
            // when the bounding box crosses the 180th meridian. Don't expect that to happen to Tokyo for a while...
            // console.log("Creating projection");
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
            // console.log("Projection created");
            return projection.scale(s).translate(t);
        }


        /**
         * Load the basemap in the svg with the countries, country border and radars
         */
        function drawBasemap(bm) {
            //console.log("Creating basemap...");
            var countries = topojson.feature(bm, bm.objects[BASELAYER_OBJECT]);
            albers_projection = createAlbersProjection(bbox[0], bbox[1], bbox[2], bbox[3], mapView);
            var path = d3.geo.path()
                .projection(albers_projection);

            BASEMAP_SVG.append("path")
                .datum(countries)
                .attr("d", path)
                .attr("class", "countries");

            path.pointRadius(2);
            // console.log("Basemap created");
        }

        function drawRadars(radarData) {
            BASEMAP_SVG.selectAll("circle .radars")
                .data(radarData).enter()
                .append("circle")
                .attr("cx", function (d) {
                    return albers_projection(d.coordinates)[0];
                })
                .attr("cy", function (d) {
                    return albers_projection(d.coordinates)[1];
                })
                .attr("r", 3)
                .attr("class", "radars");
        }

        function drawDensity() {
            BASEMAP_SVG.selectAll("circle .density")
                .data(sortedRadars).enter()
                .append("circle")
                .attr("cx", function (d) {
                    return albers_projection(d.coordinates)[0];
                })
                .attr("cy", function (d) {
                    return albers_projection(d.coordinates)[1];
                })
                .attr("r", 0)
                .attr("class", "density")
                .attr("id", function (d) {
                    return "radar-" + d.id;
                });
        }

        function updateDensity(timestamp, altitude) {
            var indata = dataByTimeAndAlt[timestamp][altitude];
            var densities = {};
            for (var radarID in radars) {
                if (radars.hasOwnProperty(radarID)) {
                    densities[radarID] = 0;
                }
            }
            for (var i = 0; i < indata.length; i++ ) {
                densities[indata[i].radar_id] = indata[i].avg_bird_density;
            }

            var densitiesArray = [];
            for (var i = 0; i < sortedRadars.length; i++) {
                densitiesArray.push(densities[sortedRadars[i].id]);
            }

            BASEMAP_SVG.selectAll("circle .density").data(densitiesArray)
                .transition()
                .duration(500)
                .attr("r", function(d) { return d;});
        }

        function drawContext(altBand) {
            context_x = d3.scale.linear()
                .domain([min_date.valueOf(), max_date.valueOf()])
                .range([0, mapView.width]);

            var inv_context_x = d3.scale.linear()
                .domain([0, mapView.width])
                .range([min_date.valueOf(), max_date.valueOf()]);

            context_y = d3.scale.linear()
                .domain([0, maxBirdDensity[altBand]])
                .range([mapView.contextHeight, 0]);

            var context = BASEMAP_SVG.append("g")
                .attr("width", mapView.width)
                .attr("height", mapView.contextHeight)
                .attr("transform", "translate(0," + mapView.height + ")");

            context.append("rect")
                .attr("width", "100%")
                .attr("height", mapView.contextHeight)
                .attr("fill", "white")
                .attr("opacity", ".4")
                .on("click", function(d, i) {
                    var pointClicked = d3.mouse(this);
                    var clickedDate = moment.utc(inv_context_x(pointClicked[0]));
                    // round to closest time interval:
                    clickedDate.minutes(clickedDate.minutes() - clickedDate.minutes() % TIME_OFFSET);
                    drawer.setUIDateTime(clickedDate);
                    interpolator.calculateForTimeAndAlt(clickedDate, drawer.getAltitudeBand());
                    drawer.updateTimeIndicator(clickedDate);
                });

            for (var radar in dataByRadarAndAlt) {
                if (dataByRadarAndAlt.hasOwnProperty(radar)) {
                    context.selectAll("circle " + ".r" + radar)
                        .data(dataByRadarAndAlt[radar][altBand]).enter().append("circle")
                        .attr("class", ".r" + radar)
                        .attr("cx", function(d) {return context_x(moment.utc(d.interval_start_time).valueOf());})
                        .attr("cy", function(d) {return context_y(d.avg_bird_density)})
                        .attr("r", 1.5)
                        .attr("stroke", "none")
                        .attr("fill", "#555");
                }
            }

            basemapTimeIndicator = context.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 2)
                .attr("height", mapView.contextHeight)
                .attr("fill", "rgba(14, 100, 143, 0.9)");

        }

        function updateTimeIndicator(datetime) {
            basemapTimeIndicator.attr("x", context_x(datetime.valueOf()));
        }

        function replaceContext(densities, alt_band) {
            BASEMAP_SVG.select("g").remove();
            drawContext(densities, alt_band);
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
            g = d3.select(ANIMATION_CANVAS_ID).node().getContext("2d");
            g.lineWidth = 2;
            g.strokeStyle = "rgba(14, 100, 143, 0.9)";
            g.fillStyle = "rgba(255, 255, 255, 0.7)"; /*  White layer to be drawn over existing trails */
            particles = [];
            for (var i=0; i< settings.particleCount; i++) {
                particles.push(createParticle(Math.floor(rand(0, settings.maxParticleAge))));
            }
            interval = setInterval(runTimeFrame, settings.frameRate);
        }


        var init = function(basemapdata, radarData) {
            d3.select(CANVAS_ID).attr("width", mapView.width).attr("height", mapView.height + mapView.contextHeight);
            BASEMAP_SVG.attr("width", mapView.width).attr("height", mapView.height + mapView.contextHeight);
            d3.select(ANIMATION_CANVAS_ID).attr("width", mapView.width).attr("height", mapView.height);
            drawBasemap(basemapdata);
            drawRadars(radarData);
            drawDensity();
            var p0 = albers_projection([bbox[0], bbox[1]]);
            var p1 = albers_projection([bbox[2], bbox[3]]);
            minX = Math.floor(p0[0]);
            maxX = Math.floor(p1[0]);
            minY = 0;
            maxY = mapView.height;
        };


        d.startAnimation = startAnimation;
        d.drawContext = drawContext;
        d.replaceContext = replaceContext;
        d.updateTimeIndicator = updateTimeIndicator;
        d.setUIDateTime = setUIDateTime;
        d.getUIDateTime = getUIDateTime;
        d.getAltitudeBand = getAltitudeBand;
        d.setAltitudeBand = setAltitudeBand;
        d.updateDensity = updateDensity;
        d.init = init;
        d.minX = minX;
        d.maxX = maxX;
        d.minY = minY;
        d.maxY = maxY;
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
                var p = albers_projection([radars[row.radar_id].coordinates[0], radars[row.radar_id].coordinates[1]]);
                var point = [p[0], p[1], [row.avg_u_speed, -row.avg_v_speed]]; // negate v because pixel space grows downwards, not upwards
                points.push(point);
            });
            return points;
        }

        function createField() {
            //console.log("createField called");
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
            if (!dataByTimeAndAlt.hasOwnProperty(timestamp)) {
                columns = [];
                createField();
                return columns;
            }
            var indata = dataByTimeAndAlt[timestamp][altitude_band];
            var densities = indata.map(function(x) {return parseFloat(x.avg_bird_density);}).sort(function (a, b) {return a-b});
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
                        // console.log("Interpolating: " + x + "/" + maxX);
                        setTimeout(batchInterpolate, MIN_SLEEP_TIME);
                        return;
                    }
                }
                //console.log("columns interpolated");
                columns = tempColumns;
                return createField();
            }
            batchInterpolate();
            return columns;
        }

        function calculateForTimeAndAlt(date, altitude) {
            interpolateField(moment.utc(date).format(UTC_DATE_FORMAT) + "+00", altitude);
            drawer.updateDensity(moment.utc(date).format(UTC_DATE_FORMAT) + "+00", altitude);
        }

        interpolator.init = init;
        //interpolator.interpolateField = interpolateField;
        interpolator.calculateForTimeAndAlt = calculateForTimeAndAlt;
        return interpolator;
    };

    /**
     * Change the altitude and update radar data
     */
    function changeAltitude() {
        var date = drawer.getUIDateTime();
        var alt_band = drawer.getAltitudeBand();
        drawer.setUIDateTime(date);
        interpolator.calculateForTimeAndAlt(date, alt_band);
        drawer.replaceContext(alt_band);
    }

    /**
     * Subtract TIME_OFFSET minutes from entered time and show results
     */
    function previous() {
        var date = drawer.getUIDateTime();
        var alt_band = drawer.getAltitudeBand();
        date = moment(date).subtract('minutes', TIME_OFFSET);
        drawer.setUIDateTime(date);
        drawer.updateTimeIndicator(date);
        interpolator.calculateForTimeAndAlt(date, alt_band);
    }

    /**
     * Add TIME_OFFSET minutes from entered time and show results
     */
    function next(){
        var date = drawer.getUIDateTime();
        var alt_band = drawer.getAltitudeBand();
        date = moment(date).add('minutes', TIME_OFFSET);
        if (date > max_date) {
            date = min_date;
        }
        drawer.setUIDateTime(date);
        drawer.updateTimeIndicator(date);
        interpolator.calculateForTimeAndAlt(date, alt_band);
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
        // console.log("Pause clicked");
        clearInterval(interval);
        intervalRunning = false;
        $("#play-pause").addClass("active");
    }

    /**
     * Start interval for time running
     */
    function play() {
        // console.log("Paused unclicked");
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
                var datetime = drawer.getUIDateTime();
                var alt_band = drawer.getAltitudeBand();
                drawer.setUIDateTime(datetime);
                drawer.updateTimeIndicator(datetime);
                interpolator.calculateForTimeAndAlt(datetime, alt_band);
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
        $("#alt-band").on("change", function(event) {
            changeAltitude();
        })
    }

    function kneadBirdData(indata) {
        var result,
            timestamps,
            allAltitudeBands,
            altitudeBands,
            altBand;
        result = hashData(indata);
        dataByTimeAndAlt = result.dataByTime;
        dataByRadarAndAlt = result.dataByRadar;
        timestamps = result.keys;
        min_date = moment.utc(timestamps[0], UTC_DATE_FORMAT);
        max_date = moment.utc(timestamps[timestamps.length - 1], UTC_DATE_FORMAT);
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
            indata.radars[i].pixel_point = albers_projection(indata.radars[i].coordinates);
            radars[indata.radars[i].id] = indata.radars[i];
        }
    }

    function init() {
        bindControls();
        d3.csv(datafile, function(indata) {
            kneadBirdData(indata);
            d3.json(basemapfile, function(basemapdata) {
                d3.json(radardatafile, function(radarData) {
                    basemap = basemapdata;
                    drawer = createDrawer();
                    interpolator = createInterpolator();
                    var compfunc = function (a, b) {if (a.id < b.id) {return -1} if (a.id > b.id) {return 1} return 0};
                    sortedRadars = radarData.radars.sort(compfunc);
                    drawer.init(basemap, sortedRadars);
                    interpolator.init(drawer.view);
                    kneadRadarData(radarData);
                    drawer.setUIDateTime(min_date);
                    interpolator.calculateForTimeAndAlt(min_date, default_alt_band);
                    drawer.drawContext(default_alt_band);
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
