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

// special document elements
var DISPLAY_ID = "#display";
var MAP_SVG_ID = "#map-svg";
var ANIMATION_CANVAS_ID = "#animation-canvas";

// Declare required globals
var particles = [];
var g;
var albers_projection;
var interval;
var basemap;
var field;
var minX;
var maxX;
var minY;
var maxY;
var columns;

/** 
 * Extract parameters sent to us by the server.
 */
var displayData = {
    topography: d3.select(DISPLAY_ID).attr("data-topography"),
};

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

/**
 * An object {width:, height:} that describes the extent of the container's view in pixels.
 */
var view = function() {
    var b = document.getElementById("display");
    var x = b.clientWidth;
    var y = b.clientHeight;
    log.debug("Container size width:" + x + " height: "+ y);
    return {width: x, height: y};
}();

/**
 * Create settings
 */
var settings = {
    vectorscale: (view.height / 4000),
    frameRate: 100,
    framesPerTime: 60,
    maxParticleAge: 30,
    particleCount: 300
};

/**
 * Initialize the application
 */
function init() {
    log.debug("Topography URI: " + displayData.topography);
    // Modify the display elements to fill the screen.
    d3.select(DISPLAY_ID).attr("width", view.width).attr("height", view.height);
    d3.select(MAP_SVG_ID).attr("width", view.width).attr("height", view.height);
    d3.select(ANIMATION_CANVAS_ID).attr("width", view.width).attr("height", view.height);
} 

/**
 * Returns a d3 Albers conical projection (en.wikipedia.org/wiki/Albers_projection) that maps the bounding box
 * defined by the lower left geographic coordinates (lng0, lat0) and upper right coordinates (lng1, lat1) onto
 * the view port having (0, 0) as the upper left point and (width, height) as the lower right point.
 */
function createAlbersProjection(lng0, lat0, lng1, lat1, view) {
    // Construct a unit projection centered on the bounding box. NOTE: center calculation will not be correct
    // when the bounding box crosses the 180th meridian. Don't expect that to happen to Tokyo for a while...
    log.time("Creating projection");
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
    log.timeEnd("Projection created");
    return projection.scale(s).translate(t);
} 

// Create particle object
function createParticle(age) {
    var particle = {
	age: age,
	x: rand(minX, maxX),
	y: rand(minY, maxY),
	xt: 0,
	yt: 0
    }
    return particle
}

// Calculate the next particle's position
function evolve() {
    particles.forEach(function(particle) {
	if (particle.age < settings.maxParticleAge) {
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
	};
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
	};
    });
}

// This function will run the animation for 1 time frame
function runTimeFrame() {
    g.beginPath();
    evolve();
    draw();
    g.stroke();
};

function animateTimeFrame(data, projection) {
    g = d3.select(ANIMATION_CANVAS_ID).node().getContext("2d");
    g.lineWidth = 1.0;
    g.strokeStyle = "rgba(255, 255, 255, 1)";
    g.fillStyle = "rgba(255, 255, 255, 0.98)";
    particles = []
    for (var i=0; i< settings.particleCount; i++) {
	particles.push(createParticle(Math.floor(rand(0, settings.maxParticleAge))));
    }
    interval = setInterval(runTimeFrame, settings.frameRate);
}

/**
 * Returns a promise for a JSON resource (URL) fetched via XHR. If the load fails, the promise rejects with an
 * object describing the reason: {error: http-status-code, message: http-status-text, resource:}.
 */

function loadJson(resource) {
    log.time("JSON Retrieval...");
    log.debug("JSON Retrieval...");
    var d = when.defer();
    d3.json(resource, function(error, result) {
        log.debug("Retrieval finished");
        return error ?
            !error.status ?
                d.reject({error: -1, message: "Cannot load resource: " + resource, resource: resource}) :
                d.reject({error: error.status, message: error.statusText, resource: resource}) :
            d.resolve(result);
    });
    log.timeEnd("JSON Retrieved");
    return d.promise;
}

/**
 * Load the basemap in the svg with the countries, country border and radars
 */
