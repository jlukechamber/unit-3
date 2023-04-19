// Add all scripts to the JS folder
(function () {

    //global variables
    //variables for data join
    //removed "den_all" (density of all trees)
    var attrArray = ["London Planetree", "Pin Oak", "Littleleaf Linden", "Norway Maple", "Japanese Pagoda", "Flowering Cherry", "American Elm", "Green Ash", "Red Maple", "Silver Linden"];
    var expressed = attrArray[0]; //initla attribute

    //variable for supporting info
    var descriptions
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 40,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([chartHeight, 0])
        .domain([0, 550]); //what value to put here??

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
        d3.json("data/bky_neighborhoods.topojson"), d3.json("data/nyc_boroughs.topojson"), d3.csv("data/descriptions.csv")
        ];
        Promise.all(promises).then(callback);

        function callback(data) {
            csvData = data[0];
            bky = data[1];
            nyc = data[2];
            descriptions = data[3];

            console.log(descriptions)
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

            //call the dropdown
            createDropdown(csvData);

            makeLegend(colorScale);

            //createDescriptions(descriptions);
        };
    };

    function createDescriptions(descriptions) {
        d3.select("body")
            .append("div")
            .attr("class", "description")
            .attr("width", chartWidth)
            .attr("height", chartHeight)

        d3.select("descriptions")
            .append("p")
            .html(descriptions[expressed])

    };
    //function to create coordinated bar chart
    function setChart(csvData, colorScale) {
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //Example 2.4 line 8...set bars for each neighborhood
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed]
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
                return colorScale(d[expressed])
            })
            .on("mouseover", function (event, d) {
                highlight(d)
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
            })
            .on("mousemove", moveLabel);

        //below Example 2.2 line 31...add style descriptor to each rect
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');


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
        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);
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
                return "regions " + d.properties.ntacode;
            })
            .attr("d", path)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
            })
            .on("mouseover", function (event, d) {
                highlight(d.properties);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);
        //below Example 2.2 line 16...add style descriptor to each path
        var desc = neighborhoods.append("desc")
            .text('{"stroke": "beige", "stroke-width": "1px"}');

    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData) {
        //add select element

        var left = document.querySelector('.map').getBoundingClientRect().left + 10,
            top = document.querySelector('.map').getBoundingClientRect().top + 10;

        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .style('left', left + "px")
            .style("top", top + "px")
            .on("change", function () {
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function (d) { return d })
            .text(function (d) { return d });
    };


    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var regions = d3.selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
            });

        //Sort, resize, and recolor bars
        var bars = d3.selectAll(".bars")
            //Sort bars
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function (d, i) {
                return i * 20
            })
            .duration(500);
        updateChart(bars, csvData.length, colorScale);

        d3.select(".legend").remove();
        makeLegend(colorScale);
    };

    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale) {
        //position bars

        bars.attr("x", function (d, i) {
            return i * (chartInnerWidth / n) + leftPadding;
        })
            //size/resize bars
            .attr("height", function (d, i) {
                return 473 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d, i) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function (d) {
                var value = d[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
        //at the bottom of updateChart()...add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text("Trees/km² by Neighborhood: " + expressed);
    };

    //function to highlight enumeration units and bars
    function highlight(props) {
        //change stroke
        var selected = d3.selectAll("." + props.ntacode)
            .style("stroke", "#d979d1")
            .style("stroke-width", "2")
            .raise()
        setLabel(props);
    };

    //function to reset the element style on mouseout
    function dehighlight(props) {
        var selected = d3.selectAll("." + props.ntacode)
            .style("stroke", function () {
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName) {
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
        d3.select(".infolabel")
            .remove();
    };

    //function to create dynamic label
    function setLabel(props) {
        //label content
        var labelAttribute = "<h1>" + Math.round(props[expressed]) +
            "</h1><b>" + expressed + "/km<sup>2</sup>" + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.ntacode + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.ntaname);
    };

    //Example 2.8 line 1...function to move info label with mouse
    function moveLabel() {
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };

    function makeLegend(color) {
        var width = 300,
            height = 300;
            topBottomPadding = 5;
        var svg = d3.select("body")
            .append("svg")
            .attr("class", "legend")
            .attr("width", width)
            .attr("height", height)
            .style("float", 'left');
        var legend = svg.selectAll('g.legendEntry')
            .data(color.range().reverse())
            .enter()
            .append('g').attr('class', 'legendEntry')
            .style("float", 'left');
        legend
            .append('rect')
            .style("float", 'left')
            .attr("x", width - 200)
            .attr("y", function (d, i) {
                return i * 20;
            })
            .attr("width", 15)
            .attr("height", 15)
            .style("stroke", "beige")
            .style("stroke-width", 1)
            .style("fill", function (d) { return d; });
        //the data objects are the fill colors
        legend
            .append('text')
            .attr("x", width - 175) //leave 5 pixel space after the <rect>
            .attr("y", function (d, i) {
                return i * 20;
            })
            .attr("dy", "0.8em") //place text one line *below* the x,y point
            .text(function (d, i) {
                var extent = color.invertExtent(d);
                //extent will be a two-element array, format it however you want:
                var format = d3.format("0.2f");
                return format(+extent[0]) + " - " + format(+extent[1]);
            })
    }
})();