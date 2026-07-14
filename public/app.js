import { fetchPeople, fetchEdges } from "./api-client.js";
import { renderStats } from "./stats.js";
import { renderMindmap, resetMindmapView } from "./mindmap.js";
import { renderMap, clearMapGeocodeCache } from "./map.js";
import { renderGraphStats } from "./graph-stats.js";
import { buildMergedEdges } from "./data-utils.js";

let people = [];
let edgesDb = [];
let mergedEdges = [];

function setTheme() {
  document.documentElement.setAttribute("data-theme", "dark");
}

function showLoader(show) {
  const el = document.getElementById("loader");
  if (el) el.hidden = !show;
}

function showError(message) {
  const el = document.getElementById("error-banner");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function clearError() {
  const el = document.getElementById("error-banner");
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

function activateTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.hidden = panel.id !== `panel-${tabName}`;
  });

  if (tabName === "stats") renderStats(people);
  if (tabName === "graph") renderMindmap(people, mergedEdges);
  if (tabName === "graph-stats") renderGraphStats(people, mergedEdges);
  if (tabName === "map") renderMap(people);
}

function renderPeopleTable(data) {
  const tbody = document.getElementById("people-table-body");
  if (!tbody) return;

  tbody.innerHTML = data.map(person => `
    <tr>
      <td>${escapeHtml(person.name || "—")}</td>
      <td>${escapeHtml((person.category || []).join(", ") || "—")}</td>
      <td>${escapeHtml(person.layer || "—")}</td>
      <td>${person.relationshipStrength ?? "—"}</td>
      <td>${escapeHtml(person.clientStatus || "—")}</td>
      <td>${person.clientProbability != null ? `${person.clientProbability}%` : "—"}</td>
      <td>${escapeHtml(person.cityCountry || "—")}</td>
      <td>${escapeHtml((person.industry || []).join(", ") || "—")}</td>
      <td>${escapeHtml(person.metVia || "—")}</td>
    </tr>
  `).join("");
}

function wireTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });
}

function wireSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;

  input.addEventListener("input", event => {
    const q = event.target.value.trim().toLowerCase();

    const filtered = people.filter(person => {
      return [
        person.name,
        person.layer,
        person.clientStatus,
        person.cityCountry,
        person.metVia,
        ...(person.category || []),
        ...(person.industry || [])
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q));
    });

    renderPeopleTable(filtered);
  });
}

function wireMindmapControls() {
  document.getElementById("reset-graph-view")?.addEventListener("click", () => {
    resetMindmapView();
  });
}

function wireMapControls() {
  document.getElementById("refresh-map-geocoding")?.addEventListener("click", async () => {
    await renderMap(people, { forceRefresh: true });
  });

  document.getElementById("clear-map-cache")?.addEventListener("click", () => {
    clearMapGeocodeCache();
    const status = document.getElementById("map-status");
    if (status) status.textContent = "Geocode cache cleared.";
  });
}

async function init() {
  setTheme();
  clearError();
  showLoader(true);

  try {
    const [peopleData, edgesData] = await Promise.all([
      fetchPeople(),
      fetchEdges()
    ]);

    people = peopleData;
    edgesDb = edgesData;
    mergedEdges = buildMergedEdges(people, edgesDb);

    renderPeopleTable(people);
    wireTabs();
    wireSearch();
    wireMindmapControls();
    wireMapControls();
    activateTab("stats");
  } catch (error) {
    console.error("[app:init]", error);
    showError(`Error loading dashboard: ${error.message}`);
  } finally {
    showLoader(false);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", init);
