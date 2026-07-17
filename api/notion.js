// api/notion.js
import { normalizePerson, normalizeEdge, buildMergedEdges } from "../data-utils.js";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PEOPLE_DB_ID = process.env.PEOPLE_DB_ID;
const EDGES_DB_ID = process.env.EDGES_DB_ID;

async function fetchAllPages(dbId, normalizer) {
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
    if (!res.ok) {
      throw new Error(`Notion API error ${res.status}: ${text}`);
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
    const people = await fetchAllPages(PEOPLE_DB_ID, normalizePerson);
    const edges = await fetchAllPages(EDGES_DB_ID, normalizeEdge);
    const mergedEdges = buildMergedEdges(people, edges);

    res.status(200).json({ people, edges, mergedEdges });
  } catch (err) {
    console.error("[api/notion]", err);
    res.status(500).json({ error: err.message });
  }
}
