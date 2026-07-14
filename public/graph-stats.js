export function renderGraphStats(people, edges) {
  const peopleById = new Map(people.map(p => [p.id, p]));
  const degree = new Map();
  const weightedDegree = new Map();

  for (const person of people) {
    degree.set(person.id, 0);
    weightedDegree.set(person.id, 0);
  }

  for (const edge of edges) {
    const weight = edge.strength ?? 1;

    degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1);

    weightedDegree.set(edge.source, (weightedDegree.get(edge.source) || 0) + weight);
    weightedDegree.set(edge.target, (weightedDegree.get(edge.target) || 0) + weight);
  }

  const nodeCount = people.length;
  const edgeCount = edges.length;
  const totalDegree = Array.from(degree.values()).reduce((a, b) => a + b, 0);
  const averageDegree = nodeCount ? totalDegree / nodeCount : 0;
  const isolates = Array.from(degree.entries()).filter(([, value]) => value === 0);

  const topByDegree = Array.from(degree.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, value]) => ({
      name: peopleById.get(id)?.name || id,
      value
    }));

  const topByWeighted = Array.from(weightedDegree.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, value]) => ({
      name: peopleById.get(id)?.name || id,
      value
    }));

  const strongestEdges = [...edges]
    .sort((a, b) => (b.strength || 0) - (a.strength || 0))
    .slice(0, 10)
    .map(edge => ({
      pair: `${peopleById.get(edge.source)?.name || edge.source} ↔ ${peopleById.get(edge.target)?.name || edge.target}`,
      strength: edge.strength || 1,
      label: edge.label || "Connection"
    }));

  setText("graph-kpi-nodes", nodeCount);
  setText("graph-kpi-edges", edgeCount);
  setText("graph-kpi-avg-degree", averageDegree.toFixed(2));
  setText("graph-kpi-isolates", isolates.length);

  renderList("top-degree-list", topByDegree, item => `${item.name} <span>${item.value}</span>`);
  renderList("top-weighted-list", topByWeighted, item => `${item.name} <span>${item.value}</span>`);
  renderList("strongest-edges-list", strongestEdges, item => `${item.pair} <span>${item.strength}</span>`);
  renderList("isolates-list", isolates.map(([id]) => ({ name: peopleById.get(id)?.name || id })), item => `${item.name}`);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderList(id, items, template) {
  const el = document.getElementById(id);
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `<li class="empty-item">No data yet</li>`;
    return;
  }

  el.innerHTML = items.map(item => `<li>${template(item)}</li>`).join("");
}
