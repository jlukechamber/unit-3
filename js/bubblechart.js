// Add all scripts to the JS folder

//execute script when window is loaded
window.onload = function () {

    var w = 900, h = 500;

    var container = d3.select("body")
        .append("svg")
        .attr("height", h)
        .attr("width", w)
        .attr("class", "container")
        .style("background-color", "rgba(0,0,0,0.2"); //get the <body> element from the DOM
    //only append once

    var innerRect = container.append("rect")
        .datum(400)
        .attr("height", function (d) {
            return d;
        })
        .attr("width", function (d) {
            return d * 2;
        })
        .attr("x", 50)
        .attr("y", 50)
        .style("fill", "white");

    var dataValues = [10, 20, 30, 40, 50];

    var cityPop = [
        {
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];

    var x = d3.scaleLinear()
        .range([90, 720]) //output min max pixel values
        .domain([0, 3]); //input min max

    var minPop = d3.min(cityPop, function (d) {
        return d.population;
    });

    var maxPop = d3.max(cityPop, function (d) {
        return d.population;
    });

    var y = d3.scaleLinear() //must consider min and max of dataset
        .range([450, 50]) //bottom to top "work inversely"
        .domain([0, 700000]); //bottom to top

    var color = d3.scaleLinear()
        .range([
            "#FDBE85",
            "#D94701",
        ])
        .domain([
            minPop,
            maxPop
        ]);

    var circles = container.selectAll(".circles") //placeholder selection, selects all in a set
        .data(cityPop)
        .enter() //assigns data to empty selection and makes available for use
        .append("circle") //create a new circle for every item in array
        .attr("class", "circles")
        .attr("id", function (d) {
            return d.city;
        })
        .attr("r", function (d) {
            //calculate radius based on population values as circle area
            var area = d.population * 0.01;
            return Math.sqrt(area / Math.PI);
        })
        .attr("cx", function (d, i) { //d refers to data value, i refers to index of data
            //return 90 + (i * 180);
            return x(i); //i because we're dealing with the index of the array
        })
        .attr("cy", function (d) {
            return y(d.population); //d because we're dealing with the data.
        })
        .style("fill", function (d) {
            return color(d.population)
        })
    //.style("stroke", "#000"); //black circle stroke;

    var yAxis = d3.axisLeft(y);
    //create axis g element and add axis
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);

    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("City Populations");

    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function (d) {
            //vertical position centered on each circle
            return y(d.population)-4;
        });

    //first line of label
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function (d, i) {
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .text(function (d) {
            return d.city;
        });

    var format = d3.format(",");

    //second line of label
    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15") //vertical offset
        .text(function(d){
            return "Pop. " + format(d.population); //use format generator to format numbers
        });
};