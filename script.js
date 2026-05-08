const { useEffect, useRef, useState } = React;

function EnergyMap({ countryRows, geoData, onCountryClick }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!countryRows.length || !geoData) {
      return;
    }

    const width = 800;
    const height = 600;
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Map of Africa showing Tier 4 plus electricity consumption share");

    svg.selectAll("*").remove();

    const projection = d3.geoMercator()
      .scale(400)
      .center([20, 0])
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const colorScale = d3.scaleSequential(d3.interpolateYlOrBr)
      .domain([0, 0.5]);

    const tooltip = d3.select("#tooltip");
    const darken = (color) => d3.color(color).darker(0.65).formatHex();

    const dataMap = new Map();

    countryRows.forEach((d) => {
      dataMap.set(d.country_code, d.tier4Share);
    });

    svg.selectAll("path")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("class", "country")
      .attr("fill", (d) => {
        const value = dataMap.get(d.properties.iso_a3);
        return value ? colorScale(value) : "#eee";
      })
      .each(function() {
        this.dataset.baseFill = d3.select(this).attr("fill");
      })
      .on("mouseover", function(event, d) {
        const value = dataMap.get(d.properties.iso_a3);
        const countryName = d.properties.name_long || d.properties.name;
        const baseFill = this.dataset.baseFill;

        d3.select(this).attr("fill", darken(baseFill));

        tooltip
          .style("opacity", 1)
          .html(`
            <strong>${countryName}</strong><br>
            Tier 4+ share: ${value ? d3.format(".1%")(value) : "No data"}
          `);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill", this.dataset.baseFill);
        tooltip.style("opacity", 0);
      })
      .on("click", (event, d) => {
        onCountryClick(d);
      });
  }, [countryRows, geoData, onCountryClick]);

  return (
    <div className="map-wrap">
      <svg ref={svgRef}></svg>
    </div>
  );
}

function ClickModal({ onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Country navigation notice"
        onClick={(event) => event.stopPropagation()}
      >
        <p>When you click, this will navigate to the country page.</p>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function App() {
  const [countryRows, setCountryRows] = useState([]);
  const [geoData, setGeoData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    d3.csv("map_data.csv").then((rows) => {
      setCountryRows(rows.map((row) => ({
        ...row,
        tier4Share: +row.tier_4plus_share,
        tier4Population: +row.tier_4plus_pop
      })));
    });

    d3.json("custom.geo.json").then(setGeoData);
  }, []);

  return (
    <>
      <main className="page">
        <EnergyMap
          countryRows={countryRows}
          geoData={geoData}
          onCountryClick={() => setIsModalOpen(true)}
        />
      </main>

      {isModalOpen && <ClickModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
