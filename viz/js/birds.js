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
var MAP_SVG_ID = "#map-svg";
var ANIMATION_CANVAS_ID = "#animation-canvas";

/**
 * Create settings
 */
var settings = {
    vectorscale: 0.12,
    frameRate: 100,
    framesPerTime: 60,
    maxParticleAge: 30
};

var particles = [];
var g;
var albers_projection;
var interval;
var iteration;
var basemap;

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


// Create particle objects based on the data
function createParticles(projection, data) {
    particles = [];
    data.rows.forEach(function(point) {
	var p = projection([point.longitude, point.latitude]);
	var particle = {
	    x: p[0],
	    y: p[1],
	    xt: 0,
	    yt: 0,
	    u: point.avg_u_speed,
	    v: point.avg_v_speed,
	    age: 0
	};
	particles.push(particle);
    });
    console.log(particles.length + "particles created: ");
    console.log(particles);
}

// Calculate the next particle's position
function evolve() {
    particles.forEach(function(particle) {
	if (particle.age < settings.maxParticleAge) {
	    var x = particle.x;
	    var y = particle.y;
	    var xt = x + particle.u * settings.vectorscale;
	    var yt = y - particle.v * settings.vectorscale; // v should be negated (because pixels go down, but the axis goes up)
	    particle.age += 1;
	    particle.xt = xt;
	    particle.yt = yt;
	};
    });
}

// Draw a line between a particle's current and next position
function draw() {
    particles.forEach(function(particle) {
	// Fade existing trails
	var prev = g.globalCompositeOperation;
	g.globalCompositeOperation = "destination-in";
	g.fillRect(0, 0, view.width, view.height);
	g.globalCompositeOperation = prev;

	// Draw new particle trails
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
    iteration++;
    if (iteration > settings.framesPerTime) {
	clearInterval(interval);
    }
    g.beginPath();
    evolve();
    draw();
    g.stroke();
};

function animateTimeFrame(data, projection) {
    console.log("animateTimeFrame() called.");
    g = d3.select(ANIMATION_CANVAS_ID).node().getContext("2d");
    g.lineWidth = 1.0;
    g.strokeStyle = "rgba(10, 10, 10, 1)";
    g.fillStyle = "rgba(255, 255, 255, 0.98";
    var particles = createParticles(projection, data);
    console.log("particles: " + particles);
    iteration = 0;
    interval = setInterval(runTimeFrame, settings.frameRate);
}

/**
 * Returns a promise for a JSON resource (URL) fetched via XHR. If the load fails, the promise rejects with an
 * object describing the reason: {error: http-status-code, message: http-status-text, resource:}.
 */
function loadMap() {
    d3.json("../data/basemap/basemap.topojson", function(error, basemap) {
	if (error) return console.error(error);

	var countries = topojson.feature(basemap, basemap.objects.ne_10m_admin_0_countries);
	//var cities = topojson.feature(basemap, basemap.objects.ne_10m_populated_places_simple);
	var radars = topojson.feature(basemap, basemap.objects.radars);

	albers_projection = createAlbersProjection(basemap.bbox[0], basemap.bbox[1], basemap.bbox[2], basemap.bbox[3], view);

	var path = d3.geo.path()
	    .projection(albers_projection);
		    
		    var svg = d3.select(MAP_SVG_ID)
	    .attr("width", view.width)
	    .attr("height", view.height);


	svg.append("path")
	    .datum(countries)
	    .attr("d", path)
	    .attr("class", "countries");

	// svg.append("path")
	//     .datum(cities)
	//     .attr("d", path)
	//     .attr("class", "place");

	path.pointRadius(1.8);

	svg.append("path")
	    .datum(radars)
	    .attr("d", path)
	    .attr("class", "radars");

	// set animation-canvas width and height
	d3.select(ANIMATION_CANVAS_ID)
	.attr("width", view.width)
	.attr("height", view.height);

	show();
    });
}

/**
 * Here comes all the interpolation stuff
 */

// Build points based on the data retrieved from the data back end
function buildPointsFromRadars(projection, data) {
    var points = [];
    data.rows.forEach(function(row) {
	var p = projection([row.longitude, row.latitude]);
	var point = [p[0], p[1], [row.avg_u_speed, -row.avg_v_speed]]; // negate v because pixel space grows downwards, not upwards
	points.push(point);
    });
    return points;
}

function createField(columns) {
    var nilVector = [NaN, NaN, NIL];
    var field = function(x, y) {
	var column = columns[Math.round(x)];
	if (column) {
	    var v = column[Math.round(y)];
	    if (v) {
		return v;
	    }
	}
	return nilVector;
    }
}

function interpolateField(data, settings, masks) {
    var d = when.defer();
    var points = buildPointsFromRadars(projection, data);

    var interpolate = mvi.inverseDistanceWeighting(test_points, 5);
    var columns = [];
    var minX = basemap.bbox[0];
    var maxX = basemap.bbox[2];
    var minY = basemap.bbox[1];
    var maxY = basemap.bbox[3];

    function interpolateColumn(x) {
	column = [];
	for (var y=minY; y<=maxY; y++) {
	    var v = [0, 0, 0];
	    v = interpolate(x, y, v);
	    v = mvi.scaleVector(v, settings.vectorscale);
	    column.push(v);
		
	}
	return column;
    }

    var x = minX;
    (function batchInterpolate() {
	try {
	    var start = +new Date;
	    while (x<maxX) {
		columns[x] = interpolateColumn(x);
		x++;
		if ((+new Date - start) > MAX_TASK_TIME) {
		    displayStatus("Interpolating: " + x + "/" + maxX);
		    setTimeout(batchInterpolate, MIN_SLEEP_TIME);
		    return;
		}
	    }
	    d.resolve(createField(columns));
	}
	catch (e) {
	    d.reject(e);
	}
    })();
}

/**
 * End of the interpolation stuff
 */

loadMap();

function show() {
    var altBand = $("#alt-band").val();
    var datetime = $("#time-in").val();
    var radardata = retrieveRadarDataByAltitudeAndTime(altBand, datetime);
    radardata.done(function(data) {
	animateTimeFrame(data, albers_projection);
    });
}

$("#redraw").on("click", function(event) {
    show();
});
