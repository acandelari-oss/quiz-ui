import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const backend = process.env.BACKEND_BASE_URL;
    const apiKey = process.env.BACKEND_API_KEY;

    if (!backend) return res.status(500).json({ error: "Missing env: BACKEND_BASE_URL" });
    if (!apiKey) return res.status(500).json({ error: "Missing env: BACKEND_API_KEY" });

    const { project_id, ...rest } = req.body || {};
    if (!project_id) return res.status(400).json({ error: "Missing project_id" });

    const response = await fetch(`${backend}/projects/${project_id}/generate_quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(rest),
    });

    const raw = await response.text();
    let data: any;
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}