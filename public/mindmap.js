let currentSvg = null;

export function renderMindmap(people, edges) {
  const container = document.getElementById("mindmap-container");
  if (!container) return;

  container.innerHTML = "";

  const width = container.clientWidth || 1000;
  const height = container.clientHeight || 700;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  currentSvg = svg;

  const zoomLayer = svg.append("g");

  svg.call(
    d3.zoom().scaleExtent([0.2, 4]).on("zoom", event => {
      zoomLayer.attr("transform", event.transform);
    })
  );

  const nodes = people.map(person => ({
    id: person.id,
    name: person.name || "Unknown",
    category: person.category?.[0] || "Other",
    strength: person.relationshipStrength || 1
  }));

  const links = edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    strength: edge.strength || 1,
    label: edge.label || "Connection"
  }));

  const color = d3.scaleOrdinal()
    .domain(["Trading", "Professional", "Personal", "Family", "Acquaintance", "Other"])
    .range(["#5591c7", "#6daa45", "#e8af34", "#d163a7", "#fdab43", "#4f98a3"]);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(d => 150 - (d.strength * 8)))
    .force("charge", d3.forceManyBody().strength(-260))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => 12 + d.strength));

  const link = zoomLayer.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "rgba(205, 204, 202, 0.45)")
    .attr("stroke-width", d => Math.max(1.5, d.strength * 0.8));

  const node = zoomLayer.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .call(d3.drag()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded)
    );

  node.append("circle")
    .attr("r", d => 8 + Math.min(10, d.strength))
    .attr("fill", d => color(d.category))
    .attr("stroke", "#171614")
    .attr("stroke-width", 2);

  node.append("text")
    .text(d => d.name)
    .attr("x", 14)
    .attr("y", 4)
    .attr("fill", "#cdccca")
    .attr("font-size", 11)
    .style("pointer-events", "none");

  node.append("title")
    .text(d => `${d.name} • ${d.category}`);

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node.attr("transform", d => `translate(${d.x}, ${d.y})`);
  });

  function dragStarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragEnded(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
}

export function resetMindmapView() {
  if (!currentSvg) return;
  currentSvg.transition().duration(500).call(
    d3.zoom().transform,
    d3.zoomIdentity
  );
}
