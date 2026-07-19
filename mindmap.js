// mindmap.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const COLORS = {
  node: "#4f98a3",
  nodeDim: "#3a3a38",
  nodeHighlight: "#d19900",
  link: "#55524a",
  linkDim: "#302f2c"
};

export function renderMindmap({ containerId, people, edges }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const width = container.clientWidth || 900;
  const height = container.clientHeight || 600;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("cursor", "grab");

  const g = svg.append("g");

  const zoom = d3.zoom().on("zoom", event => {
    g.attr("transform", event.transform);
  });

  svg.call(zoom);

  // Build nodes map
  const nodesById = new Map();
  for (const p of people) {
    nodesById.set(p.id, {
      id: p.id,
      name: p.name || "Unknown",
      layer: p.layer || "Unknown",
      category: Array.isArray(p.category) && p.category.length
        ? p.category[0]
        : "Uncategorized",
      strength: p.relationshipStrength || 0,
      degree: 0
    });
  }

  // Build links
  const links = [];
  for (const e of edges) {
    if (!nodesById.has(e.personA) || !nodesById.has(e.personB)) continue;
    links.push({
      source: e.personA,
      target: e.personB,
      strength: e.strength || 0,
      label: e.edgeLabel || ""
    });
  }

  // Degree
  for (const link of links) {
    const a = nodesById.get(link.source);
    const b = nodesById.get(link.target);
    if (a) a.degree += 1;
    if (b) b.degree += 1;
  }

  const nodes = Array.from(nodesById.values());

  if (!nodes.length) {
    g
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#797876")
      .style("font-size", "14px")
      .text("No people to display.");
    return;
  }

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(nodes, d => d.degree || 1)])
    .range([6, 24]);

  const linkWidth = d3
    .scaleLinear()
    .domain([0, d3.max(links, d => d.strength || 1) || 1])
    .range([0.5, 4]);

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id(d => d.id)
        .distance(80)
        .strength(0.8)
    )
    .force("charge", d3.forceManyBody().strength(-140))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(d => radiusScale(d.degree) + 4));

  const link = g
    .append("g")
    .attr("stroke", COLORS.link)
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke-width", d => linkWidth(d.strength));

  const node = g
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", d => radiusScale(d.degree))
    .attr("fill", COLORS.node)
    .attr("stroke", "#1c1b19")
    .attr("stroke-width", 1.2)
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  const labels = g
    .append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("font-size", 10)
    .attr("fill", "#cdccca")
    .attr("text-anchor", "middle")
    .attr("dy", d => -radiusScale(d.degree) - 4)
    .text(d => d.name);

  const neighbors = buildNeighborMap(nodes, links);

  node
    .on("mouseenter", (event, d) => highlightNode(d))
    .on("mouseleave", resetHighlight);

  labels
    .on("mouseenter", (event, d) => highlightNode(d))
    .on("mouseleave", resetHighlight);

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node.attr("cx", d => d.x).attr("cy", d => d.y);

    labels.attr("x", d => d.x).attr("y", d => d.y - radiusScale(d.degree) - 4);
  });

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
    svg.style("cursor", "grabbing");
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
    svg.style("cursor", "grab");
  }

  function buildNeighborMap(nodes, links) {
    const map = new Map();
    for (const n of nodes) {
      map.set(n.id, new Set());
    }
    for (const l of links) {
      const s = l.source.id ?? l.source;
      const t = l.target.id ?? l.target;
      map.get(s)?.add(t);
      map.get(t)?.add(s);
    }
    return map;
  }

  function highlightNode(nodeData) {
    const neighborIds = neighbors.get(nodeData.id) || new Set();
    neighborIds.add(nodeData.id);

    node
      .attr("fill", d =>
        d.id === nodeData.id
          ? COLORS.nodeHighlight
          : neighborIds.has(d.id)
          ? COLORS.node
          : COLORS.nodeDim
      )
      .attr("opacity", d => (neighborIds.has(d.id) ? 1 : 0.3));

    labels.attr("opacity", d => (neighborIds.has(d.id) ? 1 : 0.25));

    link
      .attr("stroke", l => {
        const sid = l.source.id ?? l.source;
        const tid = l.target.id ?? l.target;
        return neighborIds.has(sid) && neighborIds.has(tid)
          ? COLORS.link
          : COLORS.linkDim;
      })
      .attr("stroke-opacity", l => {
        const sid = l.source.id ?? l.source;
        const tid = l.target.id ?? l.target;
        return neighborIds.has(sid) && neighborIds.has(tid) ? 0.9 : 0.15;
      });
  }

  function resetHighlight() {
    node
      .attr("fill", COLORS.node)
      .attr("opacity", 1);

    labels.attr("opacity", 1);

    link
      .attr("stroke", COLORS.link)
      .attr("stroke-opacity", 0.6);
  }
}
