import { geocode, dominantCategory } from "./data-utils.js";
import { CATEGORY_COLORS } from "./config.js";

export async function renderWorldMap(people) {
  const width = 1200;
  const height = 620;
  const mapRoot = d3.select("#map");
  mapRoot.html("");
  const svg = mapRoot.append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g");
  const projection = d3.geoNaturalEarth1().scale(210).translate([width / 2, height / 2]);
  const path = d3.geoPath(projection);

  try {
    const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
    const countries = topojson.feature(world, world.objects.countries);
    g.selectAll("path").data(countries.features).join("path").attr("d", path).attr("fill", "#ece8e1").attr("stroke", "#c9c2b8").attr("stroke-width", 0.7);
  } catch {
    mapRoot.append("p").text("World map data failed to load.");
  }

  const grouped = {};
  const unknown = [];
  people.forEach(person => {
    const coords = geocode(person.cityCountry);
    if (!coords) { unknown.push(person); return; }
    const city = person.cityCountry.trim().toLowerCase().split(",")[0].trim();
    if (!grouped[city]) grouped[city] = { coords, people: [] };
    grouped[city].people.push(person);
  });

  const points = Object.entries(grouped).map(([city, data]) => ({ city, coords: data.coords, count: data.people.length, names: data.people.map(p => p.name), dominant: dominantCategory(data.people.map(p => p.category || [])) }));

  g.selectAll("circle").data(points).join("circle")
    .attr("cx", d => projection(d.coords)[0])
    .attr("cy", d => projection(d.coords)[1])
    .attr("r", d => Math.max(6, Math.min(20, d.count * 2.4)))
    .attr("fill", d => CATEGORY_COLORS[d.dominant] || "#bab9b4")
    .attr("fill-opacity", 0.85)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.5)
    .on("mousemove", (event, d) => showTooltip(event, `<strong>${capitalize(d.city)}</strong><br>${d.count} contact(s)<br>${d.names.join(", ")}`))
    .on("mouseleave", hideTooltip);

  svg.call(d3.zoom().scaleExtent([1, 8]).on("zoom", event => { g.attr("transform", event.transform); }));
  document.getElementById("unknownLocations").innerHTML = unknown.length ? `<ul>${unknown.map(p => `<li>${p.name}${p.cityCountry ? ` — ${p.cityCountry}` : ""}</li>`).join("")]

