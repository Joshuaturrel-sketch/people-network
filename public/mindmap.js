// mindmap.js
// Renders a force-directed relationship graph using D3.

export function renderMindmap(people, edges, containerId = "mindmap-container") {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const width  = container.clientWidth  || 800;
  const height = container.clientHeight || 600;

  const svg = d3.select(container)
    .append("svg")
    .attr("width",  width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("background", "var(--color-surface)");

  const g = svg.append("g");

  svg.call(d3.zoom().scaleExtent([0.2, 4]).on("zoom", e => g.attr("transform", e.transform)));

  // Nodes from people
  const nodes = people.map(p => ({
    id:       p.id,
    name:     p.name || "Unknown",
    category: p.category?.[0] || "Other",
    layer:    p.layer || "Unknown",
  }));

  // Links from edges (or fallback: none)
  const links = edges
    .filter(e => e.source && e.target)
    .map(e => ({ source: e.source, target: e.target }));

  const CATEGORY_COLOR = {
    "Friend":     "#01696f",
    "Colleague":  "#006494",
    "Client":     "#437a22",
    "Family":     "#a12c7b",
    "Acquaintance":"#da7101",
  };
  const nodeColor = d => CATEGORY_COLOR[d.category] || "#7a39bb";

  const simulation = d3.forceSimulation(nodes)
    .force("link",   d3.forceLink(links).id(d => d.id).distance(80))
    .force("charge", d3.forceManyBody().strength(-120))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide(18));

  const link = g.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "var(--color-border)")
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.6);

  const node = g.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .call(d3.drag()
      .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end",   (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  node.append("circle")
    .attr("r", 10)
    .attr("fill", nodeColor)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5);

  node.append("text")
    .text(d => d.name)
    .attr("x", 13)
    .attr("y", 4)
    .attr("font-size", "10px")
    .attr("fill", "var(--color-text)")
    .style("pointer-events", "none");

  node.append("title").text(d => `${d.name}\n${d.category} · ${d.layer}`);

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });
}
