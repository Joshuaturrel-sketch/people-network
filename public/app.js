import { fetchPeople, fetchEdges } from "./api-client.js";
import { normalizePerson, normalizeEdge, buildMergedEdges } from "./data-utils.js";
import { renderStats } from "./stats.js";
import { renderWorldMap } from "./map.js";
import { initMindmap } from "./mindmap.js";

initTabs();
boot();

async function boot() {
  try {
    const [rawPeople, rawEdges] = await Promise.all([fetchPeople(), fetchEdges()]);
    const people = rawPeople.map(normalizePerson);
    const edges = rawEdges.map(normalizeEdge);
    const mergedEdges = buildMergedEdges(people, edges);

    renderStats(people);
    renderWorldMap(people);
    initMindmap(people, mergedEdges);
  } catch (error) {
    document.body.innerHTML = `
      <main style="padding:40px;font-family:Inter,Arial,sans-serif">
        <h1>People Network</h1>
        <p>Failed to load live Notion data.</p>
        <pre>${error.message}</pre>
      </main>
    `;
  }
}

function initTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
      document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`${btn.dataset.view}-view`).classList.add("active");
    });
  });
}
