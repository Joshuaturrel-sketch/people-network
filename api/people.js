import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_TOKEN
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!process.env.NOTION_TOKEN) {
    return res.status(500).json({ error: "Missing NOTION_TOKEN" });
  }

  if (!DATABASE_ID) {
    return res.status(500).json({ error: "Missing NOTION_DATABASE_ID" });
  }

  try {
    const results = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: DATABASE_ID,
        start_cursor: cursor,
        page_size: 100
      });

      results.push(...response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    return res.status(200).json({ results });
  } catch (error) {
    console.error("[api/people]", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch people from Notion"
    });
  }
}
