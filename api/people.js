export default async function handler(req, res) {
  try {
    const pages = [];
    let cursor;

    do {
      const response = await fetch("https://api.notion.com/v1/databases/787fed7a-9b0e-46b3-b506-8782f14e4b7e/query", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      pages.push(...data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=60");
    res.status(200).json(pages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
