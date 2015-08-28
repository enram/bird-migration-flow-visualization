var flowViz = function() {
    // initialize app variables
    var animationView,
        animationCanvas,
        columns,
        flowData,
        frameRate = 60,          // Desired milliseconds per frame
        g,
        grid,
        maxParticleAge = 60,     // Maximum number of frames a particle is drawn before regeneration
        particleCount = 450,      // Number of particles
        particles = [],
        pointData,
        vectordenominator = 1000;

    // initialize app methods
    var buildInterpolationPoints,
        createField,
        createParticle,
        destroy,
        draw,
        evolve,
        init,
        interpolateField,
        rand,
        runTimeFrame,
        setData,
        setTime,
        startAnimation;

    // module
    var mod = {};

    //=========================================
    // All interpolation stuff
    //=========================================

    buildInterpolationPoints = function (indata) {
        var points = [];
        indata.forEach(function(row) {
            var p = pointData[row.radar_id].pixel_point;
            var point = [p[0], p[1], [row.avg_u_speed, -row.avg_v_speed]]; // negate v because pixel space grows downwards, not upwards
            points.push(point);
        });
        return points;
    };

    createField = function () {
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
    };

    interpolateField = function (timestamp) {
        if (!flowData.hasOwnProperty(timestamp)) {
            columns = [];
            createField();
            return columns;
        }
        var indata = flowData[timestamp];
        var densities = indata.map(function(x) {return parseFloat(x.avg_bird_density);}).sort(function (a, b) {return a-b});
        var points = buildInterpolationPoints(indata);
        var numberOfPoints = points.length;
        if (numberOfPoints > 5) {
            numberOfPoints = 5; // Maximum number of points to interpolate from.
        }
        var interpolate = mvi.inverseDistanceWeighting(points, numberOfPoints);
        var tempColumns = [];

        var x = animationView.minX;
        var MAX_TASK_TIME = 50;  // Amount of time before a task yields control (milliseconds)
        var MIN_SLEEP_TIME = 25;

        function interpolateColumn(x) {
            var column = [];
            for (var y=animationView.minY; y<=animationView.maxY; y++) {
                var v = [0, 0, 0];
                v = interpolate(x, y, v);
                v = mvi.scaleVector(v, animationView.maxY / vectordenominator);
                column.push(v);
            }
            return column;
        }

        function batchInterpolate() {
            var start = +new Date;
            while (x<animationView.maxX) {
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
    };



    //=========================================
    // Next, all the animation stuff
    //=========================================


    // Return a random number between min (inclusive) and max (exclusive).
    rand = function (min, max) {
        return min + Math.random() * (max - min);
    };

    // Create particle object
    createParticle = function (age) {
        var particle = {
            age: age,
            x: rand(animationView.minX, animationView.maxX),
            y: rand(animationView.minY, animationView.maxY),
            xt: 0,
            yt: 0
        };
        return particle
    };

    // Calculate the next particle's position
    evolve = function () {
        particles.forEach(function(particle, i) {
            if (particle.age >= maxParticleAge) {
                particles.splice(i, 1);
                particle = createParticle(Math.floor(rand(0, maxParticleAge/2))); // respawn
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
    };

    // Draw a line between a particle's current and next position
    draw = function () {
        // Fade existing trails
        var prev = g.globalCompositeOperation;
        g.globalCompositeOperation = "destination-in";
        g.fillRect(animationView.minX, animationView.minY,
            animationView.maxX - animationView.minX, animationView.maxY - animationView.minY);
        g.globalCompositeOperation = prev;

        // Draw new particle trails
        particles.forEach(function(particle) {
            if (particle.age < maxParticleAge) {
                g.moveTo(particle.x, particle.y);
                g.lineTo(particle.xt, particle.yt);
                particle.x = particle.xt;
                particle.y = particle.yt;
            }
        });
    };

    // This function will run the animation for 1 time frame
    runTimeFrame = function () {
        g.beginPath();
        evolve(animationView);
        draw();
        g.stroke();
    };


    startAnimation = function (animationCanvas) {
        g = animationCanvas.node().getContext("2d");
        g.lineWidth = 2;
        g.strokeStyle = "rgba(14, 100, 143, 0.9)";
        g.fillStyle = "rgba(255, 255, 255, 0.7)"; /*  White layer to be drawn over existing trails */
        for (var i=0; i< particleCount; i++) {
            particles.push(createParticle(Math.floor(rand(0, maxParticleAge))));
        }
        var animationTimeOut = setInterval(runTimeFrame, frameRate);
    };


    //=========================================
    // Module interface
    //=========================================


    destroy = function() {
        this.remove(); // TODO: this doesn't work
    };

    init = function(elementID, view, time, inflowData, inpointData) {
        flowData = inflowData;
        pointData = inpointData;
        animationView = view;
        interpolateField(time);
        animationCanvas = d3.select(elementID); // Animation canvas element
        animationCanvas.attr("width", animationView.width).attr("height", animationView.height);
        setTimeout(function() {startAnimation(animationCanvas)}, 600);
    };

    setData = function(inflowData, timestamp) {
        flowData = inflowData;
        interpolateField(timestamp);
    };

    setTime = function(timestamp) {
        interpolateField(timestamp);
    };

    mod.destroy = destroy;
    mod.init = init;
    mod.setData = setData;
    mod.setTime = setTime;
    return mod;
};