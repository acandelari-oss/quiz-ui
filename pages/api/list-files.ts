import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const backend = process.env.BACKEND_BASE_URL;
    const apiKey = process.env.BACKEND_API_KEY;

    if (!backend)
      return res.status(500).json({ error: "Missing BACKEND_BASE_URL" });

    if (!apiKey)
      return res.status(500).json({ error: "Missing BACKEND_API_KEY" });

    const projectId = req.query.project_id;

    if (!projectId)
      return res.status(400).json({ error: "Missing project_id" });

    const response = await fetch(
      `${backend}/projects/${projectId}/documents`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error("list-files error:", error);

    return res.status(500).json({
      error: error.message || "Unknown error",
    });
  }
}