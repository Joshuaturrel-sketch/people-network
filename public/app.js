// app.js
// Entry point — fetches data, wires tabs, renders all views.

import { fetchPeople, fetchEdges } from "./api-client.js";
import { renderStats }             from "./stats.js";
import { renderMindmap }           from "./mindmap.js";
import { renderMap }               from "./map.js";

let people = [];
let edges  = [];

// ─── Tab routing ──────────────────────────────────────────────────────────────
function activateTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.hidden = panel.id !== `panel-${tabId}`;
  });

  if (tabId === "stats")   renderStats(people);
  if (tabId === "mindmap") renderMindmap(people, edges);
  if (tabId === "map")     renderMap(people);
}

// ─── Search / filter ──────────────────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById("people-tbody");
  if (!tbody) return;
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.name || "—"}</td>
      <td>${p.category?.join(", ") || "—"}</td>
      <td>${p.layer || "—"}</td>
      <td>${p.relationshipStrength || "—"}</td>
      <td>${p.clientStatus || "—"}</td>
      <td>${p.cityCountry || "—"}</td>
      <td>${p.industry?.join(", ") || "—"}</td>
    </tr>
  `).join("");
}

function applyFilter(query) {
  const q = query.toLowerCase();
  const filtered = people.filter(p =>
    (p.name || "").toLowerCase().includes(q) ||
    (p.cityCountry || "").toLowerCase().includes(q) ||
    (p.category || []).some(c => c.toLowerCase().includes(q)) ||
    (p.industry || []).some(i => i.toLowerCase().includes(q))
  );
  renderTable(filtered);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function init() {
  const loader = document.getElementById("loader");
  const error  = document.getElementById("error-banner");

  try {
    if (loader) loader.hidden = false;
    [people, edges] = await Promise.all([fetchPeople(), fetchEdges()]);
    if (loader) loader.hidden = true;

    renderTable(people);
    activateTab("stats");

    // Tab buttons
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => activateTab(btn.dataset.tab));
    });

    // Search
    const searchInput = document.getElementById("search");
    searchInput?.addEventListener("input", e => applyFilter(e.target.value));

  } catch (err) {
    console.error("[app]", err);
    if (loader) loader.hidden = true;
    if (error)  { error.textContent = `Error loading data: ${err.message}`; error.hidden = false; }
  }
}

document.addEventListener("DOMContentLoaded", init);
