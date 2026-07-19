// main.js
import { normalizePerson, normalizeEdge, buildMergedEdges } from "./data-utils.js";
import { renderMindmap } from "./mindmap.js";

async function init() {
  const loading = document.getElementById("loading");
  const app = document.getElementById("app");
  const summary = document.getElementById("kpi-summary");

  try {
    const res = await fetch("/api/notion");
    if (!res.ok) {
      throw new Error(`API failed with status ${res.status}`);
    }

    const body = await res.json();
    const people = (body.people || []).map(normalizePerson);
    const edges = (body.edges || []).map(normalizeEdge);
    const mergedEdges = buildMergedEdges(people, edges);

    console.log("[mindmap] people:", people.length);
    console.log("[mindmap] edges:", mergedEdges.length);

    if (summary) {
      summary.textContent = `${people.length} people · ${mergedEdges.length} connections`;
    }

    renderMindmap({
      containerId: "mindmap-container",
      people,
      edges: mergedEdges
    });

    if (loading) loading.style.display = "none";
    if (app) app.style.display = "grid";
  } catch (err) {
    console.error("Failed to init", err);
    if (loading) {
      loading.textContent = `Dashboard failed to load: ${err.message}`;
    }
  }
}

init();
