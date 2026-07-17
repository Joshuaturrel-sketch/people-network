// main.js
import { NOTION_TOKEN, PEOPLE_DB_ID, EDGES_DB_ID } from "./notion-config.js";
import { normalizePerson, normalizeEdge, buildMergedEdges } from "./data-utils.js";
import { renderStats } from "./stats.js";
import { renderMap } from "./map.js";

const PROXY = "https://api.allorigins.win/raw?url=";

async function fetchAllPages(dbId, normalizer) {
  let rows = [];
  let cursor = undefined;
  let hasMore = true;

  while (hasMore) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const url = `https://api.notion.com/v1/databases/${dbId}/query`;
    const res = await fetch(PROXY + encodeURIComponent(url), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Notion API error ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    rows = rows.concat(json.results.map(normalizer));
    hasMore = json.has_more;
    cursor = json.next_cursor;
  }

  return rows;
}

async function boot() {
  const loading = document.getElementById("loading");
  const app = document.getElementById("app");

  try {
    loading.textContent = "Fetching people database…";
    const people = await fetchAllPages(PEOPLE_DB_ID, normalizePerson);

    loading.textContent = "Fetching connection edges…";
    const edges = await fetchAllPages(EDGES_DB_ID, normalizeEdge);

    const mergedEdges = buildMergedEdges(people, edges);

    console.log("[main] people:", people.length);
    console.log("[main] edges:", edges.length);
    console.log("[main] sample person:", people[0]);
    console.log("[main] sample edge:", mergedEdges[0]);

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
    console.error(err);
    loading.textContent = `Error: ${err.message}`;
  }
}

boot();
