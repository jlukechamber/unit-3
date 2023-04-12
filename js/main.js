// Add all scripts to the JS folder
(function () {

    //global variables
    //variables for data join
    var attrArray = ["den_all", "den_PT", "den_PO", "den_LL", "den_NM", "den_JP", "den_FC", "den_AE", "den_GA", "den_RM", "den_SL"];
    var expressed = attrArray[0]; //initla attribute

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap() {

        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 473;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on Brooklyn
        var projection = d3.geoAlbers()
            .center([0, 40.655])
            .rotate([73.95, 0, 0])
            .parallels([27.68, 45.5])
            .scale(140000)
            .translate([width / 2, height / 2]);


        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [d3.csv("data/bky_trees.csv"),
        d3.json("data/bky_neighborhoods.topojson"), d3.json("data/nyc_boroughs.topojson")
        ];
        Promise.all(promises).then(callback);

        function callback(data) {
            csvData = data[0];
            bky = data[1];
            nyc = data[2];
            console.log(csvData)
            console.log(bky)
            console.log(nyc)

            //translate nyc boroughs and brooklyn neighborhoods topojsons
            var nyc_brgs = topojson.feature(nyc, nyc.objects.nyc_boroughs),
                bky_Neighborhoods = topojson.feature(bky, bky.objects.bky_neighborhoods).features;

            var boroughs = map.append("path")
                .datum(nyc_brgs)
                .attr("class", "boroughs")
                .attr("d", path);

            //join csv data to GeoJson enumeration units
            bky_Neighborhoods = joinData(bky_Neighborhoods, csvData);

            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(bky_Neighborhoods, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);
        };
    };

    //function to create coordinated bar chart
    function setChart(csvData, colorScale) {
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 473,
            leftPadding = 40,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        /*//create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);*/

        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([chartHeight, 0])
            .domain([400, 2500]); //what value to put here??

        //Example 2.4 line 8...set bars for each neighborhood
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return a[expressed] - b[expressed]
            })
            .attr("class", function (d) {
                return "bars " + d.ntacode;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function (d, i) {
                return i * (chartInnerWidth / csvData.length) + leftPadding + rightPadding;
            })
            .attr("height", function (d, i) {
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d, i) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function (d) {
                return colorScale(d[expressed]);
            });

        var chartTitle = chart.append("text")
            .attr("x", 50)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Brooklyn Neighborhoods: total trees/sq km"); //what is "expressed[3]"

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);



        //create frame for chart border
        /*var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);*/


    };

    //function to create color scale generator - quantile (equal number of neighborhoods in classes)
    function makeColorScale(data) {
        var colorClasses = [
            "#edf8e9",
            "#bae4b3",
            "#74c476",
            "#31a354",
            "#006d2c"
        ];
        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        //console.log(colorScale.quantiles())

        return colorScale;
    };

    function joinData(bky_Neighborhoods, csvData) {
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.ntacode; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < bky_Neighborhoods.length; a++) {

                var geojsonProps = bky_Neighborhoods[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.ntacode; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {

                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        return bky_Neighborhoods;
    };

    function setEnumerationUnits(bky_Neighborhoods, map, path, colorScale) {
        //...REGIONS BLOCK FROM Week 8
        var neighborhoods = map.selectAll(".regions") //what is .regions doing?
            .data(bky_Neighborhoods)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "neighborhoods " + d.properties.ntacode;
            })
            .attr("d", path)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
            });
    };
})();