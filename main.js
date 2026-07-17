// main.js
import { renderStats } from "./stats.js";
import { renderMap } from "./map.js";

async function boot() {
  const loading = document.getElementById("loading");
  const app = document.getElementById("app");

  try {
    loading.textContent = "Fetching contacts from Notion…";

    const res = await fetch("/api/notion", { cache: "no-store" });
    const text = await res.text();

    console.log("[main] /api/notion status:", res.status);
    console.log("[main] /api/notion body:", text);

    if (!res.ok) {
      throw new Error(`API failed with status ${res.status}: ${text}`);
    }

    const data = JSON.parse(text);

    const people = Array.isArray(data.people) ? data.people : [];
    const edges = Array.isArray(data.edges) ? data.edges : [];
    const mergedEdges = Array.isArray(data.mergedEdges) ? data.mergedEdges : [];

    console.log("[main] people:", people.length);
    console.log("[main] edges:", edges.length);
    console.log("[main] mergedEdges:", mergedEdges.length);

    if (!data.people || !data.edges || !data.mergedEdges) {
      throw new Error(`Unexpected API response shape: ${text}`);
    }

    window.people = people;
    window.edges = edges;
    window.mergedEdges = mergedEdges;

    loading.style.display = "none";
    app.style.display = "grid";

    renderStats(people, mergedEdges);
    renderMap(people, mergedEdges);

    const totalHeader = document.getElementById("kpi-total-header");
    if (totalHeader) totalHeader.textContent = `${people.length} contacts`;
  } catch (err) {
    console.error("[main] boot failed:", err);
    loading.innerHTML = `
      <div style="padding:24px;max-width:720px;margin:auto;text-align:left;color:#ddd;font:14px/1.6 Inter,sans-serif">
        <h2 style="margin:0 0 12px;color:#fff;">Dashboard failed to load</h2>
        <div><strong>Message:</strong> ${err.message}</div>
      </div>
    `;
  }
}

boot();
