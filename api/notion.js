// api/notion.js
import { normalizePerson, normalizeEdge, buildMergedEdges } from "../data-utils.js";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PEOPLE_DB_ID = process.env.PEOPLE_DB_ID;
const EDGES_DB_ID = process.env.EDGES_DB_ID;

async function fetchAllPages(dbId, normalizer, label) {
  let rows = [];
  let cursor = undefined;
  let hasMore = true;

  while (hasMore) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log(`[api/notion] ${label} status:`, res.status);
    console.log(`[api/notion] ${label} body:`, text);

    if (!res.ok) {
      throw new Error(`${label} query failed (${res.status}): ${text}`);
    }

    const json = JSON.parse(text);
    rows = rows.concat(json.results.map(normalizer));
    hasMore = json.has_more;
    cursor = json.next_cursor;
  }

  return rows;
}

export default async function handler(req, res) {
  try {
    if (!NOTION_TOKEN) throw new Error("Missing NOTION_TOKEN env var");
    if (!PEOPLE_DB_ID) throw new Error("Missing PEOPLE_DB_ID env var");
    if (!EDGES_DB_ID) throw new Error("Missing EDGES_DB_ID env var");

    const people = await fetchAllPages(PEOPLE_DB_ID, normalizePerson, "people");
    const edges = await fetchAllPages(EDGES_DB_ID, normalizeEdge, "edges");
    const mergedEdges = buildMergedEdges(people, edges);

    return res.status(200).json({ people, edges, mergedEdges });
  } catch (err) {
    console.error("[api/notion] fatal:", err);
    return res.status(500).json({
      error: err.message,
      hasToken: !!NOTION_TOKEN,
      hasPeopleDb: !!PEOPLE_DB_ID,
      hasEdgesDb: !!EDGES_DB_ID
    });
  }
}
