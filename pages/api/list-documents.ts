import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const projectId = req.query.project_id;

    if (!projectId)
      return res.status(400).json({ error: "Missing project_id" });

    const backend = process.env.BACKEND_BASE_URL;
    const apiKey = process.env.BACKEND_API_KEY;

    const response = await fetch(
      `${backend}/projects/${projectId}/documents`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.status(response.status).json(data);

  } catch (e: any) {

    res.status(500).json({

      error: e.message

    });

  }
}