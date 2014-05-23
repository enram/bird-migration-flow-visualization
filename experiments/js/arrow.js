// defaults
var w = 400;
var h = 200;
var pad = 20;

// test data
var x = 5;
var y = 5;

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


