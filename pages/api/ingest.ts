import type { NextApiRequest, NextApiResponse } from "next";

async function fetchWithTimeout(url: string, options: RequestInit, ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const backend = process.env.BACKEND_BASE_URL;
    const apiKey = process.env.BACKEND_API_KEY;

    if (!backend)
      return res.status(500).json({ error: "Missing BACKEND_BASE_URL" });

    if (!apiKey)
      return res.status(500).json({ error: "Missing BACKEND_API_KEY" });

    const projectId = req.body.project_id;
    const documents = req.body.documents;

    if (!projectId)
      return res.status(400).json({ error: "Missing project_id in body" });

    if (!documents)
      return res.status(400).json({ error: "Missing documents in body" });

    const url = `${backend}/projects/${projectId}/ingest`;

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          project_id: projectId,
          documents: documents,
        }),

      },
      60000
    );

    const raw = await response.text();

    let data: any;

    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    return res.status(response.status).json(data);

  }
  catch (err: any) {

    console.error("INGEST API ERROR:", err);

    return res.status(500).json({
      error: err?.name === "AbortError"
        ? "Timeout calling backend ingest"
        : err?.message || "Unknown ingest error",
    });

  }

}
