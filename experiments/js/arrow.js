// defaults
var w = 400;
var h = 200;
var pad = 20;

// test data
var x1 = 5;
var y1 = 5;
var x2 = 6;
var y2 = 6;

// add svg
var svg = d3.select("#map").append("svg").attr("width", w + 2*pad).attr("height", h + 2*pad);

// set scales
var xscale = d3.scale.linear().domain([0,10]).range([0, w]);
var yscale = d3.scale.linear().domain([0,10]).range([h, 0]);

// define axes
var xaxis = d3.svg.axis().scale(xscale).orient("bottom");
var yaxis = d3.svg.axis().scale(yscale).orient("left");

// draw x axis
svg.append("g").attr("class", "axis")
    .attr("transform", "translate(" + pad +"," + (h + pad) + ")")
    .call(xaxis);

// draw y axis
svg.append("g").attr("class", "axis")
    .attr("transform", "translate(" + pad + "," + pad + ")").call(yaxis);

// Add arrowhead
var marker = svg.append("marker")
    .attr("id", "arr-head")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", "0")
    .attr("refY", "5")
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", "4")
    .attr("markerHeight", "3")
    .attr("orient", "auto");

marker.append("path").attr("d", "M 0 0 L 10 5 L 0 10 z");

// draw line going from coordinates (5,5) to (6,6)
svg.append("line")
    .attr("class", "arrow")
    .attr("x1", (pad+xscale(x1)))
    .attr("y1", (pad+yscale(y1)))
    .attr("x2", (pad+xscale(x2)))
    .attr("y2", (pad+yscale(y2)))
    .attr("marker-end", "url(#arr-head)");
