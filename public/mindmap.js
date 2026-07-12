import { CATEGORY_COLORS } from "./config.js";

let allPeople = [];
let allEdges = [];
let activeCategories = new Set();
let zoomBehavior = null;
let currentTransform = d3.zoomIdentity;
let simulation = null;
let svg, zoomLayer, linkLayer, nodeLayer, labelLayer;

export function initMindmap(people, mergedEdges) {
  allPeople = people;
  allEdges = mergedEdges;
  renderCategoryChips();
  bindControls();
  initSvg();
  drawMindmap();
}

function initSvg() {
  svg = d3.select("#mindmap");
  svg.selectAll("*").remove();
  zoomLayer = svg.append("g").attr("class", "zoom-layer");
  linkLayer = zoomLayer.append("g").attr("class", "links");
  nodeLayer = zoomLayer.append("g").attr("class", "nodes");
  labelLayer = zoomLayer.append("g").attr("class", "labels");
  zoomBehavior = d3.zoom().scaleExtent([0.35, 4]).on("zoom", event => {
    currentTransform = event.transform;
    zoomLayer.attr("transform", currentTransform);
  });
  svg.call(zoomBehavior);
  bindToolbar();
}

function renderCategoryChips() {
  const categories = [...new Set(allPeople.flatMap(p => p.category || []))].filter(Boolean).sort();
  const wrap = document.getElementById("categoryFilters");
  wrap.innerHTML = categories.map(cat => `<button class="chip" data-category="${cat}" type="button">${cat}</button>`).join("");
  wrap.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.category;
      if (activeCategories.has(cat)) { activeCategories.delete(cat); btn.classList.remove("active"); } else { activeCategories.add(cat); btn.classList.add("active"); }
      drawMindmap();
    });
  });
}

function bindControls() {
  document.getElementById("searchInput").addEventListener("input", drawMindmap);
  document.getElementById("layerFilter").addEventListener("change", drawMindmap);
  document.getElementById("clientStatusFilter").addEventListener("change", drawMindmap);
  document.getElementById("strengthFilter").addEventListener("input", e => { document.getElementById("strengthValue").textContent = e.target.value; drawMindmap(); });
}

function bindToolbar() {
  document.getElementById("zoomInBtn").addEventListener("click", () => zoomBehavior.scaleBy(svg.transition().duration(180), 1.2));
  document.getElementById("zoomOutBtn").addEventListener("click", () => zoomBehavior.scaleBy(svg.transition().duration(180), 0.8));
  document.getElementById("resetViewBtn").addEventListener("click", () => svg.transition().duration(220).call(zoomBehavior.transform, d3.zoomIdentity));
}

function drawMindmap() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const layer = document.getElementById("layerFilter").value;
  const clientStatus = document.getElementById("clientStatusFilter").value;
  const minStrength = Number(document.getElementById("strengthFilter").value);

  const filteredPeople = allPeople.filter(person => {
    if (search && !person.name.toLowerCase().includes(search)) return false;
    if (layer && person.layer !== layer) return false;
    if (clientStatus && person.clientStatus !== clientStatus) return false;
    if ((person.relationshipStrength || 0) < minStrength) return false;
    if (activeCategories.size && !(person.category || []).some(c => activeCategories.has(c))) return false;
    return true;
  });

  const allowedIds = new Set(filteredPeople.map(p => p.id));
  const filteredEdges = allEdges.filter(e => allowedIds.has(e.source) && allowedIds.has(e.target));

  const width = Math.max(900, document.getElementById("mindmap").clientWidth || 1200);
  const height = Math.max(620, document.getElementById("mindmap").clientHeight || 700);
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  linkLayer.selectAll("*").remove();
  nodeLayer.selectAll("*").remove();
  labelLayer.selectAll("*").remove();

  if (simulation) simulation.stop();
  simulation = d3.forceSimulation(filteredPeople)
    .force("link", d3.forceLink(filteredEdges).id(d => d.id).distance(95).strength(0.24))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(d => Math.max(16, 12 + (d.relationshipStrength || 0) * 2)));

  const link = linkLayer.selectAll("line").data(filteredEdges).join("line").attr("class", "link-line").attr("stroke-width", d => Math.max(1, d.strength));
  const node = nodeLayer.selectAll("circle").data(filteredPeople).join("circle")
    .attr("r", d => Math.max(6, Math.min(24, 6 + (d.relationshipStrength || 0) * 1.8)))
    .attr("fill", d => CATEGORY_COLORS[(d.category || [])[0]] || "#bab9b4")
    .attr("stroke", d => d.layer === "Does Not Know Me" ? "#28251d" : "#ffffff")
    .attr("stroke-width", 2.2)
    .attr("stroke-dasharray", d => d.layer === "Does Not Know Me" ? "5 3" : null)
    .call(drag(simulation))
    .on("mousemove", (event, d) => showTooltip(event, `<strong>${d.name}</strong><br>Category: ${(d.category || []).join(", ") || "-"}<br>Layer: ${d.layer || "-"}<br>Client Status: ${d.clientStatus || "-"}<br>Relationship Strength: ${d.relationshipStrength}<br>City/Country: ${d.cityCountry || "-"}`))
    .on("mouseleave", hideTooltip);

  const labels = labelLayer.selectAll("text").data(filteredPeople).join("text").attr("class", "node-label").text(d => d.name).attr("dx", 10).attr("dy", 4);

  simulation.on("tick", () => {
    link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    node.attr("cx", d => d.x).attr("cy", d => d.y);
    labels.attr("x", d => d.x).attr("y", d => d.y);
  });

  simulation.on("end", () => fitGraphToViewport(filteredPeople));
  if (!filteredPeople.length) {
    svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").attr("fill", "#a1a1aa").text("No people match the current filters.");
  }
}

function fitGraphToViewport(nodes) {
  if (!nodes.length) return;
  const xs = nodes.map(d => d.x || 0);
  const ys = nodes.map(d => d.y || 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = svg.node().clientWidth || 1200;
  const height = svg.node().clientHeight || 700;
  const graphWidth = Math.max(1, maxX - minX);
  const graphHeight = Math.max(1, maxY - minY);
  const scale = Math.min(1.5, 0.85 / Math.max(graphWidth / width, graphHeight / height));
  const tx = width / 2 - scale * (minX + maxX) / 2;
  const ty = height / 2 - scale * (minY + maxY) / 2;
  svg.transition().duration(250).call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

function drag(simulation) {
  return d3.drag()
    .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
    .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; });
}

function showTooltip(event, html) {
  const tooltip = document.getElementById("tooltip");
  tooltip.innerHTML = html; tooltip.classList.remove("hidden"); tooltip.style.left = `${event.pageX + 14}px`; tooltip.style.top = `${event.pageY + 14}px`;
}
function hideTooltip() { document.getElementById("tooltip").classList.add("hidden"); }
