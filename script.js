const { useEffect, useMemo, useRef, useState } = React;

function EnergyMap({ countryRows, geoData }) {
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
        window.location.hash = `#/country/${d.properties.iso_a3}`;
      });
  }, [countryRows, geoData]);

  return (
    <div className="map-wrap">
      <svg ref={svgRef}></svg>
    </div>
  );
}

function CountryDetail({ country }) {
  if (!country) {
    return (
      <main className="page">
        <section className="not-found">
          <a className="back-link" href="#">Back to map</a>
          <h1>Country not found</h1>
          <p>No country data was found for this page.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="country-detail">
        <a className="back-link" href="#">Back to map</a>
        <h1>{country.country_name}</h1>
        <div className="data-grid">
          <article className="data-card">
            <p className="data-label">Country code</p>
            <p className="data-value">{country.country_code || country.iso_a3}</p>
          </article>
          <article className="data-card">
            <p className="data-label">Tier 4+ share</p>
            <p className="data-value">
              {Number.isFinite(country.tier4Share) ? d3.format(".1%")(country.tier4Share) : "No data"}
            </p>
          </article>
          <article className="data-card">
            <p className="data-label">Tier 4+ population</p>
            <p className="data-value">
              {Number.isFinite(country.tier4Population) ? d3.format(",")(country.tier4Population) : "No data"}
            </p>
          </article>
        </div>
        <div className="content">
          <p>
            This page can expand into country-level context, trend summaries,
            source notes, and links to related energy access indicators.
          </p>
          <p>
            The current mockup uses the same CSV as the map so each country page
            is driven by the available dataset.
          </p>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [countryRows, setCountryRows] = useState([]);
  const [geoData, setGeoData] = useState(null);
  const [route, setRoute] = useState(window.location.hash);

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

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const countryByCode = useMemo(() => {
    return new Map(countryRows.map((country) => [country.country_code, country]));
  }, [countryRows]);

  const geoCountryByCode = useMemo(() => {
    if (!geoData) {
      return new Map();
    }

    return new Map(geoData.features.map((feature) => [
      feature.properties.iso_a3,
      {
        iso_a3: feature.properties.iso_a3,
        country_name: feature.properties.name_long || feature.properties.name
      }
    ]));
  }, [geoData]);

  const countryCode = route.match(/^#\/country\/([^/]+)$/)?.[1];
  const selectedCountry = countryCode
    ? countryByCode.get(countryCode) || geoCountryByCode.get(countryCode)
    : null;

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-brand">Open Energy Map</div>
          <nav className="site-nav" aria-label="Main navigation">
            <a href="#">Overview</a>
            <a href="#">Data</a>
            <a href="#">Methodology</a>
            <a href="#">Contact</a>
          </nav>
        </div>
      </header>

      {countryCode ? (
        <CountryDetail country={selectedCountry} />
      ) : (
        <main className="page">
          <h1 className="page-title">Population Above Tier 4 Electricity Consumption</h1>
          <EnergyMap countryRows={countryRows} geoData={geoData} />
          <section className="content" aria-label="Page content">
            <p>
              This page can introduce the dataset, summarize key regional patterns,
              and provide context for interpreting electricity consumption access
              across the continent.
            </p>
            <p>
              Additional copy can describe methodology, caveats, source notes, or
              next steps for exploring country-level energy access indicators.
            </p>
          </section>
        </main>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
