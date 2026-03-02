import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const backend = process.env.BACKEND_BASE_URL;
    const apiKey = process.env.BACKEND_API_KEY;

    const project_id = String(req.query.project_id || "");

    if (!backend) return res.status(500).json({ error: "Missing env: BACKEND_BASE_URL" });
    if (!apiKey) return res.status(500).json({ error: "Missing env: BACKEND_API_KEY" });
    if (!project_id) return res.status(400).json({ error: "Missing project_id" });

    const response = await fetch(`${backend}/projects/${project_id}/documents`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const raw = await response.text();
    let data: any;
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}