function loadMap(bm) {
    log.debug("Creating basemap...");
    basemap = bm;
    var countries = topojson.feature(basemap, basemap.objects.ne_10m_admin_0_countries);
    //var cities = topojson.feature(basemap, basemap.objects.ne_10m_populated_places_simple);
    var radars = topojson.feature(basemap, basemap.objects.radars);

    albers_projection = createAlbersProjection(basemap.bbox[0], basemap.bbox[1], basemap.bbox[2], basemap.bbox[3], view);

    var path = d3.geo.path()
        .projection(albers_projection);

    var svg = d3.select(MAP_SVG_ID);

    svg.append("path")
        .datum(countries)
        .attr("d", path)
        .attr("class", "countries");

    // svg.append("path")
    //      .datum(cities)
    //      .attr("d", path)
    //      .attr("class", "place");

    path.pointRadius(2);

    svg.append("path")
        .datum(radars)
        .attr("d", path)
        .attr("class", "radars");

    log.debug("Basemap created");
}

/**
 * Here comes all the interpolation stuff
 */

// Return a random number between min (inclusive) and max (exclusive).
function rand(min, max) {
    return min + Math.random() * (max - min);
}
/**
 *      * Returns the index of v in array a (adapted from Java and darkskyapp/binary-search).
 *           */
function binarySearch(a, v) {
    var low = 0, high = a.length - 1;
    while (low <= high) {
	var mid = low + ((high - low) >> 1), p = a[mid];
	if (p < v) {
	    low = mid + 1;
	}
	else if (p === v) {
	    return mid;
	}
	else {
	    high = mid - 1;
	}
    }
    return -(low + 1);
}

// Build points based on the data retrieved from the data back end
function buildPointsFromRadars(data) {
    var points = [];
    data.rows.forEach(function(row) {
	var p = albers_projection([row.longitude, row.latitude]);
	var point = [p[0], p[1], [row.avg_u_speed, -row.avg_v_speed]]; // negate v because pixel space grows downwards, not upwards
	points.push(point);
    });
    return points;
}

function createField() {
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
    }

    return field;
}

function interpolateField(data) {
    var points = buildPointsFromRadars(data);
    var interpolate = mvi.inverseDistanceWeighting(points, 2);
    columns = [];
    var p0 = albers_projection([basemap.bbox[0], basemap.bbox[1]]);
    var p1 = albers_projection([basemap.bbox[2], basemap.bbox[3]]);
    minX = Math.floor(p0[0]);
    maxX = Math.floor(p1[0]);
    minY = Math.floor(p1[1]);
    maxY = Math.floor(p0[1]);
    var x = minX;
    var MAX_TASK_TIME = 100;  // amount of time before a task yields control (milliseconds)
    var MIN_SLEEP_TIME = 25;

    function interpolateColumn(x) {
	var column = [];
	for (var y=minY; y<=maxY; y++) {
	    var v = [0, 0, 0];
	    v = interpolate(x, y, v);
	    v = mvi.scaleVector(v, settings.vectorscale);
	    column.push(v);
	}
	return column;
    }

    function batchInterpolate() {
	var start = +new Date;
	while (x<maxX) {
	    columns[x] = interpolateColumn(x);
	    x++;
	    if ((+new Date - start) > MAX_TASK_TIME) {
		console.log("Interpolating: " + x + "/" + maxX);
		setTimeout(batchInterpolate, MIN_SLEEP_TIME);
		return;
	    }
	}
	return createField();
    }

    batchInterpolate();
}

/**
 * End of the interpolation stuff
 */


function show() {
    var altBand = $("#alt-band").val();
    var datetime = $("#time-int").val();
    var radardata = retrieveRadarDataByAltitudeAndTime(altBand, datetime);
    radardata.done(function(data) {
	interpolateField(data);
	animateTimeFrame(data, albers_projection);
    });
}

function changeAltitude() {
    show();
}

/**
 * Subtract 20 minutes from entered time and show results
 */
function previous() {
    var datetime = $("#time-int").val();
    var date = new Date(datetime);
    date.addMinutes(-20);
    $("#time-int").val(date.toISOString());
    show();
}

/**
 * Add 20 minutes from entered time and show results
 */
function next(){
    var datetime = $("#time-int").val();
    var date = new Date(datetime);
    date.addMinutes(20);
    $("#time-int").val(date.toISOString());
    show();
}

/**
 * Returns a function that takes an array and applies it as arguments to the specified function. Yup. Basically
 * the same as when.js/apply.
 *
 * Used in the when/then calls
 */
function apply(f) {
    return function(args) {
        return f.apply(null, args);
    }
}

/**
 * Dependency tree build with whenjs to define the order of tasks 
 * to be run when loading the application.
 */
var taskTopoJson       = loadJson(displayData.topography);
var taskInitialization = when.all(true).then(apply(init));
var taskRenderMap      = when.all([taskTopoJson]).then(apply(loadMap));
var taskRadarData      = when.all([taskRenderMap]).then(apply(show));
