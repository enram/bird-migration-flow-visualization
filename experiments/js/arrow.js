// defaults
var w = 400;
var h = 200;
var pad = 20;

// add svg
var svg = d3.select("#map").append("svg").attr("width", w + 2*pad).attr("height", h + 2*pad);

// set scales
var xscale = d3.scale.linear().domain([0,10]).range([0, w]); // x scale for the position of the arrow
var yscale = d3.scale.linear().domain([0,10]).range([h, 0]); // y scale for the position of the arrow
var zscale = d3.scale.linear().domain([0,100]).range([0, h]); // scale for the length of the arrow
 
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

// define line variable so you can delete it when drawing a new one
var line = svg.append("line").attr("class", "arrow");

// draw line going from coordinates (5,5) to (6,6)
// the arrow is pointing downwards, because the translate will 
function drawArrow(x, y, len, rotation) {
    line.attr("x1", pad)
	.attr("y1", pad)
	.attr("x2", pad)
	.attr("y2", (pad+zscale(len)))
	.attr("marker-end", "url(#arr-head)")
	.attr("transform", "translate(" + xscale(x) + ", " + yscale(y) + ") rotate(" + (180+rotation) + " " + pad + " " + pad + ")");
}


/* =======================
 * jQuery stuff
 * =======================
 */
$("#draw-but").on("click", function(event) {
    console.log("button clicked");
    var x = parseInt($("#x-in").val());
    var y = parseInt($("#y-in").val());
    var len = parseInt($("#len-in").val());
    var rotation = parseInt($("#rot-in").val());
    console.log("x: " + x + ", y: " + y + ", length: " + len + ", rotation: " + rotation);
    drawArrow(x, y, len, rotation);
});

