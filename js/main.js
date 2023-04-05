// Add all scripts to the JS folder

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap() {

    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
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
        //console.log(csvData)
        //console.log(bky)
        console.log(nyc)

        var nyc_brgs = topojson.feature(nyc, nyc.objects.nyc_boroughs),
            bky_Neighborhoods = topojson.feature(bky, bky.objects.bky_neighborhoods).features;
        //console.log(bky_Neighborhoods)

        //add background to map

        var neighborhoods = map.selectAll(".regions") //what is .regions doing?
            .data(bky_Neighborhoods)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "neighborhoods " + d.properties.ntacode;
            })
            .attr("d", path);

        var boroughs = map.append("path")
            .datum(nyc_brgs)
            .attr("class", "boroughs")
            .attr("d", path);
    }
};