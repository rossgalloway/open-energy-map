const width = 800;
const height = 600;

const svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoMercator()
  .scale(400)
  .center([20, 0])
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

const colorScale = d3.scaleSequential(d3.interpolateYlOrBr)
  .domain([0, 0.5]);

const tooltip = d3.select("#tooltip");

Promise.all([
  d3.json("custom.geo.json"),
  d3.csv("map_data.csv")
]).then(([geoData, csvData]) => {

  const dataMap = new Map();

  csvData.forEach(d => {
    dataMap.set(d.country_code, +d.tier_4plus_share);
  });

  svg.selectAll("path")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "country")
    .attr("fill", d => {
      const value = dataMap.get(d.properties.iso_a3);
      return value ? colorScale(value) : "#eee";
    })
    .on("mouseover", function(event, d) {
      const value = dataMap.get(d.properties.iso_a3);
      const countryName = d.properties.name_long || d.properties.name;

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${countryName}</strong><br>
          Tier 4+ share: ${value ? d3.format(".1%")(value) : "No data"}
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity", 0);
    });

});