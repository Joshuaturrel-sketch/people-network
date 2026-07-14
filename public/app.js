// app.js
import { fetchPeople, fetchEdges } from "./api-client.js";
import { renderStats } from "./stats.js";
import { renderMindmap } from "./mindmap.js";
import { renderMap } from "./map.js";

let people = [];
let edges = [];

function showError(message) {
  const error = document.getElementById("error-banner");
  const loader = document.getElementById("loader");
  if (loader) loader.hidden = true;
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.hidden = true;
}

function activateTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.hidden = panel.id !== `panel-${tabId}`;
  });

  if (tabId === "stats") renderStats(people);
  if (tabId === "mindmap") renderMindmap(people, edges);
  if (tabId === "map") renderMap(people);
}

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

async function init() {
  try {
    const searchInput = document.getElementById("search");
    searchInput?.addEventListener("input", e => applyFilter(e.target.value));

    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => activateTab(btn.dataset.tab));
    });

    const peoplePromise = fetchPeople();
    const edgesPromise = fetchEdges().catch(err => {
      console.warn("[app] edges failed, continuing without edges", err);
      return [];
    });

    people = await peoplePromise;
    edges = await edgesPromise;

    hideLoader();

    if (!Array.isArray(people) || people.length === 0) {
      showError("People loaded, but no contacts were returned. Check your Notion database ID and property names.");
      return;
    }

    renderTable(people);
    activateTab("stats");
  } catch (err) {
    console.error("[app] init failed", err);
    showError(`Error loading data: ${err.message}`);
  }
}

document.addEventListener("DOMContentLoaded", init);
