/**
 * birds - a project to visualize bird migration flow for Belgium & Netherlands.
 *
 * Copyright (c) 2014 LifeWatch - INBO
 * The MIT License - http://opensource.org/licenses/MIT
 *
 * https://github.com/enram/bird-migration-flow-visualization
 *
 * Special thanks to Cameron Beccario for his air.js
 */

 (function() {
    "use strict";

    // special document elements
    var MAP_SVG_ID = "#map-svg";
    var FIELD_CANVAS_ID = "#field-canvas";
    var DISPLAY_ID = "#display";

    /**
     * Create settings
     */
    var settings = {
	vectorscale: 5
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
     * An object {width:, height:} that describes the extent of the browser's view in pixels.
     */
    var view = function() {
        var w = window, d = document.documentElement, b = document.getElementsByTagName("#MAP_SVG_ID")[0];
        var x = w.innerWidth || d.clientWidth || b.clientWidth;
        var y = w.innerHeight || d.clientHeight || b.clientHeight;
        log.debug("View size width:" + x + " height: "+ y);
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

    var vectorScale = function(value) {
	return value*settings.vectorscale;
    }

    function createArrow(g, projection, vscale, x, y, v) {
	console.log("draw arrow");
        g.beginPath();
        var start_x = projection([x, y])[0];
        var start_y = projection([x, y])[1];
        var end_x = start_x + vscale(v[0]);
        var end_y = start_y + vscale(v[1]);
        g.moveTo(start_x, start_y);
        g.lineTo(end_x, end_y);
        g.stroke();
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

            var albers_projection = createAlbersProjection(basemap.bbox[0], basemap.bbox[1], basemap.bbox[2], basemap.bbox[3], view);

            var path = d3.geo.path()
                .projection(albers_projection);
			
			var svg = d3.select(MAP_SVG_ID).append("svg")
                .attr("width", view.width)
                .attr("height", view.height);


            svg.append("path")
                .datum(countries)
                .attr("d", path);

            // svg.append("path")
            //     .datum(cities)
            //     .attr("d", path)
            //     .attr("class", "place");

            svg.append("path")
                .datum(radars)
                .attr("d", path)
                .attr("class", "radar");

	    // set field_canvas width and height
	    d3.select(FIELD_CANVAS_ID).attr("width", view.width).attr("height", view.height);

	    // get radar data
	    var alt = "high";
	    var radardata = retrieveRadarDataByAltitudeAndTime(alt, "2013-04-08T12:00:00Z");
	    radardata.done(function(data) {
		console.log(data);
		data.rows.forEach(function(point) {
		    // Create arrow
		    var g = d3.select(FIELD_CANVAS_ID).node().getContext("2d");
		    var v = [point.avg_u_speed, point.avg_v_speed, point.avg_bird_density];
		    console.log("u: " + point.avg_u_speed + ", v: " + point.avg_v_speed);
		    createArrow(g, albers_projection, vectorScale, point.longitude, point.latitude, v);
		});
	    });
        });
    }

    loadMap();
})();
