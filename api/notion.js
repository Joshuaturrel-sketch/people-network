// api/notion.js
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  try {
    const hasToken = !!process.env.NOTION_TOKEN;
    const hasPeopleDb = !!process.env.PEOPLE_DB_ID;
    const hasEdgesDb = !!process.env.EDGES_DB_ID;

    if (!hasToken || !hasPeopleDb || !hasEdgesDb) {
      return res.status(500).json({
        error: "Missing Notion environment variables",
        hasToken,
        hasPeopleDb,
        hasEdgesDb
      });
    }

    const [peoplePages, edgePages] = await Promise.all([
      queryAll(process.env.PEOPLE_DB_ID),
      queryAll(process.env.EDGES_DB_ID)
    ]);

    res.status(200).json({
      people: peoplePages,
      edges: edgePages
    });
  } catch (err) {
    console.error("Notion API error", err);
    res.status(500).json({
      error: err.message || "Unknown error"
    });
  }
}

async function queryAll(databaseId) {
  const results = [];
  let cursor;

  do {
    const resp = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor
    });
    results.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);

  return results;
}
